import type { TestProject } from "vitest/node";
import { createDatabaseFromMigrations } from "./database.mts";

/**
 * Prépare une base de test à partir des migrations avant l'exécution des tests.
 * TEST_DATABASE_URL doit pointer vers un serveur PostgreSQL jetable avec un rôle
 * superutilisateur (ex. postgres://postgres:postgres@127.0.0.1:5432/postgres).
 */
export default async function setup(project: TestProject) {
  const adminUrl = process.env.TEST_DATABASE_URL;
  if (!adminUrl) {
    throw new Error(
      "TEST_DATABASE_URL manquant : indiquez un serveur PostgreSQL jetable (voir README, section « Tests de la base »).",
    );
  }
  project.provide("databaseUrl", await createDatabaseFromMigrations(adminUrl, "zuvo_rls_test"));
}

declare module "vitest" {
  export interface ProvidedContext {
    databaseUrl: string;
  }
}
