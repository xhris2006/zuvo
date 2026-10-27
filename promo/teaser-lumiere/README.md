# Teaser « lumière sur verre » — Zuvo

Teaser motion design de 30 s, 9:16 (1080 × 1920, 30 i/s), inspiré de la vidéo de référence
envoyée (orbe lumineux qui guide l'œil, panneaux de verre en perspective avec reflets au sol,
mots isolés en très grand, saisie au clavier, balayage de lumière, logo qui se construit). Il garde
l'identité de Zuvo : bleu, blanc, captures réelles du site en mode sombre. Ce dossier ne touche pas
au code de l'application.

## Déroulé

| Temps         | Plan                                                                                    |
| ------------- | --------------------------------------------------------------------------------------- |
| 0 – 3,4 s     | Carrousel de cinq écrans du site éclairés par l'orbe                                    |
| 3,4 – 8 s     | « Cherche. » puis saisie de « Robe en wax » dans la barre de recherche                  |
| 8 – 11,2 s    | « Trouve. » : une annonce s'ouvre, cadrée par des repères lumineux                      |
| 11,2 – 19,6 s | « Qu'as-tu à vendre aujourd'hui ? » : les étapes réelles de mise en vente, vérification |
| 19,6 – 25,4 s | « Discute. » (annonce publiée, conversation) puis la version ordinateur                 |
| 25,4 – 30,5 s | L'orbe devient le point du logo, « Zuvo », signature, « Découvre Zuvo », adresse        |

## Fichiers

| Fichier         | Rôle                                                                            |
| --------------- | ------------------------------------------------------------------------------- |
| `index.html`    | Scène 1080 × 1920 et styles (verre, reflets, orbe, typographie)                 |
| `teaser.js`     | Plans et animations ; `window.render(t)` dessine l'instant t                    |
| `ecrans/`       | Vraies captures du site (copie locale, mode sombre, données de démonstration)   |
| `soundtrack.py` | Bande-son provisoire : pulsation, frappes, balayages, impacts calés sur l'image |
| `render.mjs`    | Rendu image par image (Playwright → ffmpeg), ou aperçus avec `--stills t1,t2,…` |

Le teaser réutilise les icônes et les polices du dossier `../publicite-cinematique/`.

```bash
cd promo/teaser-lumiere
node render.mjs --stills 2,9.5,18,29                # aperçus dans rendus/apercus/
node render.mjs                                     # rendu complet (≈ 5 min)
python3 soundtrack.py rendus/bande-son.wav
ffmpeg -i rendus/teaser-lumiere-9x16-sans-son.mp4 -i rendus/bande-son.wav -map 0:v -map 1:a \
  -c:v copy -c:a aac -b:a 192k -shortest -movflags +faststart rendus/teaser-lumiere-9x16.mp4
```

Les fichiers produits (`rendus/`) ne sont pas versionnés.

## À valider avant diffusion

- **Adresse** : `zuvo-beta.vercel.app` (`SITE_URL` dans `teaser.js`), à remplacer par l'adresse
  définitive.
- **Prix** : les prix visibles sont ceux des annonces de démonstration et de l'exemple de mise en
  vente (15 000 FCFA). La mention « Interface présentée avec des annonces de démonstration. »
  s'affiche à la fin ; flouter les prix si cette mention ne suffit pas.
- **Mentions commerciales** : « gratuit / sans commission » sont masquées dans les captures.
- **Musique** : générée par `soundtrack.py` (originale, sans droits tiers) ; une musique sous
  licence couvrant la publicité payante peut la remplacer.
- Aucune fonction inventée : chaque écran et chaque étape existent sur le site.
