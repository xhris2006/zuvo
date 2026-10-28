# Vidéos MboaDeal

Deux vidéos motion design 9:16 (1080 × 1920) pour MboaDeal, dans le style des deux premières
vidéos Zuvo, avec un nouveau scénario, l'identité orange et les **vrais écrans du site**
(copie locale, données de démonstration). Ce dossier ne touche pas au code de l'application.

| Vidéo                                       | Style                                                                         | Durée | Images |
| ------------------------------------------- | ----------------------------------------------------------------------------- | ----- | ------ |
| `seconde-vie/` « Ici, tout trouve preneur » | Clair et coloré : cartes d'objets, téléphone, étapes numérotées, carte finale | 45 s  | 60 i/s |
| `lumiere/` « Achète. Vends. Partage. »      | Noir profond : point de lumière orange, panneaux de verre, mots isolés        | 31 s  | 30 i/s |

## Déroulé

### `seconde-vie/` — Ici, tout trouve preneur

| Temps       | Plan                                                                                                   |
| ----------- | ------------------------------------------------------------------------------------------------------ |
| 0 – 4,4 s   | Fond orange : le sac du logo se dessine, « MboaDeal », « Achète. Vends. Donne une seconde vie. »       |
| 3,9 – 11,6  | Une robe, une manette, un canapé s'empilent puis s'ouvrent en éventail : « Ici, tout trouve preneur. » |
| 11 – 17,6   | « Achète et vends près de chez toi, partout au Cameroun » : page d'accueil, catégories réelles         |
| 17 – 24,6   | 01 Publie : les 5 étapes réelles de mise en vente se valident une à une, annonce publiée               |
| 24 – 31,2   | 02 Trouve : « ro » → suite proposée en grisé, suggestions (annonces, catégories, membres)              |
| 30,6 – 36,4 | 03 Partage et discute : menu de partage réel (lien, WhatsApp, Facebook), conversation                  |
| 35,8 – 40,6 | Au lancement : 0 FCFA pour publier, 0 % de commission (mêmes termes que le site)                       |
| 40 – 45     | Carte finale : logo, slogan, « Découvre MboaDeal », mention « démonstration »                          |

### `lumiere/` — Achète. Vends. Partage.

| Temps       | Plan                                                                                         |
| ----------- | -------------------------------------------------------------------------------------------- |
| 0 – 3,8 s   | « Chez toi, ça dort. Ici, ça se vend. » : les écrans se lèvent au passage de la lumière      |
| 3,8 – 4,8   | Les écrans foncent vers la caméra, un arc de lumière balaie le sol                           |
| 4,8 – 9,6   | « Achète. » : barre de recherche en verre, suite proposée en grisé, suggestions              |
| 9,6 – 12,6  | L'annonce trouvée, cadrée par des repères lumineux                                           |
| 12,6 – 19,4 | « Vends. » : les 5 étapes distribuées comme des cartes, la lumière les parcourt, publication |
| 19,4 – 23   | « Partage. » : lien, WhatsApp, Facebook jaillissent du menu de partage                       |
| 23 – 26,4   | « Ta vitrine. » : le profil, balayé par un faisceau ; favoris, abonnés, messages             |
| 26,4 – 31   | La lumière trace le logo ; slogan, « Découvre MboaDeal », offre de lancement                 |

## Fichiers

| Fichier ou dossier                  | Rôle                                                                              |
| ----------------------------------- | --------------------------------------------------------------------------------- |
| `ecrans-clairs/`, `ecrans-sombres/` | Vraies captures du site (copie locale, données de démonstration), 2x              |
| `objets/`                           | Illustrations des objets (les mêmes que les photos des annonces de démonstration) |
| `commun/marque.js`                  | Tracés du logo, copiés de `src/components/layout/logo-mark.tsx` et `wordmark.tsx` |
| `commun/icones.js`                  | Icônes Lucide (les mêmes que sur le site, licence ISC)                            |
| `commun/synthe.py`                  | Instruments et bruitages des bandes-son (synthèse numpy)                          |
| `*/index.html`                      | Scène 1080 × 1920 ; `window.seek(t)` dessine l'instant t                          |
| `lumiere/film.js`                   | Plans et trajectoire de la lumière de la vidéo sombre                             |
| `*/soundtrack.py`                   | Bande-son originale calée sur l'image                                             |
| `render.mjs`                        | Rendu image par image (Playwright → ffmpeg), ou aperçus avec `--stills`           |

Polices : Plus Jakarta Sans (licence OFL), partagées avec `../publicite-cinematique/`.

