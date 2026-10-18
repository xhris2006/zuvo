/**
 * Génère src/lib/supabase/database.types.ts à partir des migrations.
 *
 * Usage : TEST_DATABASE_URL=postgres://postgres:postgres@127.0.0.1:5432/postgres \
 *           npm run db:types
 *
 * Les migrations sont appliquées sur une base jetable (zuvo_types), puis la CLI
 * Supabase introspecte le schéma public. Avec un projet Supabase lié, on peut
 * aussi utiliser : npx supabase gen types typescript --linked --schema public
 */
import { execFileSync } from "node:child_process";
import { writeFileSync } from "node:fs";
import { createDatabaseFromMigrations } from "../supabase/tests/support/database.ts";

const SUPABASE_CLI = "supabase@2.121.0";
const output = "src/lib/supabase/database.types.ts";

const adminUrl = process.env.TEST_DATABASE_URL;
if (!adminUrl) {
  console.error("TEST_DATABASE_URL manquant (serveur PostgreSQL jetable, rôle superutilisateur).");
  process.exit(1);
}

const databaseUrl = await createDatabaseFromMigrations(adminUrl, "zuvo_types");

const types = execFileSync(
  "npx",
  ["-y", SUPABASE_CLI, "gen", "types", "typescript", "--db-url", databaseUrl, "--schema", "public"],
  { encoding: "utf8", stdio: ["ignore", "pipe", "inherit"] },
);

const header =
  "// Fichier généré par `npm run db:types` à partir de supabase/migrations.\n" +
  "// Ne pas modifier à la main.\n\n";
writeFileSync(output, header + types);
execFileSync("npx", ["prettier", "--write", output], { stdio: "inherit" });
console.log(`Types écrits dans ${output}`);
