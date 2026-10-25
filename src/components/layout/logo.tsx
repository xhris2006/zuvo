import Link from "next/link";
import { routes } from "@/config/routes";
import { siteConfig } from "@/config/site";
import { getT } from "@/i18n/server";
import { cn } from "@/lib/utils";
import { LogoMark } from "./logo-mark";

export { LogoMark };

export async function Logo({ className }: { className?: string }) {
  const t = await getT();
  return (
    <Link
      href={routes.home}
      className={cn("inline-flex items-center gap-2 rounded-lg", className)}
      aria-label={t.ui.homeLink(siteConfig.name)}
    >
      <LogoMark />
      <span className="text-xl font-bold tracking-tight text-foreground">{siteConfig.name}</span>
    </Link>
  );
}
