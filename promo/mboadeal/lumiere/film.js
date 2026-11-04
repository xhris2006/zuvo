// MboaDeal « lumière » (31 s, 9:16) : un point de lumière orange traverse le site,
// présenté sur des panneaux de verre en mode sombre, puis trace le logo.
// Rendu image par image : window.seek(t) dessine l'instant t (en secondes).
/* eslint-disable */
(() => {
  const DURATION = 31;

  // ---------------------------------------------------------------- outils
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const lerp = (a, b, u) => a + (b - a) * u;
  const E = {
    lin: (u) => u,
    io: (u) => (u < 0.5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2),
    out: (u) => 1 - Math.pow(1 - u, 3),
    expo: (u) => (u >= 1 ? 1 : 1 - Math.pow(2, -10 * u)),
    in: (u) => u * u * u,
    back: (u) => 1 + 2.70158 * Math.pow(u - 1, 3) + 1.70158 * Math.pow(u - 1, 2),
  };
  /** Images clés : [[t, valeur, courbe], …] ; valeurs nombres ou tableaux. */
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
  const win = (t, a, b, fi = 0.25, fo = 0.25) => clamp(Math.min((t - a) / fi, (b - t) / fo));
  const pop = (t, a, d = 0.4) => (t < a ? 0 : t > a + d ? 1 : E.back((t - a) / d));
  const ease = (t, a, d, e = "expo") => E[e](clamp((t - a) / d));
  const $ = (s) => document.querySelector(s);
  const stage = $("#stage");
  const add = (html, parent = stage) => {
    parent.insertAdjacentHTML("beforeend", html);
    return parent.lastElementChild;
  };
  const icon = (n) => `<svg class="i" viewBox="0 0 24 24">${window.ICONES[n]}</svg>`;
  const M = window.MARQUE;

  // ---------------------------------------------------------------- décor et lumière
  add(`<div id="bg"></div>`);
  add(`<div id="floor"></div>`);
  const pool = add(`<div id="pool"></div>`);
  const orb = add(
    `<div class="orb"><i class="glow2"></i><i class="glow1"></i><i class="streak"></i><i class="core"></i></div>`,
  );
  const persp = add(`<div id="persp"></div>`);
  add(`<svg class="abs" width="1080" height="1920" viewBox="0 0 1080 1920" style="overflow:visible">
      <defs>
        <linearGradient id="arcGrad" x1="0" x2="1"><stop offset="0" stop-color="#ff7a00" stop-opacity="0"/><stop offset=".55" stop-color="#ffb066"/><stop offset="1" stop-color="#ffffff"/></linearGradient>
        <linearGradient id="trailGrad" x1="0" x2="1"><stop offset="0" stop-color="#ff7a00" stop-opacity="0"/><stop offset="1" stop-color="#ffd2a6"/></linearGradient>
        <filter id="glow" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="8" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
      </defs>
      <ellipse id="arc" cx="540" cy="1340" rx="520" ry="120" fill="none" stroke="url(#arcGrad)" stroke-width="10" filter="url(#glow)" pathLength="1" stroke-dasharray="1" stroke-dashoffset="1" style="display:none"/>
      <rect id="outline" fill="none" stroke="#ffd2a6" stroke-width="4" rx="46" style="display:none" filter="url(#glow)"/>
      <g id="brackets" style="display:none" stroke="#ffffff" stroke-width="6" fill="none" stroke-linecap="round"></g>
      <g id="trails" style="display:none" fill="none" stroke="url(#trailGrad)" stroke-width="5" stroke-linecap="round" filter="url(#glow)">
        <path pathLength="1" stroke-dasharray="1"/><path pathLength="1" stroke-dasharray="1"/><path pathLength="1" stroke-dasharray="1"/>
      </g>
      <ellipse id="ring" cx="540" cy="1520" rx="10" ry="3" fill="none" stroke="#ffb066" stroke-width="6" filter="url(#glow)" style="display:none"/>
    </svg>`);

  // ---------------------------------------------------------------- panneaux (vraies captures, mode sombre)
  const PHONE_H = (w) => Math.round((w * 844) / 390);
  function panel(src, w, h = PHONE_H(w), radius = 46) {
    const el = add(
      `<div class="panel" style="width:${w}px;height:${h}px;border-radius:${radius}px"><img src="../ecrans-sombres/${src}.jpg" alt=""></div>`,
      persp,
    );
    el.dataset.w = w;
    el.dataset.h = h;
    return el;
  }
  const CORR = ["accueil", "explorer", "annonce", "profil", "conversation"].map((s) =>
    panel(s, 380),
  );
  const FIND = panel("annonce", 520);
  const STEPS = ["vendre-1", "vendre-2", "vendre-3", "vendre-4", "vendre-5"].map((s) =>
    panel(s, 360),
  );
  const SHARE = panel("partage", 500);
  const PROFILE = panel("profil", 520);

  function place(
    el,
    { x = 540, y = 960, z = 0, rx = 0, ry = 0, rz = 0, s = 1, o = 1, blur = 0, bright = 1 } = {},
  ) {
    const w = +el.dataset.w || el.offsetWidth;
    const h = +el.dataset.h || el.offsetHeight;
    el.style.display = "block";
    el.style.transform = `translate3d(${x - w / 2}px, ${y - h / 2}px, ${z}px) rotateX(${rx}deg) rotateY(${ry}deg) rotateZ(${rz}deg) scale(${s})`;
    el.style.opacity = o;
    el.style.filter = `blur(${blur.toFixed(2)}px) brightness(${bright.toFixed(3)})`;
  }

  // ---------------------------------------------------------------- textes et éléments de verre
  const intro = add(
    `<div id="intro"><div class="l1 chars"></div><div class="l2 chars"></div></div>`,
  );
  const kword = add(`<div class="kword"></div>`);
  const pill = add(
    `<div id="pill" class="glass">${icon("search")}<span class="ph">Rechercher un article…</span><span><span class="chars" id="typed"></span><span class="caret" id="pcaret"></span><span class="ghost" id="ghost"></span></span></div>`,
  );
  const sugg = add(`<div id="sugg" class="glass">
      <div class="lbl">ANNONCES</div>
      <div class="s hi">${'<span class="ic">' + icon("search") + "</span>"}Robe en wax longue, taille M</div>
      <div class="s">${'<span class="ic">' + icon("search") + "</span>"}Baskets rouges, pointure 42</div>
      <div class="s">${'<span class="ic">' + icon("search") + "</span>"}Lot de 6 romans africains</div>
    </div>`);
  const counter = add(`<div id="counter">Étape<b>1 sur 5</b><em>Photos</em></div>`);
  // Noms des étapes de l'assistant de mise en vente du site, lus par la voix off.
  const STEP_NAMES = ["Photos", "Description", "Catégorie", "Prix et lieu", "Vérification"];
  const done = add(`<div id="done" class="glass">
      <img src="../objets/watch.jpg" alt="">
      <div><div class="ok">${icon("circle-check")}Annonce publiée</div><div class="t">Montre dorée, bracelet cuir</div><div class="p">12 000 FCFA</div></div>
    </div>`);
  const chip = (ic, label) =>
    add(`<div class="chipg glass"><span class="ic">${icon(ic)}</span><span>${label}</span></div>`);
  const SHARE_CHIPS = [
    chip("link", "Copier le lien"),
    chip("message-circle", "WhatsApp"),
    chip("external-link", "Facebook"),
  ];
  const waCheck = add(
    `<div class="abs" style="display:none; width:64px; height:64px; border-radius:50%; background:#16a34a; color:#fff; font-size:38px; align-items:center; justify-content:center; box-shadow: 0 0 40px rgb(22 163 74 / .7)">${icon("check")}</div>`,
  );
  const PROFILE_CHIPS = [
    chip("heart", "Favoris"),
    chip("users", "Abonnés"),
    chip("message-circle", "Messages"),
  ];
  const beam = add(`<div id="beam"></div>`);
  const end = add(`<div id="end">
      <svg id="mark" class="abs" viewBox="${M.markViewBox}" width="300" height="300" style="overflow:visible">
        <defs><linearGradient id="markGrad" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ffa43a"/><stop offset=".5" stop-color="#ff7a00"/><stop offset="1" stop-color="#ff5a00"/></linearGradient></defs>
        <path id="mHandle" d="${M.handle}" fill="none" stroke="url(#markGrad)" stroke-width="20" stroke-linecap="round" pathLength="1" stroke-dasharray="1"/>
        <path id="mBody" d="${M.body}" fill="url(#markGrad)" style="transform-box: fill-box; transform-origin: center"/>
        <path id="mSmile" d="${M.smile}" fill="none" stroke="url(#markGrad)" stroke-width="16" stroke-linecap="round" pathLength="1" stroke-dasharray="1"/>
      </svg>
      <div class="center" id="word"><svg viewBox="${M.wordViewBox}" width="100%" style="display:block; overflow:visible"><path d="${M.mboa}" fill="#ffffff"/><path d="${M.deal}" fill="#ff7a00"/></svg></div>
      <div class="center" id="tag">Achète. Vends. <b>Donne une seconde vie.</b></div>
      <div class="center" id="cta"><span>Découvre MboaDeal</span></div>
      <div class="center" id="offer">Au lancement : publication gratuite, sans commission</div>
      <div class="center" id="note">Interface présentée avec des annonces de démonstration.</div>
    </div>`);
  add(`<div id="vignette"></div>`);
  const flash = add(`<div id="flash"></div>`);

  /** Prépare un texte en lettres séparées (apparition lettre par lettre avec flou). */
  function setChars(el, text) {
    if (el.dataset.built === text) return [...el.querySelectorAll("span.c")];
    el.innerHTML = text
      .replace(/'/g, "’")
      .replace(/ ([?!:;])/g, " $1")
      .split(" ")
      .map(
        (word) =>
          `<span class="w">${[...word].map((c) => `<span class="c">${c === " " ? "&nbsp;" : c}</span>`).join("")}</span>`,
      )
      .join(" ");
    el.dataset.built = text;
    return [...el.querySelectorAll("span.c")];
  }
  /** Lettres tapées : la dernière arrive floue. */
  function typeChars(el, text, t, a, speed = 0.06) {
    const spans = setChars(el, text);
    spans.forEach((s, i) => {
      const u = clamp((t - (a + i * speed)) / 0.16);
      s.style.opacity = u;
      s.style.filter = `blur(${((1 - u) * 10).toFixed(1)}px)`;
      s.style.transform = `translateY(${((1 - u) * 10).toFixed(1)}px)`;
    });
  }
  /** Mot en grand, révélé avec un flou de mouvement. */
  function showWord(text, t, a, b, { top = 300, dir = 1, size = 136 } = {}) {
    const v = win(t, a, b, 0.35, 0.3);
    if (v <= 0) return;
    kword.style.display = "block";
    kword.style.top = top + "px";
    kword.style.fontSize = size + "px";
    if (kword.dataset.text !== text) {
      kword.innerHTML = text.replace(/\.$/, '<span class="dot">.</span>');
      kword.dataset.text = text;
    }
    const inU = ease(t, a, 0.6);
    const outU = clamp((t - (b - 0.3)) / 0.3);
    kword.style.opacity = v;
    kword.style.filter = `blur(${((1 - inU) * 16 + outU * 14).toFixed(1)}px)`;
    kword.style.transform = `translateX(${((1 - inU) * 120 * dir - outU * 160 * dir).toFixed(1)}px) scale(${lerp(1.12, 1, inU)})`;
  }
  /** Élément de verre posé en (x, y) avec apparition floue. */
  function showGlass(el, { x, y, u, out = 0, rx = 0, display = "flex", s = 1 }) {
    if (u <= 0 || out >= 1) return;
    el.style.display = display;
    el.style.left = x + "px";
    el.style.top = y + "px";
    el.style.opacity = u * (1 - out);
    el.style.filter = `blur(${((1 - u) * 14 + out * 16).toFixed(1)}px)`;
    el.style.transform = `perspective(1400px) rotateX(${rx}deg) scale(${s})`;
  }

  // ---------------------------------------------------------------- trajectoire du point de lumière
  // [t, [x, y, taille, intensité]]
  const HOP_X = [160, 350, 540, 730, 920];
  const hops = [];
  HOP_X.forEach((x, i) => {
    const t0 = 14.4 + i * 0.5;
    hops.push([t0, [x, 790, 0.85, 1]]);
    if (i < 4) hops.push([t0 + 0.25, [(x + HOP_X[i + 1]) / 2, 700, 0.85, 1]]);
  });
  const ORB = [
    [0.0, [160, 1120, 0.2, 0]],
    [0.4, [160, 1120, 0.9, 1]],
    [3.2, [900, 830, 0.8, 1]],
    [3.9, [540, 1250, 0.9, 1]],
    [4.8, [190, 670, 0.9, 1]],
    [7.2, [250, 680, 0.9, 1]],
    [7.7, [210, 920, 0.85, 1]],
    [9.2, [260, 920, 0.85, 1]],
    [10.0, [540, 420, 0.9, 1]],
    [10.9, [745, 545, 0.85, 1]],
    [12.3, [860, 500, 0.9, 1]],
    [13.6, [900, 420, 0.8, 0.9]],
    ...hops,
    [17.2, [600, 900, 0.9, 1]],
    [17.8, [745, 1395, 0.8, 1]],
    [18.6, [745, 1395, 0.8, 1]],
    [19.6, [575, 650, 0.9, 1]],
    [20.3, [600, 760, 0.9, 1]],
    [21.3, [690, 968, 0.8, 1]],
    [22.6, [720, 968, 0.8, 1]],
    [23.4, [300, 560, 0.9, 1]],
    [24.8, [320, 560, 0.9, 1]],
    [26.0, [540, 640, 0.9, 1]],
    [26.6, [540, 600, 0.7, 1]],
    [27.3, [502, 852, 0.6, 1]],
    [27.5, [540, 870, 0.55, 1], "lin"],
    [27.7, [578, 852, 0.5, 1], "lin"],
    [28.2, [578, 852, 0.2, 0]],
    [DURATION, [578, 852, 0.2, 0]],
  ];
  function drawOrb(t) {
    const [x, y, s, i] = k(t, ORB);
    const pulse = 1 + 0.06 * Math.sin(t * 5.3);
    orb.style.transform = `translate(${x}px, ${y}px) scale(${s * pulse})`;
    orb.style.opacity = i;
    const near = clamp(1 - Math.abs(1330 - y) / 900);
    pool.style.left = x + "px";
    pool.style.top = "1340px";
    pool.style.opacity = (0.25 + 0.75 * near) * i;
    pool.style.transform = `scaleX(${0.8 + near * 0.5})`;
    return [x, y];
  }
  /** Éclairage d'un panneau selon sa distance au point de lumière. */
  const lit = (ox, oy, x, y, base = 0.42) =>
    base + (1.25 - base) * Math.exp(-(((x - ox) ** 2 + (y - oy) ** 2) / (520 * 520)));

  // ---------------------------------------------------------------- plans
  const SHOTS = [];
  const shot = (t0, t1, f) => SHOTS.push({ t0, t1, f });

  // 1 — Le couloir : les écrans se lèvent au passage de la lumière (0–3,8)
  function corridor(t, o, { push = 0, blur = 0, fade = 1 } = {}) {
    CORR.forEach((el, i) => {
      const x = lerp(170, 910, i / 4);
      const z = -i * 430 + t * 70 + push;
      const appear = ease(t, 0.25 + i * 0.42, 0.8);
      place(el, {
        x,
        y: 1000 + (1 - appear) * 260,
        z,
        rx: (1 - appear) * 70,
        ry: -26,
        o: appear * fade,
        blur: (1 - appear) * 10 + blur,
        bright: lit(o[0], o[1], x, 940),
      });
    });
  }
  shot(0, 3.8, (lt, t, o) => {
    corridor(lt, o);
    intro.style.display = "block";
    const out = ease(lt, 3.3, 0.45, "in");
    intro.style.opacity = 1 - out;
    intro.style.filter = `blur(${(out * 14).toFixed(1)}px)`;
    typeChars(intro.querySelector(".l1"), "Chez toi, ça dort.", t, 0.5, 0.05);
    typeChars(intro.querySelector(".l2"), "Ici, ça se vend.", t, 1.75, 0.055);
  });

  // 2 — L'élan : les écrans foncent vers la caméra, un arc balaie le sol (3,8–4,8)
  shot(3.8, 4.8, (lt, t, o) => {
    const u = ease(lt, 0, 1.0, "in");
    corridor(3.8 + lt, o, { push: u * 2200, blur: u * 22, fade: 1 - clamp((lt - 0.6) / 0.35) });
    const arc = $("#arc");
    arc.style.display = "";
    arc.setAttribute("stroke-dashoffset", 1 - ease(lt, 0.15, 0.7, "io"));
    arc.style.opacity = clamp((1.0 - lt) / 0.3);
    flash.style.opacity = 0.35 * Math.exp(-(((lt - 0.9) / 0.14) ** 2));
  });

  // 3 — Achète : deux lettres, la suite proposée en grisé, les suggestions (4,8–9,6)
  shot(4.8, 9.6, (lt, t) => {
    showWord("Achète.", t, 4.95, 9.4, { top: 300 });
    const enter = ease(lt, 0, 0.6);
    const out = ease(lt, 4.3, 0.45, "in");
    showGlass(pill, { x: 100, y: 600, u: enter, out, rx: lerp(24, 4, enter) });
    pill.querySelector(".ph").style.opacity = t < 5.55 ? 1 : 0;
    const accepted = t >= 7.0;
    const typed = $("#typed");
    const n = t < 5.6 ? 0 : t < 5.75 ? 1 : 2;
    typeChars(typed, accepted ? "robe en wax" : "ro", t, accepted ? -1 : 5.6, 0.15);
    if (!accepted)
      typed.querySelectorAll(".c").forEach((c, i) => (c.style.opacity = i < n ? 1 : 0));
    const ghost = $("#ghost");
    ghost.textContent = !accepted && t >= 6.1 ? "be en wax" : "";
    ghost.style.opacity = clamp((t - 6.1) / 0.3);
    $("#pcaret").style.opacity = Math.floor(t * 2.2) % 2 === 0 || (t > 5.5 && t < 6.2) ? 1 : 0;
    // Suggestions : panneau de verre sous la barre
    const su = ease(t, 6.2, 0.7);
    showGlass(sugg, { x: 100, y: 770, u: su, out, rx: lerp(30, 4, su), display: "block" });
    const hi = sugg.querySelector(".s.hi");
    const h = clamp((t - 7.6) / 0.3);
    const press = Math.exp(-(((t - 8.6) / 0.12) ** 2));
    hi.style.background = `linear-gradient(90deg, rgb(255 122 0 / ${0.08 + 0.3 * h + 0.3 * press}), rgb(255 122 0 / 0.03))`;
    hi.style.boxShadow = `inset 0 0 0 2px rgb(255 160 80 / ${0.5 * h})`;
  });

  // 4 — L'annonce trouvée, cadrée par des repères de lumière (9,6–12,6)
  shot(9.6, 12.6, (lt, t, o) => {
    const outline = $("#outline");
    const grow = ease(lt, 0, 0.75, "io");
    const w = lerp(940, 560, grow);
    const h = lerp(8, 1240, grow);
    const cx = 540;
    const cy = lerp(900, 1010, grow);
    const leave = ease(lt, 2.6, 0.4, "in");
    outline.style.display = "";
    outline.setAttribute("x", cx - w / 2);
    outline.setAttribute("y", cy - h / 2);
    outline.setAttribute("width", w);
    outline.setAttribute("height", h);
    outline.style.opacity = (1 - clamp((lt - 0.9) / 0.4)) * 0.9;
    const show = ease(lt, 0.5, 0.7);
    const fl = Math.sin(lt * 1.6) * 6;
    place(FIND, {
      x: cx - leave * 700,
      y: cy + fl,
      rx: lerp(10, 3, show),
      ry: lerp(-14, 8, ease(lt, 0.5, 2.4, "io")),
      s: lerp(1.04, 1, show),
      o: show,
      blur: (1 - show) * 14 + leave * 22,
      bright: lit(o[0], o[1], cx, cy, 0.78),
    });
    const g = $("#brackets");
    const bp = pop(lt, 1.0, 0.45);
    if (bp > 0 && leave < 0.5) {
      g.style.display = "";
      const m = 34 + (1 - bp) * 30;
      const x0 = cx - 260 - m - leave * 700;
      const x1 = cx + 260 + m - leave * 700;
      const y0 = cy - 562 - m + fl;
      const y1 = cy + 562 + m + fl;
      const L = 70;
      g.innerHTML = [
        `M${x0} ${y0 + L} V${y0} H${x0 + L}`,
        `M${x1 - L} ${y0} H${x1} V${y0 + L}`,
        `M${x0} ${y1 - L} V${y1} H${x0 + L}`,
        `M${x1 - L} ${y1} H${x1} V${y1 - L}`,
      ]
        .map((d) => `<path d="${d}"/>`)
        .join("");
      g.style.opacity = bp * (1 - leave * 2);
    }
    // Éclat sur le cœur (favori) quand la lumière le touche
    flash.style.opacity = 0.18 * Math.exp(-(((lt - 1.35) / 0.15) ** 2));
  });

  // 5 — Vends : les cinq étapes réelles distribuées comme des cartes, publication (12,6–19,4)
  const FAN = STEPS.map((_, i) => {
    const d = i - 2;
    return {
      x: 540 + d * 190,
      y: 1060 + Math.abs(d) * 40,
      z: -Math.abs(d) * 120,
      rz: d * 7,
      ry: -d * 9,
    };
  });
  shot(12.6, 19.4, (lt, t, o) => {
    showWord("Vends.", t, 12.75, 19.2, { top: 210, dir: -1 });
    const gather = ease(t, 16.9, 0.7, "io");
    const out = ease(t, 19.0, 0.35, "in");
    STEPS.forEach((el, i) => {
      const f = FAN[i];
      const a = ease(t, 12.9 + i * 0.18, 0.8);
      const hopT = 14.4 + i * 0.5;
      const lift = Math.exp(-(((t - hopT) / 0.22) ** 2));
      const last = i === 4;
      const tx = lerp(f.x, 540, gather);
      const ty = lerp(f.y, last ? 1000 : 1060, gather);
      const tz = lerp(f.z, last ? 120 : -260 - i * 40, gather);
      place(el, {
        x: lerp(1300, tx, a),
        y: lerp(1700, ty, a) - lift * 50,
        z: tz,
        rz: lerp(25, f.rz * (1 - gather), a),
        ry: lerp(-40, f.ry * (1 - gather), a),
        s: (1 + lift * 0.05) * (last ? lerp(1, 1.42, gather) : 1),
        o: a * (last ? 1 : 1 - gather * 0.7) * (1 - out),
        blur: (1 - a) * 16 + (last ? 0 : gather * 6) + out * 20,
        bright: lit(o[0], o[1], tx, ty, 0.5) + lift * 0.3,
      });
    });
    counter.style.display = "block";
    counter.style.opacity = win(t, 14.2, 16.9, 0.3, 0.3);
    const step = clamp(Math.floor((t - 14.2) / 0.5) + 1, 1, 5);
    $("#counter b").textContent = `${step} sur 5`;
    $("#counter em").textContent = STEP_NAMES[step - 1];
    // Bouton « Publier l'annonce » : impulsion de lumière, puis l'annonce publiée
    flash.style.opacity = 0.32 * Math.exp(-(((t - 17.85) / 0.12) ** 2));
    const r = clamp((t - 17.8) / 0.9);
    const ring = $("#ring");
    if (r > 0 && r < 1) {
      ring.style.display = "";
      ring.setAttribute("cx", 745);
      ring.setAttribute("cy", 1395);
      ring.setAttribute("rx", 20 + E.out(r) * 260);
      ring.setAttribute("ry", 6 + E.out(r) * 60);
      ring.style.opacity = (1 - r) * 0.9;
    }
    const d = pop(t, 18.05, 0.5);
    if (d > 0) showGlass(done, { x: 90, y: 1520, u: Math.min(1, d), out, s: lerp(0.8, 1, d) });
  });

  // 6 — Partage : lien, WhatsApp, Facebook jaillissent de l'annonce (19,4–23)
  const TRAIL_AT = [20.35, 20.9, 21.6];
  const CHIP_AT = [20.55, 21.1, 21.8];
  const CHIP_POS = [
    [610, 700],
    [640, 900],
    [610, 1100],
  ];
  shot(19.4, 23.0, (lt, t, o) => {
    showWord("Partage.", t, 19.55, 22.8, { top: 200 });
    const a = ease(lt, 0.1, 0.8);
    const out = ease(t, 22.55, 0.4, "in");
    place(SHARE, {
      x: lerp(-200, 330, a) - out * 300,
      y: 1060 + Math.sin(lt * 1.6) * 6,
      z: -60,
      ry: lerp(50, 16, a),
      o: a * (1 - out),
      blur: (1 - a) * 18 + out * 20,
      bright: lit(o[0], o[1], 330, 1000, 0.7),
    });
    const trails = $("#trails");
    trails.style.display = "";
    const src = [560, 760];
    [...trails.children].forEach((p, i) => {
      const [x, y] = CHIP_POS[i];
      const st = TRAIL_AT[i];
      p.setAttribute(
        "d",
        `M${src[0]} ${src[1]} C${src[0] + 80} ${src[1]}, ${x - 60} ${y + 52}, ${x} ${y + 52}`,
      );
      p.setAttribute("stroke-dashoffset", 1 - ease(t, st, 0.45, "io"));
      p.style.opacity = clamp((t - st) / 0.1) * (1 - clamp((t - (st + 0.9)) / 0.5)) * (1 - out);
    });
    SHARE_CHIPS.forEach((el, i) => {
      const st = CHIP_AT[i];
      const u = ease(t, st, 0.6);
      const [x, y] = CHIP_POS[i];
      showGlass(el, {
        x: lerp(src[0] - 60, x, u),
        y: lerp(src[1] - 52, y, u),
        u,
        out,
        s: lerp(0.6, 1, u),
      });
    });
    // WhatsApp choisi : coche verte
    const c = pop(t, 22.1, 0.4);
    if (c > 0 && out < 1) {
      waCheck.style.display = "flex";
      waCheck.style.left = "940px";
      waCheck.style.top = "920px";
      waCheck.style.opacity = 1 - out;
      waCheck.style.transform = `scale(${c})`;
    }
  });

  // 7 — Ta vitrine : le profil, balayé par un faisceau (23–26,4)
  const PCHIP_POS = [
    [40, 760],
    [700, 1010],
    [40, 1300],
  ];
  shot(23.0, 26.4, (lt, t, o) => {
    showWord("Ta vitrine.", t, 23.15, 26.2, { top: 190, size: 124 });
    const a = ease(lt, 0.1, 0.8);
    const out = ease(t, 26.0, 0.4, "in");
    place(PROFILE, {
      x: 540,
      y: lerp(1500, 1060, a) + Math.sin(lt * 1.5) * 6,
      z: -40,
      rx: lerp(40, 6, a),
      ry: lerp(-12, 10, ease(lt, 0.1, 3.2, "io")),
      o: a * (1 - out),
      blur: (1 - a) * 16 + out * 20,
      bright: lit(o[0], o[1], 540, 900, 0.75),
    });
    const sweep = clamp((t - 23.9) / 1.3);
    if (sweep > 0 && sweep < 1) {
      beam.style.display = "block";
      beam.style.left = lerp(220, 860, E.io(sweep)) + "px";
      beam.style.top = "470px";
      beam.style.opacity = Math.min(1, sweep * 8, (1 - sweep) * 8) * 0.8;
    }
    PROFILE_CHIPS.forEach((el, i) => {
      const u = pop(t, [24.8, 25.5, 25.9][i], 0.5);
      const [x, y] = PCHIP_POS[i];
      showGlass(el, {
        x,
        y: y + Math.sin(t * 1.8 + i) * 8,
        u: Math.min(1, u),
        out,
        s: lerp(0.7, 1, Math.min(1, u)),
      });
    });
  });

  // 8 — Fin : la lumière trace le logo MboaDeal (26,4–31)
  shot(26.4, DURATION + 0.01, (lt, t) => {
    end.style.display = "block";
    const mark = $("#mark");
    mark.style.left = 540 - 150 + "px";
    mark.style.top = 760 - 150 + "px";
    $("#mHandle").style.strokeDashoffset = 1 - ease(t, 26.55, 0.6, "io");
    const b = pop(t, 26.95, 0.55);
    $("#mBody").style.transform = `scale(${b})`;
    $("#mBody").style.opacity = b > 0 ? 1 : 0;
    $("#mSmile").style.strokeDashoffset = 1 - clamp((t - 27.3) / 0.4);
    mark.style.filter = `drop-shadow(0 0 ${30 + 40 * Math.exp(-(((t - 27.0) / 0.2) ** 2))}px rgb(255 122 0 / 0.6))`;
    const items = [
      ["#word", 960, 27.6],
      ["#tag", 1110, 28.0],
      ["#cta", 1230, 28.45],
      ["#offer", 1430, 29.0],
      ["#note", 1830, 29.3],
    ];
    for (const [sel, top, a] of items) {
      const el = $(sel);
      const u = ease(t, a, 0.7);
      el.style.top = top + "px";
      el.style.opacity = u;
      el.style.filter = `blur(${((1 - u) * 14).toFixed(1)}px)`;
      el.style.transform = `translateY(${(1 - u) * 36}px)`;
    }
    const ring = $("#ring");
    const r = clamp((t - 28.9) / 1.4);
    if (r > 0) {
      ring.style.display = "";
      ring.setAttribute("cx", 540);
      ring.setAttribute("cy", 1565);
      ring.setAttribute("rx", 20 + E.out(r) * 380);
      ring.setAttribute("ry", 4 + E.out(r) * 46);
      ring.style.opacity = (1 - r) * 0.9;
    }
    flash.style.opacity = 0.42 * Math.exp(-(((t - 27.0) / 0.16) ** 2));
  });

  // ---------------------------------------------------------------- rendu
  const HIDE = [
    intro,
    kword,
    pill,
    sugg,
    counter,
    done,
    waCheck,
    beam,
    end,
    ...SHARE_CHIPS,
    ...PROFILE_CHIPS,
  ];
  function hideAll() {
    for (const el of persp.children) el.style.display = "none";
    for (const el of HIDE) el.style.display = "none";
    for (const id of ["#arc", "#outline", "#brackets", "#trails", "#ring"])
      $(id).style.display = "none";
    flash.style.opacity = 0;
  }
  function seek(t) {
    hideAll();
    const o = drawOrb(t);
    // Le point de lumière passe devant tout à la fin (il trace le sourire du logo).
    orb.style.zIndex = t > 26.4 ? 5 : 0;
    const s = SHOTS.find((x) => t >= x.t0 && t < x.t1) || SHOTS[SHOTS.length - 1];
    s.f(t - s.t0, t, o);
  }
  window.seek = seek;
  window.ready = Promise.all([
    document.fonts.ready,
    ...[...document.images].map((i) => i.decode().catch(() => null)),
  ]).then(() => {
    seek(0);
    return { duration: DURATION };
  });
})();
