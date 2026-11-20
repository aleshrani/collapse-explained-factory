// usage (from spike/): REMOTION_TMP=remotion-tmp node src/videos/dubai3d/render.mjs stills <outPrefix> <f,f,...> [scale]
//                      REMOTION_TMP=remotion-tmp node src/videos/dubai3d/render.mjs video <out.mp4> [scale]
import fs from "node:fs";
if (process.env.REMOTION_TMP) { process.env.REMOTION_TMP = (await import("node:path")).resolve(process.env.REMOTION_TMP); fs.mkdirSync(process.env.REMOTION_TMP, { recursive: true }); process.env.TEMP = process.env.TMP = process.env.REMOTION_TMP; }
import path from "node:path";
const { bundle } = await import("@remotion/bundler");
const { renderStill, renderMedia, selectComposition } = await import("@remotion/renderer");
const [mode, out, a3, a4] = process.argv.slice(2);
const browserExecutable = (process.env.CHROME_PATH||"C:/Program Files/Google/Chrome/Application/chrome.exe");
const chromiumOptions = { gl: "angle" };
const serveUrl = await bundle({ entryPoint: path.resolve("src/sandboxes/dubai3d/index.tsx"), publicDir: path.resolve("src/videos/brand/public") });
const composition = await selectComposition({ serveUrl, id: "Dubai3D", browserExecutable, chromiumOptions });
const onBrowserLog = (l) => { if (l.type === "error" || l.type === "warning") console.log(`[${l.type}]`, l.text.slice(0, 400)); };
if (mode === "stills") {
  for (const f of a3.split(",").map(Number)) {
    const t0 = Date.now();
    await renderStill({ composition, serveUrl, frame: f, output: `${out}${f}.jpg`, imageFormat: "jpeg", jpegQuality: 88, scale: Number(a4 ?? "0.5"), browserExecutable, chromiumOptions, timeoutInMilliseconds: 180000, onBrowserLog });
    console.log("still", f, ((Date.now() - t0) / 1000).toFixed(1) + "s");
  }
} else {
  const t0 = Date.now();
  await renderMedia({ composition, serveUrl, codec: "h264", outputLocation: out, crf: 16, pixelFormat: "yuv420p", concurrency: 2, scale: Number(a3 ?? "1"),
    browserExecutable, chromiumOptions, timeoutInMilliseconds: 180000, onBrowserLog,
    onProgress: (p) => { if (p.renderedFrames % 60 === 0) console.log("frame", p.renderedFrames, ((Date.now() - t0) / 1000).toFixed(0) + "s"); } });
  console.log("render s", ((Date.now() - t0) / 1000).toFixed(0));
}
