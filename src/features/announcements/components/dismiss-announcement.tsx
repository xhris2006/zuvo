"use client";

import { X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useT } from "@/i18n/client";
import { HIDDEN_ANNOUNCEMENT_COOKIE } from "../constants";

/** Masque l'annonce en cours pour ce navigateur (30 jours). */
export function DismissAnnouncement({ id }: { id: string }) {
  const router = useRouter();
  const t = useT();
  return (
    <button
      type="button"
      onClick={(event) => {
        const secure = window.location.protocol === "https:" ? "; secure" : "";
        document.cookie = `${HIDDEN_ANNOUNCEMENT_COOKIE}=${encodeURIComponent(id)}; path=/; max-age=2592000; samesite=lax${secure}`;
        // Disparition immédiate ; le rendu serveur suivant ne l'affiche plus.
        const banner = event.currentTarget.closest<HTMLElement>("[data-site-banner]");
        if (banner) banner.hidden = true;
        router.refresh();
      }}
      className="-my-1 inline-flex size-7 shrink-0 items-center justify-center rounded-full transition-colors hover:bg-foreground/5"
      aria-label={t.announcement.dismiss}
      title={t.announcement.dismiss}
    >
      <X className="size-4" aria-hidden="true" />
    </button>
  );
}
