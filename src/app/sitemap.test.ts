import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

type Row = Record<string, unknown>;
const tables: Record<string, Row[]> = {};
const filters: Record<string, Array<[string, ...unknown[]]>> = {};

/** Client Supabase minimal : enregistre les filtres et renvoie les lignes prévues. */
vi.mock("@/lib/supabase/public", () => ({
  createSupabasePublicClient: () => ({
    from(table: string) {
      const calls: Array<[string, ...unknown[]]> = [];
      filters[table] = calls;
      const builder = {
        select: () => builder,
        in: (...args: unknown[]) => (calls.push(["in", ...args]), builder),
        is: (...args: unknown[]) => (calls.push(["is", ...args]), builder),
        eq: (...args: unknown[]) => (calls.push(["eq", ...args]), builder),
        order: () => builder,
        limit: () => builder,
        // Table sans données prévues : erreur de la base (panne, délai dépassé).
        then: (
          resolve: (value: { data: Row[] | null; error: { message: string } | null }) => unknown,
        ) =>
          resolve(
            tables[table]
              ? { data: tables[table], error: null }
              : { data: null, error: { message: "unavailable" } },
          ),
      };
      return builder;
    },
  }),
}));

const { default: sitemap } = await import("./sitemap");

const seller = (username: string, updated_at: string) => ({ username, updated_at });

