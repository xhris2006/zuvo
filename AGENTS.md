<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Zuvo — règles du projet

- Interface en français. Les textes d'interface vont dans `src/i18n/dictionaries/fr.ts`
  (pas de chaînes en dur dans les composants réutilisables).
- Nom du produit, pays, devise : `src/config/site.ts`. Chemins : `src/config/routes.ts`
  (`typedRoutes` est activé, un lien invalide casse le typecheck).
- Server Components par défaut ; `"use client"` uniquement pour l'interactivité.
- Code organisé par domaine dans `src/features/<domaine>` ; composants génériques dans
  `src/components/ui`.
- Valider toutes les entrées côté serveur avec Zod, même si le client valide aussi.
- Ne jamais utiliser `SUPABASE_SERVICE_ROLE_KEY` ni d'autre secret côté client,
  ni les écrire dans un commit ou un log. Toute table exposée au client a RLS activé.
- Aucune donnée fictive présentée comme réelle (annonces, utilisateurs, compteurs).
- Avant de committer : `npm run check` puis `npm run build` ; `npm run test:e2e` pour
  les changements d'interface.
