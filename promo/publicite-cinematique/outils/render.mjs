// Rend les images de référence (JPEG) et la planche du storyboard (PDF, dans rendus/).
// Usage : node promo/publicite-cinematique/outils/render.mjs [fichier.pdf]
import { mkdirSync } from "node:fs";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const dir = fileURLToPath(new URL("..", import.meta.url));
const require = createRequire(new URL("../../../package.json", import.meta.url));
const { chromium } = require("@playwright/test");

const pdf = process.argv[2] ?? `${dir}rendus/storyboard.pdf`;
const references = [
  ["demo-9x16", "01-demo-9x16"],
  ["carte-finale-9x16", "02-carte-finale-9x16"],
  ["demo-16x9", "03-demo-16x9"],
  ["carte-finale-16x9", "04-carte-finale-16x9"],
];

const browser = await chromium.launch({
  executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH || undefined,
});

const refs = await browser.newPage({ viewport: { width: 4400, height: 2100 } });
await refs.goto(`file://${dir}planche/images-de-reference.html`, { waitUntil: "networkidle" });
await refs.evaluate(() => document.fonts.ready);
mkdirSync(`${dir}images-de-reference`, { recursive: true });
for (const [id, file] of references) {
  await refs.locator(`#${id}`).screenshot({
    path: `${dir}images-de-reference/${file}.jpg`,
    type: "jpeg",
    quality: 84,
  });
}

const board = await browser.newPage();
await board.goto(`file://${dir}planche/storyboard.html`, { waitUntil: "networkidle" });
await board.evaluate(() => document.fonts.ready);
// Aucun contenu ne doit déborder d'une carte ou d'une page.
const overflow = await board.evaluate(() =>
  [...document.querySelectorAll(".card, .page")]
    .filter(
      (element) =>
        element.scrollHeight > element.clientHeight + 1 ||
        element.scrollWidth > element.clientWidth + 1,
    )
    .map((element) => element.querySelector(".head b, .runner span:last-child")?.textContent),
);
if (overflow.length > 0) console.warn("Débordements :", overflow);
mkdirSync(fileURLToPath(new URL(".", `file://${pdf}`)), { recursive: true });
await board.pdf({ path: pdf, preferCSSPageSize: true, printBackground: true });
console.log(`${await board.locator(".page").count()} pages → ${pdf}`);
await browser.close();
