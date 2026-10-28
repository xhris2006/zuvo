// Calage de l'image sur la voix off (prise ElevenLabs du 28 octobre 2026, voix d'Ellen).
// Les animations sont écrites en « temps de scène » (secondes de la version sans voix) ;
// chaque point [scène, vidéo] fixe l'instant où ce moment passe dans la vidéo finale.
// Entre deux points, le temps est interpolé linéairement. `soundtrack.py` lit ce même fichier.
window.CALAGE = (() => {
  const duree = 51.8;
  const points = [
    [0, 0],
    [1.35, 1.3], // « MboaDeal »
    [2.0, 2.6], // « Achète, vends. »
    [2.36, 4.0], // « Donne une seconde vie à tes affaires. »
    [3.9, 5.75],
    [4.5, 6.0], // la robe
    [5.8, 7.85], // la manette
    [7.1, 9.55], // le canapé
    [9.0, 11.45],
    [9.25, 11.8], // « Ici, tout trouve preneur. »
    [11.0, 13.4],
    [11.7, 13.75], // « Achète et vends près de chez toi… »
    [17.0, 17.4],
    [17.55, 17.85], // « Ton annonce en cinq étapes. »
    [18.3, 19.6], // « Tes photos »
    [19.05, 20.65], // « la description »
    [20.15, 21.75], // « la catégorie »
    [21.25, 22.9], // « le prix et la ville »
    [22.35, 24.5], // « Tu vérifies et c'est publié. »
    [23.4, 25.75],
    [24.0, 26.3],
    [25.35, 27.2], // « ro »
    [27.3, 28.6],
    [27.45, 29.4], // « des annonces »
    [28.1, 30.45], // « toutes les catégories »
    [29.05, 31.55], // « et les membres »
    [29.95, 32.9],
    [30.6, 34.5],
    [31.1, 34.9], // « Partage-la en un geste »
    [33.85, 36.4], // « et discute directement »
    [35.8, 38.0],
    [36.3, 38.4], // « Pour son lancement, tout est gratuit. »
    [37.75, 40.4], // « Zéro franc pour publier une annonce »
    [39.4, 42.4], // « et zéro pour cent de commission »
    [40.0, 44.3],
    [40.4, 44.6],
    [41.3, 45.1], // « Et toi, qu'attends-tu ? »
    [42.3, 48.8], // « Découvre MboaDeal »
    [45.0, duree],
  ];
  const lerp = (x, i, a, b) => {
    const [x0, x1] = [points[i][a], points[i + 1][a]];
    return points[i][b] + ((x - x0) / (x1 - x0)) * (points[i + 1][b] - points[i][b]);
  };
  const map = (x, a, b) => {
    let i = 0;
    while (i < points.length - 2 && x >= points[i + 1][a]) i++;
    return lerp(x, i, a, b);
  };
  return {
    duree,
    points,
    // Temps de scène → temps de la vidéo, et l'inverse.
    M: (s) => map(s, 0, 1),
    inverse: (t) => map(t, 1, 0),
  };
})();
