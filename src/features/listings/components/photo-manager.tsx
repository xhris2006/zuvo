"use client";

import { ArrowLeft, ArrowRight, ImagePlus, Loader2, Star, X } from "lucide-react";
import { useId, useRef } from "react";
import { listingLimits } from "@/config/limits";
import { cn } from "@/lib/utils";
import { useT } from "@/i18n/client";

export type EditorImage =
  | { key: string; kind: "existing"; id: string; url: string }
  | { key: string; kind: "new"; blob: Blob; url: string };

type PhotoManagerProps = {
  images: EditorImage[];
  processing: number;
  error?: string;
  onAddFiles: (files: File[]) => void;
  onChange: (images: EditorImage[]) => void;
};

function move<T>(items: T[], from: number, to: number): T[] {
  const next = [...items];
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item!);
  return next;
}

/**
 * Sélection et organisation des photos : la première est la photo principale.
 * Toutes les actions sont accessibles au clavier (boutons explicites).
 */
export function PhotoManager({
  images,
  processing,
  error,
  onAddFiles,
  onChange,
}: PhotoManagerProps) {
  const t = useT();
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const remaining = listingLimits.maxImages - images.length - processing;

  return (
    <fieldset className="flex flex-col gap-3" aria-describedby={`${inputId}-help`}>
      <legend className="text-base font-semibold tracking-tight">
        {t.photoManager.legend}{" "}
        <span className="font-normal text-muted-foreground">
          ({images.length}/{listingLimits.maxImages})
        </span>
      </legend>
      <p id={`${inputId}-help`} className="text-xs text-muted-foreground">
        {t.photoManager.help}
      </p>
      <ul className="grid grid-cols-3 gap-2 sm:grid-cols-4 sm:gap-3">
        {images.map((image, index) => (
          <li
            key={image.key}
            className="group relative aspect-square overflow-hidden rounded-xl border border-border bg-muted"
          >
            {/* eslint-disable-next-line @next/next/no-img-element -- aperçus locaux (blob:) */}
            <img
              src={image.url}
              alt={t.photoManager.photo(index + 1)}
              className="size-full object-cover"
            />
            {index === 0 ? (
              <span className="absolute top-1.5 left-1.5 rounded-full bg-primary px-2 py-0.5 text-[0.6875rem] font-semibold text-primary-foreground">
                {t.photoManager.main}
              </span>
            ) : null}
            <button
              type="button"
              onClick={() => onChange(images.filter((item) => item.key !== image.key))}
              className="absolute top-1.5 right-1.5 inline-flex size-7 items-center justify-center rounded-full bg-foreground/70 text-background hover:bg-foreground"
              aria-label={t.photoManager.remove(index + 1)}
            >
              <X className="size-4" aria-hidden="true" />
            </button>
            <div className="absolute inset-x-1.5 bottom-1.5 flex justify-between gap-1">
              <button
                type="button"
                disabled={index === 0}
                onClick={() => onChange(move(images, index, index - 1))}
                className="inline-flex size-7 items-center justify-center rounded-full bg-card/90 text-foreground shadow-card disabled:opacity-0"
                aria-label={t.photoManager.moveLeft(index + 1)}
              >
                <ArrowLeft className="size-4" aria-hidden="true" />
              </button>
              {index > 0 ? (
                <button
                  type="button"
                  onClick={() => onChange(move(images, index, 0))}
                  className="inline-flex size-7 items-center justify-center rounded-full bg-card/90 text-foreground shadow-card"
                  aria-label={t.photoManager.makeMain(index + 1)}
                >
                  <Star className="size-4" aria-hidden="true" />
                </button>
              ) : null}
              <button
                type="button"
                disabled={index === images.length - 1}
                onClick={() => onChange(move(images, index, index + 1))}
                className="inline-flex size-7 items-center justify-center rounded-full bg-card/90 text-foreground shadow-card disabled:opacity-0"
                aria-label={t.photoManager.moveRight(index + 1)}
              >
                <ArrowRight className="size-4" aria-hidden="true" />
              </button>
            </div>
          </li>
        ))}
        {Array.from({ length: processing }, (_, index) => (
          <li
            key={`processing-${index}`}
            className="flex aspect-square items-center justify-center rounded-xl border border-dashed border-border bg-muted"
          >
            <Loader2
              className="size-5 animate-spin text-muted-foreground"
              aria-label={t.photoManager.processing}
            />
          </li>
        ))}
        {remaining > 0 ? (
          <li>
            <label
              htmlFor={inputId}
              className={cn(
                "flex aspect-square cursor-pointer flex-col items-center justify-center gap-1.5 rounded-xl border border-dashed border-input bg-card text-center text-xs font-medium text-primary transition-colors hover:bg-accent",
                "focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-ring",
              )}
            >
              <ImagePlus className="size-6" aria-hidden="true" />
              {t.photoManager.add}
            </label>
            <input
              ref={inputRef}
              id={inputId}
              type="file"
              multiple
              accept={listingLimits.acceptedImageTypes.join(",")}
              className="sr-only"
              onChange={(event) => {
                const files = Array.from(event.target.files ?? []).slice(0, remaining);
                if (files.length > 0) onAddFiles(files);
                if (inputRef.current) inputRef.current.value = "";
              }}
            />
          </li>
        ) : null}
      </ul>
      {error ? (
        <p className="text-xs font-medium text-danger" role="alert">
          {error}
        </p>
      ) : null}
    </fieldset>
  );
}
