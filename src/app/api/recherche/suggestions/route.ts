import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSearchSuggestions, noSuggestions } from "@/features/search/suggestions";
import { isSupabaseConfigured } from "@/lib/env";

const querySchema = z.string().trim().min(2).max(100);

/**
 * Suggestions de la barre de recherche (?q=…). Réponse propre à la session
 * (cache privé du navigateur uniquement, jamais d'un intermédiaire).
 */
export async function GET(request: NextRequest) {
  const headers = { "Cache-Control": "private, max-age=60" };
  const parsed = querySchema.safeParse(request.nextUrl.searchParams.get("q") ?? "");
  if (!parsed.success || !isSupabaseConfigured()) {
    return NextResponse.json(noSuggestions, { headers });
  }
  return NextResponse.json(await getSearchSuggestions(parsed.data), { headers });
}
