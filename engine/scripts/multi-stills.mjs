// usage: node scripts/multi-stills.mjs <entry> <outDir> <compId[:frame],...> [scale]  (bundles once, one still per composition)
import fs from "node:fs";
if (process.env.REMOTION_TMP) { fs.mkdirSync(process.env.REMOTION_TMP, { recursive: true }); process.env.TEMP = process.env.TMP = process.env.REMOTION_TMP; }
import { bundle } from "@remotion/bundler";
import { renderStill, selectComposition } from "@remotion/renderer";
import path from "node:path";
const [entry, outDir, list, scale = "0.5"] = process.argv.slice(2);
const browserExecutable = "C:/Program Files/Google/Chrome/Application/chrome.exe";
const chromiumOptions = { gl: "angle" };
const serveUrl = await bundle({ entryPoint: path.resolve(entry), publicDir: path.resolve("public") });
fs.mkdirSync(outDir, { recursive: true });
const onBrowserLog = (l) => { if (l.type === "error") console.log(`[${l.type}]`, l.text.slice(0, 300)); };
for (const item of list.split(",")) {
  const [id, fr = "10"] = item.split(":");
  const t0 = Date.now();
  const composition = await selectComposition({ serveUrl, id, browserExecutable, chromiumOptions });
  await renderStill({ composition, serveUrl, frame: Math.min(Number(fr), composition.durationInFrames - 1), output: path.join(outDir, `${id}.jpg`), imageFormat: "jpeg", jpegQuality: 90,
    scale: Number(scale), browserExecutable, chromiumOptions, timeoutInMilliseconds: 180000, onBrowserLog });
  console.log("still", id, ((Date.now() - t0) / 1000).toFixed(1) + "s");
}
