"""Génère storyboard.md et la planche visuelle (planche/storyboard.html) à partir
de storyboard_data.py. Avec un dossier de captures PNG en argument, met aussi à
jour les écrans (ecrans/*.jpg).

    python3 promo/publicite-cinematique/outils/build.py [dossier-captures]
    node promo/publicite-cinematique/outils/render.mjs   # images de référence + PDF
"""
import html
import re
import sys
from pathlib import Path

from PIL import Image

HERE = Path(__file__).parent
sys.path.insert(0, str(HERE))
from storyboard_data import LEGAL, SCENES, SHOTS, VOICE, fmt, lines_of, words  # noqa: E402

OUT = HERE.parent
LUCIDE = OUT.parents[1] / "node_modules/lucide-react/dist/esm/icons"

BLUE, BLUE_DARK, INK, PAPER, LIGHT, TINT = "#1f5fe0", "#1a4dbb", "#0f1b2d", "#f7f9fc", "#bfd5fd", "#eff5ff"
LOGO = (
    '<svg viewBox="0 0 32 32" aria-hidden="true"><rect width="32" height="32" rx="9" fill="#1f5fe0"/>'
    '<path d="M10 10.5h12l-12 11h12" fill="none" stroke="#fff" stroke-width="2.6" stroke-linecap="round" '
    'stroke-linejoin="round"/><circle cx="23.5" cy="8.5" r="2" fill="#bfd5fd"/></svg>'
)
SCREEN_LABELS = {
    "01-bienvenue": "Bienvenue (visiteur)",
    "02-accueil": "Accueil",
    "02b-accueil-fil": "Accueil — fil des annonces",
    "03-explorer": "Explorer — catégories",
    "04-recherche": "Recherche « baskets »",
    "05-vendre-etape1": "Vendre — étape 1 (vide)",
    "06-vendre-photo": "Vendre — 1/5 Photos",
    "07-vendre-description": "Vendre — 2/5 Description",
    "08-vendre-categorie": "Vendre — 3/5 Catégorie",
    "08b-vendre-etat": "Vendre — 3/5 État",
    "09-vendre-prix": "Vendre — 4/5 Prix et lieu",
    "10-vendre-verification": "Vendre — 5/5 Vérification",
    "11-annonce-publiee": "Annonce publiée (vendeur)",
    "12-messages": "Messages",
    "13-conversation": "Conversation",
    "14-profil-en-vente": "Profil — Mes annonces",
    "15-annonce-vue-acheteur": "Annonce (acheteur)",
}


def esc(text: str) -> str:
    return html.escape(text, quote=True)


# ----------------------------------------------------------------- icônes
def icon(name: str, x: float, y: float, size: float, color: str = "#fff", width: float = 1.6, opacity: float = 1) -> str:
    """Icône Lucide (celles du site) placée dans un SVG."""
    src = (LUCIDE / f"{name}.mjs").read_text()
    node = src[src.index("node: [") :]
    parts = []
    for tag, attrs in re.findall(r'\[\s*"(\w+)",\s*\{([^}]*)\}', node):
        pairs = re.findall(r'(\w+):\s*"([^"]*)"', attrs)
        attr = " ".join(f'{k}="{v}"' for k, v in pairs if k != "key")
        parts.append(f"<{tag} {attr}/>")
    scale = size / 24
    return (
        f'<g transform="translate({x - size / 2:.2f} {y - size / 2:.2f}) scale({scale:.4f})" fill="none" '
        f'stroke="{color}" stroke-width="{width / scale * scale:.2f}" stroke-linecap="round" '
        f'stroke-linejoin="round" opacity="{opacity}">{"".join(parts)}</g>'
    )


# ----------------------------------------------------------------- cadres « tournage »
MOODS = {
    "golden": ("#f3b779", "#b8693a", "#4a2716"),
    "evening": ("#e7a06a", "#8a4f45", "#2c1b2b"),
    "day": ("#e8eef2", "#c7b08a", "#5d4a33"),
    "brand": (TINT, PAPER, "#dbe8fe"),
}


def bust(x: float, y: float, r: float, fill: str = "#1d1410", opacity: float = 0.82) -> str:
    return (
        f'<g fill="{fill}" opacity="{opacity}"><circle cx="{x}" cy="{y}" r="{r}"/>'
        f'<path d="M{x - 2.3 * r} {y + 4.2 * r} C{x - 2.3 * r} {y + 1.7 * r} {x - 1.3 * r} {y + 1.3 * r} {x} {y + 1.3 * r} '
        f'C{x + 1.3 * r} {y + 1.3 * r} {x + 2.3 * r} {y + 1.7 * r} {x + 2.3 * r} {y + 4.2 * r} Z"/></g>'
    )


def standing(x: float, top: float, h: float, fill: str = "#1d1410", opacity: float = 0.82) -> str:
    r = h * 0.075
    body = top + 2.3 * r
    return (
        f'<g fill="{fill}" opacity="{opacity}"><circle cx="{x}" cy="{top + r}" r="{r}"/>'
        f'<path d="M{x - 1.7 * r} {top + h} L{x - 1.9 * r} {body + 2 * r} Q{x - 1.9 * r} {body} {x} {body} '
        f'Q{x + 1.9 * r} {body} {x + 1.9 * r} {body + 2 * r} L{x + 1.7 * r} {top + h} Z"/></g>'
    )


