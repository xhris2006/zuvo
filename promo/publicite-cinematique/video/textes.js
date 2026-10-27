// Répliques (bulles) et voix off (sous-titres) de la publicité, en secondes.
// J = Junior, B = Boris. Les mots entre *astérisques* sont mis en valeur.
const DIALOG = [
  ["J", 3.0, 5.1, "Même ma chambre est devenue un magasin maintenant…"],
  ["J", 5.1, 7.4, "Tout ça, je n'utilise même plus !"],
  ["B", 17.1, 18.9, "Ko ko ko !"],
  ["B", 19.1, 21.0, "Tu comptes garder tout ça jusqu'à quand ?"],
  ["J", 21.3, 23.4, "Je ne sais même plus quoi en faire !"],
  ["B", 23.7, 25.4, "Mon frère, tu connais Zuvo ?"],
  ["B", 25.5, 28.9, "Tu peux publier tes articles et trouver des gens qui veulent les acheter."],
  ["J", 56.6, 58.4, "Oui, elle est disponible !"],
  ["J", 60.7, 63.3, "Héé, donc mes vieilles affaires avaient encore de la valeur ?!"],
  ["B", 63.4, 65.0, "Je t'avais dit, mon frère !"],
];
const VO = [
  [7.6, 10.0, "On a tous des affaires qu'on n'utilise plus."],
  [10.0, 12.4, "Des vêtements, des chaussures, des téléphones, des accessoires…"],
  [12.6, 16.8, "Pourtant, ce qui dort chez toi peut encore faire le bonheur de quelqu'un d'autre."],
  [29.4, 31.9, "Voici *Zuvo*, la marketplace pensée pour le Cameroun."],
  [32.1, 35.4, "Un endroit où tes affaires peuvent commencer une nouvelle vie."],
  [39.2, 42.6, "Tu prends quelques photos, tu ajoutes le prix"],
  [42.6, 45.6, "et les informations de ton article, puis tu publies ton annonce."],
  [46.8, 50.8, "Les personnes intéressées peuvent découvrir ton article et te contacter."],
  [65.3, 68.4, "Que tu sois étudiant, jeune actif"],
  [68.4, 71.6, "ou simplement quelqu'un qui veut faire de la place chez lui,"],
  [71.6, 74.4, "*Zuvo* te permet de donner une seconde vie à tes affaires"],
  [74.4, 76.9, "et de découvrir de bonnes occasions."],
  [77.3, 79.6, "Alors, avant de laisser tes affaires prendre la poussière,"],
  [79.6, 80.9, "pense à *Zuvo*."],
  [80.9, 82.1, "Publie, découvre, échange…"],
  [82.1, 84.2, "et donne une seconde vie à ce que tu n'utilises plus."],
];

window.TEXTS = { DIALOG, VO };
