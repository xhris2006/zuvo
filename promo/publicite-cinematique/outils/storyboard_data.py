"""Storyboard de la publicité Zuvo : données plan par plan (source unique du
document Markdown et de la planche visuelle)."""

import re

LEGAL = "Scénario fictif. Annonces, prix et messages de démonstration."

SCENES = [
    {
        "n": 1,
        "title": "La chambre et les affaires oubliées",
        "tc": (0, 17),
        "brief_tc": "0–12 s",
        "place": "Chambre d'un jeune actif à Yaoundé (mini-cité) : lit, armoire, chaise, table, ventilateur sur pied, rideaux en tissu imprimé.",
        "light": "Fin d'après-midi, soleil rasant à travers les rideaux, poussière en suspension. Étalonnage chaud et naturel.",
        "intent": "Accrocher en 3 secondes avec une situation que tout le monde connaît, et une pointe d'humour.",
    },
    {
        "n": 2,
        "title": "La découverte de Zuvo",
        "tc": (17, 31),
        "brief_tc": "12–23 s",
        "place": "Même chambre.",
        "light": "Même lumière, caméra épaule plus vivante.",
        "intent": "L'ami apporte la solution ; on présente Zuvo par la parole avant de le montrer.",
    },
    {
        "n": 3,
        "title": "Présentation réelle du site",
        "tc": (31, 51),
        "brief_tc": "23–43 s",
        "place": "Interface réelle (enregistrements d'écran) et chambre, près de la fenêtre.",
        "light": "Lumière naturelle de fenêtre pour la photo de l'article.",
        "intent": "Montrer le vrai site, lisible, et les vraies étapes de publication, sans accélérer au point de les rendre incompréhensibles.",
    },
    {
        "n": 4,
        "title": "Les premiers contacts",
        "tc": (51, 65),
        "brief_tc": "43–60 s",
        "place": "Chambre ; téléphone posé sur le lit.",
        "light": "Fin de journée, première lampe allumée.",
        "intent": "L'émotion : quelqu'un s'intéresse à ses affaires. Messages présentés comme une scène reconstituée, sans résultat chiffré.",
    },
    {
        "n": 5,
        "title": "L'esprit de la communauté camerounaise",
        "tc": (65, 77),
        "brief_tc": "60–72 s",
        "place": "Quatre lieux de vie variés (chambre d'étudiante, pause déjeuner sous un auvent, salon, trajet en taxi).",
        "light": "Jour, lumières naturelles différentes selon les lieux.",
        "intent": "Élargir : Zuvo s'adresse à des profils variés. Aucun compteur, aucun nom de ville à l'écran (le site est en bêta).",
    },
    {
        "n": 6,
        "title": "Conclusion et appel à l'action",
        "tc": (77, 90),
        "brief_tc": "72–90 s",
        "place": "Chambre rangée, puis carte finale en motion design.",
        "light": "Lumière douce du soir, puis fond blanc cassé et bleu Zuvo.",
        "intent": "Boucler l'histoire (la chambre a changé) et laisser une marque claire : logo, signature, adresse, appel à l'action.",
    },
]

