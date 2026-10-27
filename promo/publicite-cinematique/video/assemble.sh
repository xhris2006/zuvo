#!/bin/bash
# Assemble la publicité : son, version 16:9, couverture et sous-titres.
# À lancer après « node render.mjs » et « python3 soundtrack.py ../rendus/bande-son.wav ».
set -euo pipefail
cd "$(dirname "$0")/../rendus"

# 9:16 avec la bande-son
ffmpeg -y -loglevel error -i zuvo-pub-9x16-sans-son.mp4 -i bande-son.wav \
  -map 0:v -map 1:a -c:v copy -c:a aac -b:a 192k -shortest -movflags +faststart zuvo-pub-9x16.mp4

# 16:9 : la vidéo verticale au centre, fond flouté issu de la même image
ffmpeg -y -loglevel error -i zuvo-pub-9x16.mp4 -filter_complex \
  "[0:v]split[a][b];[a]scale=1920:-2,crop=1920:1080,gblur=sigma=38,eq=brightness=-0.06:saturation=1.1[bg];[b]scale=-2:1080[fg];[bg][fg]overlay=(W-w)/2:0,format=yuv420p" \
  -c:v libx264 -preset medium -crf 18 -c:a copy -movflags +faststart zuvo-pub-16x9.mp4

# Couverture (titre-question et plan d'ouverture)
ffmpeg -y -loglevel error -ss 2.75 -i zuvo-pub-9x16-sans-son.mp4 -frames:v 1 -q:v 2 zuvo-pub-couverture.jpg

# Sous-titres (répliques et voix off) pour les plateformes et l'enregistrement d'une voix off
node -e '
const fs = require("fs");
const window = {};
eval(fs.readFileSync("../video/textes.js", "utf8"));
const names = { J: "Junior", B: "Boris" };
const lines = [
  ...window.TEXTS.DIALOG.map(([w, a, b, t]) => [a, b, `${names[w]} : ${t}`]),
  ...window.TEXTS.VO.map(([a, b, t]) => [a, b, `Voix off : ${t.replace(/\*/g, "")}`]),
].sort((x, y) => x[0] - y[0]);
const ts = (s) => { const ms = Math.round(s * 1000); const h = String(Math.floor(ms / 3600000)).padStart(2, "0"); const m = String(Math.floor(ms / 60000) % 60).padStart(2, "0"); const sec = String(Math.floor(ms / 1000) % 60).padStart(2, "0"); return `${h}:${m}:${sec},${String(ms % 1000).padStart(3, "0")}`; };
fs.writeFileSync("zuvo-pub-sous-titres.srt", lines.map(([a, b, t], i) => `${i + 1}\n${ts(a)} --> ${ts(b)}\n${t}\n`).join("\n"));
'
ls -la zuvo-pub-*
