"use client";

import { ArrowUpToLine, ImagePlus, X } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { type FormEvent, useEffect, useId, useRef, useState, useTransition } from "react";
import { Alert } from "@/components/ui/alert";
import { buttonVariants } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { SubmitButton } from "@/components/ui/submit-button";
import { Textarea } from "@/components/ui/textarea";
import { routes } from "@/config/routes";
import { formatPhone } from "@/features/profiles/phone";
import { useT } from "@/i18n/client";
import { ImageProcessingError, resizeImage } from "@/lib/images/resize";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import { finalizeServiceImagesAction, saveServiceAction } from "../actions";
import {
  type ServiceAvailability,
  type ServicePricing,
  serviceAvailabilities,
  serviceLimits,
  servicePricingTypes,
} from "../constants";
import { newServiceImagePath, SERVICE_IMAGE_BUCKET } from "../image-url";
import { serviceHref } from "../links";
import type { ServiceField, ServiceImageInput } from "../schemas";

const MAX_INPUT_BYTES = 25 * 1024 * 1024;

type EditorImage =
  | { key: string; kind: "existing"; id: string; url: string }
  | { key: string; kind: "new"; blob: Blob; url: string };

export type ServiceEditorInitial = {
  id: string;
  title: string;
  categorySlug: string;
  description: string;
  city: string;
  district: string | null;
  pricingType: ServicePricing;
  price: number | null;
  availability: ServiceAvailability;
  availabilityNote: string | null;
  extraInfo: string | null;
  contactPhone: string | null;
  whatsapp: boolean;
  images: Array<{ id: string; url: string }>;
};

type ServiceEditorProps = {
  userId: string;
  categories: Array<{ slug: string; name: string }>;
  cities: Array<{ slug: string; name: string }>;
  /** Numéro privé du profil, proposé pour remplir le champ (jamais publié sans action). */
  profilePhone: string | null;
  initial?: ServiceEditorInitial;
};

