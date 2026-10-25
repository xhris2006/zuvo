"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import type { Route } from "next";
import Image from "next/image";
import Link from "next/link";
import { type ReactNode, useRef, useState } from "react";
import { LinkPending } from "@/components/ui/link-pending";
import { getDictionary } from "@/i18n";
import { cn } from "@/lib/utils";

type FeedCardPhotosProps = {
  urls: string[];
  title: string;
  href: Route;
  sizes: string;
  /** Charger la première photo en priorité (première carte visible). */
  priority?: boolean;
  /** Éléments posés sur la photo (ex. statut de l'annonce). */
  children?: ReactNode;
  className?: string;
};

const arrowClass =
  "absolute top-1/2 z-10 hidden size-8 -translate-y-1/2 items-center justify-center rounded-full bg-card/90 text-foreground shadow-card opacity-0 transition-opacity group-hover/photos:opacity-100 hover:bg-card focus-visible:opacity-100 disabled:invisible md:flex";

/**
 * Photos d'une carte du fil : on passe d'une photo à l'autre en balayant
 * (défilement natif avec points d'arrêt), ou avec les flèches sur ordinateur.
 * Toucher une photo ouvre l'annonce ; le lien accessible reste le titre.
 */
export function FeedCardPhotos({
  urls,
  title,
  href,
  sizes,
  priority = false,
  children,
  className,
}: FeedCardPhotosProps) {
  const t = getDictionary();
  const trackRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);
  const count = urls.length;

  function scrollByPhoto(step: number) {
    const track = trackRef.current;
    if (!track) return;
    track.scrollBy({ left: step * track.clientWidth, behavior: "smooth" });
  }

  return (
    <div
      className={cn("group/photos relative overflow-hidden bg-muted", className)}
      role={count > 1 ? "group" : undefined}
      aria-roledescription={count > 1 ? "carrousel" : undefined}
      aria-label={count > 1 ? t.listing.photosLabel(title) : undefined}
    >
      <div
        ref={trackRef}
        className="flex size-full snap-x snap-mandatory [scrollbar-width:none] overflow-x-auto overscroll-x-contain [&::-webkit-scrollbar]:hidden"
        onScroll={(event) => {
          const track = event.currentTarget;
          setActive(Math.round(track.scrollLeft / Math.max(track.clientWidth, 1)));
        }}
      >
        {urls.map((url, index) => (
          // Doublon visuel du lien du titre : retiré du parcours clavier.
          <Link
            key={url}
            href={href}
            tabIndex={-1}
            aria-hidden="true"
            draggable={false}
            className="relative size-full shrink-0 snap-center snap-always"
          >
            <Image
              src={url}
              alt=""
              fill
              draggable={false}
              loading={priority && index === 0 ? "eager" : "lazy"}
              fetchPriority={priority && index === 0 ? "high" : undefined}
              sizes={sizes}
              className="object-cover transition-transform duration-300 group-hover/photos:scale-[1.02]"
            />
            <LinkPending />
          </Link>
        ))}
      </div>
      {children}
      {count > 1 ? (
        <>
          <span className="pointer-events-none absolute top-2.5 right-2.5 rounded-full bg-foreground/70 px-2 py-0.5 text-xs font-medium text-background tabular-nums">
            <span className="sr-only">{t.listing.photoPosition(active + 1, count)}</span>
            <span aria-hidden="true">
              {active + 1}/{count}
            </span>
          </span>
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-0 bottom-2.5 flex justify-center gap-1"
          >
            {urls.map((url, index) => (
              <span
                key={url}
                className={cn(
                  "h-1.5 rounded-full bg-white shadow-[0_0_2px_rgb(0_0_0/0.45)] transition-all duration-200",
                  index === active ? "w-3.5" : "w-1.5 opacity-60",
                )}
              />
            ))}
          </div>
          <button
            type="button"
            onClick={() => scrollByPhoto(-1)}
            disabled={active === 0}
            aria-label={t.listing.previousPhoto}
            className={cn(arrowClass, "left-2")}
          >
            <ChevronLeft className="size-4" aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={() => scrollByPhoto(1)}
            disabled={active === count - 1}
            aria-label={t.listing.nextPhoto}
            className={cn(arrowClass, "right-2")}
          >
            <ChevronRight className="size-4" aria-hidden="true" />
          </button>
        </>
      ) : null}
    </div>
  );
}
