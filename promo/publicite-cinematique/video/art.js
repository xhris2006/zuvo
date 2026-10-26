// Illustrations de la publicité : motifs wax, personnages, chambre, objets.
// Tout est dessiné en SVG (aucune image externe hormis les vraies captures du site).

const C = {
  blue: "#1f5fe0",
  blueDark: "#1a4dbb",
  blueLight: "#bfd5fd",
  ink: "#0f1b2d",
  paper: "#f7f9fc",
  hair: "#17100c",
  mouth: "#3a1810",
};

/** Éclaircit (f > 0) ou assombrit (f < 0) une couleur hexadécimale. */
function shade(hex, f) {
  const n = parseInt(hex.slice(1), 16);
  const ch = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) =>
    Math.round(f < 0 ? v * (1 + f) : v + (255 - v) * f),
  );
  return "#" + ch.map((v) => v.toString(16).padStart(2, "0")).join("");
}

// ------------------------------------------------------------------ motifs
function defs() {
  const wax = (id, bg, a, b, c, size = 90) => `
    <pattern id="${id}" width="${size}" height="${size}" patternUnits="userSpaceOnUse">
      <rect width="${size}" height="${size}" fill="${bg}"/>
      <circle cx="${size * 0.25}" cy="${size * 0.25}" r="${size * 0.19}" fill="${a}"/>
      <circle cx="${size * 0.25}" cy="${size * 0.25}" r="${size * 0.11}" fill="${bg}"/>
      <circle cx="${size * 0.25}" cy="${size * 0.25}" r="${size * 0.05}" fill="${b}"/>
      <path d="M${size * 0.55} ${size * 0.62} q${size * 0.2} -${size * 0.3} ${size * 0.4} 0 q-${size * 0.2} ${size * 0.3} -${size * 0.4} 0z" fill="${b}"/>
      <circle cx="${size * 0.78}" cy="${size * 0.2}" r="${size * 0.06}" fill="${c}"/>
      <circle cx="${size * 0.2}" cy="${size * 0.8}" r="${size * 0.06}" fill="${c}"/>
      <path d="M${size * 0.5} 0 v${size}" stroke="${c}" stroke-width="${size * 0.025}" opacity=".5"/>
    </pattern>`;
  return `<svg width="0" height="0" style="position:absolute">
    <defs>
      ${wax("waxCurtain", "#e9873b", "#2f6f57", "#fbe6c4", "#b5452a", 110)}
      ${wax("waxShirt", "#1a4dbb", "#f0a04b", "#ffffff", "#0f2f73", 70)}
      ${wax("waxSheet", "#2f8a6b", "#f3c344", "#fff4dc", "#1e5c47", 120)}
      ${wax("waxWrap", "#f2b33d", "#b5452a", "#2f6f57", "#fff4dc", 60)}
      ${wax("waxDress", "#2f6f57", "#f2b33d", "#fbe6c4", "#e9873b", 70)}
      <linearGradient id="beam" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#fff6dc" stop-opacity=".55"/>
        <stop offset="1" stop-color="#fff6dc" stop-opacity="0"/>
      </linearGradient>
      <linearGradient id="wall" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#f6dcb5"/><stop offset="1" stop-color="#ebc493"/>
      </linearGradient>
      <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#ffe9c2"/><stop offset="1" stop-color="#ffc98a"/>
      </linearGradient>
      <linearGradient id="glass" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="#ffffff" stop-opacity=".55"/><stop offset="1" stop-color="#ffffff" stop-opacity=".12"/>
      </linearGradient>
      <radialGradient id="glow" cx=".5" cy=".5" r=".5">
        <stop offset="0" stop-color="#fff3d1" stop-opacity=".9"/><stop offset="1" stop-color="#fff3d1" stop-opacity="0"/>
      </radialGradient>
      <filter id="soft" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="6"/></filter>
    </defs></svg>`;
}

// ------------------------------------------------------------------ personnages
/**
 * Personnage en pied, repère local 360 × 880 (tête en haut, pieds vers y = 860).
 * Parties animables (data-p) : body, legsStand, legsSit, armL/foreL/propL, armR/foreR/propR,
 * head, eyeL, eyeR, brows, mouth (enfants data-m).
 */
