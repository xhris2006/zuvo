# Zuvo

Marketplace sociale de seconde main pour le Cameroun : les particuliers vendent
gratuitement vêtements, chaussures, accessoires, électronique et autres objets,
et échangent directement avec les acheteurs.

- Publication gratuite, aucune commission, aucun abonnement obligatoire.
- Pas de paiement ni de livraison intégrés dans la première version.
- Prix en FCFA (XAF), interface en français ou en anglais (choix dans Paramètres →
  Langue, ou FR / EN sur les pages de bienvenue et de connexion).

> **Nom provisoire.** Le nom, le pays, la devise et la langue sont centralisés
> dans [`src/config/site.ts`](src/config/site.ts).

## État d'avancement

Les dix phases prévues sont terminées dans le code. La mise en production
demande encore des actions du propriétaire du projet (voir
[« Avant l'ouverture au public »](#avant-louverture-au-public)).

| Phase | Contenu                                                          | État     |
| ----- | ---------------------------------------------------------------- | -------- |
| 0     | Audit du dépôt et plan                                           | Terminée |
| 1     | Fondations : Next.js, design system, navigation, pages publiques | Terminée |
| 2     | Supabase : schéma SQL, migrations, RLS, Storage                  | Terminée |
| 3     | Authentification, sessions, profils                              | Terminée |
| 4     | Annonces : création, photos, statuts                             | Terminée |
| 5     | Recherche, filtres, favoris, abonnements                         | Terminée |
| 6     | Messagerie temps réel                                            | Terminée |
| 7     | Notifications internes puis Web Push (push à configurer)         | Terminée |
| 8     | Administration, signalements, blocage                            | Terminée |
| 9     | PWA, SEO, accessibilité, performances                            | Terminée |
| 10    | Tests de sécurité, suppression de compte, documentation          | Terminée |

Tant que Supabase n'est pas configuré, l'application affiche des états vides
explicites (aucune donnée fictive) et les pages de connexion indiquent que
l'authentification n'est pas encore disponible.

## Fonctionnalités

- **Comptes** : inscription par e-mail vérifié, connexion (Google en option),
  mot de passe oublié, profil public `/u/<nom>` avec compteurs réels, photo de
  profil, téléphone privé, paramètres, suppression du compte.
- **Annonces** : création en brouillon, jusqu'à 8 photos réduites dans le
  navigateur et réordonnables, publication, statuts (en vente, réservé, vendu,
  retiré), modification, suppression, annonces similaires, partage.
- **Recherche** : plein texte insensible aux accents, filtres (catégorie,
  ville, état, prix), tri, pagination.
- **Social** : favoris (onglet du profil), abonnements, fil des profils suivis
  avec photos à faire défiler.
- **Navigation** : page de bienvenue pour les visiteurs (`/bienvenue`), accueil
  réservé aux membres connectés, en-tête mobile qui se masque au défilement,
  barre latérale sur ordinateur, mode sombre (Paramètres → Apparence).
- **Langues** : français (par défaut) et anglais sur tout le site, y compris
  l'administration et les pages d'information. Le choix est mémorisé sur
  l'appareil (cookie `zuvo-locale`) et appliqué dès le rendu serveur. Restent
  dans une seule langue : les contenus saisis par les membres et l'équipe
  (annonces, message global, catégories ajoutées), les e-mails de Supabase Auth
  et le texte des notifications push (français, voir
  [`docs/notifications.md`](docs/notifications.md)). Les versions anglaises des
  documents juridiques sont, comme les françaises, des brouillons à faire valider.
- **Messagerie** : une conversation par acheteur et par annonce, temps réel,
  accusés de lecture, compteur de non-lus.
- **Notifications** : nouveaux abonnés, favoris, nouvelles annonces des
  profils suivis, retrait par la modération ; préférences ; Web Push
  (à configurer, voir [`docs/notifications.md`](docs/notifications.md)).
- **Confiance** : signalement d'annonces, d'utilisateurs et de messages,
  blocage, badge « vendeur vérifié » attribué par l'équipe, page Assistance
  (contact et contestation d'un retrait), espace d'administration `/admin`
  (signalements, annonces, suspensions temporaires, équipe et modérateurs,
  catégories et villes, message global, tendances et export CSV, anti-spam,
  assistance, journal).
- **PWA** : installable, page hors connexion, icônes.
- **SEO** : métadonnées, Open Graph, sitemap des annonces, données structurées.

## Documentation

| Document                                         | Contenu                                                    |
| ------------------------------------------------ | ---------------------------------------------------------- |
| [`docs/deployment.md`](docs/deployment.md)       | Mise en ligne sur Vercel, variables, vérifications         |
| [`docs/supabase.md`](docs/supabase.md)           | Projet Supabase, migrations, schéma, RLS, Storage, tests   |
| [`docs/notifications.md`](docs/notifications.md) | Notifications internes et Web Push (configuration, essais) |
| [`docs/security.md`](docs/security.md)           | Modèle de sécurité, secrets, en-têtes, tests               |

## Stack

- [Next.js 16](https://nextjs.org) (App Router, Turbopack, Server Components par défaut)
- React 19, TypeScript strict
- Tailwind CSS 4, composants maison inspirés de shadcn/ui sur [Radix UI](https://www.radix-ui.com), icônes [Lucide](https://lucide.dev)
- Zod pour la validation côté serveur
- Supabase (PostgreSQL, Auth, Storage, Realtime), `@supabase/ssr`
- Web Push (`web-push`, clés VAPID), service worker maison
- Vitest (tests unitaires et tests de la base), Playwright + axe (tests de bout
  en bout mobile et ordinateur, accessibilité)

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
| `SUPABASE_SERVICE_ROLE_KEY`            | **Secrète**, serveur : push, suppression       | Vercel uniquement    |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY`         | Clé publique Web Push                          | `.env.local`, Vercel |
| `VAPID_PRIVATE_KEY`                    | **Secrète**, serveur : envoi Web Push          | Vercel uniquement    |
| `VAPID_SUBJECT`                        | Contact du service push (`mailto:`…)           | Vercel               |

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
| `npm run test:api`  | Requêtes et actions réelles sur PostgREST (`TEST_DATABASE_URL`, `POSTGREST_BIN`)  |
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
docs/                  Documentation (déploiement, Supabase, notifications, sécurité)
public/                Service worker (sw.js) et icônes
src/
  app/                 Routes (App Router). (info)/ regroupe les pages d'information
  components/ui/       Design system : Button, Input, Select, Field, Badge, Card,
                       Dialog, Alert, Skeleton, EmptyState, Avatar…
  components/layout/   En-tête (mobile), barre latérale (ordinateur), navigation
                       mobile, mises en page
  config/              Nom du produit, routes, villes, limites métier
  features/            Code par domaine : auth, profiles, listings, search,
                       favorites, messaging, notifications, moderation,
                       admin, account…
  i18n/                Langues : dictionnaires fr/en partagés (navigateur) et
                       serveur (dictionaries/server), getT() et useT()
  lib/                 Utilitaires : env, CSP, formatage (prix XAF, dates),
                       clients et types générés de la base (lib/supabase)
  proxy.ts             Session, redirections, Content-Security-Policy
e2e/                   Tests Playwright
```

## Design system

- Couleurs définies comme tokens CSS dans [`src/app/globals.css`](src/app/globals.css) :
  bleu (primaire, échelle `brand-50` à `brand-950`), blanc cassé froid (fond), texte
  bleu nuit, gris bleutés, couleurs de statut. Changer la couleur de marque se fait
  uniquement dans ce fichier (et `themeColor` dans `src/config/site.ts`).
- Contrastes vérifiés au niveau WCAG AA (texte 16:1, texte secondaire 5,8:1,
  texte blanc sur primaire 5,6:1, bordures de champs 3,1:1). Le mode sombre
  (`:root[data-theme="dark"]`, variante Tailwind `dark:`) a ses propres jetons,
  vérifiés eux aussi (texte 15:1, texte secondaire 7:1, primaire 6,8:1).
- Mobile d'abord : navigation basse à 5 entrées (Accueil, Explorer, Vendre,
  Messages, Profil), logo centré et notifications dans l'en-tête ; sur
  ordinateur, barre latérale avec les mêmes rubriques.
- Les animations sont désactivées si l'utilisateur préfère réduire les mouvements.

## Sécurité

RLS sur toutes les tables, rôles de l'équipe attribués par une fonction réservée aux administrateurs,
validation serveur de toutes les entrées, CSP stricte à nonce, secrets
uniquement côté serveur, aucune page privée en cache. Détails et tests :
[`docs/security.md`](docs/security.md).

## Pages juridiques

Les conditions d'utilisation, la politique de confidentialité et la page
« Signalements et blocage » sont des **brouillons** clairement signalés sur le
site. Les passages surlignés « À compléter » doivent être rédigés et l'ensemble
validé par un professionnel du droit avant la mise en production.

## Déploiement

Voir [`docs/deployment.md`](docs/deployment.md) : projet Supabase, projet
Vercel, variables d'environnement, domaine et vérifications après mise en
ligne.

## Avant l'ouverture au public

À réaliser par le propriétaire du projet (aucune de ces étapes ne peut être
faite depuis le code) :

1. Créer le projet Supabase, appliquer les migrations, régler
   l'authentification et un **fournisseur SMTP**.
2. Créer le projet Vercel et renseigner les variables d'environnement.
3. Désigner le premier administrateur (SQL) ; les suivants et les modérateurs
   se nomment ensuite depuis Administration → Équipe.
4. Faire relire et compléter les **pages juridiques** (brouillons) par un
   professionnel du droit.
5. Facultatif : connexion Google ; notifications push (clés VAPID et clé
   service_role, à vérifier dans Administration → Configuration,
   **essais sur appareils** — tant qu'ils ne sont pas faits, le push ne doit
   pas être annoncé comme disponible).
6. Dérouler la liste de vérifications de `docs/deployment.md` sur la
   production.
