import "server-only";
import { cache } from "react";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type SiteAnnouncement = {
  id: string;
  kind: "info" | "maintenance";
  message: string;
  linkUrl: string | null;
};

/**
 * Message global en cours (RLS : actif et dans sa période). Une maintenance
 * passe avant une simple annonce. Une indisponibilité de la base n'empêche
 * jamais l'affichage du site.
 */
export const getCurrentAnnouncement = cache(async (): Promise<SiteAnnouncement | null> => {
  try {
    const supabase = await createSupabaseServerClient();
    if (!supabase) return null;
    const { data, error } = await supabase
      .from("site_announcements")
      .select("id, kind, message, link_url, created_at")
      .eq("is_active", true)
      .order("created_at", { ascending: false })
      .limit(5);
    if (error || !data || data.length === 0) return null;
    const row = data.find((item) => item.kind === "maintenance") ?? data[0]!;
    return {
      id: row.id,
      kind: row.kind === "maintenance" ? "maintenance" : "info",
      message: row.message,
      linkUrl: row.link_url,
    };
  } catch {
    return null;
  }
});
