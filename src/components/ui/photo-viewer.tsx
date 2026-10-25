"use client";

import { X } from "lucide-react";
import { Dialog as DialogPrimitive } from "radix-ui";
import { useT } from "@/i18n/client";

type PhotoViewerProps = {
  /** Photo affichée ; null ferme la visionneuse. */
  src: string | null;
  alt: string;
  onClose: () => void;
};

/** Photo en plein écran sur fond sombre (fermeture : bouton, Échap ou toucher le fond). */
export function PhotoViewer({ src, alt, onClose }: PhotoViewerProps) {
  const t = useT();
  return (
    <DialogPrimitive.Root open={src !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/90 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:animate-in data-[state=open]:fade-in-0" />
        <DialogPrimitive.Content
          aria-describedby={undefined}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 outline-none data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95"
          onClick={(event) => {
            if (event.target === event.currentTarget) onClose();
          }}
        >
          <DialogPrimitive.Title className="sr-only">{alt}</DialogPrimitive.Title>
          {src ? (
            // eslint-disable-next-line @next/next/no-img-element -- photo privée (lien signé), jamais optimisée ni mise en cache par le serveur
            <img
              src={src}
              alt={alt}
              className="max-h-full max-w-full rounded-lg object-contain shadow-raised"
            />
          ) : null}
          <DialogPrimitive.Close
            className="absolute top-[max(1rem,env(safe-area-inset-top))] right-4 inline-flex size-11 items-center justify-center rounded-full bg-white/15 text-white transition-colors hover:bg-white/25"
            aria-label={t.ui.closePhoto}
          >
            <X className="size-5" aria-hidden="true" />
          </DialogPrimitive.Close>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
