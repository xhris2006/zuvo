import { cn } from "@/lib/utils";

/** Tracés du symbole MboaDeal (public/images/mboadeal-logo.svg) : poignée, sac en M, sourire. */
export const logoPaths = {
  handle: "M82 55C82 24 104 6 134 6S186 24 186 55",
  body: "M38 78C38 61 51 51 67 59L134 96L201 59C217 51 230 61 230 78V206C230 224 216 236 199 236H177V151L151 178C141 188 127 188 117 178L91 151V236H69C52 236 38 224 38 206Z",
  smile: "M101 196C119 215 149 215 167 196",
} as const;

/**
 * Symbole du logo (sans texte), utilisable dans les composants client.
 * « brand » : sac orange (fonds clairs ou sombres) ; « white » : sac blanc
 * pour les fonds orange.
 */
export function LogoMark({
  className,
  tone = "brand",
}: {
  className?: string;
  tone?: "brand" | "white";
}) {
  const color = tone === "white" ? "text-white" : "text-primary";
  return (
    <svg
      viewBox="4 -14 260 260"
      aria-hidden="true"
      className={cn("size-9 shrink-0", color, className)}
    >
      <path
        d={logoPaths.handle}
        pathLength={1}
        className="logo-handle"
        fill="none"
        stroke="currentColor"
        strokeWidth="20"
        strokeLinecap="round"
      />
      <path d={logoPaths.body} className="logo-body" fill="currentColor" />
      <path
        d={logoPaths.smile}
        pathLength={1}
        className="logo-smile"
        fill="none"
        stroke="currentColor"
        strokeWidth="16"
        strokeLinecap="round"
      />
    </svg>
  );
}
