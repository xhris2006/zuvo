import { NextResponse } from "next/server";
import { getAdminTrends, parseTrendPeriod } from "@/features/admin/management-queries";
import { getCurrentStaffRole } from "@/features/admin/queries";
import { getCityNames } from "@/features/locations/queries";
import { cityNameFrom } from "@/features/locations/names";
import { localizedCategoryName } from "@/features/categories/data";
import { getT } from "@/i18n/server";
import { type CsvCell, toCsv } from "@/lib/csv";

const exportTypes = ["tendances", "villes", "categories"] as const;

/**
 * Export CSV des chiffres du tableau de bord (équipe de modération). Aucune
 * donnée personnelle : uniquement des nombres agrégés. La base revérifie le
 * rôle (admin_get_trends).
 */
export async function GET(request: Request) {
  const t = await getT();
  const texts = t.adminPages.csv;
  if (!(await getCurrentStaffRole())) {
    return new NextResponse(texts.notFound, { status: 404 });
  }
  const url = new URL(request.url);
  const type = exportTypes.find((value) => value === url.searchParams.get("type"));
  if (!type) return new NextResponse(texts.invalidType, { status: 400 });
  const days = parseTrendPeriod(url.searchParams.get("jours") ?? undefined);

  let trends;
  try {
    trends = await getAdminTrends(days);
  } catch {
    return new NextResponse(texts.unavailable, { status: 503 });
  }

  let header: string[];
  let rows: CsvCell[][];
  if (type === "tendances") {
    header = texts.trends;
    rows = trends.days.map((day) => [day.day, day.users, day.listings, day.reports]);
  } else if (type === "villes") {
    const names = await getCityNames();
    header = texts.cities;
    rows = trends.cities.map((city) => [
      cityNameFrom(city.city, names),
      city.city,
      city.active_listings,
      city.users,
    ]);
  } else {
    header = texts.categories;
    rows = trends.categories.map((category) => [
      localizedCategoryName(t.categoryNames, category),
      category.slug,
      category.active_listings,
    ]);
  }

  const date = new Date().toISOString().slice(0, 10);
  const suffix = type === "tendances" ? `-${days}j` : "";
  return new NextResponse(toCsv(header, rows), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="mboadeal-${type}${suffix}-${date}.csv"`,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
