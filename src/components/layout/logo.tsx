import Link from "next/link";
import { routes } from "@/config/routes";
import { siteConfig } from "@/config/site";
import { getT } from "@/i18n/server";
import { cn } from "@/lib/utils";
import { LogoMark } from "./logo-mark";
import { Wordmark } from "./wordmark";

export { LogoMark, Wordmark };

/** Logo cliquable ; « animated » joue l'apparition du symbole et du nom (page de bienvenue). */
export async function Logo({
  className,
  animated = false,
  compact = false,
}: {
  className?: string;
  animated?: boolean;
  /** Logo un peu plus petit sur téléphone (en-têtes chargés). */
  compact?: boolean;
}) {
  const t = await getT();
  return (
    <Link
      href={routes.home}
      className={cn("inline-flex items-center gap-2 rounded-lg", className)}
      aria-label={t.ui.homeLink(siteConfig.name)}
    >
      <LogoMark className={cn(compact && "max-sm:size-7", animated && "logo-intro")} />
      <Wordmark
        className={cn(compact && "max-sm:h-[0.85rem]", animated && "reveal [--reveal-delay:500ms]")}
      />
    </Link>
  );
}