function person(o) {
  const skin = o.skin;
  const skinD = shade(skin, -0.22);
  const top = o.top;
  const topFill = top.pattern ? `url(#${top.pattern})` : top.base;
  const topD = top.dark || shade(top.base, -0.15);
  const pants = o.pants || "#33496b";
  const pantsD = shade(pants, -0.25);
  const shoe = o.shoe || "#f1f0ec";
  const sleeve = (px, py) =>
    top.long
      ? ""
      : `<rect x="${px - 29}" y="${py - 6}" width="58" height="66" rx="16" fill="${topFill}"/>
         <rect x="${px - 29}" y="${py + 50}" width="58" height="10" rx="5" fill="${topD}" opacity=".45"/>`;
  const armFill = top.long ? topFill : skin;
  const arm = (side, px, py) => `
    <g data-p="arm${side}">
      <rect x="${px - 24}" y="${py - 10}" width="48" height="132" rx="24" fill="${armFill}"/>
      ${sleeve(px, py)}
      <g data-p="fore${side}">
        <rect x="${px - 22}" y="${py + 104}" width="44" height="120" rx="22" fill="${armFill}"/>
        ${top.long ? `<rect x="${px - 23}" y="${py + 200}" width="46" height="14" rx="7" fill="${topD}"/>` : ""}
        <circle cx="${px}" cy="${py + 232}" r="25" fill="${skin}"/>
        <path d="M${px - 18} ${py + 226} q18 -12 36 0" stroke="${skinD}" stroke-width="3" fill="none" opacity=".6"/>
        <g data-p="prop${side}"></g>
      </g>
    </g>`;

  const hairBack =
    o.hair === "braids"
      ? Array.from({ length: 13 }, (_, i) => {
          const x = 98 + i * 13.5;
          const len = 300 + ((i * 37) % 70);
          return `<rect x="${x}" y="90" width="15" height="${len}" rx="7.5" fill="${C.hair}"/>
                  <path d="M${x + 3} 120 v${len - 40}" stroke="#3a2a22" stroke-width="2" stroke-dasharray="10 9"/>`;
        }).join("")
      : o.hair === "wrap"
        ? `<path d="M96 120 C80 60 130 0 186 4 C250 6 284 60 262 128 Z" fill="url(#waxWrap)"/>`
        : "";

  const hairFront = {
    short: `<path d="M112 124 C106 68 138 38 180 38 C222 38 254 68 248 124 C244 100 232 86 214 82 C192 77 168 77 146 82 C128 86 116 100 112 124 Z" fill="${C.hair}"/>
            <rect x="111" y="112" width="10" height="34" rx="5" fill="${C.hair}"/><rect x="239" y="112" width="10" height="34" rx="5" fill="${C.hair}"/>`,
    braids: `<path d="M108 130 C100 64 136 30 180 30 C224 30 260 64 252 130 C242 98 214 80 180 84 C146 80 118 98 108 130 Z" fill="${C.hair}"/>
             <path d="M180 32 Q176 58 172 82" stroke="#3a2a22" stroke-width="3" fill="none"/>`,
    wrap: `<path d="M100 124 C92 70 128 34 180 34 C232 34 268 70 260 124 C244 96 216 84 180 84 C144 84 116 96 100 124 Z" fill="url(#waxWrap)"/>
           <path d="M100 124 C116 100 144 90 180 90 C216 90 244 100 260 124" stroke="#b5452a" stroke-width="6" fill="none" opacity=".6"/>
           <path d="M150 34 C130 0 170 -18 186 10 C200 -16 246 -2 222 36 Z" fill="url(#waxWrap)"/>`,
    puff: `<path d="M106 124 C88 92 96 40 136 26 C150 4 210 2 226 24 C268 36 276 92 254 124 C246 100 230 86 210 82 C190 77 170 77 150 82 C130 86 114 100 106 124 Z" fill="${C.hair}"/>
           <circle cx="150" cy="40" r="6" fill="#2d2019"/><circle cx="196" cy="30" r="5" fill="#2d2019"/><circle cx="230" cy="58" r="5" fill="#2d2019"/>`,
    cap: `<rect x="111" y="108" width="11" height="36" rx="5" fill="${C.hair}"/><rect x="238" y="108" width="11" height="36" rx="5" fill="${C.hair}"/>
          <path d="M110 112 C106 58 140 30 180 30 C220 30 254 58 250 112 Q180 96 110 112 Z" fill="${o.cap || C.blue}"/>
          <path d="M180 30 L180 104 M136 46 Q150 70 146 106 M224 46 Q210 70 214 106" stroke="${shade(o.cap || C.blue, -0.25)}" stroke-width="3" fill="none" opacity=".7"/>
          <path d="M104 108 Q180 88 256 108 Q266 122 248 126 Q180 110 112 126 Q94 122 104 108 Z" fill="${shade(o.cap || C.blue, -0.2)}"/>
          <circle cx="180" cy="32" r="7" fill="${shade(o.cap || C.blue, -0.25)}"/>`,
  }[o.hair || "short"];

  const beard = o.beard
    ? `<path d="M116 146 C116 196 146 224 180 224 C214 224 244 196 244 146 C238 184 216 204 180 204 C144 204 122 184 116 146 Z" fill="${C.hair}" opacity=".93"/>
       <path d="M160 170 Q180 162 200 170 Q180 177 160 170 Z" fill="${C.hair}"/>`
    : "";
  const lashes = o.lashes
    ? `<path d="M144 127 l-7 -4 M216 127 l7 -4" stroke="${C.hair}" stroke-width="3" stroke-linecap="round"/>`
    : "";
  const earrings = o.earrings
    ? `<circle cx="114" cy="156" r="8" fill="none" stroke="#e0a526" stroke-width="4"/><circle cx="246" cy="156" r="8" fill="none" stroke="#e0a526" stroke-width="4"/>`
    : "";
  const lip = o.lip || C.mouth;

  const collar = top.collar
    ? `<path d="M152 248 L180 300 L208 248 L196 244 L180 276 L164 244 Z" fill="${topD}"/>
       <path d="M150 246 L176 296 L160 300 Z M210 246 L184 296 L200 300 Z" fill="${top.collarColor || "#f4f1ea"}"/>
       ${[330, 380, 430, 480].map((y) => `<circle cx="180" cy="${y}" r="5" fill="${topD}"/>`).join("")}`
    : `<path d="M150 250 Q180 276 210 250" stroke="${topD}" stroke-width="9" fill="none" stroke-linecap="round"/>`;
  const lanyard = o.lanyard
    ? `<path d="M156 256 L176 400 M204 256 L184 400" stroke="${C.blue}" stroke-width="7"/><rect x="160" y="398" width="40" height="52" rx="6" fill="#fff" stroke="#c9d2de" stroke-width="3"/><rect x="168" y="410" width="24" height="8" rx="3" fill="${C.blue}"/>`
    : "";

  return `<g class="person" id="${o.id}"><g data-p="body">
    ${hairBack}
    <g data-p="legsStand">
      <rect x="114" y="470" width="62" height="370" rx="28" fill="${pants}"/>
      <rect x="184" y="470" width="62" height="370" rx="28" fill="${pants}"/>
      <rect x="176" y="500" width="8" height="300" fill="${pantsD}" opacity=".5"/>
      <path d="M100 846 Q100 812 140 812 L166 812 Q182 812 182 846 Z" fill="${shoe}"/>
      <path d="M178 846 Q178 812 220 812 L246 812 Q262 812 262 846 Z" fill="${shoe}"/>
      <rect x="98" y="840" width="86" height="10" rx="5" fill="${shade(shoe, -0.3)}"/><rect x="176" y="840" width="88" height="10" rx="5" fill="${shade(shoe, -0.3)}"/>
    </g>
    <g data-p="legsSit" style="display:none">
      <ellipse cx="180" cy="806" rx="136" ry="16" fill="#000" opacity=".2"/>
      <rect x="104" y="566" width="56" height="226" rx="26" fill="${pantsD}"/>
      <rect x="200" y="566" width="56" height="226" rx="26" fill="${pantsD}"/>
      <path d="M100 470 L176 470 L170 590 Q132 612 92 592 Z" fill="${pants}"/>
      <path d="M184 470 L260 470 L268 592 Q228 612 190 590 Z" fill="${pants}"/>
      <ellipse cx="131" cy="588" rx="40" ry="20" fill="${shade(pants, 0.18)}"/>
      <ellipse cx="229" cy="588" rx="40" ry="20" fill="${shade(pants, 0.18)}"/>
      <path d="M86 812 Q86 780 124 780 L150 780 Q166 780 166 812 Z" fill="${shoe}"/>
      <path d="M194 812 Q194 780 232 780 L258 780 Q274 780 274 812 Z" fill="${shoe}"/>
    </g>
    <g data-p="torso">
      <path d="M156 196 L156 256 Q180 270 204 256 L204 196 Z" fill="${skinD}"/>
      <path d="M62 324 C62 278 96 256 136 250 L224 250 C264 256 298 278 298 324 L302 528 Q180 548 58 528 Z" fill="${topFill}"/>
      <path d="M244 262 C280 276 298 300 298 330 L302 528 Q270 536 240 538 C262 470 262 360 244 262 Z" fill="#000" opacity=".08"/>
      ${collar}${lanyard}
    </g>
    <g data-p="head"><g transform="translate(180 222) scale(1.16) translate(-180 -222)">
      <ellipse cx="114" cy="134" rx="12" ry="18" fill="${skin}"/><ellipse cx="246" cy="134" rx="12" ry="18" fill="${skin}"/>
      <ellipse cx="114" cy="134" rx="5" ry="9" fill="${skinD}" opacity=".6"/><ellipse cx="246" cy="134" rx="5" ry="9" fill="${skinD}" opacity=".6"/>
      <path d="M114 122 C114 66 144 46 180 46 C216 46 246 66 246 122 C246 178 222 212 180 214 C138 212 114 178 114 122 Z" fill="${skin}"/>
      <path d="M222 70 C248 92 252 152 234 190 C224 205 208 212 196 213 C228 196 242 150 238 110 C236 92 230 80 222 70 Z" fill="#000" opacity=".1"/>
      <ellipse cx="166" cy="80" rx="28" ry="10" fill="#fff" opacity=".09"/>
      ${o.blush ? `<circle cx="140" cy="164" r="14" fill="#c0603a" opacity=".22"/><circle cx="220" cy="164" r="14" fill="#c0603a" opacity=".22"/>` : ""}
      ${beard}
      <g data-p="eyeL"><ellipse cx="154" cy="134" rx="7.5" ry="9.5" fill="${C.hair}"/><circle cx="156.5" cy="130.5" r="2.4" fill="#fff"/></g>
      <g data-p="eyeR"><ellipse cx="206" cy="134" rx="7.5" ry="9.5" fill="${C.hair}"/><circle cx="208.5" cy="130.5" r="2.4" fill="#fff"/></g>
      ${lashes}
      <g data-p="brows"><path d="M138 114 Q152 105 167 111" stroke="${C.hair}" stroke-width="6.5" fill="none" stroke-linecap="round"/>
        <path d="M193 111 Q208 105 222 114" stroke="${C.hair}" stroke-width="6.5" fill="none" stroke-linecap="round"/></g>
      <path d="M180 142 Q172 160 179 167 Q187 169 193 163" stroke="${skinD}" stroke-width="4.5" fill="none" stroke-linecap="round"/>
      <g data-p="mouth">
        <path data-m="neutral" d="M166 186 Q180 190 194 186" stroke="${lip}" stroke-width="5.5" fill="none" stroke-linecap="round"/>
        <path data-m="smile" d="M159 181 Q180 199 201 181" stroke="${lip}" stroke-width="5.5" fill="none" stroke-linecap="round"/>
        <g data-m="grin"><path d="M155 178 Q180 212 205 178 Q180 186 155 178 Z" fill="${lip}"/><path d="M161 181 Q180 187 199 181 L197 187 Q180 191 163 187 Z" fill="#fff"/></g>
        <g data-m="open"><ellipse cx="180" cy="187" rx="12" ry="9" fill="${lip}"/><ellipse cx="180" cy="192" rx="7" ry="3.5" fill="#b4554a"/></g>
        <g data-m="o"><ellipse cx="180" cy="188" rx="9" ry="12" fill="${lip}"/></g>
        <path data-m="smirk" d="M164 187 Q186 192 202 177" stroke="${lip}" stroke-width="5.5" fill="none" stroke-linecap="round"/>
        <g data-m="chew"><path d="M166 186 Q180 181 194 186" stroke="${lip}" stroke-width="5.5" fill="none" stroke-linecap="round"/><circle cx="214" cy="176" r="11" fill="${skin}"/></g>
      </g>
      ${hairFront}${earrings}
    </g></g>
    ${arm("L", 84, 290)}
    ${arm("R", 276, 290)}
  </g></g>`;
}