def window(x, y, w, h, glow="#fff4dc"):
    return (
        f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="1.5" fill="{glow}" opacity=".55"/>'
        f'<line x1="{x + w / 2}" y1="{y}" x2="{x + w / 2}" y2="{y + h}" stroke="#7a4a2a" stroke-width=".8" opacity=".4"/>'
    )


def chip(x, y, label, ico):
    w = 7 + len(label) * 2.15
    return (
        f'<g><rect x="{x - w / 2}" y="{y - 3.6}" width="{w}" height="7.2" rx="3.6" fill="#fff" opacity=".95"/>'
        + icon(ico, x - w / 2 + 4, y, 4.2, BLUE, 1.8)
        + f'<text x="{x - w / 2 + 7}" y="{y + 1.35}" font-size="3.6" font-weight="600" fill="{INK}">{esc(label)}</text></g>'
    )


def comp_svg(comp: str) -> str:
    c = []
    if comp == "wardrobe":
        c += [bust(45, 70, 10), icon("shirt", 59, 62, 12, "#fff", 1.4, 0.9)]
        c += ['<rect x="0" y="0" width="17" height="160" fill="#2a170d" opacity=".88"/>',
              '<rect x="73" y="0" width="17" height="160" fill="#2a170d" opacity=".88"/>',
              '<line x1="17" y1="12" x2="73" y2="12" stroke="#2a170d" stroke-width="2" opacity=".7"/>']
    elif comp == "room":
        c += [window(56, 18, 26, 42), icon("armchair", 20, 112, 26, "#2a170d", 1.6, 0.75),
              icon("footprints", 13, 95, 8), icon("handbag", 22, 93, 8), icon("headphones", 30, 96, 8),
              icon("fan", 72, 104, 15, "#2a170d", 1.4, 0.7), icon("smartphone", 46, 122, 6, "#fff", 1.4, 0.8),
              standing(60, 62, 72)]
    elif comp == "inserts":
        items = [("footprints", "Chaussures", "footprints"), ("handbag", "Sacs & accessoires", "glasses"),
                 ("headphones", "TV, audio & photo", "tv"), ("smartphone", "Téléphones & tablettes", "smartphone")]
        for i, (obj, label, ico) in enumerate(items):
            y = 24 + i * 36
            c += [icon(obj, 45, y, 17, "#fff", 1.3, 0.95), chip(45, y + 14, label, ico)]
    elif comp == "closeup":
        c += ['<rect x="0" y="40" width="90" height="26" fill="#ffd9a0" opacity=".25" transform="rotate(-18 45 53)"/>',
              bust(56, 62, 19)]
    elif comp == "door":
        c += ['<rect x="4" y="22" width="30" height="118" fill="#3a2214" opacity=".75"/>',
              '<rect x="9" y="27" width="20" height="113" fill="#ffe1b3" opacity=".5"/>',
              standing(19, 36, 104), bust(70, 104, 7)]
    elif comp == "single_shoe":
        c += [bust(38, 76, 17), icon("footprints", 66, 46, 18, "#fff", 1.4)]
    elif comp == "reverse":
        c += [bust(50, 74, 18), '<path d="M14 62 l-6 -4 M14 70 l-7 0 M76 62 l6 -4 M76 70 l7 0" stroke="#fff" stroke-width="1.2" opacity=".8"/>']
    elif comp == "two_phone":
        c += [bust(28, 82, 13), bust(63, 84, 13, "#2a1d16"),
              '<rect x="40" y="96" width="11" height="20" rx="2" fill="#bcd4ff" opacity=".9"/>',
              '<circle cx="45.5" cy="106" r="16" fill="#9cc0ff" opacity=".18"/>']
    elif comp == "photo":
        c += [window(46, 14, 40, 70, "#ffffff"), icon("footprints", 66, 74, 15, INK, 1.5, 0.85),
              bust(20, 92, 14), '<rect x="30" y="80" width="14" height="25" rx="2.5" fill="#0f1b2d" opacity=".9"/>',
              icon("camera", 37, 92.5, 8, "#fff", 1.6)]
    elif comp == "thumb":
        c += [f'<rect x="8" y="62" width="74" height="24" rx="12" fill="{BLUE}"/>',
              '<text x="45" y="76.5" font-size="6.2" font-weight="700" fill="#fff" text-anchor="middle">Publier l&#39;annonce</text>',
              '<ellipse cx="60" cy="104" rx="15" ry="24" fill="#5a3826" opacity=".95" transform="rotate(-25 60 104)"/>',
              '<circle cx="50" cy="74" r="9" fill="#fff" opacity=".25"/>']
    elif comp == "phone_bed":
        c += ['<rect x="0" y="96" width="90" height="64" fill="#e9dcc8" opacity=".55"/>',
              '<rect x="34" y="104" width="22" height="40" rx="3.5" fill="#0f1b2d" transform="rotate(-8 45 124)"/>',
              '<path d="M28 110 q-4 6 0 12 M23 106 q-6 10 0 20 M62 110 q4 6 0 12 M67 106 q6 10 0 20" stroke="#fff" stroke-width="1.2" fill="none" opacity=".85"/>',
              icon("message-circle", 45, 120, 9, "#fff", 1.8), '<circle cx="50" cy="114.5" r="2.4" fill="#e5484d"/>',
              bust(30, 44, 10, "#2a1d16", 0.6), bust(62, 46, 10, "#2a1d16", 0.6)]
    elif comp == "two_laugh":
        c += [bust(28, 78, 15), bust(64, 80, 15, "#2a1d16"), icon("sparkles", 46, 52, 12, "#fff", 1.4, 0.9)]
    elif comp == "tidy":
        c += [window(58, 16, 24, 40), standing(30, 60, 76), icon("shirt", 42, 92, 10, "#fff", 1.4, 0.85),
              bust(70, 106, 8, "#2a1d16"), icon("smartphone", 66, 132, 6, "#fff", 1.4, 0.8)]
    elif comp.startswith("m_"):
        obj = {"m_bag": "handbag", "m_shoes": "footprints", "m_speaker": "speaker", "m_heart": "heart"}[comp]
        tone = {"m_bag": "#3a2a40", "m_shoes": "#22303f", "m_speaker": "#3b2a1c", "m_heart": "#1f2b25"}[comp]
        c += [bust(34, 70, 15, tone), '<rect x="54" y="78" width="16" height="28" rx="3" fill="#0f1b2d" opacity=".9"/>',
              icon(obj, 62, 92, 9, "#fff" if comp != "m_heart" else "#ff6b6b", 1.6)]
        if comp in ("m_bag", "m_speaker"):
            c.append(icon("camera", 62, 70, 8, INK, 1.6, 0.8))
    elif comp == "room_tidy":
        c += [window(56, 18, 26, 42), icon("armchair", 20, 112, 24, "#2a170d", 1.6, 0.7),
              icon("fan", 72, 104, 15, "#2a170d", 1.4, 0.7),
              '<rect x="30" y="118" width="56" height="16" rx="3" fill="#e9dcc8" opacity=".7"/>',
              f'<g transform="rotate(-80 52 116)">{bust(52, 116, 7)}</g>',
              '<rect x="58" y="110" width="5" height="8" rx="1" fill="#bcd4ff"/>']
    return "".join(c)


