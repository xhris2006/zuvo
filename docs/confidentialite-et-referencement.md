# Politique de confidentialité, Google OAuth et référencement

Ce document accompagne la réécriture de `/confidentialite` et `/conditions` et les réglages de
référencement. Il liste ce que le propriétaire doit confirmer et les étapes à faire dans les
consoles Google : rien de tout cela ne peut être fait ni vérifié depuis le code.

## 1. Ce que décrivent les pages

- `/confidentialite` : 16 sections, rédigées d'après le code (tables Supabase, connexion Google,
  stockage des photos, notifications push, cookies et stockage local réellement utilisés,
  procédure de suppression du compte). Aucune mention « brouillon » ni « à compléter » n'est
  affichée. Une version anglaise suit la langue choisie.
- `/conditions` : fonctionnement réel de la place de marché, annonces autorisées, comportements
  interdits, signalements, modération, responsabilité, contact.
- Liens vers ces deux pages : pied de page de l'accueil, pied de page des pages publiques pour les
  visiteurs, écrans de connexion et d'inscription, mention sous le bouton « Continuer avec
  Google », Paramètres et Aide.

## 2. À confirmer ou compléter par le propriétaire

| Point                                                                     | Où le renseigner                                | État actuel affiché                                     |
| ------------------------------------------------------------------------- | ----------------------------------------------- | ------------------------------------------------------- |
| Éditeur (nom ou société, adresse, RCCM…)                                  | `publisher` dans `src/config/legal.ts`          | « l'équipe MboaDeal »                                   |
| Adresse e-mail de contact                                                 | variable `NEXT_PUBLIC_CONTACT_EMAIL` (Vercel)   | téléphone et assistance en ligne seulement              |
| Région d'hébergement Supabase, région Vercel                              | texte de la section 14                          | « hors du Cameroun », sans région précise               |
| Service d'envoi des e-mails (SMTP)                                        | texte de la section 6                           | « service d'envoi configuré pour le projet »            |
| Sauvegardes de la base (activées ou non)                                  | section 8                                       | phrase conditionnelle                                   |
| Durées de conservation des messages, signalements, journaux               | section 8                                       | aucune suppression automatique (fonctionnement actuel)  |
| Âge minimum                                                               | sections 13 (confidentialité) et 2 (conditions) | accord parental pour les mineurs, sans âge chiffré      |
| Texte de loi applicable, autorité de contrôle, bases légales, juridiction | sections 10 et 13                               | non cités (à faire valider)                             |
| Vérification d'identité « vendeur vérifié »                               | sections 2 et 7                                 | seule la date d'attribution est enregistrée sur le site |
| Engagement « utilisation limitée » des données Google                     | section 5                                       | affiché : à confirmer par le propriétaire               |

Les textes doivent être relus par un professionnel du droit avant d'être considérés comme
définitifs. Après chaque modification, mettre à jour la date dans `legalUpdatedAt`.

## 3. Google Auth Platform (console.cloud.google.com)

1. **Branding** : nom « MboaDeal », e-mail d'assistance, page d'accueil
   `https://mboadeals.shop` (elle répond désormais directement, sans redirection), politique de
   confidentialité `https://mboadeals.shop/confidentialite`, conditions
   `https://mboadeals.shop/conditions`.
2. **Domaines autorisés** : `mboadeals.shop` et le domaine du projet Supabase
   (`<projet>.supabase.co`), utilisé par l'URL de retour de la connexion.
3. **Accès aux données** : ne garder que `openid`, `.../auth/userinfo.email` et
   `.../auth/userinfo.profile`. Le code ne demande pas d'autre autorisation (Supabase utilise
   « email » et « profile » par défaut) ; vérifier qu'aucune autre n'est déclarée.
4. **Validation du domaine** : valider `mboadeals.shop` dans Google Search Console avec un compte
   propriétaire du projet Google Cloud (voir section 4).
5. Relancer la validation de la marque et répondre au courriel de l'équipe de revue si elle pose
   des questions.

## 4. Google Search Console

1. Ajouter une propriété « Domaine » `mboadeals.shop` et la valider par un enregistrement DNS TXT
   chez le registraire.
2. Envoyer le sitemap `https://mboadeals.shop/sitemap.xml` (Indexation → Sitemaps).
3. Inspecter puis « Demander l'indexation » pour `/`, `/explorer`, `/services`,
   `/confidentialite`, `/conditions` et quelques annonces et services.
4. Après quelques jours : rapports « Pages » et « robots.txt », test des résultats enrichis sur une
   annonce (Product) et sur l'accueil (Organization).

## 5. Réglages de déploiement

