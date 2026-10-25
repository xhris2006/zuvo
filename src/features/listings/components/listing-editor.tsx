"use client";

import { ArrowLeft, ArrowRight, type LucideIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import {
  type FormEvent,
  type ReactNode,
  useEffect,
  useId,
  useRef,
  useState,
  useTransition,
} from "react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { listingLimits } from "@/config/limits";
import { type City, cities as defaultCities } from "@/config/locations";
import { getCategoryIcon } from "@/features/categories/data";
import { getDictionary } from "@/i18n";
import { formatPrice } from "@/lib/format";
import { fieldErrorsFrom } from "@/lib/forms/form-state";
import { ImageProcessingError, resizeImage } from "@/lib/images/resize";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import { finalizeListingAction, saveListingAction } from "../actions";
import { listingConditions, type ListingCondition, type ListingStatus } from "../constants";
import { LISTING_IMAGE_BUCKET, newListingImagePath } from "../image-url";
import { listingHref } from "../links";
import {
  type ListingField,
  type ListingImageInput,
  listingFieldsSchema,
  publicationErrors,
} from "../schemas";
import { type EditorImage, PhotoManager } from "./photo-manager";

const MAX_INPUT_BYTES = 25 * 1024 * 1024;

/** Étapes de la mise en vente, et champs vérifiés avant de passer à la suivante. */
const STEPS = ["photos", "description", "details", "price", "review"] as const;
type StepKey = (typeof STEPS)[number];
type EditorField = ListingField | "images";
const STEP_FIELDS: Record<StepKey, EditorField[]> = {
  photos: ["images"],
  description: ["title", "description"],
  details: ["category", "condition"],
  price: ["price", "city"],
  review: [],
};

function stepOfField(field: EditorField): number {
  return STEPS.findIndex((key) => STEP_FIELDS[key].includes(field));
}

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
  /** Villes proposées (base de données) ; liste initiale par défaut. */
  cities?: readonly City[];
  defaultCity?: string | null;
  listing?: EditableListing;
};

