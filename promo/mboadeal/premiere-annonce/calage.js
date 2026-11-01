// Calage de l'image sur la voix off. Sans voix : temps de scène = temps de la vidéo.
// À l'arrivée de la prise, chaque point [scène, vidéo] place un titre, une étape ou une
// étiquette sur le mot qui le dit (voir commun/calage.js) ; `soundtrack.py` lit ce fichier.
window.CALAGE = creerCalage(32.6, [
  [0, 0],
  [32.6, 32.6],
]);
