"use client";

import { Check, Copy, ExternalLink, MessageCircle, Share2 } from "lucide-react";
import { useState, useSyncExternalStore } from "react";
import { useT } from "@/i18n/client";
import { cn } from "@/lib/utils";
import { Button } from "./button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "./dropdown-menu";

type ShareButtonProps = {
  title: string;
  url: string;
  /** Texte d'accompagnement (ex. titre et prix de l'annonce). */
  text?: string;
  /** Libellé du bouton (par défaut « Partager »). */
  label?: string;
  /** « icon » : pastille ronde sans texte (sur une photo, dans une barre). */
  variant?: "button" | "icon";
  /** Style du bouton texte. */
  tone?: "outline" | "soft";
  className?: string;
};

const noop = () => () => {};
/** Partage natif disponible (téléphones, certains navigateurs de bureau). */
const canShareNatively = () => typeof navigator !== "undefined" && "share" in navigator;

/**
 * Partage natif quand l'appareil le propose ; sinon (ou en cas d'échec), menu
 * de repli : copier le lien, WhatsApp, Facebook.
 */
export function ShareButton({
  title,
  url,
  text,
  label,
  variant = "button",
  tone = "outline",
  className,
}: ShareButtonProps) {
  const t = useT();
  const native = useSyncExternalStore(noop, canShareNatively, () => false);
  const [copied, setCopied] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const message = text ? `${text}\n${url}` : url;

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  async function shareNatively() {
    try {
      await navigator.share({ title, text, url });
    } catch (error) {
      // Partage annulé : rien à faire ; autre échec : menu de repli.
      if (error instanceof DOMException && error.name === "AbortError") return;
      setMenuOpen(true);
    }
  }

  const icon = copied ? <Check aria-hidden="true" /> : <Share2 aria-hidden="true" />;
  const name = copied ? t.common.linkCopied : (label ?? t.common.share);
  const trigger =
    variant === "icon" ? (
      <button
        type="button"
        aria-label={name}
        title={label ?? t.common.share}
        className={cn(
          "inline-flex size-10 items-center justify-center rounded-full bg-card/95 text-foreground shadow-card backdrop-blur transition-transform hover:scale-105 active:scale-95 [&_svg]:size-5",
          className,
        )}
      >
        {icon}
      </button>
    ) : (
      <Button type="button" variant={tone} size="sm" className={className}>
        {icon}
        <span aria-live="polite" className="truncate">
          {name}
        </span>
      </Button>
    );

  return (
    <DropdownMenu open={menuOpen} onOpenChange={setMenuOpen} modal={false}>
      <DropdownMenuTrigger
        asChild
        onClick={(event) => {
          if (!native) return;
          // Partage natif : le menu ne s'ouvre qu'en cas d'échec.
          event.preventDefault();
          void shareNatively();
        }}
        onPointerDown={(event) => {
          if (native) event.preventDefault();
        }}
      >
        {trigger}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-52">
        <DropdownMenuItem
          onSelect={(event) => {
            event.preventDefault();
            void copy();
          }}
        >
          {copied ? <Check aria-hidden="true" /> : <Copy aria-hidden="true" />}
          {copied ? t.common.linkCopied : t.common.copyLink}
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <a
            href={`https://wa.me/?text=${encodeURIComponent(message)}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            <MessageCircle aria-hidden="true" />
            {t.common.shareWhatsApp}
          </a>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <a
            href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            <ExternalLink aria-hidden="true" />
            {t.common.shareFacebook}
          </a>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