```bash
cd promo/mboadeal
node render.mjs seconde-vie --stills 2,10,22,44     # aperçus dans seconde-vie/rendus/apercus/
node render.mjs seconde-vie                         # ≈ 6 min
python3 seconde-vie/soundtrack.py seconde-vie/rendus/bande-son.wav
ffmpeg -i seconde-vie/rendus/mboadeal-seconde-vie-9x16-sans-son.mp4 -i seconde-vie/rendus/bande-son.wav \
  -map 0:v -map 1:a -c:v copy -af loudnorm=I=-14:TP=-1.5:LRA=11 -c:a aac -b:a 192k -shortest \
  -movflags +faststart seconde-vie/rendus/mboadeal-seconde-vie-9x16.mp4
# idem avec « lumiere »
```

Les fichiers produits (`rendus/`) ne sont pas versionnés. Les captures se refont sur la copie
locale de démonstration (comptes et annonces fictifs, jamais le site public).

Logo modifié : régénérer `commun/marque.js` à partir des deux composants du site (mêmes tracés).

## Voix off (facultative)

Les deux vidéos se comprennent sans voix (textes à l'écran). Pour une voix off, voici les textes
calés sur l'image (voix jeune et chaleureuse, qui tutoie). Envoyer la prise (MP3) pour qu'elle
soit découpée et mixée comme pour les vidéos précédentes.

**`seconde-vie/`** (45 s) — chaque phrase doit tenir dans sa fenêtre

| Fenêtre       | Texte                                                                                    |
| ------------- | ---------------------------------------------------------------------------------------- |
| 4,6 – 5,9 s   | Une robe portée une seule fois…                                                          |
| 6,0 – 7,2 s   | une manette oubliée sous le lit…                                                         |
| 7,3 – 8,5 s   | un canapé qui prend toute la place.                                                      |
| 8,7 – 11 s    | Sur MboaDeal, tout trouve preneur.                                                       |
| 11,7 – 16 s   | Achète et vends près de chez toi, partout au Cameroun.                                   |
| 17,6 – 23,4 s | Publie ton annonce en cinq étapes : des photos, un prix, ta ville… et c'est en ligne !   |
| 24,7 – 30 s   | Tape deux lettres : MboaDeal devine la suite. Annonces, catégories, et même les membres. |
| 31,1 – 33,5 s | Partage-la en un geste…                                                                  |
| 33,9 – 36 s   | et discute directement avec l'acheteur.                                                  |
| 36,4 – 39,8 s | Au lancement, c'est gratuit : zéro franc pour publier, zéro commission.                  |
| 40,8 – 44,5 s | MboaDeal. Achète, vends, donne une seconde vie.                                          |

**`lumiere/`** (31 s) — mots isolés détachés, ton plus posé

| Fenêtre       | Texte                                           |
| ------------- | ----------------------------------------------- |
| 0,5 – 3,6 s   | Chez toi, ça dort… Ici, ça se vend.             |
| 4,9 s         | Achète.                                         |
| 5,8 – 9,2 s   | Deux lettres, et la suite s'écrit toute seule.  |
| 9,9 – 12,3 s  | La bonne affaire, près de chez toi.             |
| 12,7 s        | Vends.                                          |
| 14,3 – 17,3 s | Cinq étapes. Une photo, un prix, ta ville.      |
| 17,9 s        | Publiée !                                       |
| 19,5 s        | Partage.                                        |
| 20,4 – 22,5 s | Un lien, WhatsApp, Facebook.                    |
| 23,1 s        | Ta vitrine.                                     |
| 24,1 – 26 s   | Ton profil, tes favoris, tes abonnés.           |
| 27 – 30,5 s   | MboaDeal. Achète, vends, donne une seconde vie. |

## À valider avant diffusion

- **Adresse du site** : aucune adresse n'est affichée (« Sur le web · à installer sur ton
  téléphone »), en attendant le domaine définitif.
- **Prix et messages** : ceux des annonces et conversations de démonstration ; la mention
  « Annonces, prix et messages de démonstration » (ou « Interface présentée avec des annonces de
  démonstration ») s'affiche à la fin.
- **Offre de lancement** : « 0 FCFA pour publier », « 0 % de commission » reprennent les textes
  du site (« Au lancement, publier une annonce ne coûte rien et aucune commission n'est prélevée
  sur tes ventes »). À retirer si l'offre change.
- **WhatsApp et Facebook** : seuls les noms apparaissent, comme dans le vrai menu de partage ;
  aucun logo de ces marques.
- **Musique** : générée par les scripts (originale, sans droits tiers) ; une musique sous licence
  couvrant la publicité payante peut la remplacer.
- **Voix off** : vérifier que l'abonnement utilisé autorise l'usage commercial.
- Aucune fonction inventée : chaque écran et chaque étape existent sur le site.
