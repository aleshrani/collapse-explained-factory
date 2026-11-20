// Bundles scripts/carriver-collide.ts (+ the CarRiver modules it imports) with esbuild and runs it in Node.
// usage: node scripts/carriver-collide.mjs [--bed=-0.6] [--verbose]
import { build } from "esbuild";
import path from "node:path";
import os from "node:os";
import { pathToFileURL } from "node:url";
const out = path.join(os.tmpdir(), `carriver-collide-${process.pid}.mjs`);
await build({ entryPoints: ["scripts/carriver-collide.ts"], bundle: true, platform: "node", format: "esm", outfile: out, logLevel: "error" });
await import(pathToFileURL(out).href);
