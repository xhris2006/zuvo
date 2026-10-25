import { cn } from "@/lib/utils";

/** Symbole du logo (sans texte), utilisable dans les composants client. */
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
