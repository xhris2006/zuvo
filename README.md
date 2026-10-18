# Zuvo

Marketplace sociale de seconde main pour le Cameroun : les particuliers vendent
gratuitement vêtements, chaussures, accessoires, électronique et autres objets,
et échangent directement avec les acheteurs.

- Publication gratuite, aucune commission, aucun abonnement obligatoire.
- Pas de paiement ni de livraison intégrés dans la première version.
- Prix en FCFA (XAF), interface en français (architecture prête pour l'anglais).

> **Nom provisoire.** Le nom, le pays, la devise et la langue sont centralisés
> dans [`src/config/site.ts`](src/config/site.ts).

## État d'avancement

| Phase | Contenu                                                          | État     |
| ----- | ---------------------------------------------------------------- | -------- |
| 0     | Audit du dépôt et plan                                           | Terminée |
| 1     | Fondations : Next.js, design system, navigation, pages publiques | Terminée |
| 2     | Supabase : schéma SQL, migrations, RLS, Storage                  | Terminée |
| 3     | Authentification, sessions, profils                              | Terminée |
| 4     | Annonces : création, photos, statuts                             | À faire  |
| 5     | Recherche, filtres, favoris, abonnements                         | À faire  |
| 6     | Messagerie temps réel                                            | À faire  |
| 7     | Notifications internes puis Web Push                             | À faire  |
| 8     | Administration, signalements, blocage                            | À faire  |
| 9     | PWA, SEO, accessibilité, performances                            | À faire  |
| 10    | Tests de sécurité, build final, déploiement Vercel               | À faire  |

Tant que Supabase n'est pas configuré, l'application affiche des états vides
explicites (aucune donnée fictive) et les pages de connexion indiquent que
l'authentification n'est pas encore disponible.

**Base de données** : schéma, sécurité (RLS), stockage et procédure de
configuration du projet Supabase sont décrits dans [`docs/supabase.md`](docs/supabase.md).

## Authentification et profils

- Inscription par e-mail et mot de passe (8 caractères minimum, lettres et
  chiffres), vérification obligatoire de l'adresse, connexion, déconnexion,
  mot de passe oublié et changement de mot de passe.
- Connexion Google affichée uniquement si le fournisseur est activé dans Supabase.
- Session rafraîchie par `src/proxy.ts` ; chaque page et chaque action serveur
  revérifient l'utilisateur (`requireUser`), et la base applique ses politiques RLS.
- Aucune information ne révèle si une adresse possède déjà un compte.
- Profil public `/u/<nom>` (photo, bio, ville, date d'inscription, nombre réel
  d'abonnés, d'abonnements et d'annonces, bouton Suivre) ; profil personnel
  `/profil`, modification `/profil/modifier` (photo recadrée et allégée dans le
  navigateur), paramètres `/parametres`. Le téléphone reste privé.

Configuration côté Supabase (modèles d'e-mails, URL de redirection, Google) :
voir [`docs/supabase.md`](docs/supabase.md#14-authentification).

## Stack

- [Next.js 16](https://nextjs.org) (App Router, Turbopack, Server Components par défaut)
- React 19, TypeScript strict
- Tailwind CSS 4, composants maison inspirés de shadcn/ui sur [Radix UI](https://www.radix-ui.com), icônes [Lucide](https://lucide.dev)
- Zod pour la validation (client et serveur)
- Supabase (PostgreSQL, Auth, Storage, Realtime) — à partir de la phase 2
- Vitest (tests unitaires) et Playwright (tests de bout en bout mobile et ordinateur)

## Prérequis

- Node.js 22.12 ou plus récent
- npm 10

## Installation

```bash
npm install
cp .env.example .env.local   # puis compléter les valeurs
npm run dev                  # http://localhost:3000
```

## Variables d'environnement

Voir [`.env.example`](.env.example). Aucune valeur secrète ne doit être commitée.

| Variable                               | Utilisation                                    | Où la définir        |
| -------------------------------------- | ---------------------------------------------- | -------------------- |
| `NEXT_PUBLIC_SITE_URL`                 | URL publique (SEO, sitemap, liens absolus)     | `.env.local`, Vercel |
| `NEXT_PUBLIC_CONTACT_EMAIL`            | Adresse affichée sur la page Aide (facultatif) | `.env.local`, Vercel |
| `NEXT_PUBLIC_SUPABASE_URL`             | URL du projet Supabase                         | `.env.local`, Vercel |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Clé publique Supabase (protégée par RLS)       | `.env.local`, Vercel |

Sur Vercel, si `NEXT_PUBLIC_SITE_URL` est absente, l'URL de production du
projet (`VERCEL_PROJECT_PRODUCTION_URL`) est utilisée.

## Scripts

| Commande            | Rôle                                                                              |
| ------------------- | --------------------------------------------------------------------------------- |
| `npm run dev`       | Serveur de développement                                                          |
| `npm run build`     | Build de production                                                               |
| `npm run start`     | Sert le build de production                                                       |
| `npm run lint`      | ESLint                                                                            |
| `npm run typecheck` | Génère les types de routes Next.js puis lance `tsc`                               |
| `npm test`          | Tests unitaires (Vitest)                                                          |
| `npm run test:e2e`  | Tests Playwright (mobile + ordinateur) sur le build                               |
| `npm run check`     | Lint + typecheck + tests unitaires                                                |
| `npm run format`    | Formatage Prettier                                                                |
| `npm run test:db`   | Tests du schéma, des politiques RLS et du Storage (nécessite `TEST_DATABASE_URL`) |
| `npm run db:types`  | Régénère les types TypeScript de la base (nécessite `TEST_DATABASE_URL`)          |

### Tests de bout en bout

```bash
npx playwright install chromium   # une seule fois
npm run build
npm run test:e2e
```

Pour utiliser un Chromium déjà installé, définissez `PLAYWRIGHT_CHROMIUM_PATH`.

## Structure

```
supabase/
  migrations/          Schéma SQL versionné (tables, RLS, Storage, temps réel)
  tests/               Tests d'accès autorisés et refusés sur PostgreSQL
  config.toml          Configuration Supabase locale
docs/                  Documentation (Supabase)
src/
  app/                 Routes (App Router). (info)/ regroupe les pages d'information
  components/ui/       Design system : Button, Input, Select, Field, Badge, Card,
                       Dialog, Alert, Skeleton, EmptyState, Avatar…
  components/layout/   En-tête, navigation mobile, pied de page, mises en page
  config/              Nom du produit, routes, villes, limites métier
  features/            Code par domaine : listings, categories, search, auth…
  i18n/                Dictionnaires de traduction (fr)
  lib/                 Utilitaires : env, formatage (prix XAF, dates),
                       types générés de la base (lib/supabase)
e2e/                   Tests Playwright
```

## Design system

- Couleurs définies comme tokens CSS dans [`src/app/globals.css`](src/app/globals.css) :
  vert sauge (primaire), blanc cassé (fond), texte foncé, gris chauds, couleurs de statut.
- Contrastes vérifiés au niveau WCAG AA (texte 15:1, texte secondaire 5,5:1,
  texte blanc sur primaire 6:1, bordures de champs 3,4:1).
- Mobile d'abord : navigation basse à 5 entrées (Accueil, Explorer, Vendre,
  Messages, Profil), favoris et notifications dans l'en-tête.
- Les animations sont désactivées si l'utilisateur préfère réduire les mouvements.

## Sécurité (déjà en place)

- Base de données : RLS sur toutes les tables, privilèges colonne par colonne,
  identité imposée côté base, limites anti-spam, Storage cloisonné par
  utilisateur — détails et tests dans [`docs/supabase.md`](docs/supabase.md).
- En-têtes HTTP : `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`,
  `Permissions-Policy`, HSTS, CSP partielle (`frame-ancestors`, `base-uri`, `object-src`).
- Les paramètres d'URL de recherche sont validés côté serveur (Zod) : une valeur
  invalide est ignorée sans faire échouer la page.
- Les variables d'environnement publiques sont validées au démarrage, sans
  jamais afficher leur valeur dans les erreurs.

## Pages juridiques

Les conditions d'utilisation, la politique de confidentialité et la page
« Signalements et blocage » sont des **brouillons** clairement signalés sur le
site. Les passages surlignés « À compléter » doivent être rédigés et l'ensemble
validé par un professionnel du droit avant la mise en production.

## Déploiement

Le déploiement Vercel sera documenté en détail à la phase 10. En résumé :
importer le dépôt GitHub dans Vercel, définir les variables d'environnement
ci-dessus, puis déployer (aucune configuration de build spécifique).
