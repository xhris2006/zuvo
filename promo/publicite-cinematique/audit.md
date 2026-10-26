# Audit des éléments existants

Préalable au storyboard de la publicité « Et si ce que tu n'utilises plus pouvait te rapporter de
l'argent ? ». Réalisé sur le dépôt (branche `claude/tender-johnson-50rks9`) et sur une copie locale
du site lancée avec des données de démonstration.

> Le site déployé (`zuvo-beta.vercel.app`) n'est pas joignable depuis l'environnement de travail
> (accès réseau refusé). Les captures du dossier `ecrans/` viennent donc de la version locale du même
> code. Avant tout enregistrement d'écran définitif, mettre en ligne la dernière version du code et
> appliquer les migrations en attente (`npx supabase db push`) : la rubrique « Recommandé pour vous »
> en dépend.

## 1. Identité visuelle

| Élément              | Réalité dans le dépôt                                                                                   | Source                                      |
| -------------------- | ------------------------------------------------------------------------------------------------------- | ------------------------------------------- |
| Logo                 | Carré bleu aux coins arrondis, « Z » blanc, pastille bleu clair en haut à droite, suivi du mot « Zuvo » | `src/components/layout/logo-mark.tsx`       |
| Couleur principale   | Bleu Zuvo `#1f5fe0` (boutons, logo, couleur du thème de l'application)                                  | `src/app/globals.css`, `src/config/site.ts` |
| Fonds                | Blanc cassé `#f7f9fc`, bleu très clair `#eff5ff`                                                        | `src/app/globals.css`                       |
| Textes               | Bleu nuit `#0f1b2d`, gris bleuté `#55627a`                                                              | `src/app/globals.css`                       |
| Accent du logo       | Bleu clair `#bfd5fd`                                                                                    | `src/app/globals.css`                       |
| Mode sombre          | Fond `#0b1220`, bleu `#6b9bf5`                                                                          | `src/app/globals.css`                       |
| Police               | Plus Jakarta Sans (graisses 560, 640, 720)                                                              | `src/app/layout.tsx`                        |
| Icônes               | Lucide (mêmes icônes pour les catégories que dans la publicité)                                         | `src/features/categories/data.ts`           |
| Icônes d'application | 192 et 512 px, version adaptative                                                                       | `public/icons/`                             |

**Écart avec le brief** : le brief cite une palette « vert sauge et blanc cassé, à adapter aux couleurs
réelles du site ». Le site est passé au bleu : la publicité utilise le bleu Zuvo et le blanc cassé.

**Ton** : l'interface vouvoie (« Donnez une seconde vie à vos affaires ») ; la publicité tutoie dans
les dialogues et la voix off. Les textes de l'interface restent tels quels à l'écran. La signature du
brief, « La seconde vie de tes affaires. », prolonge le titre de l'accueil.

## 2. Écrans réels utilisables

Captures dans `ecrans/` (téléphone 390 px, prix floutés en attente de validation).

| Écran                     | Adresse          | Ce qu'on y voit                                                                                                                              | Capture                         | Scène      |
| ------------------------- | ---------------- | -------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------- | ---------- |
| Bienvenue (visiteur)      | `/bienvenue`     | Mosaïque d'annonces, « Donnez une seconde vie à vos affaires », « Créer un compte », « J'ai déjà un compte », FR/EN                          | `01-bienvenue`                  | —          |
| Accueil                   | `/`              | Recherche « Rechercher un article… », « Recommandé pour vous », « Annonces récentes », barre du bas (Accueil, Explorer, +, Messages, Profil) | `02-accueil`, `02b-accueil-fil` | 2, 3       |
| Explorer                  | `/explorer`      | Onglets Articles / Boutiques, catégories (15 au départ, gérées par l'administration), filtres (catégorie, ville, état, prix), tri            | `03-explorer`                   | 3, 5       |
| Recherche                 | `/explorer?q=…`  | « Résultats pour « baskets » »                                                                                                               | `04-recherche`                  | 3, 5       |
| Fiche annonce             | `/annonces/[id]` | Photos, état, titre, prix, ville, date, vendeur, « Contacter le vendeur », « Signaler l'annonce », annonces similaires                       | `15-annonce-vue-acheteur`       | 3, 5       |
| Vendre — 5 étapes         | `/vendre`        | Voir ci-dessous                                                                                                                              | `05` à `10`                     | 3, 5       |
| Annonce publiée (vendeur) | `/annonces/[id]` | « Publiée à l'instant », panneau « Gérer mon annonce »                                                                                       | `11-annonce-publiee`            | 3          |
| Messages                  | `/messages`      | Une conversation par annonce, badge de messages non lus sur l'onglet « Messages »                                                            | `12-messages`                   | 4          |
| Conversation              | `/messages/[id]` | Carte de l'annonce, « Acheteur intéressé », bulles, envoi de photos, « Écrire un message… »                                                  | `13-conversation`               | 4          |
| Profil                    | `/profil`        | Bannière, abonnés / abonnements / annonces, onglets « Mes annonces » et « Favoris », bouton « Vendre »                                       | `14-profil-en-vente`            | 4          |
| Guide d'installation      | `/installer`     | Installation sur l'écran d'accueil (Android, iPhone)                                                                                         | —                               | 6 (option) |
| Version ordinateur        | toutes           | Barre latérale de navigation                                                                                                                 | —                               | 16:9       |

**Parcours « Vendre un article »** (`src/features/listings/components/listing-editor.tsx`) : barre
« Étape x sur 5 », boutons « Continuer » et « Enregistrer le brouillon ».

1. **Photos** — « Jusqu'à 8 photos nettes. La première sera la photo principale. »
2. **Description** — Titre et description.
3. **Catégorie et état** — catégories du site, 6 états (de « Neuf avec étiquette » à « Pour pièces »).
4. **Prix et lieu** — Prix en FCFA, ville parmi 22 ; indication « Gratuit et sans commission : vous encaissez tout le prix. »
5. **Vérification** — Récapitulatif modifiable, bouton « Publier l'annonce ».

Après la publication, le vendeur arrive sur la page de son annonce.

## 3. Correspondance entre le brief et le site

| Demande du brief                                | Réalité du site                                                                                                                                       | Adaptation dans le storyboard                                                                    |
| ----------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| « 1. Prends tes photos »                        | Étape 1 « Photos »                                                                                                                                    | Conservé                                                                                         |
| « 2. Publie ton annonce »                       | Étapes 2 à 5, puis « Publier l'annonce »                                                                                                              | Conservé, avec les vrais champs en puces : Titre · Description · Catégorie · État · Prix · Ville |
| « 3. Échange avec les acheteurs »               | « Contacter le vendeur » et messagerie (texte et photos)                                                                                              | Conservé                                                                                         |
| « Notifications animées discrètes »             | Pas de bulle dans l'application à l'arrivée d'un message : badge sur « Messages » ; notification push du téléphone seulement si le membre l'a activée | Badge réel par défaut ; bannière push seulement après tests validés sur Android et iPhone        |
| Fiche produit « avec son prix »                 | Prix affiché en FCFA                                                                                                                                  | Montants des annonces de démonstration à valider, sinon floutés                                  |
| Messages de la scène 4                          | La messagerie affiche les messages tels quels                                                                                                         | Comptes de démonstration et mention « Scénario fictif… » à l'écran                               |
| « Un second acheteur… pour un autre article »   | Il faut que le vendeur ait publié plusieurs articles                                                                                                  | Plan 4A : Junior publie aussi l'ancien téléphone (profil, « Mes annonces »)                      |
| « Format mobile et accessibilité »              | Site pensé pour le téléphone, installable sur l'écran d'accueil, français et anglais, mode sombre                                                     | Interface montrée sur téléphone ; installation possible en option au plan 6A                     |
| « Si le site est encore en phase de test »      | L'adresse actuelle est une adresse de bêta                                                                                                            | Aucun compteur, aucun nom de ville à l'écran, fil de démonstration modeste                       |
| « Ne pas afficher de promesse sans validation » | Le site affiche « Publication gratuite », « Aucune commission » (accueil) et l'indication de l'étape 4                                                | Point à valider : montrer ces écrans ou les recadrer                                             |
| Palette « vert sauge et blanc cassé »           | Bleu et blanc cassé                                                                                                                                   | Palette du site                                                                                  |

Fonctions **absentes** du site, à ne pas montrer : paiement dans l'application, livraison, notes ou
avis sur les vendeurs, compteur de ventes, bulle de notification dans l'application.

## 4. Contraintes et risques

- **Pas de fausse annonce sur le site public.** Filmer la publication sur le site en production
  créerait une vraie annonce. Utiliser un environnement de démonstration (déploiement de
  prévisualisation relié à un projet Supabase séparé) ou des enregistrements d'écran faits sur une
  copie locale, avec des comptes de démonstration.
- **Données affichées** : noms et avatars fictifs, aucun vrai numéro de téléphone (le numéro
  d'assistance du site ne doit pas apparaître), pas de marque dans les titres d'annonces.
- **Marques** : éviter les logos visibles sur les objets filmés (baskets, téléphones, casques).
- **Droits** : autorisations écrites des comédiens et figurants, autorisations de tournage dans les
  lieux publics, licence musicale couvrant la publicité payante.
- **Génération par IA** (si retenue) : pas de faux témoignage, mention « contenu généré par IA »
  selon les règles de chaque plateforme.
- **Notifications push** : ne pas les montrer comme opérationnelles tant que l'envoi n'a pas été
  testé sur des appareils compatibles.

## 5. Ce qui existe déjà côté promotion

- Une vidéo motion design de 43 s (livrée précédemment, hors dépôt) : animation du logo et rythme
  réutilisables. Sa musique est synthétisée : elle ne peut servir que de piste temporaire, pas de
  musique afro-fusion sous licence.
- Les captures réelles de ce dossier (`ecrans/`) et les images de référence (`images-de-reference/`).

## 6. Ce qui peut être produit ici, et ce qui ne peut pas l'être

**Possible dans cet environnement** : captures et enregistrements d'écran réels (sur une copie locale
du site), motion design (logo, textes d'étapes, étiquettes, transitions, carte finale) en 9:16 et
16:9, animatique minutée, sous-titres, documents de production, prompts par plan.

**Impossible ici** : tourner avec des comédiens, enregistrer une vraie voix off, acquérir une licence
musicale, générer des plans vidéo photoréalistes ou une voix de synthèse de qualité (aucun outil de
ce type n'est disponible dans cet environnement).
