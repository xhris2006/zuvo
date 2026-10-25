import { ArrowRight, type LucideIcon } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import type { CSSProperties } from "react";
import { Button } from "@/components/ui/button";
import { routes } from "@/config/routes";
import { defaultCategories, getCategoryIcon } from "@/features/categories/data";
import type { ListingCardData } from "@/features/listings/types";
import { getDictionary } from "@/i18n";
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

function categoryName(slug: string) {
  return defaultCategories.find((category) => category.slug === slug)?.name ?? slug;
}

function Tile({
  tile,
  shape,
  eager,
  icon: Icon,
}: {
  tile: MosaicTile;
  shape: string;
  eager: boolean;
  /** Icône de la catégorie (vignettes sans photo). */
  icon?: LucideIcon;
}) {
  if (tile.kind === "photo") {
    return (
      <div className={cn("relative overflow-hidden rounded-2xl bg-muted shadow-card", shape)}>
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
        "flex flex-col items-center justify-center gap-2 rounded-2xl bg-brand-100 px-2 text-center text-brand-800 shadow-card",
        shape,
      )}
    >
      {Icon ? <Icon className="size-7" strokeWidth={1.6} /> : null}
      <span className="text-xs leading-tight font-semibold">{categoryName(tile.categorySlug)}</span>
    </div>
  );
}

/**
 * Accueil des visiteurs : mosaïque de photos d'annonces qui défile en continu
 * (colonnes en sens opposés, arrêtée si l'utilisateur réduit les animations),
 * message de bienvenue et accès à la connexion et à l'inscription.
 */
export function GuestWelcome({ listings }: { listings: ListingCardData[] }) {
  const t = getDictionary();
  const columns = buildMosaicColumns(listings, 3, 4);

  return (
    <section
      aria-labelledby="guest-welcome-title"
      className="overflow-hidden border-b border-border bg-gradient-to-b from-brand-50 to-background"
    >
      <div className="container-page grid items-center gap-6 pt-3 pb-8 lg:grid-cols-[1fr_1.05fr] lg:gap-12 lg:py-14">
        <div
          aria-hidden="true"
          className="relative h-[26rem] overflow-hidden [mask-image:linear-gradient(to_bottom,transparent,black_12%,black_88%,transparent)] sm:h-[30rem] lg:order-2 lg:h-[34rem]"
        >
          <div className="grid h-full grid-cols-3 gap-3">
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
                          />
                        ))}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="flex flex-col items-center gap-4 text-center lg:order-1 lg:items-start lg:gap-5 lg:text-left">
          <h1
            id="guest-welcome-title"
            className="max-w-xl text-[1.75rem] leading-tight font-bold tracking-tight text-balance sm:text-4xl lg:text-5xl lg:leading-[1.1]"
          >
            {t.home.heroTitle}
          </h1>
          <p className="max-w-md text-[0.9375rem] text-pretty text-muted-foreground sm:text-lg">
            {t.home.heroSubtitle}
          </p>
          <div className="flex w-full max-w-sm flex-col gap-3 pt-1 lg:max-w-none lg:flex-row">
            <Button asChild size="lg" className="rounded-full lg:min-w-44">
              <Link href={routes.signIn}>{t.common.signIn}</Link>
            </Button>
            <Button
              asChild
              size="lg"
              variant="outline"
              className="rounded-full border-primary text-primary hover:bg-accent lg:min-w-44"
            >
              <Link href={routes.signUp}>{t.common.signUp}</Link>
            </Button>
          </div>
          <Link
            href={routes.explore}
            className="inline-flex items-center gap-1 rounded-md px-1 py-1 text-sm font-semibold text-primary hover:text-primary-hover"
          >
            {t.home.heroSecondary}
            <ArrowRight className="size-4" aria-hidden="true" />
          </Link>
        </div>
      </div>
    </section>
  );
}
