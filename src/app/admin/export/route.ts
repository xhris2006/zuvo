import { NextResponse } from "next/server";
import { getAdminTrends, parseTrendPeriod } from "@/features/admin/management-queries";
import { getCurrentStaffRole } from "@/features/admin/queries";
import { getCityNames } from "@/features/locations/queries";
import { cityNameFrom } from "@/features/locations/names";
import { type CsvCell, toCsv } from "@/lib/csv";

const exportTypes = ["tendances", "villes", "categories"] as const;

/**
 * Export CSV des chiffres du tableau de bord (équipe de modération). Aucune
 * donnée personnelle : uniquement des nombres agrégés. La base revérifie le
 * rôle (admin_get_trends).
 */
export async function GET(request: Request) {
  if (!(await getCurrentStaffRole())) {
    return new NextResponse("Introuvable", { status: 404 });
  }
  const url = new URL(request.url);
  const type = exportTypes.find((value) => value === url.searchParams.get("type"));
  if (!type) return new NextResponse("Type d'export invalide.", { status: 400 });
  const days = parseTrendPeriod(url.searchParams.get("jours") ?? undefined);

  let trends;
  try {
    trends = await getAdminTrends(days);
  } catch {
    return new NextResponse("Export indisponible pour le moment.", { status: 503 });
  }

  let header: string[];
  let rows: CsvCell[][];
  if (type === "tendances") {
    header = ["jour", "inscriptions", "annonces_publiees", "signalements"];
    rows = trends.days.map((day) => [day.day, day.users, day.listings, day.reports]);
  } else if (type === "villes") {
    const names = await getCityNames();
    header = ["ville", "identifiant", "annonces_en_vente", "membres"];
    rows = trends.cities.map((city) => [
      cityNameFrom(city.city, names),
      city.city,
      city.active_listings,
      city.users,
    ]);
  } else {
    header = ["categorie", "identifiant", "annonces_en_vente"];
    rows = trends.categories.map((category) => [
      category.name,
      category.slug,
      category.active_listings,
    ]);
  }

  const date = new Date().toISOString().slice(0, 10);
  const suffix = type === "tendances" ? `-${days}j` : "";
  return new NextResponse(toCsv(header, rows), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="zuvo-${type}${suffix}-${date}.csv"`,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