def frame_live(comp: str, mood: str, size: str, inset: str | None = None) -> str:
    a, b, d = MOODS[mood]
    grid = "".join(
        f'<line x1="{x}" y1="0" x2="{x}" y2="160" stroke="#fff" stroke-width=".25" opacity=".35"/>' for x in (30, 60)
    ) + "".join(
        f'<line x1="0" y1="{y}" x2="90" y2="{y}" stroke="#fff" stroke-width=".25" opacity=".35"/>' for y in (53.3, 106.6)
    )
    svg = (
        f'<svg viewBox="0 0 90 160" class="frame-svg" aria-hidden="true"><defs><linearGradient id="g{comp}{mood}" x1="0" y1="0" x2=".4" y2="1">'
        f'<stop offset="0" stop-color="{a}"/><stop offset=".55" stop-color="{b}"/><stop offset="1" stop-color="{d}"/></linearGradient></defs>'
        f'<rect width="90" height="160" fill="url(#g{comp}{mood})"/>{grid}{comp_svg(comp)}</svg>'
    )
    tag = f'<span class="frame-tag">{esc(size)}</span>'
    inset_html = f'<img class="inset" src="../ecrans/{inset}.jpg" alt="">' if inset else ""
    return f'<div class="frame live">{svg}{tag}{inset_html}</div>'


def frame_ui(screen: str, size: str) -> str:
    return (
        f'<div class="frame ui"><div class="phone"><img src="../ecrans/{screen}.jpg" alt=""></div>'
        f'<span class="frame-tag tag-ui">{esc(size)}</span></div>'
    )


def frame_motion(comp: str, size: str) -> str:
    if comp == "logo":
        inner = f'<div class="m-logo">{LOGO}</div>'
    else:
        inner = (
            f'<div class="m-end"><div class="m-mark">{LOGO}<b>Zuvo</b></div>'
            '<p class="m-tag">La seconde vie de tes affaires.</p>'
            '<p class="m-sub">Le marché de la seconde main pensé pour le Cameroun.</p>'
            '<p class="m-url">[URL officielle à insérer]</p><p class="m-cta">Découvre Zuvo dès maintenant.</p></div>'
        )
    return f'<div class="frame motion">{inner}<span class="frame-tag tag-ui">{esc(size)}</span></div>'


def overlay_text(shot: dict) -> str:
    """Textes d'étape (« 1. Prends tes photos »…) posés sur le cadre."""
    steps = [t for t in shot["screen"] if re.match(r"« \d\. ", t)]
    out = "".join(f'<span class="step-pill">{esc(t.strip("« »"))}</span>' for t in steps)
    legal = '<span class="legal">' + esc(LEGAL) + "</span>" if 31 <= shot["tc"][0] < 65 else ""
    return (f'<div class="overlay">{out}</div>' if out else "") + legal


