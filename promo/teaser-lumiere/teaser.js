// Teaser Zuvo « lumière sur verre » (30 s, 9:16) : un point de lumière traverse le
// site présenté sur des panneaux de verre, puis devient la pastille du logo.
// Rendu image par image : window.render(t) dessine l'instant t (en secondes).
/* eslint-disable */
(() => {
  const SITE_URL = "zuvo-beta.vercel.app";
  const DURATION = 30.5;

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
  const icon = (n) => `<svg viewBox="0 0 24 24">${window.ICONS[n]}</svg>`;

  // ---------------------------------------------------------------- décor et lumière
  add(`<div id="bg"></div>`);
  add(`<div id="floor"></div>`);
  const pool = add(`<div id="pool"></div>`);
  const orb = add(
    `<div class="orb"><i class="glow2"></i><i class="glow1"></i><i class="streak"></i><i class="core"></i></div>`,
  );
  const persp = add(`<div id="persp"></div>`);
  const fx =
    add(`<svg class="abs" width="1080" height="1920" viewBox="0 0 1080 1920" style="overflow:visible">
      <defs>
        <linearGradient id="arcGrad" x1="0" x2="1"><stop offset="0" stop-color="#1f5fe0" stop-opacity="0"/><stop offset=".55" stop-color="#8fb4ff"/><stop offset="1" stop-color="#ffffff"/></linearGradient>
        <filter id="glow" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="8" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
      </defs>
      <ellipse id="arc" cx="540" cy="1340" rx="520" ry="120" fill="none" stroke="url(#arcGrad)" stroke-width="10" filter="url(#glow)" pathLength="1" stroke-dasharray="1" stroke-dashoffset="1" style="display:none"/>
      <rect id="outline" fill="none" stroke="#dbe7ff" stroke-width="4" rx="46" style="display:none" filter="url(#glow)"/>
      <g id="brackets" style="display:none" stroke="#ffffff" stroke-width="6" fill="none" stroke-linecap="round"></g>
      <ellipse id="ring" cx="540" cy="1520" rx="10" ry="3" fill="none" stroke="#8fb4ff" stroke-width="6" filter="url(#glow)" style="display:none"/>
    </svg>`);

  // ---------------------------------------------------------------- panneaux (vraies captures, mode sombre)
  const PHONE_H = (w) => Math.round((w * 844) / 390);
  function panel(src, w, h = PHONE_H(w), radius = 46) {
    const el = add(
      `<div class="panel" style="width:${w}px;height:${h}px;border-radius:${radius}px"><img src="ecrans/${src}.jpg" alt=""></div>`,
      persp,
    );
    el.dataset.w = w;
    el.dataset.h = h;
    return el;
  }
  const RING = ["accueil", "explorer", "annonce", "vendre-5", "messages"].map((s) => panel(s, 410));
  const FIND = panel("annonce", 500);
  const PUB = panel("publiee", 430);
  const CONV = panel("conversation", 430);
  const DESK = panel("bureau-accueil", 900, 562, 26);
  const DESK2 = panel("bureau-explorer", 900, 562, 26);

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

  // ---------------------------------------------------------------- textes
  const kword = add(`<div class="kword"></div>`);
  const pill = add(
    `<div id="pill" class="glass">${icon("search")}<span class="ph">Rechercher un article…</span><span class="chars" id="typed"></span><span class="caret" id="pcaret"></span><span class="enter">↵</span></div>`,
  );
  const question = add(`<div id="question" class="chars"></div>`);
  const prompt = add(`<div id="prompt" class="glass">
      <div class="ptitle"><i></i>Vendre un article</div>
      <div class="pfield"><b>Photo</b><img src="ecrans/produit-baskets.jpg" alt=""><span class="chars" data-text="1 photo · principale"></span></div>
      <div class="pfield"><b>Titre</b><span class="chars" data-text="Baskets rouges, pointure 42"></span></div>
      <div class="pfield"><b>Catégorie</b><span class="chars" data-text="Chaussures · Très bon état"></span></div>
      <div class="pfield"><b>Prix</b><span class="chars" data-text="15 000 FCFA"></span></div>
      <div class="pfield"><b>Ville</b><span class="chars" data-text="Yaoundé"></span></div>
      <div class="send">↑</div>
    </div>`);
  const bars = (n, seed) =>
    Array.from(
      { length: n },
      (_, i) =>
        `<i style="height:${18 + Math.abs(Math.sin(i * 1.7 + seed) * 58) + (i % 3) * 4}px"></i>`,
    ).join("");
  const rows = add(`<div id="rows">
      <div class="row glass"><div class="rl"><small>01</small><b>Photos</b></div><div class="rv"><span class="thumb on" style="background-image:url(ecrans/produit-baskets.jpg)"></span><span class="thumb"></span><span class="thumb"></span><span class="muted">jusqu'à 8</span></div></div>
      <div class="row glass"><div class="rl"><small>02</small><b>Description</b></div><div class="rv"><div class="bars">${bars(46, 1)}</div></div></div>
      <div class="row glass"><div class="rl"><small>03</small><b>Catégorie et état</b></div><div class="rv"><span class="chip">Chaussures</span><span class="chip">Très bon état</span></div></div>
      <div class="row glass"><div class="rl"><small>04</small><b>Prix et lieu</b></div><div class="rv"><span class="big">15 000 FCFA</span><span class="muted">· Yaoundé</span></div></div>
    </div>`);
  const ROWS = [...rows.querySelectorAll(".row")];
  const beam = add(`<div id="beam"></div>`);
  const counter = add(`<div id="counter">Étape<b>1 sur 5</b></div>`);
  const done = add(`<div id="done"><i>✓</i>Publiée à l'instant</div>`);
  const head = add(
    `<div id="head"><div class="l1">La seconde main,</div><div class="l2">simplement.</div></div>`,
  );
  const end = add(`<div id="end">
      <svg id="mark" viewBox="0 0 32 32" width="230" height="230" class="abs" style="overflow:visible">
        <rect id="markSq" width="32" height="32" rx="9" fill="#1f5fe0"/>
        <path id="markZ" d="M10 10.5h12l-12 11h12" fill="none" stroke="#fff" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" pathLength="1" stroke-dasharray="1"/>
      </svg>
      <div class="center" id="word">Zuvo</div>
      <div class="center" id="tag">La seconde vie de tes affaires.</div>
      <div class="center" id="cta"><span>Découvre Zuvo</span></div>
      <div class="center chars" id="play"></div>
      <div class="center" id="url">${SITE_URL}</div>
      <div class="center" id="note">Interface présentée avec des annonces de démonstration.</div>
    </div>`);
  add(`<div id="vignette"></div>`);
  const flash = add(`<div id="flash"></div>`);

  /** Prépare un texte en lettres séparées (apparition lettre par lettre avec flou). */
  function setChars(el, text) {
    if (el.dataset.built === text) return [...el.querySelectorAll("span.c")];
    // Lettres regroupées par mot : la ligne ne se coupe qu'entre deux mots.
    el.innerHTML = text
      .replace(/'/g, "’")
      .replace(/ ([?!:;])/g, "\u00a0$1")
      .split(" ")
      .map(
        (word) =>
          `<span class="w">${[...word].map((c) => `<span class="c">${c === "\u00a0" ? "&nbsp;" : c}</span>`).join("")}</span>`,
      )
      .join(" ");
    el.dataset.built = text;
    return [...el.querySelectorAll("span.c")];
  }
  /** Lettres tapées : n lettres visibles, la dernière arrive floue. */
  function typeChars(el, text, t, a, speed = 0.075) {
    const spans = setChars(el, text);
    spans.forEach((s, i) => {
      const u = clamp((t - (a + i * speed)) / 0.16);
      s.style.opacity = u;
      s.style.filter = `blur(${((1 - u) * 10).toFixed(1)}px)`;
      s.style.transform = `translateY(${((1 - u) * 10).toFixed(1)}px)`;
    });
    return clamp((t - a) / (text.length * speed));
  }
  /** Mot en grand, révélé avec flou de mouvement. */
  function showWord(text, t, a, b, { top = 300, dir = 1 } = {}) {
    const v = win(t, a, b, 0.35, 0.3);
    if (v <= 0) return;
    kword.style.display = "block";
    kword.style.top = top + "px";
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

  // ---------------------------------------------------------------- trajectoire du point de lumière
  // [t, [x, y, taille, intensité]]
  const ORB = [
    [0.0, [540, 470, 0.2, 0]],
    [0.7, [300, 520, 1, 1]],
    [3.2, [820, 560, 1, 1]],
    [4.3, [540, 1300, 0.8, 1]],
    [4.9, [250, 800, 0.9, 1]],
    [7.6, [300, 820, 0.9, 1]],
    [8.4, [820, 470, 1, 1]],
    [10.9, [780, 520, 1, 1]],
    [11.6, [150, 690, 0.9, 1]],
    [14.4, [180, 720, 0.9, 1]],
    [15.0, [900, 430, 0.8, 0.8]],
    [16.9, [900, 430, 0.8, 0.8]],
    [19.4, [540, 520, 1, 1]],
    [22.6, [560, 600, 1, 1]],
    [23.4, [180, 240, 0.9, 1]],
    [25.4, [200, 260, 0.9, 1]],
    [26.5, [540 + 51.6, 770 - 51.6, 0.55, 1], "io"],
    [30.5, [540 + 51.6, 770 - 51.6, 0.55, 1]],
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

  // 1 — Le réveil : un carrousel de panneaux éclairé par la lumière qui passe (0–3,4)
  function carousel(t, spin, extra = {}) {
    const [ox, oy] = extra.orb;
    RING.forEach((el, i) => {
      const theta = ((i - 2) * 24 + spin) * (Math.PI / 180);
      const R = 1180;
      const x = 540 + Math.sin(theta) * R;
      const z = (Math.cos(theta) - 1) * R;
      const appear = ease(t, 0.35 + i * 0.22, 0.9);
      const b = lit(ox, oy, x, 860) * (extra.dim ?? 1);
      place(el, {
        x,
        y: 940 + (1 - appear) * 160,
        z: z - (1 - appear) * 300,
        ry: (-theta * 180) / Math.PI,
        o: appear * (extra.o ?? 1),
        blur: (1 - appear) * 12 + (extra.blur ?? 0),
        bright: b,
      });
    });
  }
  shot(0, 3.4, (lt, t, o) => {
    carousel(
      lt,
      k(lt, [
        [0, -14],
        [3.4, 8],
      ]),
      { orb: o },
    );
  });

  // 2 — L'arc : le carrousel s'emballe, un arc de lumière balaie le sol (3,4–4,6)
  shot(3.4, 4.6, (lt, t, o) => {
    const u = ease(lt, 0, 1.0, "in");
    carousel(t, lerp(8, 70, u), { orb: o, blur: u * 18, o: 1 - clamp((lt - 0.55) / 0.4) });
    const arc = $("#arc");
    arc.style.display = "";
    arc.setAttribute("stroke-dashoffset", 1 - ease(lt, 0.15, 0.75, "io"));
    arc.style.opacity = clamp((1.2 - lt) / 0.3);
    flash.style.opacity = 0.35 * Math.exp(-(((lt - 0.95) / 0.15) ** 2));
  });

  // 3 — Cherche : barre de recherche, texte tapé (4,6–8,0)
  shot(4.6, 8.0, (lt, t) => {
    showWord("Cherche.", t, 4.75, 7.7, { top: 330 });
    pill.style.display = "flex";
    const enter = ease(lt, 0, 0.6);
    const collapse = ease(lt, 2.75, 0.55, "io");
    pill.style.left = 100 + "px";
    pill.style.top = 834 + "px";
    pill.style.opacity = Math.min(enter, 1 - clamp((lt - 3.15) / 0.25));
    pill.style.filter = `blur(${((1 - enter) * 14).toFixed(1)}px)`;
    pill.style.transform = `perspective(1400px) rotateX(${lerp(24, 6, enter)}deg) scale(${lerp(0.85, 1, enter) * lerp(1, 1.07, collapse)}, ${lerp(0.85, 1, enter) * lerp(1, 0.04, collapse)})`;
    const text = "Robe en wax";
    const typed = typeChars($("#typed"), text, t, 5.55, 0.085);
    pill.querySelector(".ph").style.opacity = lt < 0.9 ? 1 : 0;
    $("#pcaret").style.opacity = Math.floor(t * 2.2) % 2 === 0 || (typed > 0 && typed < 1) ? 1 : 0;
    const press = Math.exp(-(((t - 7.05) / 0.12) ** 2));
    pill.querySelector(".enter").style.background = `rgb(59 118 238 / ${press * 0.9})`;
    pill.querySelector(".enter").style.boxShadow = `0 0 ${press * 40}px rgb(59 118 238 / ${press})`;
  });

  // 4 — Trouve : un cadre se trace, l'annonce apparaît, encadrée (8,0–11,2)
  shot(8.0, 11.2, (lt, t, o) => {
    showWord("Trouve.", t, 8.3, 10.9, { top: 150 });
    const outline = $("#outline");
    const grow = ease(lt, 0, 0.75, "io");
    const w = lerp(940, 540, grow);
    const h = lerp(8, 1168, grow);
    const cx = 540;
    const cy = lerp(900, 1010, grow);
    const leave = ease(lt, 2.75, 0.45, "in");
    outline.style.display = "";
    outline.setAttribute("x", cx - w / 2);
    outline.setAttribute("y", cy - h / 2);
    outline.setAttribute("width", w);
    outline.setAttribute("height", h);
    outline.style.opacity = (1 - clamp((lt - 0.9) / 0.4)) * 0.9;
    const show = ease(lt, 0.55, 0.7);
    const fl = Math.sin(lt * 1.6) * 6;
    place(FIND, {
      x: cx - leave * 700,
      y: cy + fl,
      rx: lerp(10, 3, show),
      ry: lerp(-14, 8, ease(lt, 0.55, 2.4, "io")),
      s: lerp(1.04, 1, show),
      o: show,
      blur: (1 - show) * 14 + leave * 22,
      bright: lit(o[0], o[1], cx, cy, 0.75),
    });
    // Coins de visée autour de l'annonce
    const g = $("#brackets");
    const bp = pop(lt, 1.05, 0.45);
    if (bp > 0 && leave < 0.5) {
      g.style.display = "";
      const m = 34 + (1 - bp) * 30;
      const x0 = cx - 270 - m - leave * 700;
      const x1 = cx + 270 + m - leave * 700;
      const y0 = cy - 584 - m + fl;
      const y1 = cy + 584 + m + fl;
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
  });

  // 5 — Vends : la question arrive avec un flou de mouvement, la fiche se remplit (11,2–14,6)
  const PFIELDS = [
    [12.15, 0.05],
    [12.55, 0.045],
    [13.2, 0.045],
    [13.75, 0.06],
    [14.05, 0.06],
  ];
  shot(11.2, 14.6, (lt, t) => {
    question.style.display = "block";
    const qIn = ease(lt, 0, 0.55);
    const qOut = ease(lt, 3.1, 0.35, "in");
    setChars(question, "Qu'as-tu à vendre aujourd'hui ?");
    question.style.opacity = qIn * (1 - qOut);
    question.style.filter = `blur(${((1 - qIn) * 22 + qOut * 16).toFixed(1)}px)`;
    question.style.transform = `translateX(${((1 - qIn) * 420 - qOut * 300).toFixed(0)}px) scaleX(${lerp(1.3, 1, qIn)})`;
    prompt.style.display = "block";
    const pIn = ease(lt, 0.35, 0.8);
    const pOut = ease(lt, 3.05, 0.4, "in");
    prompt.style.left = "90px";
    prompt.style.top = "700px";
    prompt.style.opacity = pIn * (1 - pOut);
    prompt.style.filter = `blur(${((1 - pIn) * 14 + pOut * 18).toFixed(1)}px)`;
    prompt.style.transform = `perspective(1500px) rotateX(${lerp(26, 8, pIn) + pOut * 30}deg) translateY(${(1 - pIn) * 220 - pOut * 80}px) scale(${lerp(0.9, 1, pIn)})`;
    prompt.querySelectorAll(".pfield > span").forEach((span, i) => {
      const [a, speed] = PFIELDS[i];
      typeChars(span, span.dataset.text, t, a, speed);
    });
    const img = prompt.querySelector(".pfield img");
    const ip = pop(t, 12.05, 0.4);
    img.style.transform = `scale(${ip})`;
    const press = pop(t, 14.25, 0.3);
    const send = prompt.querySelector(".send");
    send.style.transform = `scale(${t > 14.25 ? lerp(0.85, 1, press) : 1})`;
    send.style.boxShadow = `0 0 ${40 + 60 * Math.exp(-(((t - 14.3) / 0.12) ** 2))}px rgb(59 118 238 / 0.8)`;
  });

  // 6 — Les étapes empilées, balayées par le faisceau (14,6–19,6)
  shot(14.6, 19.6, (lt, t) => {
    rows.style.display = "block";
    const tilt = k(lt, [
      [0, 30],
      [2.2, 12],
      [5, 8],
    ]);
    const out = ease(lt, 4.6, 0.4, "in");
    const sweep = clamp((lt - 2.35) / 1.9);
    const beamX = sweep > 0 && sweep < 1 ? lerp(80, 1000, E.io(sweep)) : -999;
    ROWS.forEach((row, i) => {
      const a = 0.1 + i * 0.32;
      const u = ease(lt, a, 0.75);
      const y = 560 + i * 214;
      row.style.top = y + "px";
      row.style.opacity = u * (1 - out);
      row.style.filter = `blur(${((1 - u) * 14 + out * 16).toFixed(1)}px) brightness(${(0.85 + 0.5 * Math.exp(-(((beamX - 540) / 420) ** 2))).toFixed(3)})`;
      row.style.transform = `perspective(1600px) rotateX(${tilt}deg) rotateZ(${lerp(-5, 0, ease(lt, 0, 2.5, "io"))}deg) translate3d(${(1 - u) * 260}px, ${(1 - u) * 90}px, ${(1 - u) * -260 + out * -400}px)`;
    });
    if (beamX > -999) {
      beam.style.display = "block";
      beam.style.left = beamX + "px";
      beam.style.opacity = Math.min(1, sweep * 8, (1 - sweep) * 8);
    }
    counter.style.display = "block";
    counter.style.opacity = win(lt, 2.0, 4.6, 0.3, 0.3);
    // Même indicateur que l'assistant de mise en vente (« Étape 5 sur 5 » : Vérification)
    $("#counter b").textContent = `${Math.min(5, 1 + Math.floor(sweep * 5))} sur 5`;
    const d = pop(lt, 4.35, 0.45);
    if (d > 0) {
      done.style.display = "block";
      done.style.opacity = Math.min(d, 1 - out);
      done.style.transform = `scale(${lerp(0.7, 1, d)})`;
      flash.style.opacity = 0.3 * Math.exp(-(((lt - 4.4) / 0.12) ** 2));
    }
  });

  // 7 — Discute : l'annonce publiée et la conversation (19,6–22,8)
  shot(19.6, 22.8, (lt, t, o) => {
    showWord("Discute.", t, 19.75, 22.6, { top: 210, dir: -1 });
    const a = ease(lt, 0, 0.7);
    const b = ease(lt, 0.55, 0.7);
    const out = ease(lt, 2.85, 0.35, "in");
    const fl = Math.sin(lt * 1.7) * 6;
    place(PUB, {
      x: lerp(1300, 330, a) - out * 600,
      y: 1040 + fl,
      z: -40,
      ry: lerp(-40, 16, a),
      o: a * (1 - out),
      blur: (1 - a) * 18 + out * 20,
      bright: lit(o[0], o[1], 330, 1000, 0.6),
    });
    place(CONV, {
      x: lerp(1500, 760, b) - out * 600,
      y: 1100 - fl,
      z: -160,
      ry: lerp(-50, -16, b),
      o: b * (1 - out),
      blur: (1 - b) * 18 + out * 20,
      bright: lit(o[0], o[1], 760, 1060, 0.85),
    });
  });

  // 8 — Le site : « La seconde main, simplement. » et la version ordinateur (22,8–25,4)
  shot(22.8, 25.4, (lt, t, o) => {
    head.style.display = "block";
    const out = ease(lt, 2.25, 0.35, "in");
    [...head.children].forEach((line, i) => {
      const u = ease(lt, 0.1 + i * 0.22, 0.7);
      line.style.opacity = u * (1 - out);
      line.style.filter = `blur(${((1 - u) * 18 + out * 16).toFixed(1)}px)`;
      line.style.transform = `translateY(${(1 - u) * 50}px)`;
    });
    const d = ease(lt, 0.35, 1.0);
    place(DESK2, {
      x: 640,
      y: 1110,
      z: -380,
      rx: 16,
      ry: -26,
      o: d * 0.7 * (1 - out),
      blur: (1 - d) * 14 + 2 + out * 18,
      bright: 0.55,
    });
    place(DESK, {
      x: lerp(700, 560, d),
      y: lerp(1400, 1190, d),
      rx: lerp(34, 14, d),
      ry: lerp(-30, -20, d),
      o: d * (1 - out),
      blur: (1 - d) * 16 + out * 18,
      bright: lit(o[0], o[1], 560, 1100, 0.75),
    });
  });

  // 9 — Fin : la lumière devient la pastille du logo, « À toi de jouer. » (25,4–30,5)
  shot(25.4, DURATION + 0.01, (lt, t) => {
    end.style.display = "block";
    const mark = $("#mark");
    const sq = pop(lt, 0.25, 0.55);
    mark.style.left = 540 - 115 + "px";
    mark.style.top = 770 - 115 + "px";
    $("#markSq").setAttribute("transform", `translate(16 16) scale(${sq}) translate(-16 -16)`);
    $("#markZ").style.strokeDashoffset = 1 - ease(lt, 0.55, 0.6, "io");
    mark.style.filter = `drop-shadow(0 0 ${30 + 30 * Math.exp(-(((lt - 1.1) / 0.2) ** 2))}px rgb(59 118 238 / 0.6))`;
    const items = [
      ["#word", 990, 1.25],
      ["#tag", 1130, 1.6],
      ["#cta", 1230, 1.95],
      ["#url", 1600, 3.1],
      ["#note", 1830, 3.3],
    ];
    for (const [sel, top, a] of items) {
      const el = $(sel);
      const u = ease(lt, a, 0.7);
      el.style.top = top + "px";
      el.style.opacity = u;
      el.style.filter = `blur(${((1 - u) * 14).toFixed(1)}px)`;
      el.style.transform = `translateY(${(1 - u) * 36}px)`;
    }
    $("#word").style.top = "860px";
    const play = $("#play");
    play.style.top = "1400px";
    typeChars(play, "À toi de jouer.", t, 27.75, 0.07);
    const ring = $("#ring");
    const r = clamp((lt - 2.9) / 1.4);
    if (r > 0) {
      ring.style.display = "";
      ring.setAttribute("cy", 1545);
      ring.setAttribute("rx", 20 + E.out(r) * 380);
      ring.setAttribute("ry", 4 + E.out(r) * 46);
      ring.style.opacity = (1 - r) * 0.9;
    }
    flash.style.opacity = 0.45 * Math.exp(-(((lt - 1.1) / 0.16) ** 2));
  });

  // ---------------------------------------------------------------- rendu
  function hideAll() {
    for (const el of persp.children) el.style.display = "none";
    for (const el of [kword, pill, question, prompt, rows, beam, counter, done, head, end])
      el.style.display = "none";
    for (const id of ["#arc", "#outline", "#brackets", "#ring"]) $(id).style.display = "none";
    flash.style.opacity = 0;
  }
  function render(t) {
    hideAll();
    const o = drawOrb(t);
    // Le point de lumière passe devant les panneaux à la fin (il devient la pastille du logo).
    orb.style.zIndex = t > 25.4 ? 5 : 0;
    const s = SHOTS.find((x) => t >= x.t0 && t < x.t1) || SHOTS[SHOTS.length - 1];
    s.f(t - s.t0, t, o);
  }
  window.render = render;
  window.DURATION = DURATION;
  window.ready = Promise.all([
    document.fonts.ready,
    ...[...document.images].map((i) => i.decode().catch(() => null)),
  ]);
})();
