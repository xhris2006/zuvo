"use client";

import { useRouter } from "next/navigation";
import { type FormEvent, type ReactNode, useId, useRef, useState, useTransition } from "react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { listingLimits } from "@/config/limits";
import { cities } from "@/config/locations";
import { getDictionary } from "@/i18n";
import { ImageProcessingError, resizeImage } from "@/lib/images/resize";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { finalizeListingAction, saveListingAction } from "../actions";
import { listingConditions, type ListingCondition, type ListingStatus } from "../constants";
import { LISTING_IMAGE_BUCKET, newListingImagePath } from "../image-url";
import { listingHref } from "../links";
import type { ListingField, ListingImageInput } from "../schemas";
import { type EditorImage, PhotoManager } from "./photo-manager";

const MAX_INPUT_BYTES = 25 * 1024 * 1024;

export type EditableListing = {
  id: string;
  title: string;
  description: string;
  price: number | null;
  condition: ListingCondition | null;
  city: string | null;
  categorySlug: string | null;
  status: ListingStatus;
  images: { id: string; url: string }[];
};

type ListingEditorProps = {
  userId: string;
  categories: { slug: string; name: string }[];
  defaultCity?: string | null;
  listing?: EditableListing;
};

export function ListingEditor({ userId, categories, defaultCity, listing }: ListingEditorProps) {
  const t = getDictionary();
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const uploadedPaths = useRef(new Map<string, string>());
  const [listingId, setListingId] = useState<string | null>(listing?.id ?? null);
  const [images, setImages] = useState<EditorImage[]>(
    listing?.images.map((image) => ({
      key: image.id,
      kind: "existing" as const,
      id: image.id,
      url: image.url,
    })) ?? [],
  );
  const [processing, setProcessing] = useState(0);
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<ListingField | "images", string>>>(
    {},
  );
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const isPublished = listing !== undefined && listing.status !== "draft";

  async function addFiles(files: File[]) {
    setFieldErrors((errors) => ({ ...errors, images: undefined }));
    setProcessing((count) => count + files.length);
    for (const file of files) {
      try {
        if (!file.type.startsWith("image/") || file.size > MAX_INPUT_BYTES) {
          throw new ImageProcessingError("Image non prise en charge ou trop volumineuse.");
        }
        const blob = await resizeImage(file, {
          maxSize: listingLimits.imageMaxDimension,
          quality: 0.82,
        });
        const key = crypto.randomUUID();
        setImages((current) =>
          current.length >= listingLimits.maxImages
            ? current
            : [...current, { key, kind: "new", blob, url: URL.createObjectURL(blob) }],
        );
      } catch (error) {
        setFieldErrors((errors) => ({
          ...errors,
          images:
            error instanceof ImageProcessingError
              ? error.message
              : "Une photo n'a pas pu être traitée.",
        }));
      } finally {
        setProcessing((count) => count - 1);
      }
    }
  }

  async function uploadNewImages(id: string): Promise<ListingImageInput[] | null> {
    const supabase = getSupabaseBrowserClient();
    if (!supabase) return null;
    const payload: ListingImageInput[] = [];
    for (const image of images) {
      if (image.kind === "existing") {
        payload.push({ id: image.id });
        continue;
      }
      let path = uploadedPaths.current.get(image.key);
      if (!path) {
        const extension = image.blob.type === "image/webp" ? "webp" : "jpg";
        path = newListingImagePath(userId, id, extension);
        const { error } = await supabase.storage
          .from(LISTING_IMAGE_BUCKET)
          .upload(path, image.blob, { contentType: image.blob.type, upsert: false });
        if (error) return null;
        uploadedPaths.current.set(image.key, path);
      }
      payload.push({ path });
    }
    return payload;
  }

  function submit(intent: "draft" | "publish") {
    const form = formRef.current;
    if (!form) return;
    startTransition(async () => {
      setMessage(null);
      setFieldErrors({});
      if (intent === "publish" && images.length === 0) {
        setFieldErrors({ images: "Ajoutez au moins une photo pour publier." });
        return;
      }

      const formData = new FormData(form);
      formData.set("intent", intent);
      const saved = await saveListingAction(listingId, formData);
      if (saved.status === "error") {
        setFieldErrors(saved.fieldErrors ?? {});
        setMessage(saved.message ?? (saved.fieldErrors ? "Corrigez les champs indiqués." : null));
        const firstInvalid = form.querySelector<HTMLElement>("[aria-invalid='true']");
        firstInvalid?.focus();
        return;
      }
      setListingId(saved.listingId);

      const payload = await uploadNewImages(saved.listingId);
      if (!payload) {
        setMessage("L'envoi des photos a échoué. Vos informations sont enregistrées : réessayez.");
        return;
      }

      const result = await finalizeListingAction({
        listingId: saved.listingId,
        images: payload,
        publish: intent === "publish",
      });
      if (result.status === "error") {
        setMessage(result.message);
        return;
      }
      router.push(listingHref(saved.listingId));
      router.refresh();
    });
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const submitter = (event.nativeEvent as SubmitEvent).submitter as HTMLButtonElement | null;
    submit(submitter?.value === "draft" ? "draft" : "publish");
  }

  return (
    <form ref={formRef} onSubmit={handleSubmit} className="flex flex-col gap-4 sm:gap-6" noValidate>
      {message ? <Alert variant="danger">{message}</Alert> : null}

      <FormSection>
        <PhotoManager
          images={images}
          processing={processing}
          error={fieldErrors.images}
          onAddFiles={(files) => void addFiles(files)}
          onChange={setImages}
        />
      </FormSection>

      <FormSection title="Description de l'article">
        <Field id="title" label="Titre" error={fieldErrors.title} required>
          {(control) => (
            <Input
              {...control}
              name="title"
              maxLength={listingLimits.titleMax}
              defaultValue={listing?.title}
              placeholder="Ex. : Robe en wax taille M"
              required
            />
          )}
        </Field>

        <Field
          id="description"
          label="Description"
          hint="État, taille, marque, défauts éventuels…"
          error={fieldErrors.description}
          required
        >
          {(control) => (
            <Textarea
              {...control}
              name="description"
              rows={6}
              maxLength={listingLimits.descriptionMax}
              defaultValue={listing?.description}
            />
          )}
        </Field>

        <div className="grid gap-5 sm:grid-cols-2">
          <Field id="category" label="Catégorie" error={fieldErrors.category} required>
            {(control) => (
              <Select {...control} name="category" defaultValue={listing?.categorySlug ?? ""}>
                <option value="">Choisir…</option>
                {categories.map((category) => (
                  <option key={category.slug} value={category.slug}>
                    {category.name}
                  </option>
                ))}
              </Select>
            )}
          </Field>
          <Field id="condition" label="État" error={fieldErrors.condition} required>
            {(control) => (
              <Select {...control} name="condition" defaultValue={listing?.condition ?? ""}>
                <option value="">Choisir…</option>
                {listingConditions.map((condition) => (
                  <option key={condition} value={condition}>
                    {t.listing.conditions[condition]}
                  </option>
                ))}
              </Select>
            )}
          </Field>
        </div>
      </FormSection>

      <FormSection title="Prix et lieu">
        <div className="grid gap-5 sm:grid-cols-2">
          <Field id="price" label="Prix (FCFA)" error={fieldErrors.price} required>
            {(control) => (
              <div className="relative">
                <Input
                  {...control}
                  name="price"
                  inputMode="numeric"
                  autoComplete="off"
                  defaultValue={listing?.price ?? ""}
                  placeholder="Ex. : 15000"
                  className="pr-16"
                />
                <span className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-sm text-muted-foreground">
                  FCFA
                </span>
              </div>
            )}
          </Field>
          <Field id="city" label="Ville" error={fieldErrors.city} required>
            {(control) => (
              <Select {...control} name="city" defaultValue={listing?.city ?? defaultCity ?? ""}>
                <option value="">Choisir…</option>
                {cities.map((city) => (
                  <option key={city.slug} value={city.slug}>
                    {city.name}
                  </option>
                ))}
              </Select>
            )}
          </Field>
        </div>
      </FormSection>

      <div className="flex flex-col-reverse gap-2 pt-1 sm:flex-row sm:justify-end">
        {isPublished ? null : (
          <Button
            type="submit"
            name="intent"
            value="draft"
            variant="outline"
            size="lg"
            disabled={pending}
          >
            Enregistrer le brouillon
          </Button>
        )}
        <Button
          type="submit"
          name="intent"
          value="publish"
          size="lg"
          loading={pending}
          disabled={processing > 0}
        >
          {isPublished ? "Enregistrer les modifications" : "Publier l'annonce"}
        </Button>
      </div>
    </form>
  );
}

function FormSection({ title, children }: { title?: string; children: ReactNode }) {
  const id = useId();
  return (
    <section
      aria-labelledby={title ? id : undefined}
      className="flex flex-col gap-5 rounded-2xl border border-border bg-card p-4 shadow-card sm:p-6"
    >
      {title ? (
        <h2 id={id} className="text-base font-semibold tracking-tight">
          {title}
        </h2>
      ) : null}
      {children}
    </section>
  );
}
