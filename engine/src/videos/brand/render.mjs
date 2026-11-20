// usage (from spike/): node src/videos/brand/render.mjs <outDir> <CompId[=fileName]> [...]
// Bundles the brand sandbox once (publicDir = src/videos/brand/public: just the two fonts, not the 1.3 GB project
// public/) and renders each composition as a PNG still with Chrome + ANGLE.
import fs from "node:fs";
if (process.env.REMOTION_TMP) { fs.mkdirSync(process.env.REMOTION_TMP, { recursive: true }); process.env.TEMP = process.env.TMP = process.env.REMOTION_TMP; }
import path from "node:path";
const { bundle } = await import("@remotion/bundler");
const { renderStill, selectComposition } = await import("@remotion/renderer");
const [outDir, ...ids] = process.argv.slice(2);
const browserExecutable = "C:/Program Files/Google/Chrome/Application/chrome.exe";
const chromiumOptions = { gl: "angle" };
const serveUrl = await bundle({ entryPoint: path.resolve("src/sandboxes/brand/index.tsx"), publicDir: path.resolve("src/videos/brand/public") });
fs.mkdirSync(outDir, { recursive: true });
for (const spec of ids) {
  const [id, name = id] = spec.split("=");
  const t0 = Date.now();
  const composition = await selectComposition({ serveUrl, id, browserExecutable, chromiumOptions });
  await renderStill({ composition, serveUrl, frame: 0, output: path.join(outDir, `${name}.png`), imageFormat: "png", scale: 1,
    browserExecutable, chromiumOptions, timeoutInMilliseconds: 180000,
    onBrowserLog: (l) => { if (l.type === "error" || l.type === "warning") console.log(`[${l.type}]`, l.text.slice(0, 300)); } });
  console.log("still", id, ((Date.now() - t0) / 1000).toFixed(1) + "s");
}
