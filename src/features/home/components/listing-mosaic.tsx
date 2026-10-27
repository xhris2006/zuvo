import type { LucideIcon } from "lucide-react";
import Image from "next/image";
import type { CSSProperties } from "react";
import { TiltLayer } from "@/components/ui/tilt-layer";
import {
  defaultCategories,
  getCategoryIcon,
  localizedCategoryName,
} from "@/features/categories/data";
import type { ListingCardData } from "@/features/listings/types";
import { getT } from "@/i18n/server";
import { cn } from "@/lib/utils";
import { buildMosaicColumns, type MosaicTile } from "../mosaic";

/** Sens et durée du défilement de chaque colonne (la colonne du milieu descend). */
const columnMotion = [
  { className: "animate-marquee-up", duration: "46s" },
  { className: "animate-marquee-down", duration: "58s" },
  { className: "animate-marquee-up", duration: "52s" },
] as const;

/** Formes variées pour éviter un effet de grille trop régulier. */
const tileShapes = ["aspect-[3/4]", "aspect-[4/5]", "aspect-square"] as const;

function Tile({
  tile,
  shape,
  eager,
  icon: Icon,
  label,
}: {
  tile: MosaicTile;
  shape: string;
  eager: boolean;
  /** Icône et nom de la catégorie (vignettes sans photo). */
  icon?: LucideIcon;
  label?: string;
}) {
  if (tile.kind === "photo") {
    return (
      <div
        className={cn(
          "glass-edge relative overflow-hidden rounded-2xl bg-muted shadow-raised",
          shape,
        )}
      >
        <Image
          src={tile.imageUrl}
          alt=""
          fill
          sizes="(min-width: 1024px) 12rem, 33vw"
          loading={eager ? "eager" : "lazy"}
          className="object-cover"
        />
      </div>
    );
  }
  return (
    <div
      className={cn(
        "glass-edge flex flex-col items-center justify-center gap-2 rounded-2xl bg-secondary px-2 text-center text-secondary-foreground shadow-raised",
        shape,
      )}
    >
      {Icon ? <Icon className="size-7" strokeWidth={1.6} /> : null}
      <span className="text-xs leading-tight font-semibold">{label}</span>
    </div>
  );
}

/**
 * Mosaïque décorative de photos d'annonces qui défile en continu (colonnes en
 * sens opposés, arrêtée si l'utilisateur réduit les animations), inclinée en
 * perspective et éclairée par un reflet. Les vignettes sans photo affichent
 * une catégorie.
 */
export async function ListingMosaic({
  listings,
  className,
}: {
  listings: ListingCardData[];
  className?: string;
}) {
  const t = await getT();
  const columns = buildMosaicColumns(listings, 3, 4);
  const categoryLabel = (slug: string) => {
    const category = defaultCategories.find((item) => item.slug === slug);
    return category ? localizedCategoryName(t.categoryNames, category) : slug;
  };

  return (
    <div className={cn("relative", className)}>
      <div
        aria-hidden="true"
        className="relative h-[40rem] reveal-depth overflow-hidden [mask-image:linear-gradient(to_bottom,transparent,black_12%,black_88%,transparent)] [--reveal-delay:120ms]"
      >
        <TiltLayer className="light-sweep grid h-full grid-cols-3 gap-3 [--tilt-base-x:8deg] [--tilt-base-y:-10deg]">
          {columns.map((tiles, column) => {
            const motion = columnMotion[column % columnMotion.length]!;
            return (
              <div key={column} className="overflow-hidden">
                <div
                  className={cn(
                    "marquee-track flex flex-col will-change-transform",
                    motion.className,
                  )}
                  style={{ "--marquee-duration": motion.duration } as CSSProperties}
                >
                  {/* Deux copies identiques : le défilement de 50 % boucle sans à-coup. */}
                  {[0, 1].map((copy) => (
                    <div key={copy} className="flex flex-col gap-3 pb-3">
                      {tiles.map((tile, index) => (
                        <Tile
                          key={tile.key}
                          tile={tile}
                          shape={tileShapes[(column + index) % tileShapes.length]!}
                          eager={copy === 0 && index < 2}
                          icon={
                            tile.kind === "placeholder"
                              ? getCategoryIcon(tile.categorySlug)
                              : undefined
                          }
                          label={
                            tile.kind === "placeholder"
                              ? categoryLabel(tile.categorySlug)
                              : undefined
                          }
                        />
                      ))}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </TiltLayer>
      </div>
      <span
        aria-hidden="true"
        className="floor-glow -bottom-10 left-[8%] h-20 w-[84%] reveal [--reveal-delay:700ms]"
      />
    </div>
  );
}
