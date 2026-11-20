// usage (from spike/): REMOTION_TMP=remotion-tmp node src/videos/demo_dubai/render.mjs stills <outPrefix> <f,f,...> [scale]
//                      REMOTION_TMP=remotion-tmp node src/videos/demo_dubai/render.mjs video <out.mp4>
import fs from "node:fs";
if (process.env.REMOTION_TMP) { fs.mkdirSync(process.env.REMOTION_TMP, { recursive: true }); process.env.TEMP = process.env.TMP = process.env.REMOTION_TMP; }
import path from "node:path";
const { bundle } = await import("@remotion/bundler");
const { renderStill, renderMedia, selectComposition } = await import("@remotion/renderer");
const [mode, out, frames, scale = "0.5"] = process.argv.slice(2);
const browserExecutable = "C:/Program Files/Google/Chrome/Application/chrome.exe";
const chromiumOptions = { gl: "angle" };
const serveUrl = await bundle({ entryPoint: path.resolve("src/sandboxes/demo_dubai/index.tsx"), publicDir: path.resolve("src/videos/brand/public") });
const composition = await selectComposition({ serveUrl, id: "DemoDubai", browserExecutable, chromiumOptions });
const onBrowserLog = (l) => { if (l.type === "error") console.log(`[${l.type}]`, l.text.slice(0, 300)); };
if (mode === "stills") {
  for (const f of frames.split(",").map(Number)) await renderStill({ composition, serveUrl, frame: f, output: `${out}${f}.jpg`, imageFormat: "jpeg", jpegQuality: 88, scale: Number(scale), browserExecutable, chromiumOptions, timeoutInMilliseconds: 180000, onBrowserLog });
} else {
  const t0 = Date.now();
  await renderMedia({ composition, serveUrl, codec: "h264", outputLocation: out, crf: 18, pixelFormat: "yuv420p", concurrency: 2, browserExecutable, chromiumOptions, timeoutInMilliseconds: 180000, onBrowserLog,
    onProgress: (p) => { if (p.renderedFrames % 90 === 0) console.log("frame", p.renderedFrames); } });
  console.log("render s", ((Date.now() - t0) / 1000).toFixed(0));
}
