# Déploiement (Vercel + Supabase)

Ce guide décrit la mise en ligne de MboaDeal. Toutes les étapes sont à réaliser
par le propriétaire du projet : elles demandent des comptes et des secrets qui
ne doivent jamais être partagés (ni dans le dépôt, ni dans une conversation).

> Les intitulés des menus de Vercel et Supabase évoluent ; ceux cités ici
> peuvent légèrement différer.

## Vue d'ensemble

| Élément                         | Obligatoire pour ouvrir le site | Documentation                                                         |
| ------------------------------- | ------------------------------- | --------------------------------------------------------------------- |
| Projet Supabase + migrations    | oui                             | [`supabase.md`](supabase.md#1-créer-et-configurer-le-projet-supabase) |
| Authentification (e-mail, URLs) | oui                             | [`supabase.md` §1.4](supabase.md#14-authentification)                 |
| SMTP (e-mails de vérification)  | oui                             | [`supabase.md` §1.4](supabase.md#14-authentification)                 |
| Projet Vercel + variables       | oui                             | ce document                                                           |
| Clé `service_role` (serveur)    | pour la suppression de compte   | ce document                                                           |
| Compte administrateur           | pour la modération              | [`supabase.md` §1.6](supabase.md#16-désigner-un-administrateur)       |
| Connexion Google                | non                             | [`supabase.md`](supabase.md#connexion-google-facultative)             |
| Notifications push              | non                             | [`notifications.md`](notifications.md)                                |
| Pages juridiques validées       | oui (avant ouverture au public) | `src/app/(info)/`                                                     |

## 1. Préparer Supabase

1. Créez le projet et appliquez **toutes** les migrations de
   `supabase/migrations/` (`npx supabase db push`), puis lancez les
   vérifications de [`supabase.md` §1.3](supabase.md#13-vérifier-linstallation).
2. Réglez l'authentification (confirmation d'e-mail, mot de passe, URL du site,
   URL de redirection, modèles d'e-mails) et un **fournisseur SMTP**.
3. Notez l'URL du projet, la clé _publishable_ et, si vous activez la
   suppression de compte et le push, la clé secrète (_secret_ / `service_role`).

## 2. Créer le projet Vercel

1. [vercel.com](https://vercel.com) → **Add New… → Project** → importez le dépôt
   GitHub `zuvo`.
2. Framework : **Next.js** (détecté automatiquement). Aucune commande de build
   particulière : `npm run build`. Version de Node.js : **22.x** (Settings →
   General → Node.js Version).
3. Avant le premier déploiement, renseignez les variables ci-dessous
   (**Settings → Environment Variables**), pour _Production_ et, si besoin,
   _Preview_.

### Variables d'environnement

| Variable                               | Portée               | Valeur                                                                    |
| -------------------------------------- | -------------------- | ------------------------------------------------------------------------- |
| `NEXT_PUBLIC_SUPABASE_URL`             | publique             | `https://<ref>.supabase.co`                                               |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | publique             | clé _publishable_ (ou _anon_)                                             |
| `NEXT_PUBLIC_SITE_URL`                 | publique             | domaine final, ex. `https://www.votre-domaine.cm` (facultatif sur Vercel) |
| `NEXT_PUBLIC_CONTACT_EMAIL`            | publique             | adresse de contact affichée (facultatif)                                  |
| `SUPABASE_SERVICE_ROLE_KEY`            | **serveur, secrète** | clé secrète Supabase                                                      |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY`         | publique             | voir [`notifications.md`](notifications.md)                               |
| `VAPID_PRIVATE_KEY`                    | **serveur, secrète** | voir [`notifications.md`](notifications.md)                               |
| `VAPID_SUBJECT`                        | serveur              | `mailto:…` ou `https://…`                                                 |

Règles :

- seules les variables préfixées `NEXT_PUBLIC_` sont envoyées au navigateur ;
  **ne préfixez jamais une clé secrète par `NEXT_PUBLIC_`** ;
- les variables `NEXT_PUBLIC_*` sont figées au moment du build : après une
  modification, **redéployez** ;
- marquez les secrets comme _Sensitive_ dans Vercel ;
- une variable mal formée provoque une erreur qui indique son **nom**, jamais
  sa valeur.

Sans `SUPABASE_SERVICE_ROLE_KEY`, le site fonctionne mais la suppression de
compte affiche un message invitant à contacter l'équipe. Sans les variables
push, la page Paramètres indique que les notifications push ne sont pas
encore disponibles.

## 3. Domaine

1. Vercel → **Settings → Domains** → ajoutez votre domaine et suivez les
   instructions DNS.
2. Mettez à jour `NEXT_PUBLIC_SITE_URL` (puis redéployez) et, dans Supabase,
   **Site URL** et **Redirect URLs** (`https://votre-domaine/**`).
3. Si la connexion Google est activée, ajoutez le domaine aux origines
   autorisées dans Google Cloud.

La Content-Security-Policy autorise automatiquement l'URL Supabase configurée
(API, stockage, temps réel) ; aucun autre domaine externe n'est nécessaire.

## 4. Après le premier déploiement

Vérifications rapides (navigation privée, sur mobile et ordinateur) :

1. Inscription → e-mail reçu → lien de confirmation → connexion.
2. Modification du profil avec photo.
3. Création d'une annonce avec photos, publication, affichage sur l'accueil et
   dans Explorer (recherche par mot-clé).
4. Depuis un second compte : favori, abonnement, message ; réception en temps
   réel et compteur de non-lus.
5. Signalement d'une annonce, puis traitement depuis `/admin` avec le compte
   administrateur.
6. Blocage puis déblocage d'un utilisateur.
7. Mot de passe oublié.
8. Suppression d'un compte de test (si `SUPABASE_SERVICE_ROLE_KEY` est définie).
9. `https://votre-domaine/sitemap.xml` et `/robots.txt`.
10. Si le push est configuré : la procédure complète de
    [`notifications.md` §3](notifications.md#3-vérification-sur-appareils-obligatoire-avant-dannoncer-le-push).

## 5. Mises à jour

- Chaque push sur la branche de production déclenche un déploiement Vercel ;
  les branches et pull requests obtiennent une prévisualisation.
- **Migrations** : toute évolution du schéma passe par un nouveau fichier dans
  `supabase/migrations/` ; appliquez-le (`npx supabase db push`) **avant** de
  déployer le code qui en dépend. Faites relire toute migration destructive
  (suppression de colonne ou de table) et sauvegardez la base au préalable.
- La CI GitHub (lint, types, tests unitaires, tests de la base, build, tests
  E2E) doit être verte avant toute fusion.

## 6. Retour arrière

- Vercel → **Deployments** → choisissez un déploiement précédent →
  **Promote to Production** (instantané).
- Une migration déjà appliquée n'est pas annulée par un retour arrière du code :
  écrivez une nouvelle migration corrective.
