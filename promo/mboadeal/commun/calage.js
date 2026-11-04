// Calage de l'image sur une voix off. Les animations d'une vidéo sont écrites en « temps de
// scène » (secondes de la version sans voix) ; chaque point [scène, vidéo] fixe l'instant où ce
// moment passe dans la vidéo finale, et le temps est interpolé linéairement entre deux points.
// Chaque vidéo déclare ses points dans son propre calage.js, lu aussi par commun/calage.py.
window.creerCalage = (duree, points) => {
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
};