def frame(shot: dict) -> str:
    screens = shot.get("screens", [])
    if shot["kind"] == "ui":
        body = frame_ui(screens[0], shot["size"])
    elif shot["kind"] == "motion":
        body = frame_motion(shot["comp"], shot["size"])
    else:
        body = frame_live(shot["comp"], shot["mood"], shot["size"], screens[-1] if shot["kind"] == "mix" and screens else None)
    return body.replace('<span class="frame-tag', overlay_text(shot) + '<span class="frame-tag', 1)


# ----------------------------------------------------------------- planche HTML
def shot_card(shot: dict) -> str:
    start, end = shot["tc"]
    kind = {"live": "Tournage", "ui": "Interface réelle", "mix": "Tournage + interface", "motion": "Motion design"}[shot["kind"]]
    rows = [("Image", shot["image"]), ("Caméra", shot["camera"])]
    for _, _, who, text in lines_of(shot):
        rows.append((who, f"« {text} »"))
    for text in shot["screen"]:
        rows.append(("À l'écran", text))
    if shot["sound"]:
        rows.append(("Son", shot["sound"]))
    if shot.get("screens"):
        rows.append(("Écrans", " → ".join(SCREEN_LABELS[s] for s in shot["screens"])))
    rows.append(("16:9", shot["r16"]))
    details = "".join(f'<div class="row"><dt>{esc(k)}</dt><dd>{esc(v)}</dd></div>' for k, v in rows)
    return (
        f'<article class="card">{frame(shot)}<div class="meta"><div class="head"><b>{shot["id"]}</b>'
        f'<span>{fmt(start)} – {fmt(end)}</span><span class="dur">{end - start:g} s</span></div>'
        f'<h3>{esc(shot["title"])}</h3><p class="kind">{kind}</p><dl>{details}</dl></div></article>'
    )


def page(content: str, n: int, extra: str = "") -> str:
    return (
        f'<section class="page {extra}"><header class="runner"><span class="brand">{LOGO}Zuvo · Publicité « Et si ce que tu n\'utilises plus… »</span>'
        f'<span>Storyboard v1 — proposition à valider — aucune vidéo rendue</span><span>{n}</span></header>{content}</section>'
    )


def timeline_bar() -> str:
    total = SCENES[-1]["tc"][1]
    colors = ["#c98652", "#b0703f", BLUE, "#8a5a7a", "#3f8a6b", BLUE_DARK]
    segs = "".join(
        f'<div class="seg" style="flex:{s["tc"][1] - s["tc"][0]};background:{colors[i]}"><b>{s["n"]}</b>'
        f'<span>{esc(s["title"])}</span><em>{fmt(s["tc"][0])}–{fmt(s["tc"][1])}</em></div>'
        for i, s in enumerate(SCENES)
    )
    voice = "".join(
        f'<i class="{"vo" if who == "Voix off" else "dlg"}" style="left:{a / total * 100:.2f}%;width:{(b - a) / total * 100:.2f}%"></i>'
        for a, b, who, _ in VOICE
    )
    music = [(0, 1), (17, 2), (31, 3), (45.5, 4), (47.5, 3.5), (65, 4), (77, 2), (87, 1)]
    pts = " ".join(f"{t / total * 1000:.1f},{40 - v * 8:.1f}" for t, v in music) + " 1000,32"
    return (
        f'<div class="timeline"><div class="segs">{segs}</div>'
        f'<div class="lane"><span class="lane-label">Voix</span><div class="track">{voice}</div></div>'
        f'<div class="lane"><span class="lane-label">Musique</span><div class="track"><svg viewBox="0 0 1000 40" preserveAspectRatio="none">'
        f'<polyline points="{pts}" fill="none" stroke="{BLUE}" stroke-width="2.5"/></svg></div></div>'
        f'<p class="legend"><i class="dlg"></i> dialogues <i class="vo"></i> voix off — courbe : intensité musicale (montées à la publication et aux premiers messages)</p></div>'
    )