export function ListingEditor({
  userId,
  categories,
  cities = defaultCities,
  defaultCity,
  listing,
}: ListingEditorProps) {
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
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<EditorField, string>>>({});
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const isPublished = listing !== undefined && listing.status !== "draft";

  // Assistant pas à pas : une annonce existante peut être modifiée à n'importe quelle étape.
  const formId = useId();
  const lastStep = STEPS.length - 1;
  const [step, setStep] = useState(0);
  const [maxStep, setMaxStep] = useState(listing ? lastStep : 0);
  const [direction, setDirection] = useState<"forward" | "back">("forward");
  const [summary, setSummary] = useState<Summary | null>(null);
  const headingRefs = useRef<(HTMLHeadingElement | null)[]>([]);
  const stepChanged = useRef(false);

  // Après un changement d'étape : focus sur son titre (lecteurs d'écran) et retour en haut.
  useEffect(() => {
    if (!stepChanged.current) return;
    headingRefs.current[step]?.focus({ preventScroll: true });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [step]);

  /** Valeurs saisies, lues dans le formulaire (y compris les étapes masquées). */
  function readFields() {
    const data = new FormData(formRef.current ?? undefined);
    const text = (name: string) => String(data.get(name) ?? "");
    return listingFieldsSchema.safeParse({
      title: text("title"),
      description: text("description"),
      category: text("category"),
      condition: text("condition"),
      price: text("price"),
      city: text("city"),
    });
  }

  /** Vérifie les champs d'une étape ; affiche leurs erreurs et renvoie false si besoin. */
  function validateStep(index: number): boolean {
    const fields = STEP_FIELDS[STEPS[index]!];
    const parsed = readFields();
    const all: Partial<Record<EditorField, string>> = parsed.success
      ? publicationErrors(parsed.data)
      : fieldErrorsFrom<ListingField>(parsed.error);
    if (images.length === 0) all.images = t.sell.photosRequired;
    const errors = Object.fromEntries(
      fields.flatMap((field) => (all[field] ? [[field, all[field]]] : [])),
    ) as Partial<Record<EditorField, string>>;
    setFieldErrors((previous) => {
      const next = { ...previous };
      for (const field of fields) delete next[field];
      return { ...next, ...errors };
    });
    if (Object.keys(errors).length > 0) {
      requestAnimationFrame(() => {
        formRef.current
          ?.querySelector<HTMLElement>("section:not([hidden]) [aria-invalid='true']")
          ?.focus();
      });
      return false;
    }
    return true;
  }

  function buildSummary(): Summary {
    const data = new FormData(formRef.current ?? undefined);
    const text = (name: string) => String(data.get(name) ?? "").trim();
    const parsed = readFields();
    const condition = text("condition") as ListingCondition;
    return {
      title: text("title"),
      description: text("description"),
      category: categories.find((category) => category.slug === text("category"))?.name ?? null,
      condition: t.listing.conditions[condition] ?? null,
      price: parsed.success && parsed.data.price !== null ? formatPrice(parsed.data.price) : null,
      city: cities.find((city) => city.slug === text("city"))?.name ?? null,
    };
  }

  function showStep(index: number) {
    stepChanged.current = true;
    setDirection(index >= step ? "forward" : "back");
    if (STEPS[index] === "review") setSummary(buildSummary());
    setStep(index);
    setMaxStep((current) => Math.max(current, index));
  }

  function goNext() {
    if (processing > 0 || !validateStep(step)) return;
    setMessage(null);
    showStep(Math.min(step + 1, lastStep));
  }

  function goBack() {
    setMessage(null);
    showStep(Math.max(step - 1, 0));
  }

  function goTo(index: number) {
    if (index === step || index > maxStep) return;
    // On ne saute en avant qu'après avoir validé l'étape en cours.
    if (index > step && !validateStep(step)) return;
    setMessage(null);
    showStep(index);
  }

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
        showStep(0);
        return;
      }

      const formData = new FormData(form);
      formData.set("intent", intent);
      const saved = await saveListingAction(listingId, formData);
      if (saved.status === "error") {
        const errors = saved.fieldErrors ?? {};
        setFieldErrors(errors);
        setMessage(saved.message ?? (saved.fieldErrors ? "Corrigez les champs indiqués." : null));
        const fields = Object.keys(errors) as ListingField[];
        const target = fields.length > 0 ? Math.min(...fields.map(stepOfField)) : -1;
        if (target >= 0 && target !== step) showStep(target);
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
    // Touche Entrée dans un champ : étape suivante plutôt que publication.
    if (!submitter && step < lastStep) {
      goNext();
      return;
    }
    submit(submitter?.value === "draft" ? "draft" : "publish");
  }

  const current = STEPS[step]!;
  const stepTitle = t.sell.steps[current].title;

  return (
    <form
      ref={formRef}
      onSubmit={handleSubmit}
      className="flex flex-col gap-5"
      noValidate
      data-hide-bottom-nav
    >
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between gap-3 text-sm">
          <span className="font-medium text-muted-foreground">
            {t.sell.stepOf(step + 1, STEPS.length)}
          </span>
          {isPublished || step === lastStep ? null : (
            <button
              type="submit"
              value="draft"
              disabled={pending}
              className="rounded-md px-1 py-1 font-semibold text-primary hover:text-primary-hover disabled:opacity-50"
            >
              {t.sell.saveDraft}
            </button>
          )}
        </div>
        <ol className="grid grid-cols-5 gap-1.5" aria-label="Étapes">
          {STEPS.map((key, index) => (
            <li key={key}>
              <button
                type="button"
                onClick={() => goTo(index)}
                disabled={index > maxStep || pending}
                aria-current={index === step ? "step" : undefined}
                aria-label={`${index + 1}. ${t.sell.steps[key].title}`}
                className="group block w-full py-2 disabled:cursor-default"
              >
                <span
                  className={cn(
                    "block h-1.5 rounded-full transition-colors duration-300",
                    index <= step
                      ? "bg-primary"
                      : index <= maxStep
                        ? "bg-secondary-hover"
                        : "bg-muted",
                  )}
                />
              </button>
            </li>
          ))}
        </ol>
      </div>

      {message ? <Alert variant="danger">{message}</Alert> : null}

      {STEPS.map((key, index) => (
        <section
          key={key}
          hidden={index !== step}
          aria-labelledby={`${formId}-${key}`}
          className={cn(
            "flex flex-col gap-5",
            index === step &&
              (direction === "forward"
                ? "animate-in duration-300 fade-in-0 slide-in-from-right-6"
                : "animate-in duration-300 fade-in-0 slide-in-from-left-6"),
          )}
        >
          <div className="flex flex-col gap-1">
            <h2
              id={`${formId}-${key}`}
              ref={(element) => {
                headingRefs.current[index] = element;
              }}
              tabIndex={-1}
              className="text-xl font-bold tracking-tight outline-none sm:text-2xl"
            >
              {t.sell.steps[key].title}
            </h2>
            <p className="text-sm text-muted-foreground">{t.sell.steps[key].hint}</p>
          </div>

          {key === "photos" ? (
            <Card>
              <PhotoManager
                images={images}
                processing={processing}
                error={fieldErrors.images}
                onAddFiles={(files) => void addFiles(files)}
                onChange={setImages}
              />
            </Card>
          ) : null}

          {key === "description" ? (
            <Card>
              <Field id="title" label="Titre" error={fieldErrors.title} required>
                {(control) => (
                  <Input
                    {...control}
                    name="title"
                    maxLength={listingLimits.titleMax}
                    defaultValue={listing?.title}
                    placeholder="Ex. : Robe en wax taille M"
                    autoComplete="off"
                    enterKeyHint="next"
                    required
                  />
                )}
              </Field>
              <Field
                id="description"
                label="Description"
                hint="Taille, marque, couleur, défauts éventuels, raison de la vente…"
                error={fieldErrors.description}
                required
              >
                {(control) => (
                  <Textarea
                    {...control}
                    name="description"
                    rows={7}
                    maxLength={listingLimits.descriptionMax}
                    defaultValue={listing?.description}
                  />
                )}
              </Field>
            </Card>
          ) : null}

          {key === "details" ? (
            <>
              <Card>
                <ChoiceGroup
                  name="category"
                  legend="Catégorie"
                  error={fieldErrors.category}
                  defaultValue={listing?.categorySlug ?? null}
                  columns="grid-cols-2 sm:grid-cols-3"
                  options={categories.map((category) => ({
                    value: category.slug,
                    label: category.name,
                    icon: getCategoryIcon(category.slug),
                  }))}
                />
              </Card>
              <Card>
                <ChoiceGroup
                  name="condition"
                  legend="État"
                  error={fieldErrors.condition}
                  defaultValue={listing?.condition ?? null}
                  columns="grid-cols-1 sm:grid-cols-2"
                  options={listingConditions.map((condition) => ({
                    value: condition,
                    label: t.listing.conditions[condition],
                    hint: t.listing.conditionHints[condition],
                  }))}
                />
              </Card>
            </>
          ) : null}

          {key === "price" ? (
            <Card>
              <Field id="price" label="Prix" error={fieldErrors.price} required>
                {(control) => (
                  <div className="relative">
                    <Input
                      {...control}
                      name="price"
                      inputMode="numeric"
                      autoComplete="off"
                      enterKeyHint="next"
                      defaultValue={listing?.price ?? ""}
                      placeholder="Ex. : 15000"
                      className="h-14 pr-20 text-2xl font-bold"
                    />
                    <span className="pointer-events-none absolute top-1/2 right-4 -translate-y-1/2 text-sm font-semibold text-muted-foreground">
                      FCFA
                    </span>
                  </div>
                )}
              </Field>
              <Field id="city" label="Ville" error={fieldErrors.city} required>
                {(control) => (
                  <Select
                    {...control}
                    name="city"
                    defaultValue={listing?.city ?? defaultCity ?? ""}
                  >
                    <option value="">Choisir…</option>
                    {cities.map((city) => (
                      <option key={city.slug} value={city.slug}>
                        {city.name}
                      </option>
                    ))}
                  </Select>
                )}
              </Field>
            </Card>
          ) : null}

          {key === "review" && summary ? (
            <ReviewCard
              summary={summary}
              photoUrl={images[0]?.url ?? null}
              photoCount={images.length}
              onEdit={(target) => goTo(STEPS.indexOf(target))}
            />
          ) : null}
        </section>
      ))}

      <div className="sticky bottom-0 z-20 -mx-4 mt-1 border-t border-border bg-background/95 px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur supports-[backdrop-filter]:bg-background/85 sm:mx-0 sm:rounded-2xl sm:border sm:px-4 sm:pb-3">
        <div className="flex gap-3">
          {step > 0 ? (
            <Button
              type="button"
              variant="outline"
              size="lg"
              onClick={goBack}
              disabled={pending}
              aria-label={`${t.sell.back} : ${t.sell.steps[STEPS[step - 1]!].title}`}
            >
              <ArrowLeft aria-hidden="true" />
              <span className="hidden sm:inline">{t.sell.back}</span>
            </Button>
          ) : null}
          {/* Clés distinctes : le bouton « Continuer » ne doit jamais devenir le bouton
              d'envoi pendant son propre clic (React réutiliserait le même élément). */}
          {step < lastStep ? (
            <Button
              key="next"
              type="button"
              size="lg"
              className="flex-1"
              onClick={goNext}
              disabled={processing > 0}
            >
              {t.sell.next}
              <ArrowRight aria-hidden="true" />
            </Button>
          ) : (
            <Button
              key="publish"
              type="submit"
              value="publish"
              size="lg"
              className="flex-1"
              loading={pending}
              disabled={processing > 0}
            >
              {isPublished ? t.sell.saveChanges : t.sell.publish}
            </Button>
          )}
        </div>
      </div>
      <p className="sr-only" aria-live="polite">
        {t.sell.stepOf(step + 1, STEPS.length)} : {stepTitle}
      </p>
    </form>
  );
}

