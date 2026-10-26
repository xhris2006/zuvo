# Publicité cinématographique Zuvo — dossier de production

Publicité « Et si ce que tu n'utilises plus pouvait te rapporter de l'argent ? » : 90 s, 9:16
(adaptation 16:9). Ce dossier ne touche pas au code de l'application.

**Statut** : storyboard proposé ; **version motion design de la vidéo rendue** (voir ci-dessous).
Le tournage réel avec comédiens et la voix off enregistrée restent à produire.

## Contenu

| Fichier ou dossier        | Rôle                                                                                       |
| ------------------------- | ------------------------------------------------------------------------------------------ |
| `audit.md`                | Audit du site : identité visuelle, écrans réels, correspondance avec le brief, contraintes |
| `storyboard.md`           | Storyboard plan par plan, bande voix minutée, musique, adaptation 16:9, points à valider   |
| `planche/storyboard.html` | Planche visuelle (A4 paysage) ; la version PDF se génère dans `rendus/` (non versionné)    |
| `ecrans/`                 | Vraies captures de l'application (copie locale, données de démonstration, prix floutés)    |
| `images-de-reference/`    | Images de référence : démo et carte finale, en 9:16 et 16:9                                |
| `outils/`                 | Générateur : `storyboard_data.py` (source unique des plans), `build.py`, `render.mjs`      |

## Vidéo motion design (`video/`)

Version animée du storyboard : 90 s, 9:16 (1080 × 1920, 30 i/s) et adaptation 16:9 (1920 × 1080,
vidéo verticale centrée sur un fond flouté). Personnages et décors illustrés, **vrais écrans du
site** (copie locale, données de démonstration). Pas de voix enregistrée : les répliques sont en
bulles, la voix off en sous-titres incrustés. **Musique provisoire** générée par `soundtrack.py`
(originale, sans droits tiers) : à remplacer par une musique sous licence pour la diffusion.

Choix par défaut, en attendant validation : adresse `zuvo-beta.vercel.app` (`SITE_URL` dans
`video/film.js`) ; prix floutés ; mentions « gratuit / sans commission » masquées dans les captures ;
pas de bannière de notification push (badge « Messages » réel) ; second message « Bonsoir, je suis
intéressée par le téléphone. » ; prénoms Junior et Boris ; titre-question à l'ouverture.

| Fichier               | Rôle                                                               |
| --------------------- | ------------------------------------------------------------------ |
| `video/index.html`    | Scène 1080 × 1920 et styles                                        |
| `video/art.js`        | Illustrations : personnages articulés, chambre, objets, motifs wax |
| `video/film.js`       | Plans, caméra, animations ; `window.render(t)` dessine l'instant t |
| `video/textes.js`     | Répliques et voix off minutées                                     |
| `video/ecrans/`       | Captures réelles (2x) utilisées dans le téléphone                  |
| `video/soundtrack.py` | Bande-son provisoire et bruitages                                  |
| `video/render.mjs`    | Rendu image par image (Playwright → ffmpeg), ou aperçus            |
| `video/assemble.sh`   | Son, version 16:9, couverture, sous-titres `.srt`                  |

```bash
node promo/publicite-cinematique/video/render.mjs --stills 2.5,40,88   # aperçus
node promo/publicite-cinematique/video/render.mjs                      # rendu complet (≈ 8 min)
python3 promo/publicite-cinematique/video/soundtrack.py promo/publicite-cinematique/rendus/bande-son.wav
bash promo/publicite-cinematique/video/assemble.sh
```

Les fichiers produits (`rendus/`) ne sont pas versionnés.

## Régénérer le storyboard

```bash
python3 promo/publicite-cinematique/outils/build.py            # storyboard.md + planche HTML
node promo/publicite-cinematique/outils/render.mjs             # images de référence + rendus/storyboard.pdf
npx prettier --write promo/publicite-cinematique              # mise en forme (vérifiée par la CI)
```

`build.py` accepte en argument un dossier de captures PNG pour mettre à jour `ecrans/`. Le rendu
utilise Playwright (déjà installé avec le projet) ; `PLAYWRIGHT_CHROMIUM_PATH` permet d'indiquer
un autre navigateur Chromium.

## Règles

- Uniquement de vrais écrans du site, jamais de fonction inventée.
- Aucune fausse annonce sur le site public : démonstration sur un environnement séparé ou une
  copie locale, comptes de démonstration, mention « Scénario fictif. Annonces, prix et messages de
  démonstration. » à l'écran.
- Aucun prix, numéro, promotion ou promesse commerciale sans validation.
- Musique sous licence couvrant la publicité payante ; autorisations des comédiens et des lieux.
