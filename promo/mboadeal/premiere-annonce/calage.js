// Calage de l'image sur la voix off (prise ElevenLabs du 1er novembre 2026). Chaque point
// [scène, vidéo] place un titre, une étape ou une étiquette sur le mot qui le dit (voir
// commun/calage.js) ; `soundtrack.py` lit ce même fichier.
window.CALAGE = creerCalage(36.8, [
  [0, 0],
  [1.1, 1.1], // « Ding ! »
  [1.9, 1.96], // « Une nouvelle annonce sur MboaDeal ! »
  [3.8, 3.95],
  [4.3, 4.45],
  [4.85, 4.75], // « Adrien l'a fait ! »
  [5.15, 6.3], // « La toute première annonce de MboaDeal ! »
  [7.2, 8.55], // « Des Amiri »
  [8.6, 10.85], // « à treize mille francs »
  [9.6, 11.95], // « à Yaoundé »
  [10.7, 12.6],
  [11.3, 13.25], // « Tu publies, »
  [11.5, 14.15], // « tes abonnés sont prévenus. »
  [15.6, 16.6],
  [16.1, 17.05], // « À ton tour ! »
  [16.9, 17.95],
  [17.45, 18.6], // « Appuie sur plus »
  [18.0, 19.2], // « tes photos »
  [18.7, 20.05], // « la description »
  [19.4, 20.95], // « la catégorie »
  [20.1, 21.9], // « le prix et la ville »
  [20.8, 23.2], // « tu vérifies »
  [21.9, 24.3], // « et c'est publié. »
  [23.2, 25.4],
  [23.75, 25.95], // « Pour le lancement, »
  [23.95, 26.7], // « c'est gratuit ! »
  [24.9, 27.8], // « Zéro franc pour publier, »
  [26.0, 29.2], // « zéro commission. »
  [27.8, 30.3],
  [29.0, 31.1], // « Fais comme Adrien ! »
  [29.25, 32.25], // « Publie ta première annonce »
  [29.9, 33.4], // « sur MboaDeal. »
  [32.6, 36.8],
]);
