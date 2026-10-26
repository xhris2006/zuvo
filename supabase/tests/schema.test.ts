import { readdir, readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import { defaultCategories } from "@/features/categories/data";
import { asAnon, asOwner } from "./support/db";

describe("garde-fous globaux du schéma", () => {
  it("active RLS sur toutes les tables du schéma public", async () => {
    const { rows } = await asOwner((sql) =>
      sql<{ relname: string }>(
        `select c.relname from pg_class c
         join pg_namespace n on n.oid = c.relnamespace
         where n.nspname = 'public' and c.relkind = 'r' and not c.relrowsecurity`,
      ),
    );
    expect(rows.map((row) => row.relname)).toEqual([]);
  });

  it("n'accorde aucun droit d'écriture au rôle anonyme", async () => {
    const { rows } = await asOwner((sql) =>
      sql<{ table_name: string; privilege_type: string }>(
        `select table_name, privilege_type from information_schema.role_table_grants
         where grantee = 'anon' and table_schema = 'public'
           and privilege_type in ('INSERT', 'UPDATE', 'DELETE', 'TRUNCATE')
         union
         select table_name, privilege_type from information_schema.role_column_grants
         where grantee = 'anon' and table_schema = 'public'
           and privilege_type in ('INSERT', 'UPDATE')`,
      ),
    );
    expect(rows).toEqual([]);
  });

  it("ne permet aux utilisateurs connectés aucun TRUNCATE ni TRIGGER", async () => {
    const { rows } = await asOwner((sql) =>
      sql(
        `select table_name, privilege_type from information_schema.role_table_grants
         where grantee = 'authenticated' and table_schema = 'public'
           and privilege_type in ('TRUNCATE', 'TRIGGER', 'REFERENCES')`,
      ),
    );
    expect(rows).toEqual([]);
  });

  it("limite les fonctions SECURITY DEFINER exposées par l'API à une liste connue", async () => {
    const { rows } = await asOwner((sql) =>
      sql<{ proname: string }>(
        `select p.proname from pg_proc p
         join pg_namespace n on n.oid = p.pronamespace
         where n.nspname = 'public' and p.prosecdef
         order by p.proname`,
      ),
    );
    expect(rows.map((row) => row.proname)).toEqual(["is_username_available"]);
  });

  it("déclare la version de la dernière migration (diagnostic de l'application)", async () => {
    const migrations = (await readdir(new URL("../migrations/", import.meta.url)))
      .filter((file) => file.endsWith(".sql"))
      .sort();
    const latest = migrations.at(-1)!.split("_")[0];
    const { rows } = await asOwner((sql) =>
      sql<{ version: string }>("select public.app_schema_version() as version"),
    );
    expect(rows[0]!.version).toBe(latest);
    const diagnostics = await readFile(
      new URL("../../src/features/notifications/push/diagnostics.ts", import.meta.url),
      "utf8",
    );
    expect(diagnostics).toContain(`EXPECTED_SCHEMA_VERSION = "${latest}"`);
  });

  it("n'accorde l'exécution d'aucune fonction interne à PUBLIC", async () => {
    const { rows } = await asOwner((sql) =>
      sql<{ proname: string }>(
        `select p.proname from pg_proc p
         join pg_namespace n on n.oid = p.pronamespace
         where n.nspname = 'private'
           and exists (
             select 1 from aclexplode(coalesce(p.proacl, acldefault('f', p.proowner))) a
             where a.grantee = 0 and a.privilege_type = 'EXECUTE'
           )`,
      ),
    );
    expect(rows).toEqual([]);
  });

  it("fixe search_path sur toutes les fonctions SECURITY DEFINER", async () => {
    const { rows } = await asOwner((sql) =>
      sql<{ proname: string }>(
        `select p.proname from pg_proc p
         join pg_namespace n on n.oid = p.pronamespace
         where n.nspname in ('public', 'private') and p.prosecdef
           and not exists (
             select 1 from unnest(coalesce(p.proconfig, '{}')) as cfg where cfg like 'search_path=%'
           )`,
      ),
    );
    expect(rows).toEqual([]);
  });

  it("n'expose pas les fonctions internes au rôle anonyme via RPC", async () => {
    const { rows } = await asOwner((sql) =>
      sql<{ proname: string }>(
        `select p.proname from pg_proc p
         join pg_namespace n on n.oid = p.pronamespace
         where n.nspname = 'public' and has_function_privilege('anon', p.oid, 'execute')
         order by p.proname`,
      ),
    );
    // app_schema_version renvoie une constante (diagnostic de configuration) ;
    // similar_listings ne lit que des annonces publiques (droits de l'appelant).
    expect(rows.map((row) => row.proname)).toEqual([
      "app_schema_version",
      "is_username_available",
      "similar_listings",
    ]);
  });
});

describe("catégories initiales", () => {
  it("correspondent exactement aux catégories affichées par l'application", async () => {
    const { rows } = await asAnon((sql) =>
      sql<{ slug: string; name: string }>(
        "select slug, name from public.categories where parent_id is null order by sort_order",
      ),
    );
    expect(rows).toEqual(defaultCategories.map(({ slug, name }) => ({ slug, name })));
  });

  it("ne peuvent pas être modifiées par un visiteur", async () => {
    await expect(
      asAnon((sql) => sql("update public.categories set name = 'x'")),
    ).rejects.toMatchObject({ code: "42501" });
  });
});

describe("données initiales", () => {
  it("ne contiennent aucun compte ni annonce fictifs", async () => {
    const { rows } = await asOwner((sql) =>
      sql<{ users: string; listings: string }>(
        `select (select count(*) from auth.users where email not like '%@example.test') as users,
                (select count(*) from public.listings l
                   join auth.users u on u.id = l.seller_id
                   where u.email not like '%@example.test') as listings`,
      ),
    );
    expect(rows[0]).toEqual({ users: "0", listings: "0" });
  });
});
