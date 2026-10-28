// Rendu image par image des vidéos MboaDeal (Playwright → ffmpeg).
//   node render.mjs seconde-vie                 → seconde-vie/rendus/mboadeal-seconde-vie-9x16-sans-son.mp4
//   node render.mjs lumiere --stills 2,9.5,18   → lumiere/rendus/apercus/t-2.jpg …
// Chaque page expose window.ready (promesse) et window.seek(t) (dessine l'instant t, en secondes).
import { spawn } from "node:child_process";
import { mkdirSync } from "node:fs";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const [film, ...args] = process.argv.slice(2);
const FILMS = { "seconde-vie": { fps: 60 }, lumiere: { fps: 30 } };
if (!FILMS[film]) {
  console.error("Usage : node render.mjs seconde-vie|lumiere [--stills t1,t2,…]");
  process.exit(1);
}
const dir = fileURLToPath(new URL(`./${film}/`, import.meta.url));
const out = `${dir}rendus/`;
const require = createRequire(new URL("../../package.json", import.meta.url));
const { chromium } = require("@playwright/test");
const stills = args.includes("--stills") ? args[args.indexOf("--stills") + 1] : null;
const fps = Number(process.env.FPS ?? FILMS[film].fps);

const browser = await chromium.launch({
  executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH || undefined,
  args: ["--font-render-hinting=none"],
});
const page = await browser.newPage({ viewport: { width: 1080, height: 1920 } });
page.on("pageerror", (error) => console.error("Erreur :", error.message));
await page.goto(`file://${dir}index.html`, { waitUntil: "load" });
const info = await page.evaluate(() => window.ready);
const stage = page.locator("#stage");

if (stills) {
  mkdirSync(`${out}apercus`, { recursive: true });
  for (const t of stills.split(",").map(Number)) {
    await page.evaluate((time) => window.seek(time), t);
    await stage.screenshot({ path: `${out}apercus/t-${t}.jpg`, type: "jpeg", quality: 85 });
  }
  console.log("aperçus :", stills);
} else {
  mkdirSync(out, { recursive: true });
  const frames = Math.round(info.duration * fps);
  const file = `${out}mboadeal-${film}-9x16-sans-son.mp4`;
  const ffmpeg = spawn(
    "ffmpeg",
    [
      "-y",
      "-loglevel",
      "error",
      "-f",
      "image2pipe",
      "-framerate",
      String(fps),
      "-c:v",
      "mjpeg",
      "-i",
      "-",
      "-c:v",
      "libx264",
      "-preset",
      "slow",
      "-crf",
      "17",
      "-pix_fmt",
      "yuv420p",
      "-profile:v",
      "high",
      "-movflags",
      "+faststart",
      file,
    ],
    { stdio: ["pipe", "inherit", "inherit"] },
  );
  const started = Date.now();
  for (let i = 0; i < frames; i++) {
    await page.evaluate((time) => window.seek(time), i / fps);
    const jpeg = await stage.screenshot({ type: "jpeg", quality: 94 });
    if (!ffmpeg.stdin.write(jpeg))
      await new Promise((resolve) => ffmpeg.stdin.once("drain", resolve));
    if (i % 300 === 0)
      console.log(`${i}/${frames} images (${Math.round((Date.now() - started) / 1000)} s)`);
  }
  ffmpeg.stdin.end();
  await new Promise((resolve) => ffmpeg.on("close", resolve));
  console.log("vidéo :", file);
}
await browser.close();