function Card({ children }: { children: ReactNode }) {
  return (
    <div className="flex flex-col gap-5 rounded-2xl border border-border bg-card p-4 shadow-card sm:p-6">
      {children}
    </div>
  );
}

type ChoiceOption = { value: string; label: string; hint?: string; icon?: LucideIcon };

/** Choix unique sous forme de cartes (boutons radio natifs, accessibles au clavier). */
function ChoiceGroup({
  name,
  legend,
  options,
  defaultValue,
  error,
  columns,
}: {
  name: string;
  legend: string;
  options: ChoiceOption[];
  defaultValue: string | null;
  error?: string;
  columns: string;
}) {
  const id = useId();
  return (
    <fieldset
      className="flex flex-col gap-3"
      aria-describedby={error ? `${id}-error` : undefined}
      aria-invalid={error ? true : undefined}
      tabIndex={error ? -1 : undefined}
    >
      <legend className="mb-3 text-sm font-medium">
        {legend}
        <span className="ml-0.5 text-danger" aria-hidden="true">
          *
        </span>
      </legend>
      <div className={cn("grid gap-2", columns)}>
        {options.map(({ value, label, hint, icon: Icon }) => (
          <label
            key={value}
            className="flex cursor-pointer items-center gap-3 rounded-xl border border-border bg-card px-3 py-3 text-sm transition-colors select-none hover:border-primary/50 has-checked:border-primary has-checked:bg-accent has-checked:ring-1 has-checked:ring-primary has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-ring"
          >
            <input
              type="radio"
              name={name}
              value={value}
              defaultChecked={defaultValue === value}
              className="sr-only"
            />
            {Icon ? (
              <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-secondary text-secondary-foreground">
                <Icon className="size-[1.125rem]" aria-hidden="true" />
              </span>
            ) : null}
            <span className="flex min-w-0 flex-col">
              <span className="leading-snug font-medium">{label}</span>
              {hint ? <span className="text-xs text-muted-foreground">{hint}</span> : null}
            </span>
          </label>
        ))}
      </div>
      {error ? (
        <p id={`${id}-error`} className="text-xs font-medium text-danger" role="alert">
          {error}
        </p>
      ) : null}
    </fieldset>
  );
}

