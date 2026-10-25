# Base de données Supabase

Ce document décrit le schéma de Zuvo, son modèle de sécurité et la procédure
pour configurer un projet Supabase. Toute la structure de la base est définie
par les migrations versionnées de [`supabase/migrations/`](../supabase/migrations) :
le schéma est entièrement reproductible.

## Sommaire

1. [Créer et configurer le projet Supabase](#1-créer-et-configurer-le-projet-supabase)
2. [Schéma](#2-schéma)
3. [Modèle de sécurité](#3-modèle-de-sécurité)
4. [Stockage des fichiers](#4-stockage-des-fichiers)
5. [Tests de la base](#5-tests-de-la-base)
6. [Types TypeScript](#6-types-typescript)
7. [Faire évoluer le schéma](#7-faire-évoluer-le-schéma)

---

## 1. Créer et configurer le projet Supabase

> Les intitulés des menus du tableau de bord Supabase évoluent régulièrement ;
> ceux indiqués ci-dessous peuvent légèrement différer.

### 1.1 Créer le projet

1. Créez un compte sur [supabase.com](https://supabase.com) puis **New project**.
2. Nom : `zuvo` (ou autre). Choisissez un **mot de passe de base de données
   robuste** et conservez-le dans un gestionnaire de mots de passe : il sera
   demandé par la CLI. Ne le communiquez à personne, y compris dans une
   conversation avec un assistant.
3. Région : choisissez la plus proche de vos utilisateurs. Pour le Cameroun,
   une région d'Europe de l'Ouest (Paris par exemple) offre en général la
   meilleure latence parmi les régions proposées.

### 1.2 Appliquer les migrations

**Méthode recommandée : la CLI Supabase** (aucune installation globale requise) :

```bash
npx supabase login                          # ouvre le navigateur pour s'authentifier
npx supabase link --project-ref <ref>       # <ref> : identifiant visible dans l'URL du projet
npx supabase db push                        # applique les migrations non encore appliquées
```

`db push` affiche la liste des migrations à appliquer et demande confirmation.
Il enregistre les migrations appliquées : relancez-le après chaque nouvelle
migration.

**Alternative : l'éditeur SQL** du tableau de bord. Exécutez le contenu de chaque
fichier de `supabase/migrations/` **dans l'ordre des noms de fichiers**. Utilisez
ensuite toujours la même méthode (mélanger les deux empêche la CLI de savoir
quelles migrations sont déjà appliquées).

> Ne jamais exécuter `supabase/tests/support/supabase-shim.sql` sur Supabase :
> ce fichier sert uniquement aux tests sur un PostgreSQL standard.

### 1.3 Vérifier l'installation

Dans l'éditeur SQL :

```sql
-- 15 catégories attendues
select count(*) from public.categories;

-- Aucune ligne attendue : toutes les tables ont RLS activé
select relname from pg_class c join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public' and c.relkind = 'r' and not c.relrowsecurity;

-- 3 buckets attendus : avatars, listing-images, message-attachments
select id, public, file_size_limit from storage.buckets order by id;
```

### 1.4 Authentification

Dans **Authentication** :

- **Sign In / Providers → Email** : activez **Confirm email** (obligatoire en
  production) ; longueur minimale du mot de passe : **8** ; exigences :
  **lettres et chiffres** ; activez **Secure password change**.
- **URL Configuration** :
  - _Site URL_ : l'URL de production (ex. `https://zuvo.vercel.app`) ;
  - _Redirect URLs_ : `http://localhost:3000/**` et l'URL de production suivie
    de `/**` (ajoutez aussi les URL de prévisualisation Vercel si nécessaire).
- **Emails → SMTP Settings** : le service d'envoi intégré de Supabase est
  fortement limité (quelques e-mails par heure) et réservé aux tests.
  Configurez un fournisseur SMTP avant l'ouverture au public, sans quoi les
  e-mails de vérification ne partiront pas.
- **Emails → Templates** : remplacez les modèles **Confirm signup**, **Reset
  password** et **Change email address** par le contenu des fichiers de
  [`supabase/templates/`](../supabase/templates) (objets indiqués dans
  `supabase/config.toml`). Leurs liens ouvrent `/auth/confirm`, qui demande une
  confirmation par bouton : le lien fonctionne même ouvert sur un autre appareil
  et ne peut pas être consommé par un robot qui précharge les liens des e-mails.
  Avec les modèles par défaut de Supabase, la confirmation passe par
  `/auth/callback` et ne fonctionne que dans le navigateur où l'inscription a
  été faite.
- **URL Configuration → Redirect URLs** doit contenir les adresses
  `…/auth/callback` du site (couvertes par `https://votre-domaine/**`).

#### Connexion Google (facultative)

1. [Google Cloud Console](https://console.cloud.google.com/) → **APIs et
   services** → **Écran de consentement OAuth** : type _Externe_, nom de
   l'application, e-mail d'assistance, domaine autorisé (votre domaine).
2. **Identifiants → Créer des identifiants → ID client OAuth** → _Application
   Web_ :
   - _Origines JavaScript autorisées_ : l'URL du site (et `http://localhost:3000`) ;
   - _URI de redirection autorisés_ : `https://<ref>.supabase.co/auth/v1/callback`
     (affiché dans Supabase, fiche du fournisseur Google).
3. Supabase → **Authentication → Sign In / Providers → Google** : activez et
   collez l'ID client et le code secret. Ne collez jamais ce secret dans le code,
   un commit ou une conversation.
4. Le bouton « Continuer avec Google » apparaît automatiquement : l'application
   lit la liste des fournisseurs activés (`/auth/v1/settings`). Tant que Google
   n'est pas activé, aucun bouton n'est affiché en production et une explication
   apparaît en développement.

Le fichier [`supabase/config.toml`](../supabase/config.toml) reprend ces
réglages pour l'environnement local (`supabase start`).

### 1.5 Clés et variables d'environnement

Dans **Project Settings → API Keys** :

| Variable                               | Valeur                                                          |
| -------------------------------------- | --------------------------------------------------------------- |
| `NEXT_PUBLIC_SUPABASE_URL`             | URL du projet (`https://<ref>.supabase.co`)                     |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | clé _publishable_ (`sb_publishable_…`) ou, à défaut, clé _anon_ |

Ces deux valeurs sont publiques par nature : la sécurité repose sur les
politiques RLS. La clé secrète (`sb_secret_…` / `service_role`) n'est utilisée
que côté serveur, dans `SUPABASE_SERVICE_ROLE_KEY` (envoi des notifications
push, suppression de compte) ; ne la placez jamais dans une variable
`NEXT_PUBLIC_*`, dans le code ou dans un commit. Les variables du push sont
décrites dans [`notifications.md`](notifications.md).

Renseignez-les dans `.env.local` (développement) et dans **Vercel → Settings →
Environment Variables** (production et prévisualisation).

### 1.6 Désigner le premier administrateur

Le **premier** administrateur se désigne depuis l'éditeur SQL (aucun compte ne
peut encore le faire depuis l'application) :

```sql
insert into public.user_roles (user_id, role)
select id, 'admin' from auth.users where email = 'adresse@exemple.com';
```

Ensuite, les administrateurs nomment ou retirent les autres membres de l'équipe
depuis **Administration → Équipe** (ou la fiche d'un utilisateur). Cette
attribution passe par la fonction `admin_set_role`, qui vérifie en base que
l'appelant est administrateur, refuse toute modification de son propre rôle
et inscrit chaque changement au journal. La table `user_roles` reste sans
aucun droit d'écriture via l'API : un rôle envoyé par le navigateur n'est
jamais pris en compte.

Deux rôles existent :

| Rôle        | Accès                                                                                                    |
| ----------- | -------------------------------------------------------------------------------------------------------- |
| `admin`     | Tout l'espace `/admin`, dont l'équipe, les catégories, les villes, le message global et la configuration |
| `moderator` | Tableau de bord, signalements, annonces, utilisateurs (sans adresse e-mail) et journal de modération     |

L'espace `/admin` renvoie une page 404 à tout autre utilisateur. Chaque action
passe par une fonction `admin_*` qui vérifie elle-même le rôle en base et
s'inscrit dans `moderation_actions` (journal non modifiable) ; les
modifications des catégories, des villes et du message global sont inscrites
dans `admin_activity` (journal de configuration). Personne ne peut agir sur
son propre compte ni sur un membre de l'équipe. Les messages privés ne sont
jamais lisibles par l'administration, sauf le message précis visé par un
signalement, et chaque consultation est journalisée.

### 1.7 Appliquer une nouvelle migration avec l'éditeur SQL

Exécutez chaque nouveau fichier **dans l'ordre des noms**, un par un. Un
fichier qui ajoute une valeur à un type énuméré (`*_types.sql`, `ALTER TYPE …
ADD VALUE`) doit être exécuté **seul et en premier** : la valeur n'est
utilisable qu'une fois sa transaction terminée. Les autres fichiers sont
encadrés par `begin` / `commit` et peuvent être réexécutés sans effet de bord.
Vérifiez ensuite la version dans **Administration → Configuration**
(`select public.app_schema_version();`).

---

## 2. Schéma

| Table                      | Rôle                                                                 |
| -------------------------- | -------------------------------------------------------------------- |
| `profiles`                 | Profil public (nom d'utilisateur, nom affiché, avatar, bio, ville)   |
| `profile_private`          | Coordonnées privées (téléphone), visibles par leur seul propriétaire |
| `user_roles`               | Rôles (`admin`, `moderator`), attribués par `admin_set_role`         |
| `notification_preferences` | Préférences de notification                                          |
| `categories`               | Catégories (15 catégories initiales, hiérarchie possible)            |
| `listings`                 | Annonces : prix entier en XAF, état, ville, statut                   |
| `listing_images`           | Photos (8 maximum, ordre, photo principale = ordre 0)                |
| `follows`                  | Abonnements entre profils                                            |
| `favorites`                | Favoris (privés)                                                     |
| `blocks`                   | Blocages (privés)                                                    |
| `conversations`            | Une conversation par acheteur et par annonce                         |
| `messages`                 | Messages (texte et pièce jointe facultative)                         |
| `notifications`            | Notifications internes                                               |
| `push_subscriptions`       | Abonnements Web Push par navigateur                                  |
| `reports`                  | Signalements (annonce, utilisateur, message) et leur traitement      |
| `moderation_actions`       | Journal des actions de modération (lecture réservée à l'équipe)      |
| `admin_activity`           | Journal de configuration (catégories, villes, message global)        |
| `cities`                   | Villes proposées (reprend la liste initiale de l'application)        |
| `site_announcements`       | Message global : information ou maintenance, dates facultatives      |
| `banned_words`             | Mots interdits dans les annonces (administrateurs)                   |
| `app_settings`             | Réglages anti-spam (limite de publication des comptes récents)       |

### Écarts justifiés par rapport au cahier des charges

- **`profiles.avatar_path`** au lieu de `avatar_url` : on stocke le chemin dans
  le bucket `avatars` (vérifié par une contrainte) plutôt qu'une URL libre, ce
  qui empêche de référencer des images externes arbitraires.
- **`profile_private`**, **`user_roles`**, **`notification_preferences`** :
  tables ajoutées, car RLS protège des lignes et non des colonnes ; les données
  privées et les rôles doivent donc vivre dans des tables distinctes.
- **`profiles.suspended_at` / `suspended_until`**, **`listings.removed_at` /
  `removed_reason`** : état de modération, modifiable uniquement par l'équipe.
  Une suspension temporaire cesse d'avoir effet à `suspended_until`, sans
  tâche planifiée (`private.is_suspended` et les politiques RLS en tiennent
  compte) ; `admin_lift_expired_suspensions` nettoie ensuite les colonnes et
  l'inscrit au journal.
- **`country_code`** sur profils et annonces : prépare l'ouverture à d'autres pays.
- **`listings.search_vector`** : colonne calculée pour la recherche plein texte
  en français, insensible aux accents (configuration `french_unaccent`).
- **`reports.resolution_note`** : note de traitement de la modération.

### Cycle de vie d'une annonce

Statuts : `draft` (brouillon), `active` (en vente), `reserved` (réservée),
`sold` (vendue), `withdrawn` (retirée par le vendeur).

- Une annonce est toujours créée en brouillon ; un brouillon peut être incomplet.
- La publication exige catégorie, prix, état, ville, description (10 caractères
  minimum) et au moins une photo ; `published_at` est alors renseigné.
- Une fois publiée, l'annonce passe librement entre `active`, `reserved`,
  `sold` et `withdrawn`, mais ne peut plus redevenir brouillon et doit
  conserver au moins une photo. Chaque remise en vente (`active`) vérifie la
  présence d'une photo.
- Une annonce retirée par la modération (`removed_at`) est masquée et ne peut
  être ni remise en ligne ni supprimée par son vendeur.

### Suppression d'un compte

Le profil, les annonces, favoris, abonnements, blocages, notifications et
abonnements push sont supprimés avec le compte. Les **conversations, messages et
signalements sont conservés** (auteur remplacé par `NULL`) pour ne pas priver
l'autre participant de son historique ni la modération de ses éléments.
Les fichiers du Storage (photo de profil, photos d'annonces) sont supprimés par
l'application (`src/features/account`), une clé étrangère ne pouvant pas les
atteindre ; les pièces jointes de messages sont conservées avec les
conversations. La suppression est demandée depuis **Paramètres → Supprimer mon
compte** (saisie du nom d'utilisateur) et utilise, côté serveur uniquement, la
clé `SUPABASE_SERVICE_ROLE_KEY`. Testée dans `supabase/tests/account-deletion.test.ts`.

### Index

Index partiels sur les annonces actives (récentes, par catégorie, par ville,
par prix), index par vendeur, index GIN pour la recherche plein texte, index
sur les abonnements, favoris, messages non lus et notifications non lues.

---

## 3. Modèle de sécurité

- **RLS activé sur toutes les tables**, avec une politique explicite par
  opération. En l'absence de politique, l'accès est refusé.
- **Privilèges colonne par colonne** : les rôles `anon` et `authenticated` ne
  reçoivent que les droits strictement nécessaires (par exemple, un vendeur peut
  modifier le prix ou le statut de son annonce, mais pas `seller_id`,
  `removed_at` ni `published_at`). Le rôle `anon` n'a aucun droit d'écriture.
- **Identité imposée** : `seller_id`, `sender_id`, `follower_id`, `reporter_id`…
  valent `auth.uid()` par défaut et les politiques refusent toute autre valeur ;
  `messages.sender_id` n'est même pas modifiable via l'API.
- **Fonctions internes dans le schéma `private`**, non exposé par l'API. Les
  fonctions `SECURITY DEFINER` fixent `search_path = ''`. La seule fonction
  `SECURITY DEFINER` appelable via l'API est `is_username_available`.
- **Fonctions appelables par l'application** (`get_or_create_conversation`,
  `mark_conversation_read`, `mark_all_notifications_read`,
  `reorder_listing_images`, `sync_listing_images`, `get_my_conversations`,
  `get_unread_messages_count`, `register_push_subscription`, `admin_*`,
  `admin_list_reports`) : elles
  s'exécutent avec les droits de l'appelant, donc sous RLS.
- **Administration** : `admin_remove_listing`, `admin_restore_listing`,
  `admin_set_user_suspension`, `admin_update_report`,
  `admin_get_reported_message`, `admin_get_stats` délèguent à des fonctions
  `private.admin_*` (`SECURITY DEFINER`) qui refusent tout appelant non
  administrateur (`42501`) ; un administrateur ne peut ni se suspendre ni
  suspendre un autre administrateur.
- **Notifications** : créées uniquement par des déclencheurs (voir
  [`notifications.md`](notifications.md)), selon les préférences du
  destinataire et jamais entre utilisateurs bloqués.
- **Anti-spam** (erreur `PT429`, transformée en HTTP 429 par l'API) :

  | Action                  | Limite                      |
  | ----------------------- | --------------------------- |
  | Création d'annonces     | 30 par jour                 |
  | Messages                | 20 par minute, 500 par jour |
  | Nouvelles conversations | 20 par heure                |
  | Abonnements             | 100 par heure               |
  | Signalements            | 20 par jour                 |
  | Favoris                 | 200 par heure               |

- **Blocage** : empêche les nouvelles conversations, les messages et les
  abonnements dans les deux sens, et supprime les abonnements existants.
- **Comptes suspendus** : profil et annonces masqués au public ; création
  d'annonces, messages, abonnements, favoris et modification du profil
  refusés ; aucune notification émise en leur nom.
- **Annonces retirées par la modération** : contenu et photos figés pour le
  vendeur (preuves conservées) jusqu'à une éventuelle restauration.
- **Signalements** : leur auteur voit leur statut, mais pas l'administrateur
  qui les a traités ni la note interne (lus par `admin_list_reports`).
- **Fonctions internes** (`private`) : aucune n'est exécutable par `PUBLIC` ;
  les droits nécessaires sont accordés explicitement (vérifié par les tests).
- **Temps réel** : `messages`, `conversations` et `notifications` sont publiés
  dans `supabase_realtime` ; Supabase Realtime applique les politiques RLS de
  chaque abonné.

### Codes d'erreur métier

| Code / message                                         | Signification                                     |
| ------------------------------------------------------ | ------------------------------------------------- |
| `42501`                                                | Accès refusé (privilège ou politique RLS)         |
| `23505`                                                | Doublon (nom d'utilisateur, favori, signalement…) |
| `23514`                                                | Donnée invalide (contrainte de validation)        |
| `PT429` `rate_limit_exceeded`                          | Limite anti-spam atteinte                         |
| `P0001` `listing_requires_image`                       | Publication sans photo                            |
| `P0001` `listing_cannot_return_to_draft`               | Retour en brouillon interdit                      |
| `P0001` `listing_removed_by_moderation`                | Annonce retirée par la modération                 |
| `P0001` `listing_image_limit_reached`                  | Plus de 8 photos                                  |
| `P0002` `listing_not_found`, `report_target_not_found` | Cible introuvable ou inaccessible                 |

---

## 4. Stockage des fichiers

Les buckets sont créés par la migration `*_storage.sql` :

| Bucket                | Accès  | Taille max | Chemin                             |
| --------------------- | ------ | ---------- | ---------------------------------- |
| `listing-images`      | public | 8 Mo       | `<user_id>/<listing_id>/<fichier>` |
| `avatars`             | public | 2 Mo       | `<user_id>/<fichier>`              |
| `message-attachments` | privé  | 8 Mo       | `<conversation_id>/<fichier>`      |

- Types acceptés (vérifiés par Supabase côté serveur) : JPEG, PNG, WebP.
- Envoi uniquement dans son propre dossier (et pour sa propre annonce) ; aucun
  écrasement possible ; suppression par le propriétaire uniquement.
- Les buckets publics sont servis par CDN : les fichiers ont des noms
  aléatoires et ne sont pas listables par les autres utilisateurs. Une photo
  d'un brouillon reste techniquement accessible à qui connaîtrait son URL exacte.
- Les pièces jointes privées ne sont lisibles que par les participants de la
  conversation (URL signées).

---

## 5. Tests de la base

Les tests de [`supabase/tests/`](../supabase/tests) appliquent toutes les
migrations sur une base vierge, puis vérifient les accès autorisés **et
refusés** pour chaque table et chaque bucket, en se connectant avec les rôles
`anon` et `authenticated` comme le fait l'API Supabase. Ils contrôlent aussi
des garde-fous globaux (RLS partout, aucun droit d'écriture anonyme, fonctions
exposées).

Ils nécessitent un serveur PostgreSQL **jetable** (16 ou plus récent) et un rôle
superutilisateur. Exemple avec Docker :

```bash
docker run --rm -d --name zuvo-pg -p 54329:5432 -e POSTGRES_PASSWORD=postgres postgres:16
TEST_DATABASE_URL=postgres://postgres:postgres@localhost:54329/postgres npm run test:db
```

Les tests créent puis remplacent la base `zuvo_rls_test` sur ce serveur.
Le fichier `supabase/tests/support/supabase-shim.sql` y reproduit le minimum
de l'environnement Supabase (rôles, `auth.uid()`, schémas `auth` et `storage`).

Ces tests tournent aussi dans l'intégration continue GitHub Actions
([`.github/workflows/ci.yml`](../.github/workflows/ci.yml)).

### Tests d'intégration de l'API

`npm run test:api` exécute les **vraies requêtes et actions de
l'application** (annonces, recherche, messagerie, notifications, push,
modération, administration) contre un vrai PostgREST, la couche API de
Supabase, branché sur une base construite à partir des migrations. Ils
détectent ce que les tests SQL ne voient pas : jointures ambiguës
(`PGRST201`), droits par colonne, noms de relations.

```bash
# PostgREST 12.2.3 (version utilisée par Supabase)
curl -fsSL -o /tmp/postgrest.tar.xz \
  https://github.com/PostgREST/postgrest/releases/download/v12.2.3/postgrest-v12.2.3-linux-static-x64.tar.xz
mkdir -p /tmp/postgrest && tar -xJf /tmp/postgrest.tar.xz -C /tmp/postgrest

TEST_DATABASE_URL=postgres://postgres:postgres@127.0.0.1:5432/postgres \
POSTGREST_BIN=/tmp/postgrest/postgrest npm run test:api
```

## 6. Types TypeScript

[`src/lib/supabase/database.types.ts`](../src/lib/supabase/database.types.ts)
est généré à partir des migrations :

```bash
TEST_DATABASE_URL=postgres://postgres:postgres@localhost:54329/postgres npm run db:types
```

Avec un projet lié, `npx supabase gen types typescript --linked --schema public`
produit le même résultat. L'intégration continue vérifie que le fichier est à jour.

## 7. Faire évoluer le schéma

1. Créez une nouvelle migration (ne modifiez jamais une migration déjà appliquée
   en production) : `npx supabase migration new <nom>`.
2. Pour toute nouvelle table : activez RLS, révoquez les privilèges par défaut,
   accordez les privilèges minimaux et écrivez les politiques.
3. Ajoutez les tests d'accès autorisés et refusés, lancez `npm run test:db`.
4. Régénérez les types (`npm run db:types`).
5. Appliquez en production avec `npx supabase db push` ; demandez une revue avant
   toute migration destructive.
