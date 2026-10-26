// Publicité Zuvo « Et si ce que tu n'utilises plus pouvait te rapporter de l'argent ? »
// Film de 90 s en 9:16, rendu image par image : window.render(t) dessine l'instant t (s).
/* eslint-disable */
(() => {
  const { C, defs, person, sneaker, handbag, speaker, phoneObj, roomBack, roomProps } = window.ART;
  const SITE_URL = "zuvo-beta.vercel.app";
  const LEGAL = "Scénario fictif. Annonces, prix et messages de démonstration.";
  const SCALE = 494 / 780; // captures 2x (780 px) → écran du téléphone (494 px)

  // ---------------------------------------------------------------- outils
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const lerp = (a, b, u) => a + (b - a) * u;
  const E = {
    lin: (u) => u,
    io: (u) => (u < 0.5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2),
    out: (u) => 1 - Math.pow(1 - u, 3),
    in: (u) => u * u * u,
    back: (u) => 1 + 2.70158 * Math.pow(u - 1, 3) + 1.70158 * Math.pow(u - 1, 2),
  };
  /** Images clés : k(t, [[t0, v0], [t1, v1, "io"], …]) ; valeurs nombres ou tableaux. */
  function k(t, f) {
    if (t <= f[0][0]) return f[0][1];
    for (let i = 1; i < f.length; i++) {
      const [t1, v1, e] = f[i];
      const [t0, v0] = f[i - 1];
      if (t <= t1) {
        const u = E[e || "io"](clamp((t - t0) / (t1 - t0)));
        return Array.isArray(v0) ? v0.map((x, j) => lerp(x, v1[j], u)) : lerp(v0, v1, u);
      }
    }
    return f[f.length - 1][1];
  }
  const win = (t, a, b, fade = 0.2) => clamp(Math.min((t - a) / fade, (b - t) / fade));
  const pop = (t, a, d = 0.35) => (t < a ? 0 : t > a + d ? 1 : E.back((t - a) / d));
  const $ = (sel, root = document) => root.querySelector(sel);

  // ---------------------------------------------------------------- scène (DOM)
  const stage = $("#stage");
  stage.insertAdjacentHTML("beforeend", defs());
  const add = (html, parent = stage) => {
    parent.insertAdjacentHTML("beforeend", html);
    return parent.lastElementChild;
  };

  // Chambre (panorama 2160 × 1920) avec caméra
  const room = add(`<div class="layer" id="room"><div class="cam">
      <svg id="back" viewBox="0 0 2160 1920">${roomBack()}<g id="dust"></g></svg>
      <svg id="props" viewBox="0 0 2160 1920">${roomProps()}</svg>
      <svg id="chars" viewBox="0 0 2160 1920" style="overflow:visible">
        ${person({ id: "junior", skin: "#7b4a2b", top: { base: "#f5f2ec", dark: "#d9d1c2" }, pants: "#33496b", hair: "short" })}
        ${person({ id: "boris", skin: "#4f2e1b", top: { base: "#1a4dbb", pattern: "waxShirt", dark: "#0f2f73", collar: true, collarColor: "#1a4dbb" }, pants: "#2b2b33", shoe: "#7a4a2c", hair: "cap", beard: true, cap: "#1f5fe0" })}
      </svg></div></div>`);
  const cam = $(".cam", room);
  const back = $("#back"),
    props = $("#props"),
    chars = $("#chars");
  const part = (root, p) => root.querySelector(`[data-p="${p}"]`);
  const dust = $("#dust");
  for (let i = 0; i < 28; i++)
    dust.insertAdjacentHTML(
      "beforeend",
      `<circle r="${2 + (i % 3)}" fill="#fff8e6" opacity=".7"/>`,
    );

  // Vue depuis l'intérieur de l'armoire (plan 1A)
  const pov =
    add(`<div class="layer" id="pov" style="background:transparent"><svg viewBox="0 0 1080 1920" class="abs" width="1080" height="1920">
      <g id="povDoorL"><rect x="0" y="0" width="540" height="1920" fill="#5b3a22"/><rect x="60" y="120" width="420" height="760" rx="14" fill="none" stroke="#4a2e1a" stroke-width="14"/><rect x="60" y="980" width="420" height="820" rx="14" fill="none" stroke="#4a2e1a" stroke-width="14"/></g>
      <g id="povDoorR"><rect x="540" y="0" width="540" height="1920" fill="#5b3a22"/><rect x="600" y="120" width="420" height="760" rx="14" fill="none" stroke="#4a2e1a" stroke-width="14"/><rect x="600" y="980" width="420" height="820" rx="14" fill="none" stroke="#4a2e1a" stroke-width="14"/></g>
      <rect x="0" y="0" width="80" height="1920" fill="#2a170d"/><rect x="1000" y="0" width="80" height="1920" fill="#2a170d"/>
      <rect x="0" y="0" width="1080" height="70" fill="#2a170d"/><rect x="0" y="1860" width="1080" height="60" fill="#2a170d"/>
      <rect x="60" y="96" width="960" height="14" rx="7" fill="#3a2a20"/>
      ${[
        ["#1a4dbb", 140],
        ["#e9873b", 300],
        ["#2f6f57", 700],
        ["#b5452a", 860],
      ]
        .map(
          ([c, x]) =>
            `<g opacity=".95"><path d="M${x} 104 q0 -24 18 -24" stroke="#ccc" stroke-width="5" fill="none"/><path d="M${x - 80} 140 L${x} 110 L${x + 80} 140 L${x + 70} 330 L${x - 70} 330 Z" fill="${c}"/><path d="M${x - 80} 140 L${x - 110} 230 L${x - 82} 240 Z M${x + 80} 140 L${x + 110} 230 L${x + 82} 240 Z" fill="${c}"/></g>`,
        )
        .join("")}
      <g id="povShirt"><path d="M-90 -60 L0 -90 L90 -60 L80 120 L-80 120 Z" fill="#2f6f57"/><path d="M-90 -60 L-150 40 L-110 60 L-80 0 Z M90 -60 L150 40 L110 60 L80 0 Z" fill="#2f6f57"/><path d="M-30 -84 Q0 -60 30 -84" stroke="#1e5c47" stroke-width="10" fill="none"/></g>
    </svg></div>`);

  // Interface réelle dans un téléphone
  const SCREENS = [
    "accueil",
    "accueil-full",
    "barre-haut",
    "barre-bas",
    "explorer",
    "recherche",
    "annonce-autre",
    "annonce-acheteur",
    "vendre-1",
    "vendre-2",
    "vendre-3",
    "vendre-3b",
    "vendre-4",
    "vendre-5",
    "publiee",
    "profil",
    "messages-1",
    "messages-2",
    "conversation-1",
    "conversation-2",
  ];
  const ui =
    add(`<div class="layer" id="ui"><div id="uibg" class="abs" style="width:1080px;height:1920px">
        <div data-bg="brand" class="abs" style="width:1080px;height:1920px;background:radial-gradient(900px 700px at 90% 5%, #dbe8fe 0, transparent 60%), radial-gradient(700px 600px at 5% 100%, #e4eefe 0, transparent 60%), #f7f9fc"></div>
        <svg data-bg="bed" class="abs" width="1080" height="1920"><rect width="1080" height="1920" fill="url(#waxSheet)"/><rect width="1080" height="1920" fill="#0b1a14" opacity=".42"/>
          <path d="M0 520 Q540 470 1080 560" stroke="#000" stroke-width="40" opacity=".12" fill="none"/><path d="M0 1500 Q500 1440 1080 1520" stroke="#000" stroke-width="50" opacity=".12" fill="none"/></svg>
      </div>
      <div class="phone" id="phone"><div class="screen" id="screen">
        ${SCREENS.map((s) => `<img data-s="${s}" src="ecrans/${s}.jpg" alt="">`).join("")}
        <div class="ring" id="ring"></div><div class="tap" id="tap"></div>
      </div></div>
      <svg id="buzz" class="abs" width="1080" height="1920" viewBox="0 0 1080 1920" style="display:none">
        ${[0, 1].map((i) => `<path d="M${180 - i * 40} ${700 - i * 30} q-${40 + i * 30} 180 0 ${360 + i * 60}" stroke="#fff" stroke-width="10" fill="none" stroke-linecap="round" opacity=".8"/><path d="M${900 + i * 40} ${700 - i * 30} q${40 + i * 30} 180 0 ${360 + i * 60}" stroke="#fff" stroke-width="10" fill="none" stroke-linecap="round" opacity=".8"/>`).join("")}
      </svg>
      <svg id="burst" class="abs" width="1080" height="1920" viewBox="0 0 1080 1920" style="display:none">
        <g transform="translate(840 380)"><circle r="92" fill="${C.blue}"/><path d="M-38 2 L-10 30 L42 -26" stroke="#fff" stroke-width="18" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
        ${Array.from({ length: 10 }, (_, i) => `<line data-ray x1="0" y1="-120" x2="0" y2="-160" stroke="${C.blue}" stroke-width="10" stroke-linecap="round" transform="rotate(${i * 36})"/>`).join("")}</g>
      </svg></div>`);
  const phone = $("#phone"),
    screen = $("#screen"),
    uibg = $("#uibg"),
    tap = $("#tap"),
    ring = $("#ring");
  const img = (s) => screen.querySelector(`[data-s="${s}"]`);

  // Scène 5 : quatre profils
  const s5 = add(`<div class="layer" id="s5"></div>`);
  const VIGNETTES = [
    {
      id: "etudiante",
      bg: `<rect width="1080" height="1920" fill="#d8c7ec"/><rect y="1240" width="1080" height="680" fill="#b79bd6"/>
           <rect x="90" y="300" width="250" height="330" rx="10" fill="#fff8ee"/><rect x="110" y="320" width="210" height="200" rx="6" fill="#f2b33d" opacity=".6"/><circle cx="215" cy="420" r="60" fill="#e9873b" opacity=".7"/>
           <rect x="640" y="250" width="300" height="420" rx="12" fill="#fff" opacity=".5"/>
           <path d="M0 1380 L1080 1380 L1080 1650 L0 1650 Z" fill="#f4a6b8"/><rect y="1640" width="1080" height="60" fill="#c97a8e"/>
           <g transform="translate(760 1360)">${handbagSvg()}</g>`,
      who: {
        id: "v-etudiante",
        skin: "#8a5634",
        top: { base: "#f2b33d", dark: "#d4952a" },
        pants: "#3d5a80",
        hair: "braids",
        lashes: true,
        earrings: true,
        blush: true,
        lip: "#5a2420",
      },
      at: [400, 520, 1.5],
      card: "vendre-1",
    },
    {
      id: "actif",
      bg: `<rect width="1080" height="1920" fill="#f3d9a6"/>
           <g opacity=".55">${Array.from({ length: 7 }, (_, i) => `<circle cx="${80 + i * 160}" cy="${900 + (i % 3) * 140}" r="${60 + (i % 2) * 40}" fill="${["#e9873b", "#2f8a6b", "#fff", "#c0392b"][i % 4]}" filter="url(#soft)"/>`).join("")}</g>
           <rect y="1300" width="1080" height="620" fill="#cfae84"/>
           <path d="M0 0 L1080 0 L1080 300 L0 300 Z" fill="#f2c94c"/>${Array.from({ length: 9 }, (_, i) => `<path d="M${i * 130} 0 L${i * 130 + 65} 0 L${i * 130 + 65} 300 L${i * 130} 300 Z" fill="#2f8a6b"/>`).join("")}
           <path d="M0 300 ${Array.from({ length: 9 }, (_, i) => `Q${i * 130 + 32} 360 ${i * 130 + 65} 300 Q${i * 130 + 97} 360 ${i * 130 + 130} 300`).join(" ")}" fill="#f2c94c"/>`,
      who: {
        id: "v-actif",
        skin: "#5c3520",
        top: { base: "#cfe0f5", dark: "#a9c2e2", long: true, collar: true, collarColor: "#e6eefb" },
        pants: "#2b3445",
        hair: "short",
        lanyard: true,
      },
      at: [540, 560, 1.5],
      card: "recherche",
    },
    {
      id: "maman",
      bg: `<rect width="1080" height="1920" fill="#8fc7c0"/><rect y="1200" width="1080" height="720" fill="#c49470"/>
           <rect x="80" y="980" width="560" height="260" rx="40" fill="#e9873b"/><rect x="60" y="1150" width="600" height="160" rx="40" fill="#d26f2c"/>
           <rect x="740" y="330" width="220" height="280" rx="8" fill="#fff8ee"/><rect x="762" y="352" width="176" height="236" fill="#2f6f57" opacity=".7"/>
           <rect x="560" y="1330" width="460" height="30" rx="10" fill="#7a4a2c"/><rect x="590" y="1360" width="22" height="260" fill="#6a3e22"/><rect x="970" y="1360" width="22" height="260" fill="#6a3e22"/>
           <g transform="translate(800 1270)">${speakerSvg()}</g>`,
      who: {
        id: "v-maman",
        skin: "#6e4127",
        top: { base: "#2f6f57", pattern: "waxDress", dark: "#1e5c47" },
        pants: "#2f6f57",
        hair: "wrap",
        earrings: true,
        lashes: true,
        lip: "#5a2420",
      },
      at: [380, 560, 1.45],
      card: null,
    },
    {
      id: "acheteur",
      bg: `<rect width="1080" height="1920" fill="#f2c230"/>
           <rect x="60" y="260" width="960" height="760" rx="80" fill="#2a2f3a"/>
           <g id="street"><rect x="100" y="300" width="880" height="680" rx="60" fill="#9fd0f0"/>
             ${Array.from({ length: 10 }, (_, i) => `<rect data-b x="${i * 220}" y="${520 + (i % 3) * 60}" width="160" height="${460 - (i % 3) * 60}" fill="${["#e9873b", "#f4efe6", "#2f8a6b", "#c0392b", "#d9b88f"][i % 5]}"/>`).join("")}
             <rect x="100" y="900" width="880" height="80" fill="#6b6f78"/></g>
           <path d="M100 300 L980 300 L980 980 L100 980 Z" fill="none" stroke="#1d2129" stroke-width="40" stroke-linejoin="round"/>
           <path d="M140 330 L420 330" stroke="#fff" stroke-width="10" opacity=".35" stroke-linecap="round"/><path d="M160 370 L300 370" stroke="#fff" stroke-width="8" opacity=".25" stroke-linecap="round"/>
           <rect x="60" y="1000" width="960" height="920" fill="#3b3f4a"/><rect x="60" y="1000" width="960" height="40" fill="#2a2f3a"/>
           <rect x="330" y="560" width="420" height="380" rx="90" fill="#4a505d"/><rect x="420" y="930" width="30" height="80" fill="#2a2f3a"/><rect x="630" y="930" width="30" height="80" fill="#2a2f3a"/>`,
      who: {
        id: "v-acheteur",
        skin: "#87573a",
        top: { base: "#e8743b", dark: "#c55a26" },
        pants: "#33496b",
        hair: "puff",
      },
      at: [540, 560, 1.5],
      card: "annonce-acheteur",
    },
  ];
  function handbagSvg() {
    return handbag(0, 0, 1.4);
  }
  function speakerSvg() {
    return speaker(0, 0, 0.9);
  }
  for (const v of VIGNETTES) {
    add(
      `<div class="abs" data-v="${v.id}" style="width:1080px;height:1920px;display:none;transform-origin:50% 50%">
        <svg viewBox="0 0 1080 1920" width="1080" height="1920" class="abs">${v.bg}<g data-who>${person(v.who)}</g></svg></div>`,
      s5,
    );
  }

  // Logo et carte finale
  const logo = add(`<div class="layer" id="logo">
      <div class="blob" id="blob1" style="right:-260px;top:-220px;width:760px;height:760px;background:#dbe8fe"></div>
      <div class="blob" id="blob2" style="left:-180px;bottom:-160px;width:520px;height:520px;background:#eff5ff"></div>
      <div id="brand" class="abs" style="width:1080px;height:1920px">
        <svg id="mark" viewBox="0 0 32 32" width="250" height="250" class="abs" style="overflow:visible">
          <g id="markSq"><rect width="32" height="32" rx="9" fill="${C.blue}"/></g>
          <path id="markZ" d="M10 10.5h12l-12 11h12" fill="none" stroke="#fff" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" pathLength="1" stroke-dasharray="1" />
          <circle id="markDot" cx="23.5" cy="8.5" r="2" fill="${C.blueLight}"/>
        </svg>
        <div class="center word" id="word">Zuvo</div>
      </div>
      <div class="center tagline" id="tagline" style="top:950px">La seconde vie de tes affaires.</div>
      <div class="center subline" id="subline" style="top:1050px">Le marché de la seconde main pensé pour le Cameroun.</div>
      <div class="center" id="urlrow" style="top:1225px"><span class="url">${SITE_URL}</span></div>
      <div class="center" id="ctarow" style="top:1345px"><span class="cta">Découvre Zuvo dès maintenant.</span></div>
    </div>`);

  // Habillage et textes
  add(`<div id="grade"></div>`);
  add(`<div id="vignette"></div>`);
  const grain = add(`<canvas id="grain" width="540" height="960"></canvas>`);
  {
    const g = grain.getContext("2d");
    const d = g.createImageData(540, 960);
    let seed = 7;
    for (let i = 0; i < d.data.length; i += 4) {
      seed = (seed * 16807) % 2147483647;
      const v = seed % 255;
      d.data[i] = d.data[i + 1] = d.data[i + 2] = v;
      d.data[i + 3] = 255;
    }
    g.putImageData(d, 0, 0);
    grain.style.width = "1180px";
    grain.style.height = "2060px";
  }
  const flash = add(`<div id="flash"></div>`);
  const hook = add(
    `<div class="hook" style="display:none">${"Et si ce que tu n'utilises plus pouvait te rapporter de l'argent ?"
      .split(" ")
      .map((w) => `<span>${w.replace("'", "’")}</span>`)
      .join("")}</div>`,
  );
  const bubbles = { J: add(`<div class="bubble"></div>`), B: add(`<div class="bubble"></div>`) };
  const sub = add(`<div class="sub" style="top:1452px;display:none"><span></span></div>`);
  const legal = add(`<div class="legal"><span>${LEGAL}</span></div>`);
  const icon = (n) => `<svg viewBox="0 0 24 24">${window.ICONS[n]}</svg>`;
  const chips = [
    ["shirt", "Mode homme"],
    ["footprints", "Chaussures"],
    ["smartphone", "Téléphones & tablettes"],
    ["glasses", "Sacs & accessoires"],
  ].map(([i, l]) => add(`<div class="chip"><i>${icon(i)}</i>${l}</div>`));
  const step = add(`<div class="step"><b>1</b><span>Prends tes photos</span></div>`);
  const fields = add(
    `<div class="fields" style="top:262px">${["Titre", "Description", "Catégorie", "État", "Prix", "Ville"].map((f) => `<span>${f}</span>`).join("")}</div>`,
  );
  const cards = [0, 1].map(() => add(`<div class="card"><div><img alt=""></div></div>`));
  const heart = add(
    `<svg class="abs" viewBox="0 0 24 24" width="220" height="220" style="display:none;fill:#ef4444;stroke:#fff;stroke-width:1.2">${window.ICONS.heart}</svg>`,
  );

  // ---------------------------------------------------------------- personnages
  function rig(g) {
    const q = (p) => g.querySelector(`[data-p="${p}"]`);
    return {
      g,
      body: q("body"),
      armL: q("armL"),
      foreL: q("foreL"),
      armR: q("armR"),
      foreR: q("foreR"),
      propL: q("propL"),
      propR: q("propR"),
      head: q("head"),
      eyeL: q("eyeL"),
      eyeR: q("eyeR"),
      brows: q("brows"),
      legsStand: q("legsStand"),
      legsSit: q("legsSit"),
      mouths: [...g.querySelectorAll("[data-m]")],
      props: {},
    };
  }
  const J = rig($("#junior")),
    B = rig($("#boris"));
  const V = Object.fromEntries(VIGNETTES.map((v) => [v.id, rig($(`#${v.who.id}`))]));
  const SKIN = {
    junior: "#7b4a2b",
    boris: "#4f2e1b",
    "v-etudiante": "#8a5634",
    "v-actif": "#5c3520",
    "v-maman": "#6e4127",
    "v-acheteur": "#87573a",
  };

  // Objets tenus en main (dans le repère de l'avant-bras, main en 276,522 ou 84,522)
  function holdables(r, side) {
    const hx = side === "R" ? 276 : 84;
    const skin = SKIN[r.g.id];
    const host = side === "R" ? r.propR : r.propL;
    const mk = (name, inner) => {
      host.insertAdjacentHTML(
        "beforeend",
        `<g data-hold="${name}" style="display:none">${inner}</g>`,
      );
      r.props[side + name] = host.lastElementChild;
    };
    mk(
      "phone",
      `<g transform="translate(${hx} 470)">${phoneObj(r.g.id + side, 96, 196, null)}</g><circle cx="${hx + 34}" cy="530" r="15" fill="${skin}"/>`,
    );
    mk(
      "shot",
      `<g transform="translate(${hx} 474)">${phoneObj(r.g.id + side + "s", 80, 162, null)}
        <g><rect x="-35" y="-76" width="70" height="152" rx="11" fill="#11161d"/>${sneaker(0, 4, 0.21)}<rect x="-28" y="-60" width="56" height="98" rx="5" fill="none" stroke="#fff" stroke-width="2" opacity=".6"/><circle cx="0" cy="62" r="9" fill="none" stroke="#fff" stroke-width="3"/></g></g>
        <circle cx="${hx + 28}" cy="532" r="14" fill="${skin}"/>`,
    );
    mk(
      "screen",
      `<g transform="translate(${hx} 480)">${phoneObj(r.g.id + side + "u", 72, 146, "ecrans/accueil.jpg")}</g><circle cx="${hx + 26}" cy="535" r="14" fill="${skin}"/>`,
    );
    mk(
      "sneaker",
      `<g transform="translate(${hx} 560) rotate(-12)">${sneaker(0, 0, 0.42)}</g><circle cx="${hx - 4}" cy="520" r="17" fill="${skin}"/>`,
    );
    mk(
      "shirt",
      `<g transform="translate(${hx - 96} 500)"><rect x="-120" y="-20" width="240" height="120" rx="18" fill="#e9873b"/><path d="M-120 10 L-170 70 L-140 90 L-110 50 Z M120 10 L170 70 L140 90 L110 50 Z" fill="#e9873b"/><path d="M-30 -18 Q0 10 30 -18" stroke="#b9612a" stroke-width="8" fill="none"/></g>`,
    );
    mk(
      "peanuts",
      `<g transform="translate(${hx} 500)"><path d="M-36 -10 L36 -10 L0 70 Z" fill="#f4efe6"/><path d="M-36 -10 L36 -10" stroke="#d6c7ad" stroke-width="5"/>${[-18, 0, 18, -8, 10].map((x, i) => `<ellipse cx="${x}" cy="${-18 - (i > 2 ? 12 : 0)}" rx="9" ry="6" fill="#c98a4a"/>`).join("")}</g>`,
    );
  }
  for (const r of [J, B, ...Object.values(V)]) {
    holdables(r, "R");
    holdables(r, "L");
  }

  function place(r, { x, floor, seat, s = 1, flip = false }) {
    const sit = seat !== undefined;
    const y = sit ? seat - 520 * s : floor - 850 * s;
    r.g.setAttribute(
      "transform",
      flip
        ? `translate(${x + 180 * s} ${y}) scale(${-s} ${s})`
        : `translate(${x - 180 * s} ${y}) scale(${s})`,
    );
    r.legsStand.style.display = sit ? "none" : "";
    r.legsSit.style.display = sit ? "" : "none";
    r.g.style.display = "";
    r.pos = { x, y, s, flip };
  }
  const SPEAKER = { J: J, B: B };
  function speaking(r, t) {
    for (const [who, a, b] of DIALOG) if (SPEAKER[who] === r && t >= a && t < b - 0.15) return true;
    return false;
  }
  function pose(r, t, p = {}) {
    const armL = p.armL || [6, -4];
    const armR = p.armR || [-6, 4];
    r.armL.setAttribute("transform", `rotate(${armL[0]} 84 290)`);
    r.foreL.setAttribute("transform", `rotate(${armL[1]} 84 402)`);
    r.armR.setAttribute("transform", `rotate(${armR[0]} 276 290)`);
    r.foreR.setAttribute("transform", `rotate(${armR[1]} 276 402)`);
    for (const [k2, el] of Object.entries(r.props)) el.style.display = "none";
    const hold = (side, what, tilt = 0) => {
      const el = r.props[side + what];
      if (!el) return;
      el.style.display = "";
      const [a, b] = side === "R" ? armR : armL;
      const hx = side === "R" ? 276 : 84;
      el.parentNode.setAttribute("transform", `rotate(${-(a + b) + tilt} ${hx} 522)`);
    };
    if (p.holdR) hold("R", p.holdR, p.tiltR || 0);
    if (p.holdL) hold("L", p.holdL, p.tiltL || 0);
    const breath = Math.sin(t * 2.1 + (r === B ? 1 : 0)) * 3;
    r.body.setAttribute("transform", `translate(0 ${breath}) rotate(${p.body || 0} 180 520)`);
    r.head.setAttribute("transform", `rotate(${p.head || 0} 180 214)`);
    r.brows.setAttribute("transform", `translate(0 ${-(p.brows || 0) * 10})`);
    const seed = r === J ? 0 : r === B ? 1.3 : 2.1;
    const bp = (t + seed) % 3.9;
    const blink = bp < 0.14 ? Math.abs(bp - 0.07) / 0.07 : 1;
    const look = p.look || [0, 0];
    for (const [eye, cx] of [
      [r.eyeL, 154],
      [r.eyeR, 206],
    ]) {
      const sy = Math.max(0.08, blink * (p.wide ? 1.15 : 1));
      eye.setAttribute(
        "transform",
        `translate(${look[0] * 5} ${look[1] * 4 + 134 * (1 - sy)}) scale(1 ${sy})`,
      );
    }
    let m = p.mouth || "smile";
    if ((p.talk ?? speaking(r, t)) && !p.mute) {
      const v = Math.sin(t * 27 + seed) + 0.6 * Math.sin(t * 15.7 + seed * 2);
      m = v > 0.35 ? "open" : v > -0.5 ? p.talkRest || "neutral" : "smile";
    }
    for (const el of r.mouths) el.style.display = el.dataset.m === m ? "" : "none";
  }

  // ---------------------------------------------------------------- caméra et chambre
  let camState = { x: 1080, y: 960, z: 1 };
  function setCam(x, y, z) {
    camState = { x, y, z };
    cam.style.transform = `translate(${540 - x * z}px, ${960 - y * z}px) scale(${z})`;
  }
  const toScreen = (wx, wy) => [
    (wx - camState.x) * camState.z + 540,
    (wy - camState.y) * camState.z + 960,
  ];
  function headTop(r) {
    const { x, y, s } = r.pos;
    return toScreen(x, y + 30 * s);
  }
  function roomState(t, o = {}) {
    room.style.display = "block";
    back.style.filter = o.blurBack ? `blur(${o.blurBack}px)` : "";
    props.style.filter = o.blurProps ? `blur(${o.blurProps}px)` : "";
    chars.style.filter = o.blurChars ? `blur(${o.blurChars}px)` : "";
    const door = o.door ?? 0;
    part(back, "door").setAttribute(
      "transform",
      `translate(132 0) scale(${1 - door * 0.86} 1) translate(-132 0)`,
    );
    part(back, "doorlight").setAttribute("opacity", door * 0.75);
    part(back, "blades").setAttribute("transform", `rotate(${t * 620} 1830 930)`);
    part(back, "curtainL").setAttribute("transform", `rotate(${Math.sin(t * 1.3) * 0.7} 1060 300)`);
    part(back, "curtainR").setAttribute(
      "transform",
      `rotate(${Math.sin(t * 1.3 + 1) * 0.7} 1450 300)`,
    );
    const messy = o.tidy ? false : true;
    part(back, "sleeve").style.display = messy ? "" : "none";
    part(props, "chairItems").style.display = messy ? "" : "none";
    part(props, "clothesPile").style.display = messy ? "" : "none";
    part(props, "oldPhone").style.display = messy && !o.noOldPhone ? "" : "none";
    part(props, "bedPhone").style.display = o.bedPhone ? "" : "none";
    part(props, "tableSneaker").style.display = o.tableSneaker ? "" : "none";
    part(back, "beam").setAttribute("opacity", o.evening ? 0.35 : 0.75);
    // Poussière dans le rayon de lumière
    [...dust.children].forEach((c, i) => {
      const u = (i * 0.37 + t * 0.03 * (1 + (i % 4) * 0.4)) % 1;
      const x = 700 + ((i * 97) % 600) + Math.sin(t * 0.7 + i) * 30;
      const y = 900 + u * 900;
      c.setAttribute("cx", x - (y - 900) * 0.35);
      c.setAttribute("cy", y);
      c.setAttribute("opacity", (o.evening ? 0.25 : 0.65) * Math.sin(u * Math.PI));
    });
    J.g.style.display = "none";
    B.g.style.display = "none";
    grade(o.evening ? "evening" : o.tidy ? "soft" : "golden", o.gradeMix ?? 1);
  }
  function grade(kind, mix = 1) {
    const g = $("#grade");
    const c = {
      golden: "rgb(255 170 80 / 0.10)",
      evening: "rgb(150 70 130 / 0.22)",
      soft: "rgb(255 190 120 / 0.08)",
      none: "transparent",
    }[kind];
    g.style.background = c;
    g.style.mixBlendMode = "multiply";
    g.style.opacity = mix;
  }

  // ---------------------------------------------------------------- téléphone (interface réelle)
  /**
   * Téléphone : le point (sx, sy) de l'écran (px de l'écran, 494 × 1069) est amené au
   * point (fx, fy) de l'image, à l'échelle s. Par défaut, téléphone entier centré.
   */
  function uiState({
    bg = "brand",
    focus = [247, 534],
    at = [540, 880],
    s = 1,
    rot = 0,
    opacity = 1,
  } = {}) {
    ui.style.display = "block";
    uibg.style.display = bg === "none" ? "none" : "block";
    for (const el of uibg.children) el.style.display = el.dataset.bg === bg ? "block" : "none";
    const [sx, sy] = focus;
    const [fx, fy] = at;
    const left = fx - (14 + sx) * s;
    const top = fy - (14 + sy) * s;
    phone.style.transform = `translate(${left}px, ${top}px) rotate(${rot}deg) scale(${s})`;
    phone.style.opacity = opacity;
  }
  function scr(name, { x = 0, y = 0, o = 1 } = {}) {
    const el = img(name);
    el.style.display = "block";
    el.style.transform = `translate(${x}px, ${y}px)`;
    el.style.opacity = o;
  }
  /** Enchaîne des écrans : [[t, nom, "slide"|"fade"|"up"], …]. */
  function seq(t, list, dur = 0.28) {
    let cur = 0;
    for (let i = 0; i < list.length; i++) if (t >= list[i][0]) cur = i;
    const [t0, name, mode] = list[cur];
    const u = cur === 0 ? 1 : E.out(clamp((t - t0) / dur));
    if (cur > 0 && u < 1) {
      const prev = list[cur - 1][1];
      if (mode === "fade") {
        scr(prev);
        scr(name, { o: u });
      } else if (mode === "up") {
        scr(prev, { y: -200 * u, o: 1 - u });
        scr(name, { y: 1069 * (1 - u) });
      } else {
        scr(prev, { x: -494 * u });
        scr(name, { x: 494 * (1 - u) });
      }
    } else scr(name);
    return name;
  }
  function tapAt(t, a, x, y) {
    const u = (t - a) / 0.45;
    if (u < 0 || u > 1) return;
    tap.style.display = "block";
    tap.style.left = x + "px";
    tap.style.top = y + "px";
    tap.style.transform = `scale(${0.5 + u * 0.9})`;
    tap.style.opacity = 1 - u;
  }
  function ringAt(t, a, b, rect) {
    const v = win(t, a, b, 0.2);
    if (v <= 0) return;
    ring.style.display = "block";
    const [x, y, w, h] = rect.map((n) => n * SCALE);
    const pulse = 1 + Math.sin((t - a) * 6) * 0.03;
    ring.style.left = x - 8 + "px";
    ring.style.top = y - 8 + "px";
    ring.style.width = w + 16 + "px";
    ring.style.height = h + 16 + "px";
    ring.style.opacity = v;
    ring.style.transform = `scale(${pulse})`;
  }
  function buzz(t, a, b) {
    const on = t >= a && t < b;
    $("#buzz").style.display = on ? "block" : "none";
    if (on) $("#buzz").style.opacity = 0.5 + 0.5 * Math.sin(t * 40);
    return on ? Math.sin(t * 90) * 7 : 0;
  }
  function card(i, t, a, b, src, { x, y, rot = 0 }) {
    const el = cards[i];
    const v = win(t, a, b, 0.25);
    if (v <= 0) return;
    el.style.display = "block";
    $("img", el).src = `ecrans/${src}.jpg`;
    const p = pop(t, a, 0.45);
    el.style.left = x + "px";
    el.style.top = y + "px";
    el.style.opacity = v;
    el.style.transform = `rotate(${rot}deg) scale(${0.6 + 0.4 * p})`;
  }

  // ---------------------------------------------------------------- textes
  const { DIALOG, VO } = window.TEXTS;
  const frame = { anchors: {}, subTop: 1452 };

  function drawBubbles(t) {
    for (const who of ["J", "B"]) {
      const el = bubbles[who];
      el.style.display = "none";
      const line = DIALOG.find(([w, a, b]) => w === who && t >= a && t < b);
      const anchor = frame.anchors[who];
      if (!line || !anchor) continue;
      const [, a, b, text] = line;
      if (el.dataset.text !== text) {
        el.textContent = text.replace(/'/g, "’").replace(/ ([!?:;])/g, "\u00a0$1");
        el.dataset.text = text;
      }
      el.style.display = "block";
      const [hx, hy, below] = anchor;
      const w = el.offsetWidth,
        h = el.offsetHeight;
      const left = clamp(hx - w / 2, 50, 1030 - w);
      const top = below ? hy + 34 : hy - h - 34;
      el.className = "bubble" + (below ? " below" : "");
      el.style.left = left + "px";
      el.style.top = top + "px";
      el.style.setProperty("--tail", clamp(hx - left, 50, w - 50) + "px");
      el.style.setProperty("--ox", clamp(hx - left, 50, w - 50) + "px");
      const p = pop(t, a, 0.3);
      const out = clamp((b - t) / 0.15);
      el.style.transform = `scale(${0.7 + 0.3 * p})`;
      el.style.opacity = Math.min(clamp((t - a) / 0.12), out);
    }
  }
  function drawSub(t) {
    const line = VO.find(([a, b]) => t >= a && t < b);
    sub.style.display = "none";
    if (!line || frame.noSub) return;
    const [a, b, text] = line;
    const span = $("span", sub);
    const html = text
      .replace(/'/g, "’")
      .replace(/ ([!?:;])/g, "&nbsp;$1")
      .replace(/\*(.+?)\*/g, "<b>$1</b>");
    if (span.innerHTML !== html) span.innerHTML = html;
    sub.style.display = "flex";
    sub.style.top = frame.subTop + "px";
    const v = Math.min(clamp((t - a) / 0.2), clamp((b - t) / 0.18));
    sub.style.opacity = v;
    sub.style.transform = `translateY(${(1 - E.out(clamp((t - a) / 0.25))) * 24}px)`;
  }
  function drawStep(t, n, label, a, { top = 150 } = {}) {
    step.style.display = "flex";
    $("b", step).textContent = n;
    $("span", step).textContent = label;
    const p = pop(t, a, 0.4);
    step.style.left = "50%";
    step.style.top = top + "px";
    step.style.transform = `translateX(-50%) scale(${0.6 + 0.4 * p})`;
    step.style.opacity = clamp((t - a) / 0.15);
  }

  // ---------------------------------------------------------------- plans
  const ZOOM_J = 0.95;
  const SEAT = 1336;
  const FLOOR = 1775;
  const SHOTS = [];
  const shot = (t0, t1, f) => SHOTS.push({ t0, t1, f });

  // 1A — l'armoire s'ouvre (0–3)
  shot(0, 3, (lt, t) => {
    roomState(t, { blurBack: 10, blurProps: 7 });
    setCam(
      1330,
      k(lt, [
        [0, 1150],
        [3, 1170],
      ]),
      k(lt, [
        [0, 1.75],
        [3, 1.85],
      ]),
    );
    place(J, { x: 1330, floor: FLOOR, s: ZOOM_J });
    const surprised = lt < 1.5;
    pose(J, t, {
      armL: k(lt, [
        [0, [40, 70]],
        [0.9, [28, 40]],
        [3, [10, 0]],
      ]),
      armR: k(lt, [
        [0, [-40, -70]],
        [0.9, [-28, -40]],
        [3, [-10, 0]],
      ]),
      brows: surprised ? 1 : 0.4,
      wide: surprised,
      mouth: lt < 0.5 ? "neutral" : surprised ? "o" : "smirk",
      look: lt > 1.7 ? [-0.8, 0.5] : [0, 0],
      head: lt > 1.7 ? -6 : 0,
      talk: false,
    });
    pov.style.display = "block";
    const open = E.out(clamp(lt / 0.9));
    $("#povDoorL").setAttribute("transform", `translate(0 0) scale(${1 - open * 0.93} 1)`);
    $("#povDoorR").setAttribute(
      "transform",
      `translate(1080 0) scale(${1 - open * 0.93} 1) translate(-1080 0)`,
    );
    const fall = clamp((lt - 1.35) / 0.55);
    const [sx, sy] = toScreen(1330 - 96 * ZOOM_J * 0.95, FLOOR - 850 * ZOOM_J + 270 * ZOOM_J);
    const fy = lerp(-200, sy - 40, E.in(fall));
    const fx = lerp(sx + 120, sx, fall);
    $("#povShirt").setAttribute(
      "transform",
      `translate(${fx} ${fy}) rotate(${lerp(-40, 18, fall)}) scale(${lt < 1.35 ? 0 : 1.2})`,
    );
    hook.style.display = "block";
    [...hook.children].forEach((w, i) => {
      const a = 0.25 + i * 0.17;
      w.style.opacity = clamp((lt - a) / 0.18);
      w.style.transform = `translateY(${(1 - E.out(clamp((lt - a) / 0.3))) * 30}px)`;
    });
    hook.style.opacity = clamp((3 - lt) / 0.25);
  });

  // 1B — « Même ma chambre est devenue un magasin » (3–7,5)
  shot(3, 7.5, (lt, t) => {
    roomState(t);
    setCam(
      k(lt, [
        [0, 1170],
        [4.5, 1200],
      ]),
      1150,
      k(lt, [
        [0, 0.92],
        [4.5, 0.99],
      ]),
    );
    place(J, { x: 1350, floor: FLOOR, s: ZOOM_J });
    const second = t >= 5.1;
    pose(J, t, {
      armL: second
        ? k(t, [
            [5.1, [50, 35]],
            [5.5, [36, 102], "back"],
          ])
        : k(lt, [
            [0, [6, -4]],
            [0.5, [56, 30], "back"],
          ]),
      armR: second
        ? k(t, [
            [5.1, [-6, 4]],
            [5.5, [-36, -102], "back"],
          ])
        : [-6, 4],
      head: second ? -4 : -8,
      look: second ? [0, 0] : [-0.8, 0.2],
      brows: second ? 0.7 : 0.3,
    });
    frame.anchors.J = headTop(J);
  });

  // 1C — inserts sur les objets (7,5–12,5)
  const INSERTS = [
    [1420, 1250, 0, 2.9],
    [975, 1478, 1, 3.6],
    [1215, 1095, 2, 3.2],
    [1015, 1380, 3, 3.0],
  ];
  shot(7.5, 12.5, (lt, t) => {
    roomState(t, { blurBack: 9 });
    const i = Math.min(3, Math.floor(lt / 1.25));
    const [x, y, ci, z] = INSERTS[i];
    const u = (lt - i * 1.25) / 1.25;
    setCam(x + lerp(-30, 30, u), y, z + u * 0.12);
    const chip = chips[ci];
    const p = pop(lt, i * 1.25 + 0.15, 0.4);
    chip.style.display = "flex";
    chip.style.left = "50%";
    chip.style.top = "300px";
    chip.style.transform = `translateX(-50%) scale(${0.5 + 0.5 * p})`;
    chip.style.opacity = clamp((lt - i * 1.25 - 0.15) / 0.12);
  });

  // 1D — « Ce qui dort chez toi… » (12,5–17)
  shot(12.5, 17, (lt, t) => {
    roomState(t, { blurBack: 2 });
    setCam(
      k(lt, [
        [0, 1440],
        [4.5, 1480],
      ]),
      k(lt, [
        [0, 1130],
        [4.5, 1110],
      ]),
      k(lt, [
        [0, 1.3],
        [4.5, 1.45],
      ]),
    );
    place(J, { x: 1530, seat: SEAT, s: ZOOM_J });
    const turn = lt > 4.1;
    pose(J, t, {
      armL: turn ? [6, -4] : [-34, -150],
      armR: [-14, 24],
      look: turn ? [-1, 0] : [-0.9, 0.4],
      head: turn ? -8 : 6,
      mouth: lt > 2.6 ? "smile" : "neutral",
      brows: turn ? 0.6 : 0,
    });
  });

  // 2A — Boris entre (17–19)
  shot(17, 19, (lt, t) => {
    roomState(t, { door: E.out(clamp(lt / 0.55)) });
    setCam(560, 1060, 0.95);
    const walk = E.io(clamp((lt - 0.5) / 1.5));
    place(B, { x: lerp(300, 520, walk), floor: lerp(1392, 1740, walk), s: lerp(0.86, 0.98, walk) });
    pose(B, t, {
      armR:
        lt < 1.1
          ? k(lt, [
              [0, [-20, -150]],
              [0.3, [-30, -160]],
            ])
          : [-6, 4],
      armL: [6, -4],
      look: [1, 0],
      head: 6,
      mouth: "grin",
    });
    frame.anchors.B = headTop(B);
  });

  // 2B — « Tu comptes garder tout ça jusqu'à quand ? » (19–21)
  shot(19, 21, (lt, t) => {
    roomState(t, { blurBack: 9, blurProps: 5 });
    setCam(
      1060,
      k(lt, [
        [0, 1170],
        [2, 1150],
      ]),
      k(lt, [
        [0, 1.85],
        [2, 1.95],
      ]),
    );
    place(B, { x: 1060, floor: FLOOR, s: 0.98 });
    pose(B, t, {
      armR: [-22, -158],
      holdR: "sneaker",
      tiltR: 0,
      look: [0.6, -0.2],
      head: 7,
      brows: 0.6,
      mouth: "smirk",
      talkRest: "smirk",
    });
    frame.anchors.B = headTop(B);
  });

  // 2C — « Je ne sais même plus quoi en faire ! » (21–23,5)
  shot(21, 23.5, (lt, t) => {
    roomState(t, { blurBack: 9, blurProps: 4 });
    setCam(
      1530,
      k(lt, [
        [0, 1060],
        [2.5, 1040],
      ]),
      k(lt, [
        [0, 1.9],
        [2.5, 2.0],
      ]),
    );
    place(J, { x: 1530, seat: SEAT, s: ZOOM_J });
    pose(J, t, {
      armL: k(lt, [
        [0, [6, -4]],
        [0.35, [38, 104], "back"],
      ]),
      armR: k(lt, [
        [0, [-6, 4]],
        [0.35, [-38, -104], "back"],
      ]),
      brows: 0.8,
      head: -5,
      mouth: "grin",
    });
    frame.anchors.J = headTop(J);
  });

  // 2D — « Mon frère, tu connais Zuvo ? » (23,5–29)
  shot(23.5, 29, (lt, t) => {
    const ots = lt >= 2.5;
    roomState(t, ots ? { blurBack: 16, blurProps: 14, blurChars: 10 } : { blurBack: 3 });
    setCam(
      1640,
      ots ? 1000 : 1090,
      ots
        ? 1.7
        : k(lt, [
            [0, 1.3],
            [2.5, 1.38],
          ]),
    );
    place(J, { x: 1500, seat: SEAT, s: ZOOM_J });
    place(B, { x: 1785, seat: SEAT, s: 0.98 });
    pose(J, t, {
      body: 5,
      look: [1, 0.4],
      head: 8,
      brows: 0.8,
      mouth: lt > 1.2 ? "o" : "smile",
      wide: true,
    });
    pose(B, t, { armL: [58, 38], holdL: "screen", look: [-1, 0], head: -6, mouth: "grin" });
    if (!ots) {
      frame.anchors.B = headTop(B);
    } else {
      // Plan par-dessus l'épaule : le vrai site, en grand.
      uiState({
        bg: "none",
        at: [
          560,
          k(lt, [
            [2.5, 1000],
            [5.5, 960],
          ]),
        ],
        s: k(lt, [
          [2.5, 1.12],
          [5.1, 1.18],
          [5.5, 2.8, "in"],
        ]),
        rot: k(lt, [
          [2.5, -5],
          [5.5, 0],
        ]),
      });
      scr("accueil-full", {
        y: k(lt, [
          [2.7, -560],
          [5.0, -1500],
        ]),
      });
      scr("barre-haut");
      scr("barre-bas", { y: 1069 - 89 });
      frame.anchors.B = [760, 170, true];
      flash.style.opacity = clamp((lt - 5.25) / 0.25);
    }
  });

  // 2E — le logo (29–31)
  function logoAnim(lt, { finalLayout = 0 } = {}) {
    logo.style.display = "block";
    const sq = pop(lt, 0, 0.5);
    const markSize = lerp(250, 230, finalLayout);
    const markY = lerp(640, 440, E.io(finalLayout));
    const mark = $("#mark");
    mark.style.left = 540 - markSize / 2 + "px";
    mark.style.top = markY - markSize / 2 + "px";
    mark.setAttribute("width", markSize);
    mark.setAttribute("height", markSize);
    $("#markSq").setAttribute("transform", `translate(16 16) scale(${sq}) translate(-16 -16)`);
    $("#markZ").style.strokeDashoffset = 1 - E.io(clamp((lt - 0.3) / 0.5));
    const dot = pop(lt, 0.75, 0.35);
    $("#markDot").setAttribute(
      "transform",
      `translate(23.5 8.5) scale(${dot}) translate(-23.5 -8.5)`,
    );
    const word = $("#word");
    const wv = E.out(clamp((lt - 0.85) / 0.45));
    word.style.top = lerp(800, 690, E.io(finalLayout)) + (1 - wv) * 40 + "px";
    word.style.opacity = wv;
    $("#blob1").style.transform =
      `translate(${Math.sin(lt * 0.6) * 20}px, ${Math.cos(lt * 0.5) * 16}px)`;
    $("#blob2").style.transform =
      `translate(${Math.cos(lt * 0.5) * 18}px, ${Math.sin(lt * 0.7) * 14}px)`;
  }
  function endTexts(lt) {
    const items = [
      ["#tagline", 0.1],
      ["#subline", 0.5],
      ["#urlrow", 0.9],
      ["#ctarow", 1.3],
    ];
    for (const [sel, a] of items) {
      const el = $(sel);
      const v = E.out(clamp((lt - a) / 0.45));
      el.style.display = "block";
      el.style.opacity = v;
      el.style.transform = `translateY(${(1 - v) * 40}px)`;
    }
    const cta = $("#ctarow .cta");
    const pulse = lt > 3.2 ? 1 + 0.035 * Math.sin((lt - 3.2) * 4) : 1;
    cta.style.transform = `scale(${pulse})`;
  }
  function hideEnd() {
    for (const sel of ["#tagline", "#subline", "#urlrow", "#ctarow"]) $(sel).style.display = "none";
  }
  shot(29, 31, (lt, t) => {
    hideEnd();
    logoAnim(lt);
    flash.style.opacity = clamp(1 - lt / 0.35);
    frame.subTop = 1452;
  });

  // 3A — accueil (31–34)
  shot(31, 34, (lt, t) => {
    uiState({
      at: [540, 900],
      s: k(lt, [
        [0, 0.95],
        [0.5, 1.12, "out"],
      ]),
      rot: k(lt, [
        [0, 4],
        [0.6, 0],
      ]),
    });
    scr("accueil-full", {
      y: k(lt, [
        [0.6, -900],
        [2.9, -2350],
      ]),
    });
    scr("barre-haut");
    scr("barre-bas", { y: 1069 - 89 });
  });

  // 3B — recherche et catégories (34–36,5)
  shot(34, 36.5, (lt, t) => {
    uiState({
      focus: k(lt, [
        [1.2, [247, 534]],
        [1.8, [247, 330]],
      ]),
      at: k(lt, [
        [1.2, [540, 900]],
        [1.8, [540, 820]],
      ]),
      s: k(lt, [
        [1.2, 1.12],
        [1.8, 1.4],
      ]),
    });
    seq(lt, [
      [0, "explorer"],
      [1.2, "recherche", "fade"],
    ]);
    tapAt(lt, 0.85, 247, 70);
  });

  // 3C — fiche produit (36,5–39)
  shot(36.5, 39, (lt, t) => {
    uiState({
      focus: k(lt, [
        [0, [247, 534]],
        [0.9, [247, 660]],
      ]),
      at: k(lt, [
        [0, [540, 900]],
        [0.9, [540, 760]],
      ]),
      s: k(lt, [
        [0, 1.12],
        [0.9, 1.75],
      ]),
    });
    scr("annonce-autre");
    ringAt(lt, 1.0, 2.5, [24, 1062, 250, 66]);
  });

  // 3D — 1. Prends tes photos (39–41)
  shot(39, 41, (lt, t) => {
    roomState(t, { tableSneaker: true, noOldPhone: true, blurBack: 3 });
    setCam(
      k(lt, [
        [0, 1130],
        [2, 1150],
      ]),
      1020,
      k(lt, [
        [0, 1.45],
        [2, 1.55],
      ]),
    );
    place(J, { x: 1000, floor: FLOOR - 40, s: ZOOM_J });
    pose(J, t, {
      armR: [-62, -36],
      holdR: "shot",
      look: [1, 0.2],
      head: 6,
      mouth: lt > 1.1 ? "grin" : "smile",
    });
    flash.style.opacity = lt > 1.0 && lt < 1.4 ? 0.85 * (1 - (lt - 1.0) / 0.4) : 0;
    drawStep(lt, 1, "Prends tes photos", 0.15);
  });

  // 3E — 2. Publie ton annonce (41–45,5)
  const STEPS = [
    [0, "vendre-1"],
    [0.75, "vendre-2", "slide"],
    [1.5, "vendre-3", "slide"],
    [2.2, "vendre-3b", "fade"],
    [2.9, "vendre-4", "slide"],
    [3.65, "vendre-5", "slide"],
  ];
  shot(41, 45.5, (lt, t) => {
    const FOCUS = {
      "vendre-1": 380,
      "vendre-2": 430,
      "vendre-3": 420,
      "vendre-3b": 480,
      "vendre-4": 380,
      "vendre-5": 470,
    };
    const keys = STEPS.map(([a, n]) => [a, FOCUS[n]]);
    const fy = k(
      lt,
      keys.map(([a, f], i) => (i ? [a + 0.1, f] : [a, f])),
    );
    uiState({
      focus: [247, fy],
      at: [540, 960],
      s: k(lt, [
        [0, 1.2],
        [0.4, 1.42],
      ]),
    });
    const name = seq(lt, STEPS);
    drawStep(lt, 2, "Publie ton annonce", 0.05, { top: 120 });
    fields.style.display = "flex";
    fields.style.top = "240px";
    fields.style.opacity = clamp((lt - 0.2) / 0.2);
    const on = {
      "vendre-1": 0,
      "vendre-2": 2,
      "vendre-3": 3,
      "vendre-3b": 4,
      "vendre-4": 6,
      "vendre-5": 6,
    }[name];
    [...fields.children].forEach((f, i) => f.classList.toggle("on", i < on));
  });

  // 3F — « Publier l'annonce » (45,5–47,5)
  shot(45.5, 47.5, (lt, t) => {
    uiState({
      focus: k(lt, [
        [0, [247, 470]],
        [0.3, [247, 1022]],
        [0.8, [247, 1022]],
        [1.3, [247, 534]],
      ]),
      at: k(lt, [
        [0, [540, 880]],
        [0.3, [540, 1250]],
        [0.8, [540, 1250]],
        [1.3, [540, 900]],
      ]),
      s: k(lt, [
        [0, 1.42],
        [0.3, 1.25],
        [0.8, 1.25],
        [1.3, 1.12],
      ]),
    });
    seq(
      lt,
      [
        [0, "vendre-5"],
        [0.62, "publiee", "up"],
      ],
      0.4,
    );
    tapAt(lt, 0.35, 330, 1022);
    const b = $("#burst");
    const p = pop(lt, 0.75, 0.45);
    b.style.display = lt > 0.75 ? "block" : "none";
    b.style.opacity = clamp((2 - lt) / 0.3);
    b.firstElementChild.setAttribute("transform", `translate(840 330) scale(${p})`);
    b.querySelectorAll("[data-ray]").forEach((r, i) =>
      r.setAttribute(
        "transform",
        `rotate(${i * 36}) translate(0 ${-clamp((lt - 0.8) / 0.5) * 40})`,
      ),
    );
  });

  // 3G — 3. Échange avec les acheteurs (47,5–51)
  shot(47.5, 51, (lt, t) => {
    uiState({
      at: [
        540,
        k(lt, [
          [0, 900],
          [3.5, 860],
        ]),
      ],
      s: 1.08,
    });
    scr("annonce-acheteur");
    ringAt(lt, 0.6, 3.5, [24, 1560, 732, 96]);
    drawStep(lt, 3, "Échange avec les acheteurs", 0.1, { top: 140 });
  });

  // 4A — il reprend ses activités (51–53,5)
  shot(51, 53.5, (lt, t) => {
    roomState(t, { evening: true, bedPhone: true, noOldPhone: true });
    setCam(
      1420,
      1130,
      k(lt, [
        [0, 1.0],
        [2.5, 1.06],
      ]),
    );
    place(J, { x: 1100, floor: FLOOR, s: ZOOM_J });
    place(B, { x: 1780, seat: SEAT, s: 0.98 });
    const fold = Math.sin(lt * 5) * 6;
    pose(J, t, {
      armL: [-12 + fold, -112],
      armR: [12 - fold, 112],
      holdR: "shirt",
      look: [0, 0.8],
      head: 4,
      mouth: "smile",
    });
    const eat = (Math.sin(lt * 3.2) + 1) / 2;
    pose(B, t, {
      armL: [lerp(-10, -24, eat), lerp(-60, -150, eat)],
      holdR: "peanuts",
      armR: [-14, 40],
      mouth: eat > 0.6 ? "chew" : "smile",
      look: [-0.5, 0],
    });
    card(0, lt, 0.3, 2.5, "profil", { x: 70, y: 220, rot: -4 });
  });

  // 4B — le premier message (53,5–56,5)
  shot(53.5, 56.5, (lt, t) => {
    const shake = buzz(lt, 0, 0.7);
    uiState({
      bg: "bed",
      focus: k(lt, [
        [1.15, [247, 534]],
        [1.6, [247, 270]],
      ]),
      at: k(lt, [
        [1.15, [540 + shake, 900]],
        [1.6, [540, 760]],
      ]),
      s: k(lt, [
        [0, 1.0],
        [1.15, 1.08],
        [1.6, 1.75],
      ]),
      rot: k(lt, [
        [0, -6],
        [1.15, 0],
      ]),
    });
    seq(lt, [
      [0, "messages-1"],
      [1.15, "conversation-1", "slide"],
    ]);
    tapAt(lt, 0.85, 247, 140);
    ringAt(lt, 1.7, 3.0, [24, 356, 650, 172]);
  });

  // 4C — « Oui, elle est disponible ! » (56,5–58,5)
  shot(56.5, 58.5, (lt, t) => {
    roomState(t, { evening: true, blurBack: 9, blurProps: 6, noOldPhone: true });
    setCam(
      1530,
      1050,
      k(lt, [
        [0, 1.85],
        [2, 1.95],
      ]),
    );
    place(J, { x: 1530, seat: SEAT, s: ZOOM_J });
    pose(J, t, {
      armR: [6, 82],
      holdR: "screen",
      look: [0.3, 0.9],
      head: 5,
      mouth: "grin",
      brows: 0.4,
    });
    frame.anchors.J = headTop(J);
    card(0, lt, 0.2, 2.0, "conversation-2", { x: 700, y: 1060, rot: 5 });
  });

  // 4D — un second acheteur (58,5–60,5)
  shot(58.5, 60.5, (lt, t) => {
    const shake = buzz(lt, 0, 0.5);
    uiState({
      bg: "bed",
      focus: k(lt, [
        [0.4, [247, 534]],
        [0.9, [247, 200]],
      ]),
      at: k(lt, [
        [0.4, [540 + shake, 900]],
        [0.9, [540, 760]],
      ]),
      s: k(lt, [
        [0.4, 1.08],
        [0.9, 1.6],
      ]),
    });
    scr("messages-2");
    ringAt(lt, 0.95, 2.0, [16, 168, 748, 128]);
  });

  // 4E — « Je t'avais dit, mon frère ! » (60,5–65)
  shot(60.5, 65, (lt, t) => {
    roomState(t, { evening: true, blurBack: 3, noOldPhone: true });
    setCam(
      1640,
      1090,
      k(lt, [
        [0, 1.3],
        [4.5, 1.4],
      ]),
    );
    place(J, { x: 1500, seat: SEAT, s: ZOOM_J });
    place(B, { x: 1785, seat: SEAT, s: 0.98 });
    pose(J, t, {
      armL: [34, 96],
      armR: [6, 82],
      holdR: "screen",
      body: 4,
      look: [1, 0],
      head: 8,
      brows: 1,
      wide: true,
      mouth: "grin",
    });
    const eat = lt < 2.8 ? (Math.sin(lt * 3.4) + 1) / 2 : 0;
    pose(B, t, {
      armL: [lerp(-10, -24, eat), lerp(-60, -150, eat)],
      armR: [-14, 40],
      holdR: "peanuts",
      look: [-1, 0],
      head: -6,
      mouth: lt < 2.9 ? (eat > 0.6 ? "chew" : "grin") : "grin",
    });
    frame.anchors.J = headTop(J);
    frame.anchors.B = headTop(B);
  });

  // 5 — la communauté (65–77)
  const V_ORDER = ["etudiante", "actif", "maman", "acheteur"];
  shot(65, 77, (lt, t) => {
    s5.style.display = "block";
    grade("soft", 1);
    const i = Math.min(3, Math.floor(lt / 3));
    const v = VIGNETTES.find((x) => x.id === V_ORDER[i]);
    const r = V[v.id];
    const local = lt - i * 3;
    for (const el of s5.children) el.style.display = "none";
    const box = s5.querySelector(`[data-v="${v.id}"]`);
    box.style.display = "block";
    const enter = E.out(clamp(local / 0.35));
    box.style.transform = `translateX(${(1 - enter) * (i ? 1080 : 0)}px) scale(${1 + local * 0.025})`;
    const [x, top, s] = v.at;
    r.g.setAttribute("transform", `translate(${x - 180 * s} ${top}) scale(${s})`);
    r.legsStand.style.display = "";
    r.legsSit.style.display = "none";
    if (v.id === "etudiante") {
      pose(r, t, { armR: [-48, -58], holdR: "shot", look: [1, 0.6], head: 8, mouth: "smile" });
      flash.style.opacity = local > 1.0 && local < 1.35 ? 0.8 * (1 - (local - 1.0) / 0.35) : 0;
    } else if (v.id === "actif") {
      pose(r, t, {
        armR: [6, 84],
        holdR: "screen",
        look: [0.2, 1],
        head: 6,
        mouth: local > 1.2 ? "grin" : "smile",
      });
    } else if (v.id === "maman") {
      pose(r, t, { armR: [-55, -50], holdR: "shot", look: [1, 0.5], head: 6, mouth: "smile" });
      flash.style.opacity = local > 1.3 && local < 1.65 ? 0.8 * (1 - (local - 1.3) / 0.35) : 0;
    } else {
      pose(r, t, {
        armR: [6, 84],
        holdR: "screen",
        look: [0.3, 1],
        head: -4,
        mouth: local > 1.3 ? "grin" : "smile",
        brows: local > 1.3 ? 0.6 : 0,
      });
      box
        .querySelectorAll("[data-b]")
        .forEach((b, j) =>
          b.setAttribute(
            "transform",
            `translate(${-((local * 600 + j * 0) % 2200) + 2200 * (j * 220 > (local * 600) % 2200 ? 0 : 1)} 0)`,
          ),
        );
      const h = pop(local, 1.3, 0.4);
      heart.style.display = local > 1.3 ? "block" : "none";
      heart.style.left = "720px";
      heart.style.top = 560 - clamp((local - 1.3) / 1.2) * 120 + "px";
      heart.style.opacity = clamp((3 - local) / 0.4);
      heart.style.transform = `scale(${h})`;
    }
    if (v.card)
      card(1, local, 0.5, 2.85, v.card, { x: i % 2 ? 90 : 700, y: 260, rot: i % 2 ? -5 : 5 });
  });

  // 6A — la chambre rangée (77–80)
  shot(77, 80, (lt, t) => {
    roomState(t, { tidy: true, noOldPhone: true });
    setCam(
      k(lt, [
        [0, 1250],
        [3, 1290],
      ]),
      1150,
      k(lt, [
        [0, 0.95],
        [3, 1.02],
      ]),
    );
    place(J, { x: 1560, seat: SEAT, s: ZOOM_J });
    pose(J, t, {
      armL: [10, -6],
      armR: [6, 82],
      holdR: "screen",
      body: -4,
      look: [0.2, 0.9],
      head: 5,
      mouth: "grin",
    });
  });

  // 6B — le logo (80–82,4) puis 6C — carte finale (82,4–90)
  shot(80, 82.4, (lt, t) => {
    if (lt < 0.9) {
      roomState(t, { tidy: true, noOldPhone: true });
      setCam(
        1560,
        k(lt, [
          [0, 1080],
          [0.9, 1040],
        ]),
        k(lt, [
          [0, 1.4],
          [0.9, 1.9],
        ]),
      );
      place(J, { x: 1560, seat: SEAT, s: ZOOM_J });
      pose(J, t, {
        armR: k(lt, [
          [0, [6, 82]],
          [0.6, [24, 128]],
        ]),
        holdR: "screen",
        look: [0, 0],
        head: 0,
        mouth: "grin",
      });
      flash.style.opacity = clamp((lt - 0.6) / 0.3);
    } else {
      hideEnd();
      logoAnim(lt - 0.9);
      flash.style.opacity = clamp(1 - (lt - 0.9) / 0.35);
    }
  });
  shot(82.4, 90.01, (lt, t) => {
    logoAnim(lt + 1.5, { finalLayout: E.io(clamp(lt / 1.4)) });
    if (lt > 1.8) endTexts(lt - 1.8);
    else hideEnd();
  });

  // ---------------------------------------------------------------- rendu
  function hideAll() {
    for (const el of [room, pov, ui, s5, logo]) el.style.display = "none";
    for (const el of [
      hook,
      step,
      fields,
      tap,
      ring,
      heart,
      $("#buzz"),
      $("#burst"),
      ...chips,
      ...cards,
    ])
      el.style.display = "none";
    for (const im of screen.querySelectorAll("img")) im.style.display = "none";
    flash.style.opacity = 0;
    grade("none");
    frame.anchors = {};
    frame.subTop = 1452;
    frame.noSub = false;
  }
  function render(t) {
    hideAll();
    const s = SHOTS.find((x) => t >= x.t0 && t < x.t1) || SHOTS[SHOTS.length - 1];
    s.f(t - s.t0, t);
    drawBubbles(t);
    drawSub(t);
    legal.style.display = t >= 31 && t < 65 ? "block" : "none";
    const live = room.style.display === "block" || s5.style.display === "block";
    $("#vignette").style.display = live ? "block" : "none";
    // Grain fixe : une texture légère qui n'alourdit pas la compression.
  }
  window.render = render;
  window.DURATION = 90;
  window.ready = Promise.all([
    document.fonts.ready,
    ...[...document.images].map((i) => i.decode().catch(() => null)),
  ]).then(() => true);
})();