// ------------------------------------------------------------------ objets
function sneaker(x, y, s = 1, flip = false) {
  return `<g transform="translate(${x} ${y}) scale(${flip ? -s : s} ${s})">
    <path d="M-120 20 C-120 -40 -96 -62 -40 -70 L10 -86 C34 -56 70 -40 110 -30 C130 -24 134 0 130 20 Z" fill="#e63946"/>
    <path d="M-40 -70 L10 -86 C20 -72 30 -62 44 -54 L-30 -40 Z" fill="#c92a37"/>
    ${[-20, -4, 12].map((d) => `<path d="M${d - 18} ${-60 + d * 0.3} l26 -6" stroke="#fff" stroke-width="5" stroke-linecap="round"/>`).join("")}
    <rect x="-128" y="14" width="266" height="26" rx="13" fill="#f6f4ef"/>
    <rect x="-128" y="32" width="266" height="8" rx="4" fill="#d9d4ca"/>
    <path d="M60 -30 q30 6 50 10" stroke="#fff" stroke-width="4" opacity=".6"/>
  </g>`;
}

function shirtStack(x, y, s = 1) {
  const colors = ["#2f6f57", "#e9873b", "#1a4dbb", "#f2f0ea", "#b5452a"];
  return `<g transform="translate(${x} ${y}) scale(${s})">${colors
    .map(
      (
        c,
        i,
      ) => `<rect x="${-110 + (i % 2) * 8}" y="${-i * 30}" width="220" height="34" rx="10" fill="${c}"/>
                 <rect x="${-110 + (i % 2) * 8}" y="${-i * 30 + 24}" width="220" height="10" rx="5" fill="#000" opacity=".12"/>
                 <path d="M${-30 + (i % 2) * 8} ${-i * 30 + 4} l30 14 l30 -14" stroke="#000" stroke-width="3" fill="none" opacity=".15"/>`,
    )
    .join("")}</g>`;
}

