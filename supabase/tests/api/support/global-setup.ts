import { type ChildProcess, spawn } from "node:child_process";
import { existsSync } from "node:fs";
import pg from "pg";
import type { TestProject } from "vitest/node";
import { createDatabaseFromMigrations } from "../../support/database.mts";

/**
 * Tests d'intégration de l'API : les requêtes de l'application sont exécutées
 * contre un vrai PostgREST (même version que Supabase) branché sur une base
 * construite à partir des migrations.
 *
 * Variables : TEST_DATABASE_URL (PostgreSQL jetable, superutilisateur) et
 * POSTGREST_BIN (chemin du binaire PostgREST, voir docs/supabase.md).
 */
const JWT_SECRET = "cle-de-test-postgrest-uniquement-0123456789abcdef";
const PORT = Number(process.env.POSTGREST_PORT ?? 54399);
const AUTHENTICATOR_PASSWORD = "authenticator-test";

let postgrest: ChildProcess | undefined;

async function waitForPostgrest(url: string) {
  const deadline = Date.now() + 20_000;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(`${url}/categories?select=slug&limit=1`);
      if (response.ok) return;
    } catch {
      // PostgREST démarre encore.
    }
    await new Promise((resolve) => setTimeout(resolve, 200));
  }
  throw new Error("PostgREST n'a pas démarré (voir la sortie ci-dessus).");
}

export default async function setup(project: TestProject) {
  const adminUrl = process.env.TEST_DATABASE_URL;
  const binary = process.env.POSTGREST_BIN;
  if (!adminUrl) throw new Error("TEST_DATABASE_URL manquant (PostgreSQL jetable).");
  if (!binary || !existsSync(binary)) {
    throw new Error(
      "POSTGREST_BIN manquant : chemin du binaire PostgREST (voir docs/supabase.md).",
    );
  }

  const databaseUrl = await createDatabaseFromMigrations(adminUrl, "zuvo_api_test");

  // Rôle de connexion de PostgREST, comme sur Supabase.
  const admin = new pg.Client({ connectionString: adminUrl });
  await admin.connect();
  try {
    await admin.query(`
      do $$ begin
        if not exists (select 1 from pg_roles where rolname = 'authenticator') then
          create role authenticator login noinherit password '${AUTHENTICATOR_PASSWORD}';
        else
          alter role authenticator login noinherit password '${AUTHENTICATOR_PASSWORD}';
        end if;
      end $$;
      grant anon, authenticated, service_role to authenticator;
    `);
  } finally {
    await admin.end();
  }

  const dbUri = new URL(databaseUrl);
  dbUri.username = "authenticator";
  dbUri.password = AUTHENTICATOR_PASSWORD;

  postgrest = spawn(binary, [], {
    env: {
      ...process.env,
      PGRST_DB_URI: dbUri.toString(),
      PGRST_DB_SCHEMAS: "public",
      PGRST_DB_ANON_ROLE: "anon",
      PGRST_JWT_SECRET: JWT_SECRET,
      PGRST_SERVER_HOST: "127.0.0.1",
      PGRST_SERVER_PORT: String(PORT),
      PGRST_LOG_LEVEL: "error",
    },
    stdio: ["ignore", "inherit", "inherit"],
  });

  const postgrestUrl = `http://127.0.0.1:${PORT}`;
  await waitForPostgrest(postgrestUrl);

  project.provide("databaseUrl", databaseUrl);
  project.provide("postgrestUrl", postgrestUrl);
  project.provide("jwtSecret", JWT_SECRET);

  return () => {
    postgrest?.kill();
  };
}

declare module "vitest" {
  export interface ProvidedContext {
    databaseUrl: string;
    postgrestUrl: string;
    jwtSecret: string;
  }
}
