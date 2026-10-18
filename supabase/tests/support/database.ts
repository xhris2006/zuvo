import { readdir, readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import pg from "pg";

const supabaseDir = fileURLToPath(new URL("../../", import.meta.url));

/**
 * Crée (ou recrée) une base PostgreSQL vierge, y installe l'environnement
 * Supabase simulé puis applique toutes les migrations dans l'ordre.
 * Retourne l'URL de connexion à cette base.
 *
 * `adminUrl` doit désigner un rôle superutilisateur sur un serveur jetable.
 */
export async function createDatabaseFromMigrations(
  adminUrl: string,
  databaseName: string,
): Promise<string> {
  if (!/^[a-z_][a-z0-9_]*$/.test(databaseName)) {
    throw new Error(`Nom de base invalide : ${databaseName}`);
  }

  const admin = new pg.Client({ connectionString: adminUrl });
  await admin.connect();
  try {
    await admin.query(`drop database if exists ${databaseName} with (force)`);
    await admin.query(`create database ${databaseName}`);
  } finally {
    await admin.end();
  }

  const databaseUrl = new URL(adminUrl);
  databaseUrl.pathname = `/${databaseName}`;

  const client = new pg.Client({ connectionString: databaseUrl.toString() });
  await client.connect();
  try {
    // Le shim crée une publication logique : l'avertissement wal_level est sans effet ici.
    client.on("notice", () => {});
    await client.query(await readFile(`${supabaseDir}tests/support/supabase-shim.sql`, "utf8"));
    const migrationsDir = `${supabaseDir}migrations/`;
    const files = (await readdir(migrationsDir)).filter((file) => file.endsWith(".sql")).sort();
    for (const file of files) {
      try {
        await client.query(await readFile(`${migrationsDir}${file}`, "utf8"));
      } catch (error) {
        throw new Error(`Échec de la migration ${file} : ${(error as Error).message}`);
      }
    }
  } finally {
    await client.end();
  }

  return databaseUrl.toString();
}