function oldPhone(x, y, s = 1, rot = 0) {
  return `<g transform="translate(${x} ${y}) rotate(${rot}) scale(${s})">
    <rect x="-46" y="-90" width="92" height="180" rx="16" fill="#2b2d33"/>
    <rect x="-38" y="-74" width="76" height="140" rx="6" fill="#4d5563"/>
    <path d="M-38 -74 L20 -74 L-38 10 Z" fill="#fff" opacity=".12"/>
    <circle cx="0" cy="78" r="6" fill="#16171b"/>
  </g>`;
}

function handbag(x, y, s = 1) {
  return `<g transform="translate(${x} ${y}) scale(${s})">
    <path d="M-50 -40 C-50 -110 50 -110 50 -40" stroke="#8a5a2b" stroke-width="12" fill="none"/>
    <path d="M-90 -40 L90 -40 L104 70 Q0 86 -104 70 Z" fill="#c8894b"/>
    <path d="M-90 -40 L90 -40 L94 -6 Q0 10 -94 -6 Z" fill="#a8703a"/>
    <rect x="-14" y="-12" width="28" height="18" rx="4" fill="#e9c46a"/>
  </g>`;
}

function headphones(x, y, s = 1) {
  return `<g transform="translate(${x} ${y}) scale(${s})">
    <path d="M-70 10 C-70 -80 70 -80 70 10" stroke="#22252b" stroke-width="16" fill="none" stroke-linecap="round"/>
    <rect x="-96" y="-6" width="44" height="70" rx="20" fill="#2f6fe0"/><rect x="52" y="-6" width="44" height="70" rx="20" fill="#2f6fe0"/>
    <rect x="-90" y="4" width="18" height="50" rx="9" fill="#1a4dbb"/><rect x="72" y="4" width="18" height="50" rx="9" fill="#1a4dbb"/>
  </g>`;
}

