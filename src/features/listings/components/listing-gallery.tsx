"use client";

import { ImageOff } from "lucide-react";
import Image from "next/image";
import { type ReactNode, useRef, useState } from "react";
import { useT } from "@/i18n/client";
import { cn } from "@/lib/utils";

type GalleryImage = { id: string; url: string | null };

type ListingGalleryProps = {
  images: GalleryImage[];
  title: string;
  /** Boutons posés en haut de la photo sur mobile (retour, favori, partage). */
  overlay?: ReactNode;
};

/** Boutons superposés à la photo, sur mobile uniquement. */
function GalleryOverlay({ children }: { children: ReactNode }) {
  return (
    <div className="pointer-events-none absolute inset-x-3 top-3 z-10 flex items-start justify-between gap-2 md:hidden [&>*]:pointer-events-auto">
      {children}
    </div>
  );
}

/** Galerie : défilement tactile (scroll-snap) et vignettes cliquables. */
export function ListingGallery({ images, title, overlay }: ListingGalleryProps) {
  const t = useT();
  const trackRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);
  const visible = images.filter((image): image is { id: string; url: string } =>
    Boolean(image.url),
  );

  if (visible.length === 0) {
    return (
      <div className="relative">
        <div className="flex aspect-[4/5] flex-col items-center justify-center gap-2 rounded-3xl bg-muted text-muted-foreground sm:aspect-[4/3] sm:rounded-2xl">
          <ImageOff className="size-8" aria-hidden="true" />
          <span className="text-sm">{t.listing.noPhoto}</span>
        </div>
        {overlay ? <GalleryOverlay>{overlay}</GalleryOverlay> : null}
      </div>
    );
  }

  function goTo(index: number) {
    const track = trackRef.current;
    if (!track) return;
    track.scrollTo({ left: index * track.clientWidth, behavior: "smooth" });
    setActive(index);
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="relative">
        <div
          ref={trackRef}
          // Zone défilante atteignable au clavier (flèches gauche et droite).
          tabIndex={0}
          role="region"
          className="flex aspect-[4/5] snap-x snap-mandatory [scrollbar-width:none] overflow-x-auto rounded-3xl bg-muted outline-offset-2 sm:aspect-[4/3] sm:rounded-2xl [&::-webkit-scrollbar]:hidden"
          onScroll={(event) => {
            const track = event.currentTarget;
            setActive(Math.round(track.scrollLeft / Math.max(track.clientWidth, 1)));
          }}
          aria-roledescription={t.listing.carousel}
          aria-label={t.listing.photosLabel(title)}
        >
          {visible.map((image, index) => (
            <div
              key={image.id}
              className="relative size-full shrink-0 snap-center"
              aria-roledescription={t.listing.slide}
              aria-label={t.listing.slidePosition(index + 1, visible.length)}
            >
              <Image
                src={image.url}
                alt={t.listing.photoNumbered(title, index + 1)}
                fill
                priority={index === 0}
                sizes="(min-width: 1024px) 40rem, 100vw"
                className="object-cover sm:object-contain"
              />
            </div>
          ))}
        </div>
        {overlay ? <GalleryOverlay>{overlay}</GalleryOverlay> : null}
        {visible.length > 1 ? (
          <>
            <span className="absolute right-3 bottom-3 hidden rounded-full bg-foreground/70 px-2.5 py-1 text-xs font-medium text-background sm:block">
              {active + 1} / {visible.length}
            </span>
            <div
              aria-hidden="true"
              className="absolute inset-x-0 bottom-3 flex justify-center gap-1.5 sm:hidden"
            >
              {visible.map((image, index) => (
                <span
                  key={image.id}
                  className={cn(
                    "h-1.5 rounded-full bg-white shadow-[0_0_2px_rgb(0_0_0/0.4)] transition-all",
                    index === active ? "w-4" : "w-1.5 opacity-60",
                  )}
                />
              ))}
            </div>
          </>
        ) : null}
      </div>
      {visible.length > 1 ? (
        <div className="hidden gap-2 overflow-x-auto pb-1 sm:flex">
          {visible.map((image, index) => (
            <button
              key={image.id}
              type="button"
              onClick={() => goTo(index)}
              aria-label={t.listing.showPhoto(index + 1)}
              aria-current={index === active}
              className={cn(
                "relative size-16 shrink-0 overflow-hidden rounded-lg border-2 transition-colors",
                index === active
                  ? "border-primary"
                  : "border-transparent opacity-80 hover:opacity-100",
              )}
            >
              <Image src={image.url} alt="" fill sizes="64px" className="object-cover" />
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
