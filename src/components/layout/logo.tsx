import Link from "next/link";
import { routes } from "@/config/routes";
import { siteConfig } from "@/config/site";
import { getT } from "@/i18n/server";
import { cn } from "@/lib/utils";
import { LogoMark } from "./logo-mark";

export { LogoMark };

/** Logo cliquable ; « animated » joue l'apparition du symbole et du nom (page de bienvenue). */
export async function Logo({
  className,
  animated = false,
}: {
  className?: string;
  animated?: boolean;
}) {
  const t = await getT();
  return (
    <Link
      href={routes.home}
      className={cn("inline-flex items-center gap-2 rounded-lg", className)}
      aria-label={t.ui.homeLink(siteConfig.name)}
    >
      <LogoMark className={animated ? "logo-intro" : undefined} />
      <span
        className={cn(
          "text-xl font-bold tracking-tight text-foreground",
          animated && "reveal [--reveal-delay:500ms]",
        )}
      >
        {siteConfig.name}
      </span>
    </Link>
  );
}
