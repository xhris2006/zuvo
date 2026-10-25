"use client";

import { Check, Share2 } from "lucide-react";
import { useState } from "react";
import { useT } from "@/i18n/client";
import { cn } from "@/lib/utils";
import { Button } from "./button";

type ShareButtonProps = {
  title: string;
  url: string;
  /** « icon » : pastille ronde sans texte (sur une photo, dans une barre). */
  variant?: "button" | "icon";
  className?: string;
};

/** Partage natif (mobile) ou copie du lien dans le presse-papiers. */
export function ShareButton({ title, url, variant = "button", className }: ShareButtonProps) {
  const t = useT();
  const [copied, setCopied] = useState(false);

  async function share() {
    if (navigator.share) {
      try {
        await navigator.share({ title, url });
        return;
      } catch {
        // Partage annulé : on ne fait rien.
        return;
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  const icon = copied ? <Check aria-hidden="true" /> : <Share2 aria-hidden="true" />;

  if (variant === "icon") {
    return (
      <button
        type="button"
        onClick={() => void share()}
        aria-label={copied ? t.common.linkCopied : t.common.share}
        title={t.common.share}
        className={cn(
          "inline-flex size-10 items-center justify-center rounded-full bg-card/95 text-foreground shadow-card backdrop-blur transition-transform hover:scale-105 active:scale-95 [&_svg]:size-5",
          className,
        )}
      >
        {icon}
      </button>
    );
  }

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      className={className}
      onClick={() => void share()}
    >
      {icon}
      <span aria-live="polite">{copied ? t.common.linkCopied : t.common.share}</span>
    </Button>
  );
}