function speaker(x, y, s = 1) {
  return `<g transform="translate(${x} ${y}) scale(${s})">
    <rect x="-130" y="-56" width="260" height="112" rx="56" fill="#22313f"/>
    <rect x="-112" y="-40" width="224" height="80" rx="40" fill="#2f4358"/>
    ${Array.from({ length: 9 }, (_, i) => `<line x1="${-90 + i * 22}" y1="-30" x2="${-90 + i * 22}" y2="30" stroke="#22313f" stroke-width="5" stroke-linecap="round"/>`).join("")}
    <circle cx="-130" cy="0" r="30" fill="#e9873b"/><circle cx="130" cy="0" r="30" fill="#e9873b"/>
  </g>`;
}

function phoneObj(id, w, h, screen) {
  // Téléphone tenu en main ; l'écran affiche une vraie capture si « screen » est fourni.
  const clip = `clip-${id}`;
  return `<g data-phone="${id}">
    <rect x="${-w / 2}" y="${-h / 2}" width="${w}" height="${h}" rx="${w * 0.16}" fill="#101318"/>
    <clipPath id="${clip}"><rect x="${-w / 2 + 5}" y="${-h / 2 + 5}" width="${w - 10}" height="${h - 10}" rx="${w * 0.12}"/></clipPath>
    <g clip-path="url(#${clip})">
      <rect x="${-w / 2}" y="${-h / 2}" width="${w}" height="${h}" fill="#dfe8f7"/>
      ${screen ? `<image data-screen href="${screen}" x="${-w / 2 + 5}" y="${-h / 2 + 5}" width="${w - 10}" preserveAspectRatio="xMidYMin meet"/>` : ""}
    </g>
  </g>`;
}