def build_html() -> str:
    pages = []
    n = 1
    cover = f"""
<div class="cover">
  <div class="cover-mark">{LOGO}<b>Zuvo</b></div>
  <p class="kicker">Publicité cinématographique · storyboard</p>
  <h1>Et si ce que tu n'utilises plus pouvait te rapporter de l'argent&nbsp;?</h1>
  <ul class="facts">
    <li><b>90 s</b> durée totale</li><li><b>9:16</b> format principal · adaptation 16:9</li>
    <li><b>6</b> scènes · <b>{len(SHOTS)}</b> plans</li><li><b>FR</b> français parlé au Cameroun</li>
  </ul>
  <p class="status">Proposition à valider avant production. Aucune vidéo n'a été rendue.
  Les écrans sont de vraies captures de l'application (environnement de démonstration local, données fictives, prix floutés en attente de validation).
  Les cadres « tournage » sont des schémas de cadrage, pas des images finales.</p>
</div>"""
    pages.append(page(cover, n, "cover-page"))
    n += 1

    synth = f"""
<h2>L'histoire en une phrase</h2>
<p class="lead">Junior, jeune actif de Yaoundé, étouffe sous les affaires qu'il n'utilise plus ; son ami Boris lui fait découvrir Zuvo ; il publie ses baskets en quelques étapes, reçoit ses premiers messages… et sa chambre respire. Ce que tu n'utilises plus peut encore servir à quelqu'un d'autre.</p>
{timeline_bar()}
<div class="cols3">
  <div><h3>Personnages</h3>
    <p><b>Junior</b> (protagoniste, 22–26 ans) — étudiant ou jeune actif à Yaoundé, t-shirt blanc, attachant, un peu débordé. Nom proposé, à valider.</p>
    <p><b>Boris</b> (l'ami, même âge) — casquette, chemise en pagne aux tons bleus (écho discret à la marque), blagueur, toujours en train de grignoter.</p>
    <p><b>Scène 5</b> — une étudiante, un jeune actif, une femme d'une quarantaine d'années, un jeune acheteur : apparences, styles et lieux variés.</p></div>
  <div><h3>Ce qui change par rapport au brief</h3>
    <p>Minutage recalé sur la durée réelle des répliques (≈ 3 mots/s) : 90 s au total, scène 1 de 17 s au lieu de 12.</p>
    <p>Notifications : badge réel sur « Messages » (le site n'affiche pas de bulle dans l'application ; la notification push dépend de l'appareil).</p>
    <p>Second acheteur : intéressé par l'ancien téléphone, publié par Junior au plan 4A (« Mes annonces »).</p></div>
  <div><h3>Principes</h3>
    <p>Écrans réels uniquement, lisibles au moins 2 s pour les étapes clés. Aucun chiffre, prix ou promesse sans validation.</p>
    <p>Mention permanente pendant la démo et les messages : « {esc(LEGAL)} »</p>
    <p>Sous-titres incrustés sur tout le film (lecture sans le son).</p></div>
</div>"""
    pages.append(page(synth, n))
    n += 1

    swatches = [("Bleu Zuvo", BLUE, "couleur principale du site, boutons, logo"), ("Bleu foncé", BLUE_DARK, "survol, contrastes"),
                ("Blanc cassé", PAPER, "fond du site et de la carte finale"), ("Bleu nuit", INK, "textes"),
                ("Bleu clair", LIGHT, "pastille du logo"), ("Bleu très clair", TINT, "fonds d'accent")]
    sw = "".join(
        f'<div class="sw"><i style="background:{c}"></i><b>{esc(name)}</b><code>{c}</code><span>{esc(use)}</span></div>'
        for name, c, use in swatches
    )
    da = f"""
<h2>Direction artistique</h2>
<div class="cols2">
  <div>
    <h3>Couleurs réelles du site (src/app/globals.css)</h3>
    <p class="note">Le brief cite « vert sauge et blanc cassé, à adapter aux couleurs réelles » : le site est aujourd'hui en <b>bleu et blanc cassé</b>. La publicité suit le site.</p>
    <div class="swatches">{sw}</div>
    <h3>Typographie</h3>
    <p class="type-sample"><span style="font-weight:720">Plus Jakarta Sans</span> — la police du site. Titres en gras (640–720), textes en 560.</p>
    <h3>Image</h3>
    <p>Lumière naturelle, étalonnage chaud et doux pour les scènes réelles ; l'interface bleue ressort sur ces tons chauds. Costumes et décors sobres, quelques touches de bleu. Pas de logos de marques visibles sur les objets ni dans les titres d'annonces.</p>
  </div>
  <div>
    <h3>Motion design</h3>
    <p>Logo : le carré bleu apparaît, le Z se trace, la pastille bleu clair « s'allume » (la seconde vie). Étiquettes de catégories (plan 1C) et textes d'étapes au style des puces du site. Transitions par raccord dans l'écran du téléphone, jamais agressives.</p>
    <h3>Zones de sécurité 9:16 (TikTok, Reels, Statut WhatsApp)</h3>
    <div class="safe"><div class="safe-frame"><i class="top"></i><i class="bottom"></i><i class="right"></i><span>zone utile</span></div>
    <p>Rien d'important dans les 220 px du haut, les 380 px du bas et les 140 px de droite (boutons et légendes des plateformes). Sous-titres au-dessus de la zone basse.</p></div>
    <h3>Musique</h3>
    <p>Afro-fusion / amapiano instrumental (≈ 110 BPM), sous licence couvrant la publicité payante. Intro légère (0–17 s), entrée du groove (17 s), montée et impact au moment de « Publier l'annonce » (45,5 s), seconde montée sur les premiers messages, pleine énergie en scène 5, résolution sur la carte finale.</p>
  </div>
</div>"""
    pages.append(page(da, n))
    n += 1

    # Pagination continue : une scène commence sur la page en cours s'il reste la place.
    avail, header_h, row_h = 184, 18, 71
    current, used = [], 0

    def flush():
        nonlocal current, used, n
        if current:
            pages.append(page("".join(current), n, "scene-page"))
            n += 1
        current, used = [], 0

    def header(scene, cont):
        nonlocal used
        current.append(
            f'<div class="scene-block"><div class="scene-head"><span class="sn">Scène {scene["n"]}</span><h2>{esc(scene["title"])}{" (suite)" if cont else ""}</h2>'
            f'<span class="stc">{fmt(scene["tc"][0])} – {fmt(scene["tc"][1])} · {scene["tc"][1] - scene["tc"][0]} s '
            f'<em>(brief : {scene["brief_tc"]})</em></span></div>'
            + ("" if cont else f'<p class="scene-info"><b>Lieu</b> {esc(scene["place"])} <b>Lumière</b> {esc(scene["light"])} <b>Intention</b> {esc(scene["intent"])}</p>')
            + "</div>"
        )
        used += header_h

    for scene in SCENES:
        shots = [s for s in SHOTS if s["scene"] == scene["n"]]
        for ri in range(0, len(shots), 2):
            first = ri == 0
            if used + row_h + (header_h if first else 0) > avail:
                flush()
            if first or not current:
                header(scene, not first)
            current.append('<div class="cards">' + "".join(shot_card(s) for s in shots[ri : ri + 2]) + "</div>")
            used += row_h
    flush()

    rows = "".join(
        f'<tr><td>{fmt(a)} – {fmt(b)}</td><td>{esc(who)}</td><td>{esc(text)}</td><td>{words(text) / (b - a):.1f}</td></tr>'
        for a, b, who, text in VOICE
    )
    vo = f"""
<h2>Bande voix (dialogues et voix off du brief, minutées)</h2>
<p class="note">Débit en mots par seconde : 2,5 à 3,4 pour la voix off, jusqu'à 3,9 pour les répliques rapides entre amis. Si l'interprétation est plus lente, la scène 1 s'allonge au détriment des plans muets de la scène 5.</p>
<table class="vo-table"><thead><tr><th>Temps</th><th>Qui</th><th>Texte</th><th>mots/s</th></tr></thead><tbody>{rows}</tbody></table>"""
    pages.append(page(vo, n))
    n += 1

    refs = """
<h2>Images de référence (style frames)</h2>
<p class="note">Rendues avec la vraie police, le vrai logo et de vraies captures. Les fonds « tournage » sont des aplats provisoires.</p>
<div class="refs">
  <figure><img src="../images-de-reference/01-demo-9x16.jpg" alt=""><figcaption>Démo 9:16 — plan 3E</figcaption></figure>
  <figure><img src="../images-de-reference/02-carte-finale-9x16.jpg" alt=""><figcaption>Carte finale 9:16 — plan 6C</figcaption></figure>
  <div class="refs-wide">
    <figure><img src="../images-de-reference/03-demo-16x9.jpg" alt=""><figcaption>Démo 16:9 — écran partagé</figcaption></figure>
    <figure><img src="../images-de-reference/04-carte-finale-16x9.jpg" alt=""><figcaption>Carte finale 16:9</figcaption></figure>
  </div>
</div>"""
    pages.append(page(refs, n))
    n += 1

    validate = """
<h2>Points à valider avant production</h2>
<ol class="todo">
  <li><b>Minutage</b> — 90 s, scènes décalées par rapport au brief pour que dialogues et voix off tiennent sans être précipités.</li>
  <li><b>Adresse du site</b> — l'adresse actuelle « zuvo-beta.vercel.app » est une adresse de bêta : quelle URL officielle afficher sur la carte finale&nbsp;?</li>
  <li><b>Prix dans la démo</b> — montants des annonces de démonstration à valider, ou prix floutés (comme sur cette planche).</li>
  <li><b>« Gratuit et sans commission »</b> — affiché par le site à l'étape « Prix et lieu » et dans « Pourquoi vendre sur Zuvo ? ». Promesse commerciale : la montrer, ou recadrer ces écrans.</li>
  <li><b>Notification push</b> — bannière du téléphone uniquement si l'envoi a été testé sur Android et iPhone ; sinon, badge réel sur « Messages » (proposé par défaut).</li>
  <li><b>Second message</b> — « Bonsoir, je suis intéressée par le téléphone. » (le brief ne donne pas son texte).</li>
  <li><b>Personnages</b> — prénoms Junior et Boris ; le compte de démonstration affichera le nom choisi.</li>
  <li><b>Ouverture</b> — titre-question en surimpression pendant les 3 premières secondes : oui ou non.</li>
  <li><b>Mode de production</b> — voir ci-dessous.</li>
</ol>
<div class="cols3 modes">
  <div class="mode reco"><h3>A. Tournage réel <em>recommandé</em></h3><p>Deux comédiens camerounais + quatre profils en scène 5, un jour et demi de tournage, une chambre réelle à Yaoundé et quatre lieux. Écrans incrustés en post-production à partir des vrais enregistrements. Voix off enregistrée par un comédien ou une comédienne camerounais(e). Musique sous licence ou composée sur commande.</p></div>
  <div class="mode"><h3>B. Génération vidéo par IA</h3><p>Prompts par plan et fiches personnages. Risques : visages et décors qui changent d'un plan à l'autre, mains et téléphones déformés. Interfaces toujours incrustées depuis les vraies captures, voix off humaine, mention « contenu généré par IA » selon les règles de chaque plateforme.</p></div>
  <div class="mode"><h3>C. Animatique (réalisable ici)</h3><p>Version minutée avec les cadres de ce storyboard, les vrais enregistrements d'écran, le motion design (logo, étapes, carte finale) en 9:16 et 16:9, sous-titres et musique temporaire. Sert de prévisualisation et de base au monteur ; ce n'est pas le film final.</p></div>
</div>
<p class="note">Après validation : script final, voix off minutée (et fichier de sous-titres), liste des plans pour le tournage, enregistrements d'écran réels en haute définition, éléments de motion design (logo, étapes, étiquettes, carte finale) en 9:16 et 16:9, prompts par plan, plan de montage et animatique.</p>"""
    pages.append(page(validate, n))

    return f"""<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8">
<title>Storyboard publicité Zuvo</title>
<link rel="stylesheet" href="planche.css">
</head>
<body>
{"".join(pages)}
</body>
</html>
"""