type Summary = {
  title: string;
  description: string;
  category: string | null;
  condition: string | null;
  price: string | null;
  city: string | null;
};

/** Aperçu de l'annonce avant publication, chaque partie modifiable. */
function ReviewCard({
  summary,
  photoUrl,
  photoCount,
  onEdit,
}: {
  summary: Summary;
  photoUrl: string | null;
  photoCount: number;
  onEdit: (step: StepKey) => void;
}) {
  const t = getDictionary();
  const rows: { label: string; value: string | null; step: StepKey }[] = [
    {
      label: "Photos",
      value: photoCount > 1 ? `${photoCount} photos` : `${photoCount} photo`,
      step: "photos",
    },
    { label: "Prix", value: summary.price, step: "price" },
    { label: "Catégorie", value: summary.category, step: "details" },
    { label: "État", value: summary.condition, step: "details" },
    { label: "Ville", value: summary.city, step: "price" },
  ];
  const editButton = (label: string, step: StepKey) => (
    <button
      type="button"
      onClick={() => onEdit(step)}
      className="shrink-0 rounded-md px-1 py-1 text-sm font-semibold text-primary hover:text-primary-hover"
      aria-label={`${t.sell.edit} : ${label}`}
    >
      {t.sell.edit}
    </button>
  );
  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-card">
      <div className="flex items-center gap-4 p-4">
        <div className="size-20 shrink-0 overflow-hidden rounded-xl bg-muted sm:size-24">
          {photoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element -- aperçu local (blob:) ou photo déjà publiée
            <img src={photoUrl} alt="" className="size-full object-cover" />
          ) : null}
        </div>
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <p className="text-xl font-bold tracking-tight">{summary.price ?? "Prix à définir"}</p>
          <p className="line-clamp-2 font-medium">{summary.title || "Sans titre"}</p>
        </div>
        {editButton("Titre", "description")}
      </div>
      <dl className="divide-y divide-border border-t border-border text-sm">
        {rows.map((row) => (
          <div key={row.label} className="flex items-center gap-3 px-4 py-2.5">
            <dt className="w-20 shrink-0 text-muted-foreground">{row.label}</dt>
            <dd className="min-w-0 flex-1 truncate font-medium">{row.value ?? "—"}</dd>
            {editButton(row.label, row.step)}
          </div>
        ))}
        <div className="flex flex-col gap-1 px-4 py-3">
          <div className="flex items-center gap-3">
            <dt className="flex-1 text-muted-foreground">Description</dt>
            {editButton("Description", "description")}
          </div>
          <dd className="line-clamp-4 whitespace-pre-line text-foreground/90">
            {summary.description || "—"}
          </dd>
        </div>
      </dl>
    </div>
  );
}