- **Domaine officiel** : `https://mboadeals.shop`, défini dans `src/config/site.ts`
  (`siteConfig.url`). Sur un déploiement de production Vercel (`VERCEL_ENV=production`), les URL
  canoniques, `sitemap.xml`, `robots.txt`, les données structurées, les aperçus de partage et les
  liens « Partager » l'utilisent toujours (fonction `getPublicSiteUrl`), même si
  `NEXT_PUBLIC_SITE_URL` contient encore `https://zuvo-beta.vercel.app` et même si le site est
  ouvert par son adresse `*.vercel.app`. Les déploiements de prévisualisation et le poste local
  gardent leur propre adresse.
- **`NEXT_PUBLIC_SITE_URL`** ne sert plus qu'aux liens des e-mails d'authentification et au
  retour de la connexion Google (`/auth/callback`). Pour qu'ils utilisent aussi le domaine
  officiel, sans rien casser :
  1. Supabase → Authentication → URL Configuration : _Site URL_ `https://mboadeals.shop`, et
     ajouter `https://mboadeals.shop/**` aux _Redirect URLs_ (garder l'ancienne adresse le temps
     de la transition) ;
  2. Vercel → Settings → Environment Variables (Production) :
     `NEXT_PUBLIC_SITE_URL=https://mboadeals.shop`, puis redéployer ;
  3. tester une inscription, un « mot de passe oublié » et « Continuer avec Google ».
- **Ancienne adresse** : une fois l'étape précédente vérifiée, configurer dans Vercel → Settings →
  Domains une redirection permanente (308) de `zuvo-beta.vercel.app` vers `mboadeals.shop`. En
  attendant, les balises canoniques de chaque page désignent déjà `mboadeals.shop`, ce qui
  permet à Google de regrouper les deux adresses.
- Choisir une seule adresse : rediriger `www.mboadeals.shop` vers `mboadeals.shop` (ou
  l'inverse) dans Vercel → Domains.
- Ces modifications ne sont visibles en ligne qu'une fois la branche déployée en production.

## 6. Référencement : ce qui est en place

- `/` sert l'accueil des visiteurs directement (statut 200, URL canonique) ; `/bienvenue` affiche
  le même contenu avec `/` pour URL canonique.
- `sitemap.xml` (régénéré au plus une fois par heure, `src/app/sitemap.ts`), uniquement sur le
  domaine officiel et à l'URL canonique de chaque page, sans doublon :
  - pages publiques : `/`, `/explorer`, `/services`, `/services/recherche`, `/securite`,
    `/aide`, `/installer`, `/signalements`, `/conditions`, `/confidentialite` ;
  - annonces en vente ou réservées, non retirées, de vendeurs visibles (`/annonces/<id>`) ;
  - services en ligne, ni en pause ni retirés (`/services/<id>`) ;
  - profils publics des vendeurs et prestataires concernés (`/u/<nom>`), une fois chacun ;
  - pages de catégorie contenant au moins une annonce ou un service en ligne, à leur URL
    canonique (`/explorer?category=…`, `/services/recherche?categorie=…`). Les autres
    combinaisons de filtres, le tri et la pagination renvoient par leur balise canonique vers
    ces pages et ne figurent pas dans le sitemap ; la recherche libre (`q=`) est en `noindex`.
  - `lastmod` uniquement lorsqu'elle est exacte : date des documents juridiques, dernière
    modification d'une annonce, d'un service ou d'un profil (profil ou contenu), élément le plus
    récemment modifié pour les pages de liste. Aucune date pour l'accueil, l'aide, la sécurité
    et l'installation.
  - Aucune page privée : un dernier filtre écarte toute URL d'espace membre ou
    d'authentification.
- `robots.txt` : pages publiques ouvertes et `Sitemap: https://mboadeals.shop/sitemap.xml` ;
  espaces membres, administration, retours d'authentification et API exclus (ce n'est pas une
  protection : ces pages exigent une session et la base applique ses politiques d'accès). Les
  formulaires de connexion, d'inscription et de mot de passe oublié restent explorables pour que
  les moteurs lisent leur balise `noindex`.
- Pages privées : `noindex` sur toutes les pages membres, d'authentification et
  d'administration ; sans session, les espaces membres redirigent (307) vers `/connexion`, elle
  aussi en `noindex`.
- Données structurées : `WebSite` et `Organization` sur l'accueil (nom, logo, téléphone
  d'assistance réel), `Product` sur les annonces ayant un prix (aucun avis ni note).
- Titre, description, URL canonique et aperçu de partage sur chaque page publique ; recherche
  libre, pages privées, annonces non publiées et services en pause ou retirés en `noindex`.
- Les robots reconnus par Next.js (Googlebot, Bingbot…) reçoivent titre, description et
  canonique dans le `<head>` ; les navigateurs les reçoivent en flux (« streaming metadata »),
  ce qui est le comportement normal de Next.js 16.
