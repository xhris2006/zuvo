import { ArrowRight, type LucideIcon } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import type { CSSProperties, ReactNode } from "react";
import { Logo } from "@/components/layout/logo";
import { Button } from "@/components/ui/button";
import { routes } from "@/config/routes";
import {
  defaultCategories,
  getCategoryIcon,
  localizedCategoryName,
} from "@/features/categories/data";
import { LanguageToggle } from "@/features/language/components/language-switch";
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
        "flex flex-col items-center justify-center gap-2 rounded-2xl bg-secondary px-2 text-center text-secondary-foreground shadow-card",
        shape,
      )}
    >
      {Icon ? <Icon className="size-7" strokeWidth={1.6} /> : null}
      <span className="text-xs leading-tight font-semibold">{label}</span>
    </div>
  );
}

/**
 * Page de bienvenue des visiteurs, séparée de l'accueil : mosaïque de photos
 * d'annonces qui défile en continu (colonnes en sens opposés, arrêtée si
 * l'utilisateur réduit les animations), message et accès à l'inscription et
 * à la connexion. Les membres connectés arrivent directement sur l'accueil.
 */
export async function WelcomeScreen({
  listings,
  notice,
}: {
  listings: ListingCardData[];
  /** Message affiché au-dessus (ex. compte supprimé). */
  notice?: ReactNode;
}) {
  const t = await getT();
  const columns = buildMosaicColumns(listings, 3, 4);
  const categoryLabel = (slug: string) => {
    const category = defaultCategories.find((item) => item.slug === slug);
    return category ? localizedCategoryName(t.categoryNames, category) : slug;
  };

  return (
    <section
      aria-labelledby="welcome-title"
      className="welcome-backdrop relative flex min-h-dvh flex-col overflow-hidden"
    >
      <LanguageToggle className="absolute top-[max(1.25rem,env(safe-area-inset-top))] right-4 z-10 sm:right-6 lg:right-8" />
      <div className="container-page flex flex-1 flex-col gap-5 pt-[max(1.25rem,env(safe-area-inset-top))] pb-[max(1.5rem,env(safe-area-inset-bottom))] lg:grid lg:grid-cols-[1fr_1.05fr] lg:items-center lg:gap-14 lg:py-10">
        <Logo className="self-center lg:hidden" />
        <div
          aria-hidden="true"
          className="relative h-[38dvh] min-h-52 overflow-hidden [mask-image:linear-gradient(to_bottom,transparent,black_12%,black_88%,transparent)] sm:h-[30rem] lg:order-2 lg:h-[40rem]"
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
          </div>
        </div>

        <div className="mt-auto flex flex-col items-center gap-4 text-center lg:order-1 lg:mt-0 lg:items-start lg:gap-6 lg:text-left">
          <Logo className="hidden lg:inline-flex" />
          {notice}
          <h1
            id="welcome-title"
            className="max-w-xl text-[1.875rem] leading-[1.1] font-extrabold tracking-tight text-balance sm:text-5xl lg:text-6xl"
          >
            {t.home.heroTitle}
          </h1>
          <p className="max-w-md text-[0.9375rem] text-pretty text-muted-foreground sm:text-lg">
            {t.home.heroSubtitle}
          </p>
          <div className="flex w-full max-w-sm flex-col gap-3 pt-1 lg:max-w-none lg:flex-row">
            <Button asChild size="lg" className="rounded-full shadow-raised lg:min-w-48">
              <Link href={routes.signUp}>{t.common.signUp}</Link>
            </Button>
            <Button
              asChild
              size="lg"
              variant="outline"
              className="rounded-full border-primary bg-card/60 text-primary backdrop-blur hover:bg-accent lg:min-w-48"
            >
              <Link href={routes.signIn}>{t.welcome.signIn}</Link>
            </Button>
          </div>
          <Link
            href={routes.explore}
            className="inline-flex items-center gap-1 rounded-md px-1 py-1 text-sm font-semibold text-muted-foreground hover:text-foreground"
          >
            {t.welcome.browse}
            <ArrowRight className="size-4" aria-hidden="true" />
          </Link>
        </div>
      </div>
    </section>
  );
}
