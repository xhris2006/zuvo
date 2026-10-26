import { readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";
import { expect, it } from "vitest";

const SRC = join(process.cwd(), "src");

function sourceFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return sourceFiles(path);
    return /\.(ts|tsx)$/.test(entry.name) && !/\.test\.tsx?$/.test(entry.name) ? [path] : [];
  });
}

/**
 * Côté serveur, une valeur exportée par un module « use client » n'est qu'une
 * référence vers le navigateur : un nom de cookie importé ainsi n'est jamais
 * lu (bug du bouton « masquer » du message global). Ces modules n'exportent
 * donc que des composants, des fonctions et des types.
 */
it("les modules « use client » n'exportent pas de constantes", () => {
  const offenders = sourceFiles(SRC).flatMap((path) => {
    const source = readFileSync(path, "utf8");
    if (!/^\s*["']use client["']/.test(source)) return [];
    return [
      ...source.matchAll(/^export (?:const|let) (\w+)\s*(?::[^=]+)?=\s*(["'`\d[{]|new )/gm),
    ].map((match) => `${relative(SRC, path)} : ${match[1]}`);
  });
  expect(offenders).toEqual([]);
});
