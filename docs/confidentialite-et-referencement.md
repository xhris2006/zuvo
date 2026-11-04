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
2. Envoyer le sitemap `https://mboadeals.shop/sitemap.xml`.
3. Inspecter puis « Demander l'indexation » pour `/`, `/explorer`, `/confidentialite`,
   `/conditions` et quelques annonces.
4. Après quelques jours : rapports « Pages » et « robots.txt », test des résultats enrichis sur une
   annonce (Product) et sur l'accueil (Organization).

## 5. Réglages de déploiement

- Définir `NEXT_PUBLIC_SITE_URL=https://mboadeals.shop` dans Vercel (URL canoniques, sitemap,
  robots.txt, liens de partage), puis redéployer.
- Choisir une seule adresse : rediriger `www.mboadeals.shop` vers `mboadeals.shop` (ou
  l'inverse) dans Vercel → Domains.
- Ces modifications ne sont visibles en ligne qu'une fois la branche déployée en production.

## 6. Référencement : ce qui est en place

- `/` sert l'accueil des visiteurs directement (statut 200, URL canonique) ; `/bienvenue` affiche
  le même contenu avec `/` pour URL canonique.
- `sitemap.xml` : pages publiques, catégories contenant au moins une annonce en vente, annonces
  en vente et profils de leurs vendeurs. Aucune page privée.
- `robots.txt` : pages publiques ouvertes ; espaces membres, administration, authentification et
  API exclus (ce n'est pas une protection : ces pages exigent une session et la base applique ses
  politiques d'accès).
- Données structurées : `WebSite` et `Organization` sur l'accueil (nom, logo, téléphone
  d'assistance réel), `Product` sur les annonces ayant un prix (aucun avis ni note).
- Titre, description, URL canonique et aperçu de partage sur chaque page publique ; recherche
  libre, pages privées et annonces non publiées en `noindex`.