# ----------------------------------------------------------------- Markdown
def build_md() -> str:
    out = []
    out.append("# Publicité « Et si ce que tu n'utilises plus pouvait te rapporter de l'argent ? » — storyboard\n")
    out.append(
        "> **Statut : proposition à valider avant production. Aucune vidéo n'a été rendue.**\n"
        "> Les écrans sont de vraies captures de l'application (environnement local de démonstration,\n"
        "> données fictives, prix floutés en attente de validation). Planche visuelle : `planche/storyboard.html`.\n"
    )
    out.append("## Fiche technique\n")
    out.append(
        "- **Durée** : 90 s (brief : 60 à 90 s), 6 scènes, " + str(len(SHOTS)) + " plans.\n"
        "- **Formats** : 9:16 (1080 × 1920) principal ; adaptation 16:9 (1920 × 1080).\n"
        "- **Tournage conseillé** : 4K 16:9 avec repères 9:16 au moniteur, action principale dans le tiers central,\n"
        "  ralentis à 60–120 i/s pour les inserts ; diffusion en 30 i/s.\n"
        "- **Sous-titres** incrustés sur tout le film (lecture sans le son) ; zones de sécurité des plateformes\n"
        "  respectées (220 px en haut, 380 px en bas, 140 px à droite en 9:16).\n"
        f"- **Mention** pendant la démo et les messages (0:31 – 1:05) : « {LEGAL} »\n"
    )
    out.append("## L'histoire\n")
    out.append(
        "Junior, jeune actif de Yaoundé, étouffe sous les affaires qu'il n'utilise plus. Son ami Boris lui fait\n"
        "découvrir Zuvo ; il publie ses baskets en suivant les vraies étapes du site, reçoit ses premiers messages,\n"
        "et sa chambre respire. Message : ce que tu n'utilises plus peut encore servir à quelqu'un d'autre.\n"
    )
    out.append("| Scène | Temps | Brief | Rôle dans le récit |\n|---|---|---|---|")
    for s in SCENES:
        out.append(f"| {s['n']}. {s['title']} | {fmt(s['tc'][0])} – {fmt(s['tc'][1])} | {s['brief_tc']} | {s['intent']} |")
    out.append("")
    out.append(
        "Personnages (prénoms proposés) : **Junior**, 22–26 ans, t-shirt blanc, attachant et un peu débordé ;\n"
        "**Boris**, son ami, casquette et chemise en pagne aux tons bleus, blagueur, toujours en train de grignoter.\n"
        "Scène 5 : une étudiante, un jeune actif, une femme d'une quarantaine d'années, un jeune acheteur.\n"
    )
    for scene in SCENES:
        out.append(f"## Scène {scene['n']} — {scene['title']} ({fmt(scene['tc'][0])} – {fmt(scene['tc'][1])})\n")
        out.append(f"- **Lieu** : {scene['place']}\n- **Lumière** : {scene['light']}\n- **Intention** : {scene['intent']}\n")
        for shot in [s for s in SHOTS if s["scene"] == scene["n"]]:
            a, b = shot["tc"]
            out.append(f"### {shot['id']} · {fmt(a)} – {fmt(b)} · {shot['size']} — {shot['title']}\n")
            if shot.get("screens"):
                imgs = " ".join(
                    f'<img src="ecrans/{s}.jpg" width="120" alt="{SCREEN_LABELS[s]}">' for s in shot["screens"]
                )
                out.append(imgs + "\n")
            out.append(f"- **Image** : {shot['image']}")
            out.append(f"- **Caméra** : {shot['camera']}")
            for _, _, who, text in lines_of(shot):
                out.append(f"- **{who}** : « {text} »")
            for text in shot["screen"]:
                out.append(f"- **À l'écran** : {text}")
            if shot["sound"]:
                out.append(f"- **Son** : {shot['sound']}")
            out.append(f"- **16:9** : {shot['r16']}\n")
    out.append("## Bande voix minutée\n")
    out.append("| Temps | Qui | Texte | mots/s |\n|---|---|---|---|")
    for a, b, who, text in VOICE:
        out.append(f"| {fmt(a)} – {fmt(b)} | {who} | {text} | {words(text) / (b - a):.1f} |")
    out.append("")
    out.append(
        "Voix off : interprétation humaine, chaleureuse et expressive, français parlé au Cameroun, sans accent\n"
        "forcé ni ton institutionnel. Si l'interprétation est plus lente, la scène 1 s'allonge au détriment des\n"
        "plans muets de la scène 5.\n"
    )
    out.append("## Musique et son\n")
    out.append(
        "Afro-fusion / amapiano instrumental (≈ 110 BPM), **sous licence couvrant la publicité payante** sur\n"
        "TikTok, Instagram, Facebook et WhatsApp (ou composition sur commande avec cession de droits).\n\n"
        "| Temps | Musique |\n|---|---|\n"
        "| 0:00 – 0:17 | Intro légère (shaker, guitare), ambiance du quartier, ventilateur |\n"
        "| 0:17 – 0:31 | Entrée du groove ; pause sur « tu connais Zuvo ? » ; impact sur le logo |\n"
        "| 0:31 – 0:45 | Groove régulier, sons d'interface discrets |\n"
        "| 0:45 – 0:47 | Montée puis impact sur « Publier l'annonce » |\n"
        "| 0:47 – 1:05 | Groove plein, une note à chaque message, seconde montée |\n"
        "| 1:05 – 1:17 | Pleine énergie, montage sur les temps |\n"
        "| 1:17 – 1:30 | Arrangement allégé sous la voix, accord final sur la carte |\n"
    )
    out.append("## Adaptation 16:9\n")
    out.append(
        "- Plans tournés en 16:9 et cadrés pour le 9:16 : le 16:9 montre davantage la chambre (effet avant / après\n"
        "  1B → 6A plus lisible).\n"
        "- Démo (scène 3) : écran partagé, tournage à gauche, téléphone avec l'interface réelle à droite, étapes\n"
        "  1-2-3 en colonne ; option : version ordinateur du site (barre latérale) pour l'accueil et Explorer.\n"
        "- Carte finale en mise en page horizontale (voir `images-de-reference/`).\n"
    )
    out.append("## Points à valider\n")
    for item in [
        "**Minutage** de 90 s (scènes décalées par rapport au brief pour que les répliques tiennent).",
        "**Adresse officielle** du site pour la carte finale (l'adresse actuelle est une adresse de bêta).",
        "**Prix** des annonces de démonstration : montants validés, ou floutés.",
        "**« Gratuit et sans commission »**, affiché par le site à l'étape « Prix et lieu » : le montrer ou recadrer.",
        "**Notification push** du téléphone : seulement après tests validés sur Android et iPhone ; sinon badge « Messages ».",
        "**Second message** : « Bonsoir, je suis intéressée par le téléphone. »",
        "**Prénoms** Junior et Boris (le compte de démonstration portera le nom choisi).",
        "**Titre-question** en surimpression pendant les 3 premières secondes.",
        "**Mode de production** : A. tournage réel (recommandé), B. génération vidéo par IA, C. animatique seule.",
    ]:
        out.append(f"1. {item}")
    out.append("")
    out.append("## Modes de production\n")
    out.append(
        "- **A. Tournage réel (recommandé)** — deux comédiens camerounais et quatre profils en scène 5, un jour et\n"
        "  demi de tournage. Écrans incrustés en post-production depuis les vrais enregistrements ; voix off par un\n"
        "  comédien ou une comédienne camerounais(e) ; musique sous licence.\n"
        "- **B. Génération vidéo par IA** — prompts par plan et fiches personnages. Risques : cohérence des visages\n"
        "  et des décors d'un plan à l'autre, mains et téléphones. Interfaces incrustées depuis les vraies captures,\n"
        "  voix off humaine, mention « contenu généré par IA » selon les règles de chaque plateforme.\n"
        "- **C. Animatique** (réalisable dans cet environnement) — version minutée avec ces cadres, les vrais\n"
        "  enregistrements d'écran, le motion design, les sous-titres et une musique temporaire. Prévisualisation et\n"
        "  base de montage, pas le film final.\n"
    )
    return "\n".join(out)


def copy_screens(source: Path) -> None:
    """Captures PNG (390 px de large, échelle 2 ou 3) → JPEG de 585 px."""
    dest = OUT / "ecrans"
    dest.mkdir(parents=True, exist_ok=True)
    for png in sorted(source.glob("*.png")):
        if png.stem not in SCREEN_LABELS:
            continue
        im = Image.open(png).convert("RGB")
        im = im.resize((585, round(im.height * 585 / im.width)), Image.LANCZOS)
        im.save(dest / f"{png.stem}.jpg", quality=82, optimize=True, progressive=True)


def main() -> None:
    if len(sys.argv) > 1:
        copy_screens(Path(sys.argv[1]))
    (OUT / "planche" / "storyboard.html").write_text(build_html())
    (OUT / "storyboard.md").write_text(build_md())
    print("ok", len(SHOTS), "plans")


if __name__ == "__main__":
    main()