# kind : live (tournage), ui (interface réelle), mix (tournage + interface), motion (motion design)
SHOTS = [
    # ------------------------------------------------------------------ scène 1
    dict(
        id="1A", scene=1, tc=(0, 3), kind="live", size="Plan moyen (POV)",
        title="L'armoire s'ouvre",
        image="Vue depuis l'intérieur de l'armoire : les portes s'ouvrent sur Junior (t-shirt blanc), qui découvre une pile de vêtements qu'il ne porte plus. Une chemise glisse de la pile et lui tombe sur l'épaule.",
        camera="Caméra fixe dans l'armoire, grand angle (24 mm), légère contre-plongée.",
        screen=["Option : titre-question en surimpression, mot à mot (0:00,5–0:03) : « Et si ce que tu n'utilises plus pouvait te rapporter de l'argent ? »"],
        sound="Grincement des portes, ambiance du quartier (moto-taxis au loin, radio du voisin). Musique : intro légère (shaker, guitare).",
        comp="wardrobe", mood="golden",
        r16="Même plan : les portes ouvertes cadrent Junior au centre, le décor de la chambre apparaît en arrière-plan.",
    ),
    dict(
        id="1B", scene=1, tc=(3, 7.5), kind="live", size="Plan large",
        title="« Même ma chambre est devenue un magasin »",
        image="Junior se retourne vers la chambre : sur la chaise, des baskets, un sac, un casque audio et quelques accessoires ; sur la table, un ancien téléphone. Le ventilateur tourne, les rideaux bougent.",
        camera="Plan fixe puis léger travelling avant.",
        screen=["Sous-titres incrustés (tout le film)."],
        sound="Ambiance de la chambre, ventilateur.",
        comp="room", mood="golden",
        r16="Le 16:9 montre toute la chambre : chaise à gauche, Junior à droite, fenêtre au fond.",
    ),
    dict(
        id="1C", scene=1, tc=(7.5, 12.5), kind="live", size="Inserts au ralenti",
        title="Les objets mis en valeur",
        image="Inserts successifs : baskets, sac, casque audio, ancien téléphone. Chaque objet reçoit une petite étiquette au style de Zuvo portant sa vraie catégorie du site : « Chaussures », « Sacs & accessoires », « TV, audio & photo », « Téléphones & tablettes ».",
        camera="Slider latéral lent, mise au point qui glisse d'un objet à l'autre, tournage à 60–120 i/s (ralenti).",
        screen=["Étiquettes de catégories (icône + nom réels du site), sans prix."],
        sound="Chaque coupe tombe sur un temps de la musique.",
        comp="inserts", mood="golden",
        r16="Les quatre objets peuvent apparaître côte à côte en écran partagé (4 colonnes).",
    ),
    dict(
        id="1D", scene=1, tc=(12.5, 17), kind="live", size="Plan rapproché",
        title="« Ce qui dort chez toi… »",
        image="Junior s'assoit sur le bord du lit et regarde la chaise chargée, pensif ; la lumière dorée glisse sur son visage.",
        camera="Travelling avant très lent.",
        screen=[],
        sound="À la fin du plan : on frappe à la porte.",
        comp="closeup", mood="golden",
        r16="Junior sur le tiers droit, la chaise floue au premier plan à gauche.",
    ),
    # ------------------------------------------------------------------ scène 2
    dict(
        id="2A", scene=2, tc=(17, 19), kind="live", size="Plan moyen",
        title="Boris entre",
        image="La porte s'ouvre : Boris (casquette, chemise en pagne aux tons bleus) passe la tête, puis entre et s'arrête net devant la chaise.",
        camera="Caméra épaule, depuis l'intérieur de la chambre.",
        screen=[],
        sound="Porte, pas.",
        comp="door", mood="golden",
        r16="Porte à gauche du cadre, Junior assis à droite.",
    ),
    dict(
        id="2B", scene=2, tc=(19, 21), kind="live", size="Plan rapproché",
        title="« Jusqu'à quand ? »",
        image="Boris soulève une basket du bout des doigts, sourire moqueur.",
        camera="Caméra épaule, léger recadrage sur la basket.",
        screen=[],
        sound="",
        comp="single_shoe", mood="golden",
        r16="Identique, plus d'air autour de Boris.",
    ),
    dict(
        id="2C", scene=2, tc=(21, 23.5), kind="live", size="Plan rapproché (contrechamp)",
        title="« Je ne sais même plus quoi en faire ! »",
        image="Junior ouvre les bras, mi-dépité, mi-amusé.",
        camera="Contrechamp, caméra épaule.",
        screen=[],
        sound="",
        comp="reverse", mood="golden",
        r16="Identique.",
    ),
    dict(
        id="2D", scene=2, tc=(23.5, 29), kind="mix", size="Plan à deux + insert écran",
        title="« Mon frère, tu connais Zuvo ? »",
        image="Boris s'assoit à côté de Junior, sort son téléphone et lui montre le site. Junior se rapproche de l'écran, intrigué. Insert par-dessus l'épaule : page d'accueil réelle de Zuvo.",
        camera="Plan à deux en caméra épaule, puis insert par-dessus l'épaule sur l'écran (interface incrustée en post-production).",
        screen=["Écran du téléphone : page d'accueil réelle."],
        sound="Petite pause musicale sur « tu connais Zuvo ? ».",
        comp="two_phone", mood="golden", screens=["02-accueil"],
        r16="Plan à deux en entier, l'écran du téléphone lisible au centre.",
    ),
    dict(
        id="2E", scene=2, tc=(29, 31), kind="motion", size="Transition motion design",
        title="Le logo Zuvo",
        image="Travelling avant dans l'écran du téléphone ; le cadre devient blanc cassé et le logo Zuvo se construit : carré bleu, tracé du Z, pastille bleu clair.",
        camera="Zoom raccord (de la caméra vers l'écran), puis animation 2D.",
        screen=["Logo Zuvo animé."],
        sound="Souffle + impact musical sur l'apparition du logo.",
        comp="logo", mood="brand",
        r16="Logo centré, même animation.",
    ),
    # ------------------------------------------------------------------ scène 3
    dict(
        id="3A", scene=3, tc=(31, 34), kind="ui", size="Interface réelle",
        title="Accueil et annonces",
        image="Junior a maintenant le téléphone en main. Page d'accueil réelle : logo, « Rechercher un article… », « Recommandé pour vous », « Annonces récentes » ; défilement doux, puis balayage des photos d'une annonce dans le fil.",
        camera="Enregistrement d'écran plein cadre, dans un téléphone qui flotte légèrement (motion design).",
        screen=[LEGAL + " (bas d'écran, de 0:31 à 1:05)"],
        sound="Sons d'interface discrets (défilement, toucher).",
        comp="ui", mood="brand", screens=["02-accueil", "02b-accueil-fil"],
        r16="Option : version ordinateur du site (barre latérale) pour ce plan.",
    ),
    dict(
        id="3B", scene=3, tc=(34, 36.5), kind="ui", size="Interface réelle",
        title="Recherche et catégories",
        image="Explorer : onglets Articles / Boutiques, catégories réelles ; saisie de « baskets » dans la recherche, résultats.",
        camera="Enregistrement d'écran ; zoom doux sur la grille des catégories.",
        screen=[],
        sound="Frappe au clavier discrète.",
        comp="ui", mood="brand", screens=["03-explorer", "04-recherche"],
        r16="Écran partagé : catégories à gauche, résultats à droite.",
    ),
    dict(
        id="3C", scene=3, tc=(36.5, 39), kind="ui", size="Interface réelle",
        title="Fiche produit",
        image="Fiche d'une annonce de démonstration : photo, « Très bon état », titre, prix, ville, « Publiée… », vendeur, bouton « Contacter le vendeur ».",
        camera="Enregistrement d'écran ; léger zoom sur le prix et l'état.",
        screen=["Prix : montant à valider, sinon flouté (comme sur cette planche)."],
        sound="",
        comp="ui", mood="brand", screens=["15-annonce-vue-acheteur"],
        r16="Téléphone à droite, infos clés reprises en texte à gauche.",
    ),
    dict(
        id="3D", scene=3, tc=(39, 41), kind="live", size="Plan rapproché",
        title="1. Prends tes photos",
        image="Junior pose ses baskets sur le rebord de la fenêtre, en pleine lumière, et les photographie avec son téléphone.",
        camera="Plan rapproché par-dessus l'épaule, puis insert sur l'écran de l'appareil photo.",
        screen=["« 1. Prends tes photos »"],
        sound="Déclencheur photo, léger flash blanc.",
        comp="photo", mood="day",
        r16="Junior à gauche, la fenêtre et les baskets à droite.",
    ),
    dict(
        id="3E", scene=3, tc=(41, 45.5), kind="ui", size="Interface réelle (accéléré lisible)",
        title="2. Publie ton annonce",
        image="Parcours réel « Vendre un article », environ une seconde par étape : Photos (photo « Principale ») → Description (titre) → Catégorie et état (« Chaussures », « Très bon état ») → Prix et lieu (prix, « Yaoundé ») → Vérification. La barre « Étape x sur 5 » progresse.",
        camera="Enregistrement d'écran ; transitions latérales identiques à celles du site.",
        screen=["« 2. Publie ton annonce »", "Puces animées reprenant les vrais champs : Titre · Description · Catégorie · État · Prix · Ville"],
        sound="Un « clic » doux à chaque « Continuer ».",
        comp="ui", mood="brand", screens=["06-vendre-photo", "07-vendre-description", "08-vendre-categorie", "09-vendre-prix", "10-vendre-verification"],
        r16="Les cinq étapes en frise horizontale, l'étape active agrandie.",
    ),
    dict(
        id="3F", scene=3, tc=(45.5, 47.5), kind="mix", size="Insert macro + interface",
        title="« Publier l'annonce »",
        image="Gros plan du pouce qui touche « Publier l'annonce », puis la page de l'annonce publiée : « Publiée à l'instant », panneau « Gérer mon annonce ».",
        camera="Macro (100 mm) sur le pouce, raccord sur l'enregistrement d'écran.",
        screen=[],
        sound="Montée musicale puis impact sur le toucher (première montée demandée).",
        comp="thumb", mood="brand", screens=["10-vendre-verification", "11-annonce-publiee"],
        r16="Identique, téléphone centré.",
    ),
    dict(
        id="3G", scene=3, tc=(47.5, 51), kind="ui", size="Interface réelle",
        title="3. Échange avec les acheteurs",
        image="La même annonce vue par un acheteur, avec le bouton « Contacter le vendeur ».",
        camera="Enregistrement d'écran, léger zoom sur le bouton.",
        screen=["« 3. Échange avec les acheteurs »"],
        sound="",
        comp="ui", mood="brand", screens=["15-annonce-vue-acheteur"],
        r16="Les trois étapes restent affichées à gauche, cochées.",
    ),
    # ------------------------------------------------------------------ scène 4
    dict(
        id="4A", scene=4, tc=(51, 53.5), kind="mix", size="Montage elliptique",
        title="Il reprend ses activités",
        image="Coupes rapides : Junior photographie aussi l'ancien téléphone et une chemise ; son profil affiche « Mes annonces ». Il pose le téléphone sur le lit et commence à ranger ; Boris grignote des arachides.",
        camera="Jump cuts sur le même axe, plan fixe large.",
        screen=["Écran : profil réel, onglet « Mes annonces »."],
        sound="Musique en groove régulier.",
        comp="tidy", mood="evening", screens=["14-profil-en-vente"],
        r16="Identique.",
    ),
    dict(
        id="4B", scene=4, tc=(53.5, 56.5), kind="mix", size="Gros plan + interface",
        title="Le premier message",
        image="Le téléphone vibre sur le lit. Gros plan : badge rouge sur « Messages ». Junior ouvre la conversation (message lisible au moins 2 secondes).",
        camera="Gros plan du téléphone, puis enregistrement d'écran.",
        screen=["Message (scène reconstituée) : « Bonjour, votre paire de chaussures est-elle toujours disponible ? »"],
        sound="Vibration, petite note musicale. Pas de bannière push par défaut (voir points à valider).",
        comp="phone_bed", mood="evening", screens=["13-conversation"],
        r16="Téléphone et visage de Junior dans le même cadre.",
    ),
    dict(
        id="4C", scene=4, tc=(56.5, 58.5), kind="mix", size="Plan rapproché + interface",
        title="« Oui, elle est disponible ! »",
        image="Junior sourit et répond ; la bulle bleue part dans la conversation.",
        camera="Plan rapproché, raccord sur l'écran.",
        screen=["Réponse affichée dans la conversation."],
        sound="Son d'envoi discret.",
        comp="reverse", mood="evening", screens=["13-conversation"],
        r16="Écran partagé : visage / conversation.",
    ),
    dict(
        id="4D", scene=4, tc=(58.5, 60.5), kind="ui", size="Interface réelle",
        title="Un second acheteur",
        image="Nouvelle vibration : une deuxième conversation apparaît dans « Messages », pour l'ancien téléphone.",
        camera="Enregistrement d'écran de la boîte de réception.",
        screen=["Message (scène reconstituée) : « Bonsoir, je suis intéressée par le téléphone. »"],
        sound="Vibration, deuxième note (la musique monte).",
        comp="ui", mood="brand", screens=["12-messages"],
        r16="Identique.",
    ),
    dict(
        id="4E", scene=4, tc=(60.5, 65), kind="live", size="Plan à deux",
        title="« Je t'avais dit, mon frère ! »",
        image="Junior se tourne vers Boris, surpris et amusé. Boris, la bouche pleine, sourit.",
        camera="Plan à deux fixe, réactions naturelles (laisser jouer).",
        screen=[],
        sound="Montée musicale vers la scène 5.",
        comp="two_laugh", mood="evening",
        r16="Identique, la chambre visible autour d'eux.",
    ),
    # ------------------------------------------------------------------ scène 5
    dict(
        id="5A", scene=5, tc=(65, 68), kind="mix", size="Plan rapproché",
        title="L'étudiante",
        image="Une étudiante (chambre de cité universitaire, style décontracté) photographie un sac à main posé sur son lit ; insert sur l'étape « Photos ».",
        camera="Plan rapproché, caméra épaule.",
        screen=[],
        sound="Montage sur les temps, musique pleine.",
        comp="m_bag", mood="day", screens=["06-vendre-photo"],
        r16="Personnage à gauche, écran à droite.",
    ),
    dict(
        id="5B", scene=5, tc=(68, 71), kind="mix", size="Plan moyen",
        title="Le jeune actif",
        image="Un jeune actif (chemise, pause déjeuner sous un auvent) consulte des chaussures sur son téléphone dans Explorer.",
        camera="Plan moyen, léger travelling latéral.",
        screen=[],
        sound="",
        comp="m_shoes", mood="day", screens=["04-recherche"],
        r16="Identique.",
    ),
    dict(
        id="5C", scene=5, tc=(71, 74), kind="live", size="Plan rapproché",
        title="L'appareil électronique",
        image="Une femme d'une quarantaine d'années, dans son salon, photographie une enceinte sur une table bien éclairée.",
        camera="Plan rapproché, mise au point sur l'enceinte.",
        screen=[],
        sound="",
        comp="m_speaker", mood="day",
        r16="Identique.",
    ),
    dict(
        id="5D", scene=5, tc=(74, 77), kind="mix", size="Plan rapproché",
        title="L'acheteur",
        image="Un jeune homme, à l'arrière d'un taxi, découvre une annonce qui l'intéresse et touche le cœur pour l'ajouter à ses favoris ; il sourit.",
        camera="Plan rapproché, lumière qui défile sur son visage.",
        screen=[],
        sound="",
        comp="m_heart", mood="day", screens=["15-annonce-vue-acheteur"],
        r16="Identique.",
    ),
    # ------------------------------------------------------------------ scène 6
    dict(
        id="6A", scene=6, tc=(77, 80), kind="live", size="Plan large",
        title="La chambre rangée",
        image="La chaise est libre, l'armoire en ordre, le ventilateur tourne. Junior, allongé sur le lit, consulte Zuvo et sourit.",
        camera="Plan large fixe, même axe que le plan 1B (avant / après).",
        screen=[],
        sound="Musique allégée sous la voix.",
        comp="room_tidy", mood="evening",
        r16="Même axe que 1B : l'effet avant / après est encore plus lisible en 16:9.",
    ),
    dict(
        id="6B", scene=6, tc=(80, 83), kind="motion", size="Transition motion design",
        title="Le logo au centre",
        image="Junior tourne son téléphone vers la caméra, l'écran envahit le cadre ; le logo Zuvo apparaît au centre avec l'animation de marque.",
        camera="Raccord écran, puis animation 2D.",
        screen=["Logo Zuvo."],
        sound="Impact doux + scintillement sur la pastille du logo.",
        comp="logo", mood="brand",
        r16="Identique.",
    ),
    dict(
        id="6C", scene=6, tc=(83, 90), kind="motion", size="Carte finale",
        title="Appel à l'action",
        image="Carte finale sur blanc cassé : ZUVO, « La seconde vie de tes affaires. », « Le marché de la seconde main pensé pour le Cameroun. », adresse du site, « Découvre Zuvo dès maintenant. ».",
        camera="Animation 2D, textes qui entrent l'un après l'autre.",
        screen=["ZUVO", "« La seconde vie de tes affaires. »", "« Le marché de la seconde main pensé pour le Cameroun. »", "[URL OFFICIELLE DE ZUVO À INSÉRER]", "« Découvre Zuvo dès maintenant. »"],
        sound="Accord final, la musique se résout ; dernière seconde silencieuse.",
        comp="endcard", mood="brand",
        r16="Mise en page horizontale (voir images de référence).",
    ),
]


