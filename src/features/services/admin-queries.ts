import "server-only";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { ServiceQueryError } from "./queries";

export const adminServiceFilters = ["tous", "en-ligne", "en-pause", "retires", "a-la-une"] as const;
export type AdminServiceFilter = (typeof adminServiceFilters)[number];

export const ADMIN_SERVICES_PAGE_SIZE = 30;

export type AdminServiceRow = {
  id: string;
  title: string;
  status: "active" | "paused";
  featuredAt: string | null;
  removedAt: string | null;
  removedReason: string | null;
  createdAt: string;
  category: string | null;
  provider: { username: string; displayName: string } | null;
};

/** Services pour l'équipe (RLS : l'équipe voit tous les services). */
export async function getAdminServices(
  filter: AdminServiceFilter,
  query: string | undefined,
  page: number,
): Promise<{ items: AdminServiceRow[]; total: number }> {
  const supabase = await createSupabaseServerClient();
  if (!supabase) throw new ServiceQueryError();
  let request = supabase
    .from("services")
    .select(
      `id, title, status, featured_at, removed_at, removed_reason, created_at,
       category:service_categories(name),
       provider:profiles!services_provider_id_fkey(username, display_name)`,
      { count: "exact" },
    )
    .order("created_at", { ascending: false })
    .range((page - 1) * ADMIN_SERVICES_PAGE_SIZE, page * ADMIN_SERVICES_PAGE_SIZE - 1);
  if (filter === "en-ligne") request = request.eq("status", "active").is("removed_at", null);
  if (filter === "en-pause") request = request.eq("status", "paused").is("removed_at", null);
  if (filter === "retires") request = request.not("removed_at", "is", null);
  if (filter === "a-la-une") request = request.not("featured_at", "is", null);
  if (query) request = request.ilike("title", `%${query.replace(/[%_\\]/g, " ")}%`);
  const { data, error, count } = await request;
  if (error) throw new ServiceQueryError();
  return {
    total: count ?? 0,
    items: data.map((row) => ({
      id: row.id,
      title: row.title,
      status: row.status,
      featuredAt: row.featured_at,
      removedAt: row.removed_at,
      removedReason: row.removed_reason,
      createdAt: row.created_at,
      category: row.category?.name ?? null,
      provider: row.provider
        ? { username: row.provider.username, displayName: row.provider.display_name }
        : null,
    })),
  };
}

export type AdminServiceCategory = {
  id: string;
  slug: string;
  name: string;
  isActive: boolean;
  activeServices: number;
};

/** Catégories de services, actives ou non, avec le nombre de services en ligne. */
export async function getAdminServiceCategories(): Promise<AdminServiceCategory[]> {
  const supabase = await createSupabaseServerClient();
  if (!supabase) throw new ServiceQueryError();
  const { data, error } = await supabase
    .from("service_categories")
    .select("id, slug, name, is_active, services(count)")
    .eq("services.status", "active")
    .is("services.removed_at", null)
    .order("sort_order")
    .order("name");
  if (error) throw new ServiceQueryError();
  return data.map((row) => ({
    id: row.id,
    slug: row.slug,
    name: row.name,
    isActive: row.is_active,
    activeServices: row.services[0]?.count ?? 0,
  }));
}
