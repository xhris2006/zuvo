"use client";

import { ImageOff } from "lucide-react";
import Image from "next/image";
import { useRef, useState } from "react";
import { cn } from "@/lib/utils";

type GalleryImage = { id: string; url: string | null };

/** Galerie : défilement tactile (scroll-snap) et vignettes cliquables. */
export function ListingGallery({ images, title }: { images: GalleryImage[]; title: string }) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);
  const visible = images.filter((image): image is { id: string; url: string } =>
    Boolean(image.url),
  );

  if (visible.length === 0) {
    return (
      <div className="flex aspect-square flex-col items-center justify-center gap-2 bg-muted text-muted-foreground sm:aspect-[4/3] sm:rounded-2xl">
        <ImageOff className="size-8" aria-hidden="true" />
        <span className="text-sm">Pas de photo</span>
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
          className="flex aspect-square snap-x snap-mandatory [scrollbar-width:none] overflow-x-auto bg-muted sm:aspect-[4/3] sm:rounded-2xl [&::-webkit-scrollbar]:hidden"
          onScroll={(event) => {
            const track = event.currentTarget;
            setActive(Math.round(track.scrollLeft / Math.max(track.clientWidth, 1)));
          }}
          aria-roledescription="carrousel"
          aria-label={`Photos de « ${title} »`}
        >
          {visible.map((image, index) => (
            <div
              key={image.id}
              className="relative size-full shrink-0 snap-center"
              aria-roledescription="diapositive"
              aria-label={`${index + 1} sur ${visible.length}`}
            >
              <Image
                src={image.url}
                alt={`${title} — photo ${index + 1}`}
                fill
                priority={index === 0}
                sizes="(min-width: 1024px) 40rem, 100vw"
                className="object-contain"
              />
            </div>
          ))}
        </div>
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
              aria-label={`Afficher la photo ${index + 1}`}
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