beforeEach(() => {
  tables.listings = [
    {
      id: "11111111-1111-4111-8111-111111111111",
      status: "active",
      updated_at: "2026-11-02T10:00:00+00:00",
      category: { slug: "telephones", is_active: true },
      seller: seller("awa", "2026-10-01T08:00:00+00:00"),
      images: [
        { storage_path: "u/l/b.webp", sort_order: 1 },
        { storage_path: "u/l/a.webp", sort_order: 0 },
      ],
    },
    {
      id: "22222222-2222-4222-8222-222222222222",
      status: "reserved",
      updated_at: "2026-11-03T12:00:00+00:00",
      category: { slug: "telephones", is_active: true },
      seller: seller("awa", "2026-10-01T08:00:00+00:00"),
      images: [],
    },
    {
      // Vendeur suspendu : invisible pour les visiteurs, l'annonce est ignorée.
      id: "33333333-3333-4333-8333-333333333333",
      status: "active",
      updated_at: "2026-11-04T09:00:00+00:00",
      category: { slug: "mode", is_active: true },
      seller: null,
      images: [],
    },
  ];
  tables.services = [
    {
      id: "44444444-4444-4444-8444-444444444444",
      updated_at: "2026-11-01T07:00:00+00:00",
      category: { slug: "batiment-travaux", is_active: true },
      // Même membre vendeur et prestataire : un seul profil dans le plan.
      provider: seller("awa", "2026-11-03T18:00:00+00:00"),
      images: [],
    },
    {
      id: "55555555-5555-4555-8555-555555555555",
      updated_at: "2026-10-20T07:00:00+00:00",
      category: null,
      provider: seller("ben", "2026-10-01T08:00:00+00:00"),
      images: [],
    },
  ];
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("sitemap", () => {
  it("n'utilise que le domaine officiel en production, même avec une ancienne adresse configurée", async () => {
    vi.stubEnv("VERCEL_ENV", "production");
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://zuvo-beta.vercel.app");
    const entries = await sitemap();
    expect(entries.length).toBeGreaterThan(0);
    for (const entry of entries) {
      expect(entry.url.startsWith("https://mboadeals.shop/")).toBe(true);
    }
    expect(JSON.stringify(entries)).not.toContain("vercel.app");
  });

  it("liste les pages publiques attendues, une seule fois chacune", async () => {
    vi.stubEnv("VERCEL_ENV", "production");
    const urls = (await sitemap()).map((entry) => entry.url);
    for (const path of [
      "/",
      "/explorer",
      "/services",
      "/services/recherche",
      "/securite",
      "/aide",
      "/conditions",
      "/confidentialite",
      "/annonces/11111111-1111-4111-8111-111111111111",
      "/annonces/22222222-2222-4222-8222-222222222222",
      "/services/44444444-4444-4444-8444-444444444444",
      "/u/awa",
    ]) {
      expect(urls).toContain(`https://mboadeals.shop${path}`);
    }
    expect(new Set(urls).size).toBe(urls.length);
  });

  it("exclut les contenus non publics et les pages privées", async () => {
    vi.stubEnv("VERCEL_ENV", "production");
    const urls = (await sitemap()).map((entry) => entry.url);
    expect(urls).not.toContain(
      "https://mboadeals.shop/annonces/33333333-3333-4333-8333-333333333333",
    );
    expect(urls).not.toContain(
      "https://mboadeals.shop/services/55555555-5555-4555-8555-555555555555",
    );
    expect(urls).not.toContain("https://mboadeals.shop/u/ben");
    for (const url of urls) {
      const { pathname } = new URL(url);
      expect(pathname).not.toMatch(
        /^\/(admin|messages|profil|parametres|vendre|favoris|notifications|fil|assistance|connexion|inscription|bienvenue|auth|api)(\/|$)/,
      );
      expect(pathname).not.toMatch(/^\/services\/(publier|mes-services)$|\/modifier$/);
    }
    // Les requêtes demandent explicitement des contenus publiés et non retirés.
    expect(filters.listings).toContainEqual(["in", "status", ["active", "reserved"]]);
    expect(filters.listings).toContainEqual(["is", "removed_at", null]);
    expect(filters.services).toContainEqual(["eq", "status", "active"]);
    expect(filters.services).toContainEqual(["is", "removed_at", null]);
  });

  it("n'ajoute que les URL canoniques des catégories, sans autre paramètre", async () => {
    vi.stubEnv("VERCEL_ENV", "production");
    const withQuery = (await sitemap())
      .map((entry) => entry.url)
      .filter((url) => url.includes("?"));
    expect(withQuery.sort()).toEqual([
      "https://mboadeals.shop/explorer?category=telephones",
      "https://mboadeals.shop/services/recherche?categorie=batiment-travaux",
    ]);
  });

  it("date chaque page de sa dernière modification connue", async () => {
    vi.stubEnv("VERCEL_ENV", "production");
    const byUrl = new Map((await sitemap()).map((entry) => [entry.url, entry]));
    const lastmod = (path: string) => byUrl.get(`https://mboadeals.shop${path}`)?.lastModified;
    expect(lastmod("/annonces/11111111-1111-4111-8111-111111111111")).toBe(
      "2026-11-02T10:00:00.000Z",
    );
    // Explorer et ses catégories : annonce en vente la plus récemment modifiée.
    expect(lastmod("/explorer")).toBe("2026-11-02T10:00:00.000Z");
    expect(lastmod("/explorer?category=telephones")).toBe("2026-11-02T10:00:00.000Z");
    expect(lastmod("/services")).toBe("2026-11-01T07:00:00.000Z");
    // Profil : modification la plus récente du profil, de ses annonces ou services.
    expect(lastmod("/u/awa")).toBe("2026-11-03T18:00:00.000Z");
    expect(lastmod("/conditions")).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    // Aucune date inventée pour les pages sans date fiable.
    expect(lastmod("/")).toBeUndefined();
    expect(lastmod("/aide")).toBeUndefined();
  });

  it("garde les pages publiques et les services si les annonces sont indisponibles", async () => {
    delete tables.listings;
    const paths = (await sitemap()).map((entry) => new URL(entry.url).pathname);
    expect(paths).toContain("/explorer");
    expect(paths).toContain("/services/44444444-4444-4444-8444-444444444444");
    expect(paths.some((path) => path.startsWith("/annonces/"))).toBe(false);
  });
});