# Bande voix : (début, fin, qui, texte), en secondes.
VOICE = [
    (3.0, 7.4, "Junior", "Même ma chambre est devenue un magasin maintenant… Tout ça, je n'utilise même plus !"),
    (7.6, 12.3, "Voix off", "On a tous des affaires qu'on n'utilise plus. Des vêtements, des chaussures, des téléphones, des accessoires…"),
    (12.6, 16.8, "Voix off", "Pourtant, ce qui dort chez toi peut encore faire le bonheur de quelqu'un d'autre."),
    (17.1, 18.0, "Boris", "Ko ko ko !"),
    (19.1, 21.0, "Boris", "Tu comptes garder tout ça jusqu'à quand ?"),
    (21.3, 23.4, "Junior", "Je ne sais même plus quoi en faire !"),
    (23.7, 28.9, "Boris", "Mon frère, tu connais Zuvo ? Tu peux publier tes articles et trouver des gens qui veulent les acheter."),
    (29.4, 31.9, "Voix off", "Voici Zuvo, la marketplace pensée pour le Cameroun."),
    (32.2, 35.4, "Voix off", "Un endroit où tes affaires peuvent commencer une nouvelle vie."),
    (39.2, 45.6, "Voix off", "Tu prends quelques photos, tu ajoutes le prix et les informations de ton article, puis tu publies ton annonce."),
    (46.8, 50.8, "Voix off", "Les personnes intéressées peuvent découvrir ton article et te contacter."),
    (56.8, 58.3, "Junior", "Oui, elle est disponible !"),
    (60.8, 63.4, "Junior", "Héé, donc mes vieilles affaires avaient encore de la valeur ?!"),
    (63.6, 64.9, "Boris", "Je t'avais dit, mon frère !"),
    (65.3, 76.8, "Voix off", "Que tu sois étudiant, jeune actif ou simplement quelqu'un qui veut faire de la place chez lui, Zuvo te permet de donner une seconde vie à tes affaires et de découvrir de bonnes occasions."),
    (77.3, 87.0, "Voix off", "Alors, avant de laisser tes affaires prendre la poussière, pense à Zuvo. Publie, découvre, échange… et donne une seconde vie à ce que tu n'utilises plus."),
]


def words(text: str) -> int:
    return len(re.findall(r"[\wÀ-ÿ'’-]+", text))


def lines_of(shot: dict) -> list:
    """Répliques qui commencent pendant le plan."""
    start, end = shot["tc"]
    return [v for v in VOICE if start <= v[0] < end]


def fmt(t: float) -> str:
    whole = int(t)
    m, s = divmod(whole, 60)
    out = f"{m}:{s:02d}"
    if t != whole:
        out += f",{int(round((t - whole) * 10))}"
    return out


def check() -> None:
    """Contrôle de cohérence : plans contigus, rattachés à la bonne scène."""
    previous = 0
    for shot in SHOTS:
        start, end = shot["tc"]
        assert start == previous, (shot["id"], start, previous)
        assert end > start
        scene = SCENES[shot["scene"] - 1]
        assert scene["tc"][0] <= start and end <= scene["tc"][1], shot["id"]
        previous = end
    assert previous == SCENES[-1]["tc"][1]
    for start, end, who, text in VOICE:
        assert end > start
        assert words(text) / (end - start) <= 4.0, (text, words(text) / (end - start))
    for a, b in zip(VOICE, VOICE[1:]):
        assert a[1] <= b[0], (a, b)


check()
