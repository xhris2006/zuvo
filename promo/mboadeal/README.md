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

Règle : la voix dit ce qui s'affiche au même moment (titres, étapes, étiquettes). Les
animations sont recalées sur chaque nouvelle prise.

**Prononciation** : « Mboa » se dit comme « boa » (le serpent) précédé d'un « m » léger, en deux
syllables « m-bo-a », jamais « bois ». « Deal » se dit « dil ». Dans ElevenLabs, écrire
**« Mbo-a Dil »** (ou « M'bo-a Dil ») à la place de « MboaDeal » et vérifier à l'écoute.

**Voix** : légère teinte africaine (Afrique centrale), jeune, chaleureuse, qui tutoie.

**`seconde-vie/`** (45 s)

| À l'écran                                       | Texte à dire                                                                                         |
| ----------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| Logo, « Achète. Vends. Donne une seconde vie. » | Mbo-a Dil. Achète. Vends. Donne une seconde vie.                                                     |
| Une robe… une manette… un canapé                | Une robe portée une seule fois… une manette oubliée sous le lit… un canapé qui prend toute la place. |
| « Ici, tout trouve preneur. »                   | Ici, tout trouve preneur.                                                                            |
| « Achète et vends près de chez toi… »           | Achète et vends près de chez toi, partout au Cameroun.                                               |
| « Ton annonce en 5 étapes. »                    | Ton annonce en cinq étapes :                                                                         |
| Étape 1 « Photos »                              | les photos…                                                                                          |
| Étape 2 « Description »                         | la description…                                                                                      |
| Étape 3 « Catégorie »                           | la catégorie…                                                                                        |
| Étape 4 « 12 000 FCFA · Douala »                | le prix et la ville…                                                                                 |
| Étape 5 « Vérification », « Annonce publiée »   | tu vérifies… et c'est publié !                                                                       |
| « Deux lettres, MboaDeal complète le reste. »   | Tape deux lettres… et Mbo-a Dil complète le reste.                                                   |
| « Annonces », « Catégories », « Membres »       | Annonces, catégories, et même les membres.                                                           |
| « Partage-la en un geste. »                     | Partage-la en un geste…                                                                              |
| « Et discute directement. »                     | et discute directement.                                                                              |
| « Au lancement, c'est gratuit. »                | Au lancement, c'est gratuit :                                                                        |
| « 0 FCFA pour publier une annonce »             | zéro franc pour publier une annonce…                                                                 |
| « 0 % de commission sur tes ventes »            | et zéro pour cent de commission sur tes ventes.                                                      |
| Carte finale, « Découvre MboaDeal »             | Achète, vends, donne une seconde vie… Découvre Mbo-a Dil !                                           |

**`lumiere/`** (31 s) — mots isolés détachés, ton plus posé

| À l'écran                                      | Texte à dire                                                |
| ---------------------------------------------- | ----------------------------------------------------------- |
| « Chez toi, ça dort. Ici, ça se vend. »        | Chez toi, ça dort… Ici, ça se vend.                         |
| « Achète. »                                    | Achète.                                                     |
| « ro » puis la suite en grisé                  | Deux lettres… et Mbo-a Dil complète le reste.               |
| L'annonce trouvée                              | La bonne affaire, près de chez toi.                         |
| « Vends. »                                     | Vends.                                                      |
| Les cinq cartes                                | En cinq étapes :                                            |
| « Photos » … « Vérification » (compteur)       | photos… description… catégorie… prix et lieu… vérification. |
| « Annonce publiée »                            | Publiée !                                                   |
| « Partage. »                                   | Partage.                                                    |
| « Copier le lien », « WhatsApp », « Facebook » | Un lien… WhatsApp… Facebook.                                |
| « Ta vitrine. »                                | Ta vitrine.                                                 |
| « Favoris », « Abonnés », « Messages »         | Tes favoris, tes abonnés, tes messages.                     |
| Logo, slogan                                   | Mbo-a Dil. Achète, vends, donne une seconde vie.            |

### Mixage

`commun/voixoff.py` découpe la prise phrase par phrase, place chaque phrase sur son moment (léger
accéléré possible, sans changer la hauteur de la voix) et baisse la musique sous la voix
(−5 dB, et −13 dB entre 300 Hz et 4 kHz). Les positions des phrases dans la prise sont dans
`seconde-vie/voix.py` et `lumiere/voix.py` (prises ElevenLabs du 28 octobre 2026, à placer
dans `rendus/voix-off.mp3` de chaque vidéo) ; une nouvelle prise demande de les relever à nouveau.

```bash
cd promo/mboadeal/seconde-vie
python3 soundtrack.py rendus/bande-son.wav
python3 voix.py rendus/voix-off.mp3 rendus/bande-son.wav rendus/bande-son-voix.wav
ffmpeg -i rendus/mboadeal-seconde-vie-9x16-sans-son.mp4 -i rendus/bande-son-voix.wav -map 0:v -map 1:a \
  -c:v copy -af loudnorm=I=-14:TP=-1.5:LRA=11 -c:a aac -b:a 192k -shortest -movflags +faststart \
  rendus/mboadeal-seconde-vie-9x16-voix.mp4
```

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