// ------------------------------------------------------------------ chambre (panorama 2160 × 1920)
function roomBack() {
  const floorLines = [1440, 1515, 1610, 1730, 1880]
    .map(
      (y) =>
        `<line x1="0" y1="${y}" x2="2160" y2="${y}" stroke="#a97b55" stroke-width="3" opacity=".5"/>`,
    )
    .join("");
  const vp = 1080;
  const radial = Array.from({ length: 13 }, (_, i) => {
    const xb = -1200 + i * 380;
    const xt = vp + (xb - vp) * 0.32;
    return `<line x1="${xt}" y1="1380" x2="${xb}" y2="1920" stroke="#a97b55" stroke-width="3" opacity=".45"/>`;
  }).join("");
  const louvers = Array.from({ length: 9 }, (_, i) => {
    const y = 372 + i * 52;
    return `<rect x="1080" y="${y}" width="340" height="40" fill="url(#glass)"/><line x1="1080" y1="${y + 2}" x2="1420" y2="${y + 2}" stroke="#fff" stroke-width="3" opacity=".7"/>`;
  }).join("");
  const bars = Array.from(
    { length: 6 },
    (_, i) =>
      `<line x1="${1106 + i * 58}" y1="356" x2="${1106 + i * 58}" y2="846" stroke="#2e2a28" stroke-width="7"/>`,
  ).join("");
  const curtain = (x, flip) => `
    <g data-p="curtain${flip ? "R" : "L"}">
      <path d="M${x} 300 L${x + 120} 300 Q${x + (flip ? 140 : 100)} 660 ${x + (flip ? 110 : 130)} 1030 L${x - 10} 1030 Q${x + 10} 660 ${x} 300 Z" fill="url(#waxCurtain)"/>
      ${[24, 58, 92].map((d) => `<path d="M${x + d} 304 Q${x + d + (flip ? 8 : -8)} 660 ${x + d + (flip ? -6 : 6)} 1030" stroke="#7a2e14" stroke-width="10" opacity=".18" fill="none"/>`).join("")}
    </g>`;
  return `
    <rect x="-500" width="3160" height="1380" fill="url(#wall)"/>
    <rect x="-500" y="1000" width="3160" height="380" fill="#cf9263"/>
    <rect x="-500" y="994" width="3160" height="12" fill="#b77a4a"/>
    <rect x="-500" y="1366" width="3160" height="18" fill="#8e5a36"/>
    <rect x="-500" y="1380" width="3160" height="1400" fill="#c49470"/>
    ${floorLines}${radial}
    <!-- porte -->
    <rect x="108" y="500" width="380" height="880" fill="#6e4428"/>
    <rect data-p="doorway" x="132" y="524" width="332" height="856" fill="#2c2018"/>
    <rect data-p="doorlight" x="132" y="524" width="332" height="856" fill="#ffe1ad" opacity="0"/>
    <g data-p="door"><rect x="132" y="524" width="332" height="856" fill="#a06b40"/>
      <rect x="170" y="570" width="256" height="330" rx="10" fill="none" stroke="#7d5030" stroke-width="10"/>
      <rect x="170" y="960" width="256" height="360" rx="10" fill="none" stroke="#7d5030" stroke-width="10"/>
      <circle cx="430" cy="960" r="14" fill="#e0b54a"/></g>
    <!-- calendrier et prise -->
    <rect x="1570" y="400" width="150" height="190" rx="8" fill="#fffaf0"/><rect x="1570" y="400" width="150" height="46" rx="8" fill="#c0392b"/>
    ${Array.from({ length: 12 }, (_, i) => `<rect x="${1586 + (i % 4) * 32}" y="${462 + Math.floor(i / 4) * 36}" width="22" height="22" rx="3" fill="#e7dccb"/>`).join("")}
    <rect x="1520" y="1270" width="54" height="70" rx="8" fill="#f4efe6" stroke="#cdbfae" stroke-width="3"/>
    <!-- fenêtre à persiennes (naco) -->
    <rect x="1056" y="336" width="388" height="534" fill="#f7f1e6"/>
    <rect x="1080" y="356" width="340" height="490" fill="url(#sky)"/>
    <path d="M1080 700 Q1160 640 1250 690 Q1330 640 1420 700 L1420 846 L1080 846 Z" fill="#e6a46b" opacity=".55"/>
    <path d="M1140 846 L1146 640 M1146 640 q-50 -10 -80 20 M1146 640 q40 -30 90 -10 M1146 640 q-20 -40 -60 -50 M1146 640 q30 -40 70 -40" stroke="#b9774a" stroke-width="10" fill="none" opacity=".6"/>
    ${louvers}${bars}
    <path d="M1080 356 Q1250 300 1420 356" stroke="#2e2a28" stroke-width="7" fill="none"/>
    <rect x="1040" y="862" width="420" height="22" rx="4" fill="#efe6d6"/>
    <rect x="980" y="290" width="540" height="12" rx="6" fill="#4a3426"/>
    ${curtain(1000, false)}${curtain(1390, true)}
    <!-- armoire -->
    <g data-p="wardrobe">
      <rect x="500" y="290" width="460" height="1100" rx="10" fill="#7d4f2e"/>
      <rect x="486" y="276" width="488" height="40" rx="8" fill="#6a4226"/>
      <rect x="380" y="186" width="140" height="96" rx="12" fill="#3d6fb0" transform="rotate(-4 450 234)" opacity="0"/>
      <rect x="560" y="196" width="220" height="84" rx="12" fill="#3d6fb0"/><rect x="640" y="182" width="60" height="20" rx="8" fill="#2a4f82"/>
      <rect x="800" y="220" width="120" height="60" rx="6" fill="#d9b88f"/>
      <rect x="524" y="330" width="206" height="1010" rx="6" fill="#98623b"/>
      <rect x="730" y="330" width="206" height="1010" rx="6" fill="#98623b"/>
      <rect x="548" y="360" width="158" height="440" rx="8" fill="none" stroke="#7d4f2e" stroke-width="8"/>
      <rect x="548" y="850" width="158" height="440" rx="8" fill="none" stroke="#7d4f2e" stroke-width="8"/>
      <rect x="754" y="360" width="158" height="440" rx="8" fill="none" stroke="#7d4f2e" stroke-width="8"/>
      <rect x="754" y="850" width="158" height="440" rx="8" fill="none" stroke="#7d4f2e" stroke-width="8"/>
      <rect x="712" y="780" width="12" height="70" rx="6" fill="#e0b54a"/><rect x="738" y="780" width="12" height="70" rx="6" fill="#e0b54a"/>
      <g data-p="sleeve"><path d="M726 700 q40 30 30 110 q-4 26 -24 30" stroke="#1a4dbb" stroke-width="30" fill="none" stroke-linecap="round"/></g>
      <rect x="520" y="1386" width="40" height="18" fill="#5a381f"/><rect x="900" y="1386" width="40" height="18" fill="#5a381f"/>
    </g>
    <!-- ventilateur sur pied -->
    <ellipse cx="1830" cy="1452" rx="110" ry="24" fill="#2d3340"/>
    <rect x="1822" y="1000" width="16" height="452" fill="#9aa3b2"/>
    <rect x="1806" y="990" width="48" height="60" rx="14" fill="#e8ebf0"/>
    <g data-p="fan">
      <circle cx="1830" cy="930" r="118" fill="#fff" opacity=".18"/>
      <g data-p="blades">
        ${[0, 120, 240].map((a) => `<ellipse cx="1830" cy="868" rx="34" ry="62" fill="#5aa0e8" opacity=".85" transform="rotate(${a} 1830 930)"/>`).join("")}
      </g>
      <circle cx="1830" cy="930" r="26" fill="#e8ebf0"/>
      <circle cx="1830" cy="930" r="118" fill="none" stroke="#dfe4ea" stroke-width="7"/>
      <circle cx="1830" cy="930" r="80" fill="none" stroke="#dfe4ea" stroke-width="3" opacity=".7"/>
      ${Array.from({ length: 12 }, (_, i) => `<line x1="1830" y1="930" x2="${1830 + 118 * Math.cos((i * Math.PI) / 6)}" y2="${930 + 118 * Math.sin((i * Math.PI) / 6)}" stroke="#dfe4ea" stroke-width="2.5" opacity=".7"/>`).join("")}
    </g>
    <!-- lumière -->
    <polygon data-p="beam" points="1080,846 1420,846 1260,1920 420,1920" fill="url(#beam)" opacity=".75"/>
  `;
}

