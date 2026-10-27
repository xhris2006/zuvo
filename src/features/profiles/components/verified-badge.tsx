import { BadgeCheck } from "lucide-react";
import { getT } from "@/i18n/server";
import { cn } from "@/lib/utils";

type VerifiedBadgeProps = {
  /** « label » : pastille avec texte ; « icon » : icône seule (texte pour les lecteurs d'écran). */
  variant?: "label" | "icon";
  className?: string;
};

/** Badge « vendeur vérifié », attribué manuellement par l'administration. */
export async function VerifiedBadge({ variant = "label", className }: VerifiedBadgeProps) {
  const t = await getT();
  if (variant === "icon") {
    return (
      <span
        className={cn("inline-flex shrink-0 text-primary-ink", className)}
        title={t.profile.verifiedHint}
      >
        <BadgeCheck className="size-4" aria-hidden="true" />
        <span className="sr-only">{t.profile.verified}</span>
      </span>
    );
  }
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center gap-1 rounded-full bg-secondary px-2 py-0.5 text-xs font-semibold text-secondary-foreground",
        className,
      )}
      title={t.profile.verifiedHint}
    >
      <BadgeCheck className="size-3.5" aria-hidden="true" />
      {t.profile.verified}
    </span>
  );
}
