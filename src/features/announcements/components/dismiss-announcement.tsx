"use client";

import { X } from "lucide-react";
import { useRouter } from "next/navigation";
import { getDictionary } from "@/i18n";

export const HIDDEN_ANNOUNCEMENT_COOKIE = "zuvo_hidden_announcement";

/** Masque l'annonce en cours pour ce navigateur (30 jours). */
export function DismissAnnouncement({ id }: { id: string }) {
  const router = useRouter();
  const t = getDictionary();
  return (
    <button
      type="button"
      onClick={() => {
        document.cookie = `${HIDDEN_ANNOUNCEMENT_COOKIE}=${encodeURIComponent(id)}; path=/; max-age=2592000; samesite=lax`;
        router.refresh();
      }}
      className="-my-1 inline-flex size-7 shrink-0 items-center justify-center rounded-full transition-colors hover:bg-black/5"
      aria-label={t.announcement.dismiss}
      title={t.announcement.dismiss}
    >
      <X className="size-4" aria-hidden="true" />
    </button>
  );
}