function roomProps() {
  return `
    <!-- table et objets -->
    <rect x="1120" y="1118" width="270" height="26" rx="6" fill="#7a4a2c"/>
    <rect x="1136" y="1144" width="18" height="236" fill="#6a3e22"/><rect x="1356" y="1144" width="18" height="236" fill="#6a3e22"/>
    <g data-p="tableItems">
      <g data-p="oldPhone">${oldPhone(1190, 1104, 0.42, -78)}</g>
      <rect x="1270" y="1050" width="64" height="70" rx="10" fill="#d96c3b"/><path d="M1302 1050 q-30 -70 10 -110 q20 50 -10 110" fill="#2f8a6b"/><path d="M1302 1050 q40 -60 70 -60 q-20 50 -70 60" fill="#3fa37f"/>
    </g>
    <!-- lit -->
    <rect x="1240" y="1180" width="40" height="330" rx="8" fill="#5a381f"/>
    <rect x="2050" y="1000" width="110" height="520" rx="14" fill="#6a4226"/>
    <path d="M1290 1236 L2120 1236 L2160 1330 L1250 1330 Z" fill="#f4ead8"/>
    <path data-p="sheet" d="M1290 1236 L1980 1236 L2010 1330 L1250 1330 Z" fill="url(#waxSheet)"/>
    <rect x="1250" y="1326" width="910" height="120" fill="url(#waxSheet)"/>
    <rect x="1250" y="1326" width="910" height="120" fill="#000" opacity=".12"/>
    <rect x="1250" y="1440" width="910" height="70" fill="#7a4a2c"/>
    <rect x="1262" y="1500" width="28" height="70" fill="#5a381f"/><rect x="2110" y="1500" width="28" height="70" fill="#5a381f"/>
    <g data-p="bedPhone" style="display:none"><g transform="translate(1660 1290) rotate(-6) scale(0.5 0.22)">${oldPhone(0, 0, 1)}</g></g>
    <g data-p="tableSneaker" style="display:none">${sneaker(1250, 1092, 0.5)}</g>
    <rect x="1960" y="1180" width="170" height="80" rx="36" fill="#fff8ec"/>
    <g data-p="clothesPile">${shirtStack(1420, 1290, 0.75)}</g>
    <!-- chaise en plastique -->
    <g data-p="chair" transform="translate(975 1760) scale(0.72) translate(-975 -1760)">
      <path d="M800 1240 Q860 1120 990 1120 Q1110 1120 1150 1240 L1130 1420 L820 1420 Z" fill="#f3f3f1"/>
      ${[0, 1, 2, 3].map((i) => `<rect x="${862 + i * 62}" y="1180" width="30" height="130" rx="14" fill="#d9d9d4"/>`).join("")}
      <path d="M780 1420 L1170 1420 L1150 1470 L800 1470 Z" fill="#e6e6e2"/>
      <path d="M800 1470 L760 1760 M1150 1470 L1190 1760 M850 1470 L870 1720 M1100 1470 L1080 1720" stroke="#e1e1dc" stroke-width="30" stroke-linecap="round"/>
      <g data-p="chairItems">
        ${headphones(930, 1150, 0.9)}
        ${handbag(1130, 1290, 0.8)}
        ${sneaker(900, 1386, 0.62)}${sneaker(1050, 1396, 0.62, true)}
      </g>
    </g>
  `;
}

window.ART = {
  C,
  shade,
  defs,
  person,
  sneaker,
  shirtStack,
  oldPhone,
  handbag,
  headphones,
  speaker,
  phoneObj,
  roomBack,
  roomProps,
};