/** Formulaire de publication ou de modification d'un service, photos comprises. */
export function ServiceEditor({
  userId,
  categories,
  cities,
  profilePhone,
  initial,
}: ServiceEditorProps) {
  const t = useT();
  const texts = t.services.editor;
  const router = useRouter();
  const id = useId();
  const formRef = useRef<HTMLFormElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const uploadedPaths = useRef(new Map<string, string>());
  const [serviceId, setServiceId] = useState<string | null>(initial?.id ?? null);
  const [images, setImages] = useState<EditorImage[]>(
    () =>
      initial?.images.map((image) => ({
        key: image.id,
        kind: "existing" as const,
        id: image.id,
        url: image.url,
      })) ?? [],
  );
  const [pricingType, setPricingType] = useState<ServicePricing>(initial?.pricingType ?? "from");
  const [phone, setPhone] = useState(
    initial?.contactPhone ? formatPhone(initial.contactPhone) : "",
  );
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<ServiceField | "images", string>>>(
    {},
  );
  const [message, setMessage] = useState<string | null>(null);
  const [processing, setProcessing] = useState(0);
  const [pending, startTransition] = useTransition();
  const [stage, setStage] = useState<"saving" | "uploading">("saving");

  // Libère les aperçus locaux (blob:) quand l'éditeur disparaît.
  const previews = useRef(images);
  useEffect(() => {
    previews.current = images;
  }, [images]);
  useEffect(
    () => () => {
      for (const image of previews.current) {
        if (image.kind === "new") URL.revokeObjectURL(image.url);
      }
    },
    [],
  );

  async function addFiles(files: File[]) {
    setFieldErrors((errors) => ({ ...errors, images: undefined }));
    setProcessing((count) => count + files.length);
    for (const file of files) {
      try {
        if (!file.type.startsWith("image/") || file.size > MAX_INPUT_BYTES) {
          throw new ImageProcessingError("tooLarge");
        }
        const blob = await resizeImage(file, {
          maxSize: serviceLimits.imageMaxDimension,
          quality: 0.82,
        });
        const key = crypto.randomUUID();
        setImages((current) =>
          current.length >= serviceLimits.maxImages
            ? current
            : [...current, { key, kind: "new", blob, url: URL.createObjectURL(blob) }],
        );
      } catch (error) {
        setFieldErrors((errors) => ({
          ...errors,
          images:
            error instanceof ImageProcessingError ? t.images[error.code] : t.images.photoFailed,
        }));
      } finally {
        setProcessing((count) => count - 1);
      }
    }
  }

  function removeImage(key: string) {
    setImages((current) => {
      const image = current.find((item) => item.key === key);
      if (image?.kind === "new") URL.revokeObjectURL(image.url);
      return current.filter((item) => item.key !== key);
    });
  }

  function moveFirst(key: string) {
    setImages((current) => {
      const image = current.find((item) => item.key === key);
      return image ? [image, ...current.filter((item) => item.key !== key)] : current;
    });
  }

  async function uploadNewImages(targetId: string): Promise<ServiceImageInput[] | null> {
    const supabase = getSupabaseBrowserClient();
    if (!supabase) return null;
    const payload: ServiceImageInput[] = [];
    for (const image of images) {
      if (image.kind === "existing") {
        payload.push({ id: image.id });
        continue;
      }
      let path = uploadedPaths.current.get(image.key);
      if (!path) {
        const extension = image.blob.type === "image/webp" ? "webp" : "jpg";
        path = newServiceImagePath(userId, targetId, extension);
        const { error } = await supabase.storage
          .from(SERVICE_IMAGE_BUCKET)
          .upload(path, image.blob, { contentType: image.blob.type, upsert: false });
        if (error) return null;
        uploadedPaths.current.set(image.key, path);
      }
      payload.push({ path });
    }
    return payload;
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = formRef.current;
    if (!form || processing > 0) return;
    startTransition(async () => {
      setMessage(null);
      setFieldErrors({});
      setStage("saving");
      const saved = await saveServiceAction(serviceId, new FormData(form));
      if (saved.status === "error") {
        setFieldErrors(saved.fieldErrors ?? {});
        setMessage(saved.message ?? (saved.fieldErrors ? t.editor.fixFields : null));
        const first = Object.keys(saved.fieldErrors ?? {})[0];
        if (first) form.querySelector<HTMLElement>(`[name="${first}"]`)?.focus();
        return;
      }
      setServiceId(saved.serviceId);

      setStage("uploading");
      const payload = await uploadNewImages(saved.serviceId);
      if (!payload) {
        setMessage(t.editor.uploadFailed);
        return;
      }
      const result = await finalizeServiceImagesAction({
        serviceId: saved.serviceId,
        images: payload,
      });
      if (result.status === "error") {
        setMessage(result.message);
        return;
      }
      router.push(serviceHref(saved.serviceId));
      router.refresh();
    });
  }

  const error = (field: ServiceField) => fieldErrors[field];
  const sectionClass = "flex flex-col gap-4 rounded-2xl border border-border bg-card p-4 sm:p-6";
  const headingClass = "text-base font-semibold tracking-tight";
  const isQuote = pricingType === "quote";

  return (
    <form ref={formRef} onSubmit={handleSubmit} noValidate className="flex flex-col gap-5">
      {message ? (
        <Alert variant="danger" role="alert">
          {message}
        </Alert>
      ) : null}

      <section aria-labelledby={`${id}-service`} className={sectionClass}>
        <h2 id={`${id}-service`} className={headingClass}>
          {texts.sectionService}
        </h2>
        <Field id={`${id}-title`} label={texts.title} error={error("title")} required>
          {(control) => (
            <Input
              {...control}
              name="title"
              defaultValue={initial?.title}
              maxLength={serviceLimits.titleMax}
              placeholder={texts.titlePlaceholder}
              autoComplete="off"
            />
          )}
        </Field>
        <Field id={`${id}-category`} label={texts.category} error={error("category")} required>
          {(control) => (
            <Select {...control} name="category" defaultValue={initial?.categorySlug ?? ""}>
              <option value="" disabled>
                {texts.categoryPlaceholder}
              </option>
              {categories.map((category) => (
                <option key={category.slug} value={category.slug}>
                  {category.name}
                </option>
              ))}
            </Select>
          )}
        </Field>
        <Field
          id={`${id}-description`}
          label={texts.description}
          error={error("description")}
          required
        >
          {(control) => (
            <Textarea
              {...control}
              name="description"
              defaultValue={initial?.description}
              rows={7}
              maxLength={serviceLimits.descriptionMax}
              placeholder={texts.descriptionPlaceholder}
            />
          )}
        </Field>
      </section>

      <section aria-labelledby={`${id}-photos`} className={sectionClass}>
        <div className="flex flex-col gap-1">
          <h2 id={`${id}-photos`} className={headingClass}>
            {texts.photos}
          </h2>
          <p className="text-sm text-muted-foreground">
            {texts.photosHint(serviceLimits.maxImages)}
          </p>
        </div>
        <ul className="grid grid-cols-3 gap-2 sm:grid-cols-4">
          {images.map((image, index) => (
            <li
              key={image.key}
              className="relative aspect-square overflow-hidden rounded-xl bg-muted"
            >
              {/* eslint-disable-next-line @next/next/no-img-element -- aperçu local (blob:) ou photo déjà publiée */}
              <img src={image.url} alt="" className="size-full object-cover" />
              {index === 0 ? (
                <span className="absolute bottom-1.5 left-1.5 rounded-full bg-primary px-2 py-0.5 text-[0.6875rem] font-semibold text-primary-foreground">
                  {texts.mainPhoto}
                </span>
              ) : (
                <button
                  type="button"
                  onClick={() => moveFirst(image.key)}
                  className="absolute bottom-1.5 left-1.5 inline-flex size-8 items-center justify-center rounded-full bg-card/95 shadow-card"
                  aria-label={texts.moveFirst(index + 1)}
                  title={texts.moveFirst(index + 1)}
                >
                  <ArrowUpToLine className="size-4" aria-hidden="true" />
                </button>
              )}
              <button
                type="button"
                onClick={() => removeImage(image.key)}
                className="absolute top-1.5 right-1.5 inline-flex size-8 items-center justify-center rounded-full bg-card/95 shadow-card"
                aria-label={texts.removePhoto(index + 1)}
                title={texts.removePhoto(index + 1)}
              >
                <X className="size-4" aria-hidden="true" />
              </button>
            </li>
          ))}
          {images.length < serviceLimits.maxImages ? (
            <li>
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                disabled={processing > 0}
                className="flex aspect-square w-full flex-col items-center justify-center gap-1.5 rounded-xl border-2 border-dashed border-border text-sm font-medium text-muted-foreground transition-colors hover:border-primary hover:text-primary-ink disabled:opacity-60"
              >
                <ImagePlus className="size-6" aria-hidden="true" />
                {texts.addPhotos}
              </button>
            </li>
          ) : null}
        </ul>
        <input
          ref={fileRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
          multiple
          hidden
          onChange={(event) => {
            const files = Array.from(event.target.files ?? []).slice(
              0,
              serviceLimits.maxImages - images.length,
            );
            event.target.value = "";
            void addFiles(files);
          }}
        />
        {fieldErrors.images ? (
          <p className="text-sm text-danger" role="alert">
            {fieldErrors.images}
          </p>
        ) : null}
      </section>

      <section aria-labelledby={`${id}-place`} className={sectionClass}>
        <h2 id={`${id}-place`} className={headingClass}>
          {texts.sectionPlace}
        </h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field id={`${id}-city`} label={texts.city} error={error("city")} required>
            {(control) => (
              <Select {...control} name="city" defaultValue={initial?.city ?? ""}>
                <option value="" disabled>
                  {texts.cityPlaceholder}
                </option>
                {cities.map((city) => (
                  <option key={city.slug} value={city.slug}>
                    {city.name}
                  </option>
                ))}
              </Select>
            )}
          </Field>
          <Field id={`${id}-district`} label={texts.district} error={error("district")}>
            {(control) => (
              <Input
                {...control}
                name="district"
                defaultValue={initial?.district ?? ""}
                maxLength={serviceLimits.districtMax}
                placeholder={texts.districtPlaceholder}
              />
            )}
          </Field>
        </div>
      </section>

      <section aria-labelledby={`${id}-price`} className={sectionClass}>
        <h2 id={`${id}-price`} className={headingClass}>
          {texts.sectionPrice}
        </h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field id={`${id}-pricing`} label={texts.pricingType} error={error("pricingType")}>
            {(control) => (
              <Select
                {...control}
                name="pricingType"
                value={pricingType}
                onChange={(event) => setPricingType(event.target.value as ServicePricing)}
              >
                {servicePricingTypes.map((type) => (
                  <option key={type} value={type}>
                    {t.services.pricingTypes[type]}
                  </option>
                ))}
              </Select>
            )}
          </Field>
          <Field
            id={`${id}-price-value`}
            label={texts.price}
            hint={texts.priceHint}
            error={error("price")}
            required={!isQuote}
          >
            {(control) => (
              <Input
                {...control}
                name="price"
                inputMode="numeric"
                defaultValue={initial?.price ?? ""}
                disabled={isQuote}
                placeholder={isQuote ? t.services.pricingTypes.quote : "10 000"}
              />
            )}
          </Field>
          <Field id={`${id}-availability`} label={texts.availability} error={error("availability")}>
            {(control) => (
              <Select
                {...control}
                name="availability"
                defaultValue={initial?.availability ?? "appointment"}
              >
                {serviceAvailabilities.map((value) => (
                  <option key={value} value={value}>
                    {t.services.availability[value]}
                  </option>
                ))}
              </Select>
            )}
          </Field>
          <Field
            id={`${id}-availability-note`}
            label={texts.availabilityNote}
            error={error("availabilityNote")}
          >
            {(control) => (
              <Input
                {...control}
                name="availabilityNote"
                defaultValue={initial?.availabilityNote ?? ""}
                maxLength={serviceLimits.availabilityNoteMax}
                placeholder={texts.availabilityNotePlaceholder}
              />
            )}
          </Field>
        </div>
      </section>

      <section aria-labelledby={`${id}-contact`} className={sectionClass}>
        <h2 id={`${id}-contact`} className={headingClass}>
          {texts.sectionContact}
        </h2>
        <Field
          id={`${id}-phone`}
          label={texts.contactPhone}
          hint={texts.contactPhoneHint}
          error={error("contactPhone")}
        >
          {(control) => (
            <Input
              {...control}
              name="contactPhone"
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
              placeholder="6 90 00 00 00"
            />
          )}
        </Field>
        {profilePhone && phone.trim() === "" ? (
          <button
            type="button"
            onClick={() => setPhone(formatPhone(profilePhone))}
            className="self-start text-sm font-semibold text-primary-ink underline-offset-4 hover:underline"
          >
            {texts.useProfilePhone}
          </button>
        ) : null}
        <label className="flex items-center gap-3 text-sm">
          <Checkbox name="whatsapp" defaultChecked={initial?.whatsapp ?? false} />
          {texts.whatsapp}
        </label>
        <Field id={`${id}-extra`} label={texts.extraInfo} error={error("extraInfo")}>
          {(control) => (
            <Textarea
              {...control}
              name="extraInfo"
              defaultValue={initial?.extraInfo ?? ""}
              rows={3}
              maxLength={serviceLimits.extraInfoMax}
              placeholder={texts.extraInfoPlaceholder}
            />
          )}
        </Field>
      </section>

      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Link
          href={initial ? serviceHref(initial.id) : routes.services}
          className={cn(buttonVariants({ variant: "outline", size: "lg" }))}
        >
          {texts.cancel}
        </Link>
        <SubmitButton pending={pending} size="lg" disabled={processing > 0}>
          {pending
            ? stage === "uploading"
              ? texts.uploading
              : texts.saving
            : initial
              ? texts.save
              : texts.publish}
        </SubmitButton>
      </div>
    </form>
  );
}
