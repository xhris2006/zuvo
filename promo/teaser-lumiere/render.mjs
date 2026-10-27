// Rendu du teaser image par image (Playwright → ffmpeg).
//   node render.mjs                      → rendus/teaser-lumiere-9x16-sans-son.mp4
//   node render.mjs --stills 1,4.5,20    → rendus/apercus/t-1.jpg …
import { spawn } from "node:child_process";
import { mkdirSync } from "node:fs";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const dir = fileURLToPath(new URL(".", import.meta.url));
const out = fileURLToPath(new URL("./rendus/", import.meta.url));
const require = createRequire(new URL("../../package.json", import.meta.url));
const { chromium } = require("@playwright/test");

const args = process.argv.slice(2);
const stillsArg = args.includes("--stills") ? args[args.indexOf("--stills") + 1] : null;
const fps = 30;

const browser = await chromium.launch({
  executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH || undefined,
});
const page = await browser.newPage({ viewport: { width: 1080, height: 1920 } });
page.on("pageerror", (error) => console.error("Erreur :", error.message));
await page.goto(`file://${dir}index.html`, { waitUntil: "load" });
await page.evaluate(() => window.ready);
const stage = page.locator("#stage");

if (stillsArg) {
  mkdirSync(`${out}apercus`, { recursive: true });
  for (const t of stillsArg.split(",").map(Number)) {
    await page.evaluate((time) => window.render(time), t);
    await stage.screenshot({ path: `${out}apercus/t-${t}.jpg`, type: "jpeg", quality: 85 });
  }
  console.log("aperçus :", stillsArg);
} else {
  mkdirSync(out, { recursive: true });
  const duration = await page.evaluate(() => window.DURATION);
  const frames = Math.round(duration * fps);
  const file = `${out}teaser-lumiere-9x16-sans-son.mp4`;
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
      "medium",
      "-crf",
      "19",
      "-pix_fmt",
      "yuv420p",
      "-movflags",
      "+faststart",
      file,
    ],
    { stdio: ["pipe", "inherit", "inherit"] },
  );
  const started = Date.now();
  for (let i = 0; i < frames; i++) {
    await page.evaluate((time) => window.render(time), i / fps);
    const jpeg = await stage.screenshot({ type: "jpeg", quality: 93 });
    if (!ffmpeg.stdin.write(jpeg))
      await new Promise((resolve) => ffmpeg.stdin.once("drain", resolve));
    if (i % 150 === 0)
      console.log(`${i}/${frames} images (${Math.round((Date.now() - started) / 1000)} s)`);
  }
  ffmpeg.stdin.end();
  await new Promise((resolve) => ffmpeg.on("close", resolve));
  console.log("vidéo :", file);
}
await browser.close();
