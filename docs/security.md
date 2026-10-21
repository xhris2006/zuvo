# Sécurité

Synthèse des protections en place et des règles à respecter. Le détail des
politiques de la base est dans [`supabase.md`](supabase.md#3-modèle-de-sécurité),
celui des notifications push dans [`notifications.md`](notifications.md).

## Principes

- **Défense en profondeur** : le proxy (`src/proxy.ts`) redirige les visiteurs
  non connectés, mais chaque page et chaque action serveur revérifient la
  session (`requireUser`), et la base applique ses politiques RLS. Aucune
  décision d'autorisation ne repose sur le navigateur.
- **Refus par défaut** : RLS activé sur toutes les tables, privilèges accordés
  colonne par colonne ; sans politique explicite, l'accès est refusé.
- **Identité imposée par la base** : auteur d'une annonce, d'un message, d'un
  signalement, etc. valent `auth.uid()` ; les colonnes sensibles
  (`seller_id`, `removed_at`, `published_at`, `suspended_at`, `sender_id`…) ne
  sont pas modifiables via l'API.
- **Validation serveur systématique** (Zod) de toutes les entrées des actions,
  même quand le formulaire valide déjà côté client.

## Rôle administrateur

- Attribué **uniquement en SQL** par le propriétaire du projet (table
  `user_roles`, aucun droit d'écriture via l'API) : voir
  [`supabase.md` §1.6](supabase.md#16-désigner-un-administrateur).
- Les actions de modération passent par les fonctions `admin_*`, qui vérifient
  le rôle **en base** à chaque appel ; l'interface `/admin` renvoie une 404
  aux autres utilisateurs. Un administrateur ne peut ni se suspendre ni
  suspendre un autre administrateur.
- Chaque action est inscrite dans un journal non modifiable
  (`moderation_actions`). Les messages privés ne sont lisibles par
  l'administration que pour le message signalé, et chaque consultation est
  journalisée.

## Secrets

| Secret                                 | Où il vit                     | Utilisé par                                               |
| -------------------------------------- | ----------------------------- | --------------------------------------------------------- |
| Mot de passe de la base Supabase       | gestionnaire de mots de passe | CLI Supabase (migrations)                                 |
| `SUPABASE_SERVICE_ROLE_KEY`            | variables Vercel (serveur)    | `src/lib/supabase/admin.ts` : push, suppression de compte |
| `VAPID_PRIVATE_KEY`                    | variables Vercel (serveur)    | envoi des notifications push                              |
| Secret OAuth Google, identifiants SMTP | tableau de bord Supabase      | Supabase Auth                                             |

- Les secrets sont lus par `src/lib/server-env.ts`, protégé par `server-only`
  (toute importation depuis un composant client fait échouer le build) ; les
  erreurs de configuration n'affichent que le nom des variables.
- Vérification effectuée : un build avec des secrets factices ne laisse aucune
  trace de ces valeurs dans les fichiers envoyés au navigateur
  (`.next/static`).
- `.env*` est ignoré par Git (sauf `.env.example`, qui ne contient aucune
  valeur secrète).
- En cas de fuite : régénérez immédiatement la clé concernée (Supabase →
  API Keys, nouvelle paire VAPID depuis Administration → Configuration), mettez à jour
  Vercel, redéployez.

## En-têtes HTTP

- **Content-Security-Policy** stricte, avec un nonce aléatoire par requête
  (`src/lib/security/csp.ts`) : seuls les scripts émis par Next.js pour la
  réponse s'exécutent (`'strict-dynamic'`), aucune source externe hormis
  Supabase (API, stockage, temps réel), `frame-ancestors 'none'`,
  `object-src 'none'`, `base-uri 'self'`, `form-action` limité au site,
  Supabase et Google. Les styles en ligne restent autorisés (attributs `style`
  de React et Radix), sans permettre d'exécuter du code.
- `Strict-Transport-Security`, `X-Content-Type-Options: nosniff`,
  `X-Frame-Options: DENY`, `Referrer-Policy`, `Permissions-Policy` (caméra,
  micro, géolocalisation, paiement désactivés).
- Pages et réponses authentifiées : `Cache-Control: private, no-store`. Le
  service worker ne met en cache
  que la page « hors connexion », rendue sans cookies.

## Autres protections

- **Redirections** : le paramètre `next` n'accepte que des chemins internes
  (`safeRedirectPath`) ; le service worker n'ouvre que des chemins du site.
- **Injection** : la recherche plein texte construit la requête `tsquery`
  côté serveur à partir de mots nettoyés ; la recherche d'utilisateurs de
  l'administration retire les caractères spéciaux de PostgREST.
- **XSS** : aucun HTML fourni par les utilisateurs n'est interprété ; les
  données structurées JSON-LD échappent `<`.
- **CSRF** : les actions serveur Next.js vérifient l'origine. Les
  notifications push sont envoyées par le serveur juste après l'action, sans
  point d'entrée public.
- **Fichiers** : types (JPEG, PNG, WebP) et tailles imposés par les buckets,
  dossiers cloisonnés par utilisateur, aucun écrasement possible ; pièces
  jointes de messages privées.
- **Anti-spam** : limites en base (annonces, messages, conversations,
  abonnements, signalements) ; limites d'authentification gérées par Supabase.
- **Comptes suspendus et blocages** appliqués par la base (création,
  messages, abonnements, notifications).
- **Suppression de compte** : uniquement pour l'utilisateur de la session,
  après saisie de son nom d'utilisateur ; profil, annonces, photos, favoris,
  abonnements et notifications sont supprimés.

## Revue de sécurité (phase 10)

Une revue indépendante du code et des migrations a relevé cinq points, tous
corrigés (migration `20261018170000_security_hardening.sql` et code) et
couverts par des tests :

| Gravité | Problème                                                                                     | Correction                                                                              |
| ------- | -------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| Moyenne | Redirection ouverte : `/.//site-externe` était normalisé en `//site-externe`                 | rejet des chemins normalisés commençant par `//`                                        |
| Moyenne | Abonnements push vers des adresses arbitraires (requêtes du serveur vers des hôtes internes) | services push connus uniquement (base, validation, envoi) ; insertion directe interdite |
| Faible  | Un compte suspendu pouvait encore ajouter des favoris (notifications à son nom)              | favoris et modification du profil refusés, notifications ignorées, limite horaire       |
| Faible  | L'auteur d'un signalement pouvait lire l'administrateur et la note de traitement             | droits par colonne, lecture admin par `admin_list_reports`                              |
| Faible  | Le vendeur pouvait modifier une annonce retirée et effacer ses photos (preuves)              | contenu et photos figés tant que l'annonce est retirée                                  |

## Tests de sécurité automatisés

- `npm run test:db` : accès autorisés **et refusés** pour chaque table, les
  fonctions d'administration (refus aux non-administrateurs et aux visiteurs),
  le Storage, les déclencheurs de notifications et la suppression de compte.
- `npm test` : actions serveur (session exigée, validation, identifiants
  falsifiés, rôle administrateur), CSP, variables d'environnement.
- `npm run test:api` : les requêtes et actions réelles de l'application
  exécutées contre un vrai PostgREST (version de Supabase) et la base issue
  des migrations : jointures, droits par colonne, RLS, envoi push.
- `npm run test:e2e` : redirections des pages protégées, en-têtes de
  sécurité, nonce différent à chaque requête, absence de violation CSP,
  accessibilité (axe).

## Signaler une vulnérabilité

Écrivez à l'adresse de contact du site en décrivant le problème, sans
l'exploiter au-delà du nécessaire ni accéder aux données d'autres
utilisateurs. (Procédure à compléter par le propriétaire du projet avant
l'ouverture au public.)
