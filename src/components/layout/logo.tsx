import Link from "next/link";
import { routes } from "@/config/routes";
import { siteConfig } from "@/config/site";
import { cn } from "@/lib/utils";

export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" aria-hidden="true" className={cn("size-8", className)}>
      <rect width="32" height="32" rx="9" className="fill-primary" />
      <path
        d="M10 10.5h12l-12 11h12"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.6"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="text-primary-foreground"
      />
      <circle cx="23.5" cy="8.5" r="2" className="fill-brand-200" />
    </svg>
  );
}

export function Logo({ className }: { className?: string }) {
  return (
    <Link
      href={routes.home}
      className={cn("inline-flex items-center gap-2 rounded-lg", className)}
      aria-label={`${siteConfig.name} — accueil`}
    >
      <LogoMark />
      <span className="text-xl font-bold tracking-tight text-foreground">{siteConfig.name}</span>
    </Link>
  );
}
