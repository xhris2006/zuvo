# Publicité cinématographique Zuvo — dossier de production

Publicité « Et si ce que tu n'utilises plus pouvait te rapporter de l'argent ? » : 90 s, 9:16
(adaptation 16:9). Ce dossier ne touche pas au code de l'application.

**Statut : storyboard proposé, en attente de validation. Aucune vidéo n'a été rendue.**

## Contenu

| Fichier ou dossier        | Rôle                                                                                       |
| ------------------------- | ------------------------------------------------------------------------------------------ |
| `audit.md`                | Audit du site : identité visuelle, écrans réels, correspondance avec le brief, contraintes |
| `storyboard.md`           | Storyboard plan par plan, bande voix minutée, musique, adaptation 16:9, points à valider   |
| `planche/storyboard.html` | Planche visuelle (A4 paysage) ; la version PDF se génère dans `rendus/` (non versionné)    |
| `ecrans/`                 | Vraies captures de l'application (copie locale, données de démonstration, prix floutés)    |
| `images-de-reference/`    | Images de référence : démo et carte finale, en 9:16 et 16:9                                |
| `outils/`                 | Générateur : `storyboard_data.py` (source unique des plans), `build.py`, `render.mjs`      |

## Régénérer

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
