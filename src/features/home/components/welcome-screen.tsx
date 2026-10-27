import { ArrowRight, type LucideIcon } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { type CSSProperties, Fragment, type ReactNode } from "react";
import { Logo } from "@/components/layout/logo";
import { Button } from "@/components/ui/button";
import { TiltLayer } from "@/components/ui/tilt-layer";
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

/** Décalage d'une valeur d'entrée (variable CSS --reveal-delay ou --i). */
const delay = (ms: number) => ({ "--reveal-delay": `${ms}ms` }) as CSSProperties;

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

  const words = t.home.heroTitle.split(" ");
  // Le sous-titre et les boutons suivent la fin de la révélation du titre.
  const afterTitle = 350 + words.length * 75;

  return (
    <section
      aria-labelledby="welcome-title"
      className="welcome-backdrop relative flex min-h-dvh flex-col overflow-hidden"
    >
      {/* Lumière : halos bleus qui dérivent et point lumineux près de la mosaïque. */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
        <span className="light-orb -top-40 -right-40 size-[36rem] lg:top-[-6rem] lg:right-[-4rem] lg:size-[46rem]" />
        <span className="light-orb -bottom-48 -left-40 size-[30rem] [--orb-color:var(--orb-color-soft)] [--orb-duration:24s]" />
        <span className="light-spark top-[14%] right-[22%] lg:top-[16%] lg:right-[38%]" />
      </div>
      <LanguageToggle className="absolute top-[max(1.25rem,env(safe-area-inset-top))] right-4 z-10 sm:right-6 lg:right-8" />
      <div className="relative container-page flex flex-1 flex-col gap-5 pt-[max(1.25rem,env(safe-area-inset-top))] pb-[max(1.5rem,env(safe-area-inset-bottom))] lg:grid lg:grid-cols-[1fr_1.05fr] lg:items-center lg:gap-14 lg:py-10">
        <Logo className="self-center lg:hidden" animated />
        <div className="relative lg:order-2">
          <div
            aria-hidden="true"
            className="relative h-[38dvh] min-h-52 reveal-depth overflow-hidden [mask-image:linear-gradient(to_bottom,transparent,black_12%,black_88%,transparent)] [--reveal-delay:120ms] sm:h-[30rem] lg:h-[40rem]"
          >
            <TiltLayer className="light-sweep grid h-full grid-cols-3 gap-3 [--tilt-base-x:6deg] lg:[--tilt-base-x:8deg] lg:[--tilt-base-y:-10deg]">
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
            className="floor-glow -bottom-6 left-[8%] h-14 w-[84%] reveal [--reveal-delay:700ms] lg:-bottom-10 lg:h-20"
          />
        </div>

        <div className="mt-auto flex flex-col items-center gap-4 text-center lg:order-1 lg:mt-0 lg:items-start lg:gap-6 lg:text-left">
          <Logo className="hidden lg:inline-flex" animated />
          {notice}
          <h1
            id="welcome-title"
            className="max-w-xl text-[1.625rem] leading-[1.15] font-bold tracking-tight text-balance sm:text-4xl lg:text-5xl"
          >
            {words.map((word, index) => (
              <Fragment key={index}>
                <span
                  className="reveal-word"
                  style={{ "--i": index, "--reveal-delay": "350ms" } as CSSProperties}
                >
                  {word}
                </span>
                {index < words.length - 1 ? " " : null}
              </Fragment>
            ))}
          </h1>
          <p
            className="max-w-md reveal text-sm text-pretty text-muted-foreground sm:text-base"
            style={delay(afterTitle)}
          >
            {t.home.heroSubtitle}
          </p>
          <div className="flex w-full max-w-sm flex-col gap-3 pt-1 lg:max-w-none lg:flex-row">
            <Button
              asChild
              size="lg"
              className="reveal-up rounded-full shadow-raised lg:min-w-48"
              style={delay(afterTitle + 150)}
            >
              <Link href={routes.signUp}>{t.common.signUp}</Link>
            </Button>
            <Button
              asChild
              size="lg"
              variant="outline"
              className="reveal-up rounded-full border-primary bg-card/60 text-primary backdrop-blur hover:bg-accent lg:min-w-48"
              style={delay(afterTitle + 250)}
            >
              <Link href={routes.signIn}>{t.welcome.signIn}</Link>
            </Button>
          </div>
          <Link
            href={routes.explore}
            className="group inline-flex reveal-up items-center gap-1 rounded-md px-1 py-1 text-sm font-semibold text-muted-foreground hover:text-foreground"
            style={delay(afterTitle + 350)}
          >
            {t.welcome.browse}
            <ArrowRight
              className="size-4 transition-transform duration-300 group-hover:translate-x-1"
              aria-hidden="true"
            />
          </Link>
        </div>
      </div>
    </section>
  );
}
