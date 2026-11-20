// "Collapse Explained" DEMO short: Dubai's "The World" islands. 1080x1920, 30 fps, 27 s. One 2D canvas per frame, flat-ink
// cartoon (thick ink outlines, amber + navy), the architect host from ../brand/scientist.ts, lip-sync from the voice RMS.
// Timeline in video seconds: voice starts at 0.6 s (LEAD). Shots are cut on whip pans (see B).
import React, { useEffect, useLayoutEffect, useState } from "react";
import { AbsoluteFill, continueRender, delayRender, staticFile, useCurrentFrame } from "remotion";
import { Pen, rnd } from "../persona/toon";
import { drawScientist, ARCH_PRESETS, Pose, Arm } from "../brand/scientist";
import { Canvas } from "../brand/Brand";
import RMS from "./rms.json";

type G = CanvasRenderingContext2D;
type P = [number, number];
export const DEMO_FRAMES = 810;
const W = 1080, H = 1920, LEAD = 0.6;
const INK = "#1a1226", NAVY = "#0e1f45", SAND = "#f5a623", SAND_L = "#ffd27a", SAND_D = "#c97a12", RED = "#d8362f", AMBER = "#ffc13a", FOAM = "#aeeaf2";
const TXT = "BeVietnamPro", DISP = "Boldonse";
// shot boundaries (video seconds)
const B = [0, 3.5, 5.9, 8.3, 11.2, 13.2, 15.4, 17.6, 20.4, 27.0];

// ---------------- small helpers ----------------
const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
const lerp = (a: number, b: number, u: number) => a + (b - a) * u;
const easeOut = (x: number) => 1 - Math.pow(1 - clamp01(x), 3);
const easeIn = (x: number) => Math.pow(clamp01(x), 2.2);
const easeIO = (x: number) => { x = clamp01(x); return x * x * (3 - 2 * x); };
const backOut = (x: number) => { x = clamp01(x); const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2); };
const popS = (t: number, t0: number, d = 0.3) => (t < t0 ? 0 : backOut((t - t0) / d));
const shake = (t: number, imp: [number, number][]): P => {
  let x = 0, y = 0;
  for (const [ti, a] of imp) if (t >= ti) { const d = t - ti, e = a * Math.exp(-d * 11); x += e * Math.sin(d * 71); y += e * Math.cos(d * 83); }
  return [x, y];
};
const txt = (g: G, s: string, x: number, y: number, size: number, fill: string, ow = 0, fam = TXT, align: CanvasTextAlign = "center", oc = INK) => {
  g.font = `${fam === DISP ? 400 : 700} ${size}px ${fam}`; g.textAlign = align; g.textBaseline = "middle"; g.lineJoin = "round";
  if (ow) { g.lineWidth = ow; g.strokeStyle = oc; g.strokeText(s, x, y); }
  g.fillStyle = fill; g.fillText(s, x, y);
};
const fitSize = (g: G, s: string, size: number, maxW: number, fam = TXT) => { g.font = `${fam === DISP ? 400 : 700} ${size}px ${fam}`; const w = g.measureText(s).width; return w > maxW ? size * maxW / w : size; };
const blob = (g: G, cx: number, cy: number, r: number, seed: number, n = 10, sy = 1) => {
  const pts: P[] = [];
  for (let i = 0; i < n; i++) { const a = (i / n) * Math.PI * 2, rr = r * (0.76 + 0.4 * rnd(seed, i)); pts.push([cx + Math.cos(a) * rr, cy + Math.sin(a) * rr * sy]); }
  const mid = (a: P, b: P): P => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
  g.beginPath(); const m0 = mid(pts[n - 1], pts[0]); g.moveTo(m0[0], m0[1]);
  for (let i = 0; i < n; i++) { const m = mid(pts[i], pts[(i + 1) % n]); g.quadraticCurveTo(pts[i][0], pts[i][1], m[0], m[1]); }
  g.closePath();
};
const ink = (g: G, fill: string, w = 7) => { g.fillStyle = fill; g.fill(); g.lineWidth = w; g.strokeStyle = INK; g.lineJoin = "round"; g.stroke(); };
const rrect = (g: G, x: number, y: number, w: number, h: number, r = 0) => { g.beginPath(); if (r) g.roundRect(x, y, w, h, r); else g.rect(x, y, w, h); };
const poly = (g: G, pts: P[]) => { g.beginPath(); pts.forEach((p, i) => (i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1]))); g.closePath(); };
const circle = (g: G, x: number, y: number, r: number) => { g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); };

// ---------------- sea ----------------
const drawSea = (g: G, t: number) => {
  const gr = g.createLinearGradient(0, -300, 0, 2400);
  gr.addColorStop(0, "#1f8fb8"); gr.addColorStop(0.5, "#16679a"); gr.addColorStop(1, "#0d3f70");
  g.fillStyle = gr; g.fillRect(-900, -900, 3000, 3800);
  for (let i = 0; i < 10; i++) { // lighter / darker patches drifting slowly
    const x = -300 + i * 230 + Math.sin(t * 0.25 + i) * 40, y = -200 + ((i * 397) % 1900) + Math.cos(t * 0.2 + i * 2) * 30;
    blob(g, x, y, 180 + (i % 3) * 50, 40 + i, 9, 0.6); g.fillStyle = i % 2 ? "rgba(120,220,235,0.13)" : "rgba(8,30,80,0.18)"; g.fill();
  }
  g.lineCap = "round"; g.lineWidth = 6;
  for (let grp = 0; grp < 2; grp++) {
    g.strokeStyle = grp ? "rgba(174,234,242,0.55)" : "rgba(174,234,242,0.28)"; g.beginPath();
    for (let gy = -700, row = 0; gy < 2500; gy += 88, row++) for (let gx = -760; gx < 1900; gx += 118) {
      const ph = rnd(gx * 0.013 + 3, gy * 0.017 + 5); if ((ph > 0.5 ? 1 : 0) !== grp) continue;
      const x = gx + (row % 2) * 59 + Math.sin(t * 0.9 + ph * 6.28) * 12, y = gy + Math.cos(t * 0.7 + ph * 6.28) * 6;
      g.moveTo(x - 22, y + 3); g.quadraticCurveTo(x, y - 12, x + 22, y + 3);
    }
    g.stroke();
  }
};

// ---------------- the world map out of islands ----------------
const POLYS: [number, number][][] = [
  [[-168, 66], [-160, 70], [-140, 70], [-125, 70], [-95, 72], [-80, 70], [-62, 62], [-56, 52], [-66, 45], [-70, 42], [-76, 35], [-81, 30], [-80, 25], [-84, 30], [-90, 29], [-97, 26], [-97, 20], [-90, 21], [-87, 16], [-83, 10], [-78, 8], [-80, 8], [-86, 12], [-92, 15], [-105, 20], [-110, 24], [-114, 31], [-117, 32], [-124, 40], [-124, 48], [-135, 58], [-150, 60], [-165, 60]],
  [[-55, 60], [-45, 60], [-20, 70], [-20, 82], [-60, 82], [-72, 76]],
  [[-80, 8], [-62, 11], [-50, 0], [-35, -6], [-39, -15], [-48, -26], [-58, -38], [-66, -46], [-70, -55], [-75, -50], [-73, -37], [-71, -18], [-81, -5]],
  [[-10, 36], [-9, 43], [-2, 47], [-4, 48], [5, 53], [10, 57], [18, 60], [25, 65], [30, 70], [60, 70], [100, 77], [140, 72], [180, 68], [170, 60], [155, 58], [142, 52], [135, 43], [127, 38], [122, 31], [120, 22], [108, 18], [106, 10], [100, 13], [103, 1], [98, 8], [92, 22], [80, 14], [77, 8], [72, 20], [66, 25], [57, 25], [50, 30], [58, 22], [52, 16], [43, 13], [35, 28], [32, 31], [36, 36], [27, 37], [20, 40], [12, 44], [18, 40], [8, 44], [0, 38]],
  [[-17, 21], [-10, 35], [10, 37], [32, 31], [43, 12], [51, 12], [40, -4], [40, -15], [35, -25], [20, -35], [12, -18], [9, -1], [8, 5], [-8, 4], [-17, 14]],
  [[114, -22], [122, -18], [131, -12], [142, -11], [146, -19], [153, -27], [150, -37], [140, -38], [131, -31], [115, -34]],
];
const EXTRA: P[] = [[-3, 54], [-6, 53], [138, 36], [141, 40], [136, 34], [110, -7], [118, -2], [102, -2], [125, -8], [172, -42], [174, -38], [47, -19], [-80, 22], [-72, 19], [121, 15], [121, 23], [-22, 65], [-170, 64]];
const inPoly = (x: number, y: number, p: [number, number][]) => { let c = false; for (let i = 0, j = p.length - 1; i < p.length; j = i++) if ((p[i][1] > y) !== (p[j][1] > y) && x < ((p[j][0] - p[i][0]) * (y - p[i][1])) / (p[j][1] - p[i][1]) + p[i][0]) c = !c; return c; };
const MS = 2.857, MX0 = 40, MY0 = 560; // map scale px/deg, left edge (lon -170), top (lat 80)
const mapX = (lon: number) => MX0 + (lon + 170) * MS, mapY = (lat: number) => MY0 + (80 - lat) * MS;
type Isl = { x: number; y: number; r: number; seed: number; key: number };
const ISL: Isl[] = (() => {
  const out: Isl[] = []; let n = 0;
  for (let lat = 82, row = 0; lat > -58; lat -= 6.2, row++) for (let lon = -172 + (row % 2) * 3.1; lon < 182; lon += 6.2) {
    const jl = lon + (rnd(n, 1) - 0.5) * 3, ja = lat + (rnd(n, 2) - 0.5) * 3; n++;
    if (POLYS.some((p) => inPoly(jl, ja, p))) { const i = out.length; out.push({ x: mapX(jl), y: mapY(ja), r: 11 + rnd(i, 7) * 5, seed: i + 11, key: 0 }); }
  }
  EXTRA.forEach(([lo, la], k) => out.push({ x: mapX(lo), y: mapY(la), r: 9 + rnd(k, 9) * 3, seed: 300 + k, key: 0 }));
  out.forEach((o, i) => (o.key = rnd(i, 3) * 0.65 + ((o.x - MX0) / 1000) * 0.35));
  return out;
})();

const drawIsland = (g: G, x: number, y: number, r: number, seed: number, s = 1) => {
  if (s <= 0) return;
  g.save(); g.translate(x, y); g.scale(s, s);
  blob(g, 0, 0, r * 1.5, seed + 50, 9, 0.9); g.fillStyle = "rgba(120,220,225,0.55)"; g.fill();
  blob(g, 0, 0, r, seed, 10); g.save(); g.clip();
  g.fillStyle = SAND_D; g.fillRect(-r * 2, -r * 2, r * 4, r * 4);
  blob(g, -r * 0.16, -r * 0.2, r * 0.9, seed + 3, 9); g.fillStyle = SAND; g.fill();
  blob(g, -r * 0.34, -r * 0.36, r * 0.4, seed + 7, 7); g.fillStyle = SAND_L; g.fill();
  g.restore();
  blob(g, 0, 0, r, seed, 10); g.lineWidth = Math.max(3.5, r * 0.3); g.strokeStyle = INK; g.lineJoin = "round"; g.stroke();
  if (rnd(seed, 5) > 0.45) { blob(g, r * 0.12, -r * 0.05, r * 0.27, seed + 9, 7); ink(g, "#38a860", Math.max(2.5, r * 0.18)); }
  g.restore();
};
const drawMap = (g: G, popAt: (i: Isl) => number) => { for (const o of ISL) drawIsland(g, o.x, o.y, o.r, o.seed, popAt(o)); };

// ---------------- skyline coast (shot 1) ----------------
const drawCoast = (g: G, t: number) => {
  const edge = (x: number) => 430 + Math.sin(x * 0.011 + 1) * 18 + Math.sin(x * 0.031) * 8;
  g.beginPath(); g.moveTo(-900, -900); g.lineTo(2000, -900); g.lineTo(2000, edge(2000));
  for (let x = 2000; x >= -900; x -= 40) g.lineTo(x, edge(x)); g.closePath();
  g.fillStyle = SAND_L; g.fill();
  g.save(); g.clip(); g.fillStyle = SAND; g.fillRect(-900, 330, 3000, 200); g.restore();
  g.beginPath(); g.moveTo(-900, -900); g.lineTo(2000, -900); g.lineTo(2000, edge(2000)); for (let x = 2000; x >= -900; x -= 40) g.lineTo(x, edge(x)); g.closePath();
  g.lineWidth = 10; g.strokeStyle = INK; g.lineJoin = "round"; g.stroke();
  g.strokeStyle = "rgba(255,255,255,0.8)"; g.lineWidth = 6; g.setLineDash([26, 18]); g.lineDashOffset = -t * 20; g.beginPath();
  for (let x = -100; x <= 1200; x += 20) g[x === -100 ? "moveTo" : "lineTo"](x, edge(x) + 22 + Math.sin(t * 1.4 + x * 0.02) * 4);
  g.stroke(); g.setLineDash([]);
  const base = 395;
  const T: [number, number, number, string][] = [[90, 100, 190, "#2d7fb0"], [215, 70, 140, "#e8dcc0"], [340, 120, 250, "#3b64a8"], [520, 56, 330, "#f1ead6"], [690, 110, 210, "#2d7fb0"], [830, 80, 160, "#e8dcc0"], [960, 96, 245, "#3b64a8"], [1060, 70, 150, "#e8dcc0"]];
  for (const [cx, w, h, c] of T) {
    if (w === 56) { // Burj-style spire
      poly(g, [[cx - 30, base], [cx - 20, base - h * 0.55], [cx - 9, base - h * 0.85], [cx - 3, base - h - 50], [cx + 3, base - h - 50], [cx + 9, base - h * 0.85], [cx + 20, base - h * 0.55], [cx + 30, base]]); ink(g, c, 7);
      g.fillStyle = "rgba(40,70,120,0.25)"; g.fillRect(cx + 2, base - h * 0.8, 24, h * 0.8 - 4);
    } else {
      rrect(g, cx - w / 2, base - h, w, h, 6); ink(g, c, 7);
      g.fillStyle = "rgba(14,31,69,0.22)"; g.fillRect(cx + w * 0.15, base - h + 4, w * 0.35, h - 8);
      for (let y = base - h + 22; y < base - 18; y += 34) for (let x = cx - w / 2 + 14; x < cx + w / 2 - 20; x += 28) { g.fillStyle = "#ffe9a8"; g.fillRect(x, y, 14, 16); }
    }
  }
  txt(g, "DUBAI, UAE", 540, 360 + 100, 48, "#fff", 12);
};

// ---------------- dredger scene (shot 3) ----------------
const wavyBand = (g: G, y: number, amp: number, t: number, ph: number, fill: string) => {
  g.beginPath(); g.moveTo(-400, y);
  for (let x = -400; x <= 1500; x += 30) g.lineTo(x, y + Math.sin(x * 0.012 + t * 1.6 + ph) * amp);
  g.lineTo(1500, 2400); g.lineTo(-400, 2400); g.closePath(); ink(g, fill, 8);
};
const arcPt = (u: number): P => [800 + 215 * u, 730 - 360 * u + 590 * u * u];
const drawDredger = (g: G, t: number, ts: number) => {
  const sky = g.createLinearGradient(0, -300, 0, 1000); sky.addColorStop(0, "#ff7f4a"); sky.addColorStop(0.55, "#ffbd6e"); sky.addColorStop(1, "#ffe6b0");
  g.fillStyle = sky; g.fillRect(-400, -400, 1900, 1500);
  circle(g, 820, 560, 205); g.fillStyle = "rgba(255,243,196,0.28)"; g.fill();
  circle(g, 820, 560, 150); ink(g, "#fff3c4", 8);
  for (let i = 0; i < 4; i++) { const cx = ((i * 420 + t * 14) % 1700) - 300, cy = 330 + i * 120; blob(g, cx, cy, 90 + i * 14, 70 + i, 9, 0.5); ink(g, "#ffeed8", 7); }
  wavyBand(g, 985, 7, t, 0, "#2290b8");
  const cnt = clamp01((t - 5.96) / 1.95);
  const mr = 30 + 85 * easeIO(cnt); // growing sand mound at the landing point
  g.save(); blob(g, 1010, 975, mr, 21, 9, 0.8); ink(g, SAND, 8); blob(g, 990, 960, mr * 0.55, 23, 7, 0.7); g.fillStyle = SAND_L; g.fill(); g.restore();
  // ship
  const bob = Math.sin(t * 2.1) * 7, rot = Math.sin(t * 1.7) * 0.012;
  g.save(); g.translate(430, 980); g.rotate(rot); g.translate(-430, -980 + bob);
  poly(g, [[110, 880], [800, 880], [750, 990], [170, 990]]); ink(g, "#1c2f5e", 9);
  poly(g, [[158, 950], [758, 950], [750, 990], [170, 990]]); ink(g, RED, 7);
  g.fillStyle = "#e8dcc0"; rrect(g, 118, 856, 690, 28, 6); ink(g, "#e8dcc0", 7);
  rrect(g, 150, 726, 210, 132, 8); ink(g, "#f6efdc", 8);
  for (let i = 0; i < 4; i++) { rrect(g, 170 + i * 46, 758, 30, 34, 4); ink(g, "#2d7fb0", 4); }
  rrect(g, 182, 660, 140, 68, 8); ink(g, "#f6efdc", 8);
  for (let i = 0; i < 3; i++) { rrect(g, 198 + i * 40, 676, 28, 30, 4); ink(g, "#9fd8ee", 4); }
  rrect(g, 254, 596, 50, 70, 5); ink(g, AMBER, 7); g.fillStyle = NAVY; g.fillRect(256, 612, 46, 18);
  g.lineCap = "round"; g.strokeStyle = INK; g.lineWidth = 18; g.beginPath(); g.moveTo(470, 858); g.lineTo(520, 700); g.lineTo(570, 858); g.stroke();
  g.strokeStyle = AMBER; g.lineWidth = 9; g.beginPath(); g.moveTo(470, 858); g.lineTo(520, 700); g.lineTo(570, 858); g.stroke();
  g.strokeStyle = INK; g.lineWidth = 36; g.beginPath(); g.moveTo(560, 858); g.lineTo(600, 790); g.lineTo(790, 735); g.stroke();
  g.strokeStyle = "#8fa3bf"; g.lineWidth = 22; g.beginPath(); g.moveTo(560, 858); g.lineTo(600, 790); g.lineTo(790, 735); g.stroke();
  poly(g, [[780, 712], [818, 724], [810, 758], [786, 756]]); ink(g, AMBER, 6);
  g.restore();
  // sand jet ("rainbowing")
  const seg = Math.min(1, 0.15 + ts * 1.4);
  const path = (w: number, col: string) => { g.strokeStyle = col; g.lineWidth = w; g.beginPath(); for (let i = 0; i <= 40; i++) { const p = arcPt((i / 40) * seg); g[i ? "lineTo" : "moveTo"](p[0], p[1] + bob); } g.stroke(); };
  path(46, INK); path(32, SAND); g.setLineDash([22, 30]); g.lineDashOffset = -t * 260; path(12, SAND_L); g.setLineDash([]);
  for (let k = 0; k < 70; k++) {
    const u = ((t * 1.1 + k / 70) % 1) * seg, p = arcPt(u), j = (rnd(k, 4) - 0.5) * 34;
    circle(g, p[0] + j * 0.5, p[1] + j + bob, 5 + rnd(k, 6) * 5); g.fillStyle = SAND_L; g.fill(); g.lineWidth = 2.5; g.strokeStyle = SAND_D; g.stroke();
  }
  wavyBand(g, 1010, 9, t, 2, "#177aa6");
  g.strokeStyle = "rgba(255,255,255,0.7)"; g.lineWidth = 6; g.lineCap = "round"; g.setLineDash([40, 30]); g.lineDashOffset = -t * 40; g.beginPath();
  for (let x = 130; x < 820; x += 20) g[x === 130 ? "moveTo" : "lineTo"](x, 1000 + Math.sin(x * 0.02 + t * 3) * 4); g.stroke(); g.setLineDash([]);
  wavyBand(g, 1130, 11, t, 4, "#10608c"); wavyBand(g, 1290, 14, t, 6, "#0c4a78"); wavyBand(g, 1500, 16, t, 1, "#0a3a66");
  g.fillStyle = "rgba(174,234,242,0.4)"; for (let i = 0; i < 12; i++) { g.fillRect(((i * 211 + t * 30) % 1500) - 200, 1160 + (i % 4) * 90, 70, 7); }
};

// ---------------- island diorama (shots 6-8) ----------------
const GY = 1045, HX = 640;
const palm = (g: G, x: number, y: number, h: number, t: number, sd: number) => {
  const sw = Math.sin(t * 1.3 + sd) * 4;
  g.lineCap = "round"; g.strokeStyle = INK; g.lineWidth = 20; g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + 14, y - h * 0.5, x + 6 + sw, y - h); g.stroke();
  g.strokeStyle = "#a9703d"; g.lineWidth = 11; g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + 14, y - h * 0.5, x + 6 + sw, y - h); g.stroke();
  for (let i = 0; i < 6; i++) {
    const a = -Math.PI / 2 + (i - 2.5) * 0.62 + Math.sin(t * 1.5 + i + sd) * 0.04;
    g.save(); g.translate(x + 6 + sw, y - h); g.rotate(a + Math.PI / 2); g.beginPath(); g.ellipse(0, -44, 16, 56, 0, 0, Math.PI * 2); ink(g, i % 2 ? "#2f9a52" : "#3fb865", 6); g.restore();
  }
};
const pole = (g: G, x: number, sc: number) => {
  const h = 330 * sc;
  g.save(); g.translate(x, GY);
  rrect(g, -8 * sc, -h, 16 * sc, h, 3); ink(g, "#9a653a", 6 * sc);
  rrect(g, -62 * sc, -h + 24 * sc, 124 * sc, 14 * sc, 3); ink(g, "#9a653a", 6 * sc);
  g.lineWidth = 6 * sc; g.strokeStyle = INK; g.beginPath(); g.moveTo(-8 * sc, -h * 0.82); g.lineTo(-46 * sc, -h + 34 * sc); g.moveTo(8 * sc, -h * 0.82); g.lineTo(46 * sc, -h + 34 * sc); g.stroke();
  for (const dx of [-50, 0, 50]) { rrect(g, dx * sc - 5 * sc, -h + 4 * sc, 10 * sc, 20 * sc, 4 * sc); ink(g, "#8ee0e8", 4 * sc); }
  g.restore();
};
const lit = (i: number, t: number) => {
  if (rnd(i, 99) > 0.88 && t < 19.2) return false;
  if (t < 15.4) return true;
  if (t >= 15.7 && t < 17.5) return rnd(Math.floor(t * 13), i + 3) > 0.45;
  if (t < 19.2) return true;
  if (t < 19.5) return rnd(Math.floor(t * 18), i) > 0.5;
  return false;
};
const drawHotel = (g: G, t: number) => {
  g.save(); g.translate(HX, GY);
  rrect(g, -105, -250, 210, 250, 6); ink(g, "#f3ead2", 8);
  g.fillStyle = "rgba(14,31,69,0.14)"; g.fillRect(62, -246, 39, 242);
  rrect(g, -75, -340, 150, 92, 6); ink(g, "#f8f1dd", 8);
  poly(g, [[-92, -338], [0, -410], [92, -338]]); ink(g, "#e8a23a", 8);
  g.strokeStyle = INK; g.lineWidth = 6; g.beginPath(); g.moveTo(0, -410); g.lineTo(0, -470); g.stroke();
  poly(g, [[0, -470], [46, -455], [0, -440]]); ink(g, RED, 5);
  let k = 0;
  const win = (x: number, y: number) => { const on = lit(k++, t); rrect(g, x, y, 32, 30, 4); ink(g, on ? "#ffd45a" : "#2a3a66", 4); if (on) { g.fillStyle = "rgba(255,212,90,0.22)"; g.fillRect(x - 8, y - 8, 48, 46); } };
  for (let r = 0; r < 4; r++) for (let c = 0; c < 4; c++) win(-92 + c * 46, -232 + r * 44 + (r === 3 ? 4 : 0));
  for (let r = 0; r < 2; r++) for (let c = 0; c < 3; c++) win(-62 + c * 46, -326 + r * 40);
  for (let i = 0; i < 6; i++) { g.fillStyle = i % 2 ? AMBER : NAVY; g.fillRect(-54 + i * 18, -62, 18, 16); }
  g.lineWidth = 5; g.strokeStyle = INK; g.strokeRect(-54, -62, 108, 16);
  rrect(g, -26, -46, 52, 46, 4); ink(g, NAVY, 5);
  g.restore();
  palm(g, HX - 160, GY + 6, 170, t, 1); palm(g, HX + 160, GY + 8, 150, t, 3);
};
const drawGenerator = (g: G, t: number, running: number) => {
  const sh = running * Math.sin(t * 90) * 1.6;
  g.save(); g.translate(900 + sh, GY + 4);
  rrect(g, -4, -150, 22, 80, 4); ink(g, "#6a7080", 6);
  rrect(g, -12, -158, 38, 14, 4); ink(g, "#3a3f50", 5);
  rrect(g, -95, -110, 190, 110, 10); ink(g, "#5e8a5a", 8);
  g.fillStyle = "rgba(14,31,69,0.2)"; g.fillRect(40, -106, 51, 102);
  g.lineWidth = 5; g.strokeStyle = INK; for (let i = 0; i < 5; i++) { g.beginPath(); g.moveTo(-80, -90 + i * 16); g.lineTo(-20, -90 + i * 16); g.stroke(); }
  rrect(g, 10, -92, 70, 40, 5); ink(g, NAVY, 5); txt(g, "DIESEL", 45, -72, 22, AMBER, 0);
  circle(g, 60, -30, 9); ink(g, RED, 4);
  g.restore();
  for (let i = 0; i < 2; i++) { g.save(); g.translate(760 - i * 48, GY + 2); rrect(g, -20, -62, 40, 62, 6); ink(g, i ? "#c7402f" : "#2d6fa8", 6); g.fillStyle = INK; g.fillRect(-20, -42, 40, 5); g.restore(); }
  g.strokeStyle = INK; g.lineWidth = 14; g.lineCap = "round"; g.beginPath(); g.moveTo(805, GY); g.quadraticCurveTo(740, GY + 34, HX + 40, GY + 6); g.stroke();
  for (let k = 0; k < 10; k++) { // smoke
    const a = (t * 0.75 + k / 10) % 1, x = 907 + Math.sin(a * 6 + k) * 22 + a * 40, y = GY - 160 - a * 300, r = 16 + a * 52;
    circle(g, x, y, r); g.globalAlpha = running * (1 - a) * 0.95; ink(g, a < 0.5 ? "#6b7280" : "#9aa0ad", 5); g.globalAlpha = 1;
  }
};
const drawDiorama = (g: G, t: number) => {
  const night = clamp01((t - 19.4) / 1.0);
  const sky = g.createLinearGradient(0, -200, 0, 1010);
  sky.addColorStop(0, "#2b2c6e"); sky.addColorStop(0.55, "#a34a73"); sky.addColorStop(1, "#ffa75a");
  g.fillStyle = sky; g.fillRect(-900, -900, 3200, 1910);
  for (let i = 0; i < 40; i++) { const sx = -400 + rnd(i, 1) * 1900, sy = -200 + rnd(i, 2) * 750; circle(g, sx, sy, 2 + rnd(i, 3) * 3); g.fillStyle = `rgba(255,245,210,${0.35 + 0.65 * night * (0.6 + 0.4 * Math.sin(t * 3 + i))})`; g.fill(); }
  circle(g, 1010, 880, 120); ink(g, "#ffd88a", 8);
  wavyBand(g, 1000, 6, t, 0, "#1d7fae"); wavyBand(g, 1070, 8, t, 2, "#16689a");
  g.beginPath(); g.ellipse(700, 1090, 720, 108, 0, 0, Math.PI * 2); ink(g, SAND, 10);
  g.save(); g.beginPath(); g.ellipse(700, 1090, 720, 108, 0, 0, Math.PI * 2); g.clip(); g.fillStyle = SAND_L; g.beginPath(); g.ellipse(660, 1060, 660, 80, 0, 0, Math.PI * 2); g.fill(); g.restore();
  g.beginPath(); g.ellipse(700, 1090, 720, 108, 0, 0, Math.PI * 2); g.lineWidth = 10; g.strokeStyle = INK; g.stroke();
  [[960, 1], [1095, 0.8], [1190, 0.64], [1262, 0.5]].forEach(([x, s]) => pole(g, x, s));
  pole(g, 470, 1);
  drawHotel(g, t);
  drawGenerator(g, t, 1 - easeOut((t - 19.4) / 0.9));
  wavyBand(g, 1200, 9, t, 3, "#10608c"); wavyBand(g, 1340, 12, t, 1, "#0c4a78"); wavyBand(g, 1540, 14, t, 5, "#0a3a66");
  if (night > 0) { g.fillStyle = `rgba(5,9,38,${0.55 * night})`; g.fillRect(-900, -900, 3200, 3800); }
};

// ---------------- construction crane + coin drain (shot 5) ----------------
const drawCrane = (g: G, t: number, ts: number) => {
  const sky = g.createLinearGradient(0, -200, 0, 1000); sky.addColorStop(0, "#ff8e55"); sky.addColorStop(0.6, "#ffc07a"); sky.addColorStop(1, "#ffe3a8");
  g.fillStyle = sky; g.fillRect(-500, -500, 2100, 1500);
  circle(g, 860, 560, 140); ink(g, "#fff1c0", 8);
  wavyBand(g, 1000, 6, t, 0, "#2290b8");
  g.beginPath(); g.ellipse(430, 1030, 400, 80, 0, 0, Math.PI * 2); ink(g, SAND, 10);
  g.save(); g.beginPath(); g.ellipse(430, 1030, 400, 80, 0, 0, Math.PI * 2); g.clip(); g.fillStyle = SAND_L; g.beginPath(); g.ellipse(400, 1010, 340, 50, 0, 0, Math.PI * 2); g.fill(); g.restore();
  g.beginPath(); g.ellipse(430, 1030, 400, 80, 0, 0, Math.PI * 2); g.lineWidth = 10; g.strokeStyle = INK; g.stroke();
  wavyBand(g, 1090, 8, t, 2, "#177aa6");
  // crane tower + jib; trolley freezes at tf
  const tf = 11.95; const run = t < tf;
  const tx = run ? 470 + 150 * Math.sin(t * 2.4) : 470 + 150 * Math.sin(tf * 2.4);
  g.lineCap = "round"; g.lineJoin = "round";
  const rail = (x1: number, y1: number, x2: number, y2: number) => { g.strokeStyle = INK; g.lineWidth = 14; g.beginPath(); g.moveTo(x1, y1); g.lineTo(x2, y2); g.stroke(); g.strokeStyle = AMBER; g.lineWidth = 7; g.beginPath(); g.moveTo(x1, y1); g.lineTo(x2, y2); g.stroke(); };
  rail(270, 1010, 270, 560); rail(340, 1010, 340, 560);
  for (let y = 1010; y > 580; y -= 56) { rail(270, y, 340, y - 56); rail(340, y, 270, y - 56); }
  rail(150, 548, 780, 548); rail(150, 548, 150, 548); rail(250, 520, 360, 520);
  for (let x = 160; x < 770; x += 70) { rail(x, 548, x + 35, 500); rail(x + 35, 500, x + 70, 548); }
  rail(150, 548, 780, 548);
  rrect(g, 90, 540, 90, 70, 6); ink(g, "#8a93a6", 7); // counterweight
  rrect(g, 290, 470, 70, 50, 6); ink(g, "#f6efdc", 7); rrect(g, 304, 482, 26, 24, 3); ink(g, "#9fd8ee", 4); // cab
  rrect(g, tx - 22, 548, 44, 26, 5); ink(g, "#3a3f50", 6);
  const swing = run ? 0.06 * Math.sin(t * 2.4 + 1) : 0.3 * Math.exp(-(t - tf) * 2.6) * Math.cos((t - tf) * 9);
  const cl = 190 + (run ? 0 : 0);
  g.save(); g.translate(tx, 574); g.rotate(swing);
  g.strokeStyle = INK; g.lineWidth = 5; g.beginPath(); g.moveTo(0, 0); g.lineTo(0, cl); g.stroke();
  poly(g, [[-26, cl], [26, cl], [18, cl + 22], [-18, cl + 22]]); ink(g, "#3a3f50", 5);
  rrect(g, -84, cl + 22, 168, 22, 4); ink(g, "#c9ced8", 6); rrect(g, -84, cl + 22, 168, 22, 4); g.fillStyle = "rgba(14,31,69,0.2)"; g.fillRect(0, cl + 22, 84, 22);
  g.restore();
  // coin pile + coins draining into a whirlpool
  const px = 560, py = 1000, wx = 880, wy = 1200;
  const left = Math.max(0, 18 - Math.floor(Math.max(0, (t - 11.5) / 0.07)));
  const coin = (x: number, y: number, r: number, spin: number) => { g.beginPath(); g.ellipse(x, y, r * Math.max(0.15, Math.abs(Math.cos(spin))), r, 0, 0, Math.PI * 2); ink(g, "#ffc21a", Math.max(3, r * 0.2)); g.beginPath(); g.ellipse(x, y, r * 0.6 * Math.max(0.15, Math.abs(Math.cos(spin))), r * 0.6, 0, 0, Math.PI * 2); g.lineWidth = Math.max(2, r * 0.1); g.strokeStyle = "#c98a00"; g.stroke(); };
  for (let k = 0; k < left; k++) { const row = Math.floor(k / 5), col = k % 5; coin(px - 60 + col * 30 + (row % 2) * 14, py - row * 16, 22, 0); }
  g.beginPath(); g.ellipse(wx, wy, 230, 78, 0, 0, Math.PI * 2); ink(g, "#0a3a66", 8);
  g.lineWidth = 6; g.strokeStyle = "rgba(174,234,242,0.8)"; g.lineCap = "round";
  for (let a = 0; a < 3; a++) { g.beginPath(); for (let i = 0; i <= 40; i++) { const q = i / 40, ang = a * 2.1 + q * 7 - t * 3, rr = 1 - q * 0.9; g[i ? "lineTo" : "moveTo"](wx + Math.cos(ang) * 210 * rr, wy + Math.sin(ang) * 70 * rr); } g.stroke(); }
  for (let k = 0; k < 18; k++) {
    const u = (t - (11.5 + k * 0.07)) / 1.2; if (u < 0 || u > 1) continue;
    const q = easeIn(u); const x = lerp(px, wx, q), y = lerp(py, wy, q) - Math.sin(Math.PI * Math.min(1, u * 1.15)) * 230 * (1 - q);
    coin(x, y, lerp(22, 8, q), t * 14 + k);
  }
};

// ---------------- end card ----------------
const drawEnd = (g: G, t: number, ts: number) => {
  const gr = g.createRadialGradient(470, 600, 80, 540, 900, 1400); gr.addColorStop(0, "#f9bd3a"); gr.addColorStop(1, "#c77a00");
  g.fillStyle = gr; g.fillRect(-300, -300, 1700, 2500);
  g.strokeStyle = "rgba(255,255,255,0.14)"; g.lineWidth = 2;
  for (let x = 0; x <= W; x += 40) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, H); g.stroke(); }
  for (let y = 0; y <= H; y += 40) { g.beginPath(); g.moveTo(0, y); g.lineTo(W, y); g.stroke(); }
  g.strokeStyle = "rgba(255,255,255,0.24)"; g.lineWidth = 3;
  for (let x = 0; x <= W; x += 200) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, H); g.stroke(); }
  for (let y = 0; y <= H; y += 200) { g.beginPath(); g.moveTo(0, y); g.lineTo(W, y); g.stroke(); }
  // a collapsing tower, right
  const base = 1235, tx = 860, tw = 190;
  rrect(g, tx - tw / 2, base - 330, tw, 330, 6); ink(g, "#1c3a78", 9);
  for (let y = base - 310; y < base - 30; y += 52) for (let x = tx - tw / 2 + 18; x < tx + tw / 2 - 30; x += 44) { g.fillStyle = "#ffe08a"; g.fillRect(x, y, 22, 26); }
  const cr = 0.08 + 0.5 * easeIn(ts / 4.2);
  g.save(); g.translate(tx + tw / 2, base - 330); g.rotate(cr); g.translate(-(tx + tw / 2), -(base - 330) + cr * 40);
  rrect(g, tx - tw / 2, base - 640, tw, 310, 6); ink(g, "#24498f", 9);
  for (let y = base - 620; y < base - 350; y += 52) for (let x = tx - tw / 2 + 18; x < tx + tw / 2 - 30; x += 44) { g.fillStyle = rnd(y, x) > 0.4 ? "#ffe08a" : "#16294f"; g.fillRect(x, y, 22, 26); }
  g.restore();
  for (let k = 0; k < 9; k++) { const a = (t * 0.5 + k / 9) % 1; circle(g, tx - 80 + k * 24 + Math.sin(a * 5 + k) * 14, base - 330 - a * 200, 22 + a * 40); g.globalAlpha = 0.8 * (1 - a); ink(g, "#e9d8bd", 5); g.globalAlpha = 1; }
  // title
  const s1 = popS(t, 21.35, 0.4), s2 = popS(t, 21.6, 0.4), s3 = easeOut((t - 22.4) / 0.5);
  const fs = fitSize(g, "EXPLAINED", 150, 930, DISP);
  for (const [s, y, str] of [[s1, 215, "COLLAPSE"], [s2, 372, "EXPLAINED"]] as [number, number, string][]) {
    if (s <= 0) continue; g.save(); g.translate(540, y); g.scale(s, s);
    txt(g, str, 8, 10, fs, "#ffffff", 0, DISP); // paper shadow
    txt(g, str, 0, 0, fs, NAVY, 20, DISP, "center", INK); txt(g, str, 0, 0, fs, NAVY, 0, DISP);
    g.restore();
  }
  if (s3 > 0) {
    g.save(); g.globalAlpha = s3; g.translate(0, (1 - s3) * 30);
    rrect(g, 150, 440, 780, 84, 42); ink(g, NAVY, 8);
    txt(g, "Big plans. Bigger collapses.", 540, 482, fitSize(g, "Big plans. Bigger collapses.", 50, 720), "#ffffff", 0);
    g.restore();
  }
};

// ---------------- the architect ----------------
const AK = 0.95, AX = 270, AY = 1255;
const l2 = (a: P | undefined, b: P | undefined, u: number): P => { const A = a ?? [0, 0], Bq = b ?? [0, 0]; return [lerp(A[0], Bq[0], u), lerp(A[1], Bq[1], u)]; };
const blendArm = (a: Arm, b: Arm, u: number): Arm => ({ target: l2(a.target, b.target, u), bend: a.bend, hand: u < 0.5 ? a.hand : b.hand });
const blendPose = (a: Pose, b: Pose, u: number): Pose => {
  u = easeIO(u);
  return {
    lean: lerp(a.lean ?? 0, b.lean ?? 0, u),
    head: { tilt: lerp(a.head?.tilt ?? 0, b.head?.tilt ?? 0, u), nod: lerp(a.head?.nod ?? 0, b.head?.nod ?? 0, u), turn: lerp(a.head?.turn ?? 0, b.head?.turn ?? 0, u) },
    brows: { raise: l2(a.brows?.raise, b.brows?.raise, u), tilt: l2(a.brows?.tilt, b.brows?.tilt, u) },
    eyes: { shape: u < 0.5 ? a.eyes?.shape : b.eyes?.shape, look: l2(a.eyes?.look, b.eyes?.look, u) },
    mouth: u < 0.5 ? a.mouth : b.mouth,
    armL: blendArm(a.armL!, b.armL!, u), armR: blendArm(a.armR!, b.armR!, u),
  };
};
const AP = ARCH_PRESETS;
const SHRUG: Pose = { ...AP.neutral, head: { tilt: -7, nod: 1 }, brows: { raise: [7, 9] }, eyes: { shape: "open", look: [0.3, 0] }, mouth: "smirk",
  armL: { target: [70, 600], bend: 1, hand: "open" }, armR: { target: [530, 600], bend: 1, hand: "open" } };
const drawArch = (g: G, f: number, t: number, pose: Pose, t0: number, patch = SAND) => {
  const ps = popS(t, t0, 0.4); if (ps <= 0.001) return;
  const lvl = (RMS as number[])[Math.min(f, DEMO_FRAMES - 1)] / 100;
  const talking = lvl > 0.13;
  let mouth = pose.mouth;
  if (talking) mouth = lvl > 0.6 ? "A" : lvl > 0.33 ? (f % 6 < 3 ? "E" : "O") : f % 4 < 2 ? "E" : "MB";
  const ph = t % 3.3, blink = ph < 0.13 ? Math.sin((ph / 0.13) * Math.PI) : 0;
  const p: Pose = { ...pose, mouth, head: { ...pose.head, tilt: (pose.head?.tilt ?? 0) + Math.sin(t * 1.3) * 1.2, nod: (pose.head?.nod ?? 0) + (talking ? lvl * 1.2 : 0) },
    eyes: { ...pose.eyes, blink: pose.eyes?.shape === "open" || pose.eyes?.shape === "lid" ? blink : 0 }, root: { y: Math.sin(t * 2.2) * 2 } };
  g.save(); g.translate(AX, AY + 8); g.scale(ps, ps);
  g.beginPath(); g.ellipse(0, 0, 215, 38, 0, 0, Math.PI * 2); ink(g, patch, 8);
  g.beginPath(); g.ellipse(-30, -6, 130, 16, 0, 0, Math.PI * 2); g.fillStyle = patch === SAND ? SAND_L : "#1d3a78"; g.fill();
  g.restore();
  g.save(); g.translate(AX, AY); g.scale(AK * ps, AK * ps); g.translate(-300, -975);
  drawScientist(new Pen(g), p, { look: "architect", glasses: true, hat: "white" });
  g.restore();
};
const poseFor = (t: number): Pose | null => {
  if (t >= B[1] && t < B[2]) return blendPose(AP.shocked, AP.explaining, (t - 4.5) / 0.35);
  if (t >= B[3] && t < B[4]) return AP.smug;
  if (t >= B[5] && t < B[6]) return blendPose(AP.neutral, AP.facepalm, (t - 14.35) / 0.3);
  if (t >= B[7] && t < B[8]) return blendPose(SHRUG, AP.laughing, (t - 19.45) / 0.3);
  if (t >= B[8]) return AP.explaining;
  return null;
};

// ---------------- stamps (shot 4) ----------------
const S4 = { cx: 783, cy: 703, fx: 640, fy: 760 };
const s4Scale = (t: number) => lerp(2.0, 2.2, easeIO((t - B[3]) / (B[4] - B[3])));
const STAMPS: { x: number; y: number; rot: number; t: number }[] = (() => {
  const s = 2.1, pick: { x: number; y: number }[] = [];
  const cand = [...ISL].sort((a, b) => a.key - b.key).filter((o) => { const sx = S4.fx + (o.x - S4.cx) * s, sy = S4.fy + (o.y - S4.cy) * s; return sx > 230 && sx < 930 && sy > 520 && sy < 1180 && !(sx < 520 && sy > 700); });
  for (const o of cand) { if (pick.length >= 14) break; if (pick.every((p) => Math.hypot((p.x - o.x) * s, (p.y - o.y) * s) > 175)) pick.push(o); }
  return pick.map((o, i) => ({ x: o.x, y: o.y, rot: (rnd(i, 8) - 0.5) * 0.5, t: 9.4 + i * 0.115 }));
})();
const drawStamp = (g: G, st: { x: number; y: number; rot: number; t: number }, t: number) => {
  const ts = t - st.t; if (ts < 0) return;
  const sc = ts < 0.12 ? lerp(2.4, 1, easeIn(ts / 0.12)) : 1 + 0.06 * Math.exp(-(ts - 0.12) * 12) * Math.cos((ts - 0.12) * 40);
  g.save(); g.translate(st.x, st.y); g.rotate(st.rot); g.scale(0.55 * sc, 0.55 * sc); g.globalAlpha = Math.min(1, ts / 0.05);
  rrect(g, -105, -44, 210, 88, 10); ink(g, RED, 9);
  rrect(g, -91, -31, 182, 62, 6); g.lineWidth = 5; g.strokeStyle = "#ffffff"; g.stroke();
  txt(g, "SOLD", 0, 3, 62, "#ffffff", 8);
  if (ts > 0.12 && ts < 0.45) { g.globalAlpha = 1 - (ts - 0.12) / 0.33; circle(g, 0, 0, 110 + (ts - 0.12) * 380); g.lineWidth = 10; g.strokeStyle = "#ffffff"; g.stroke(); }
  g.restore();
};

// ---------------- badges (screen space) ----------------
const badge = (g: G, t: number, t0: number, big: string, small: string, y: number, bigSize = 190, col = AMBER) => {
  const s = popS(t, t0, 0.35); if (s <= 0) return;
  g.save(); g.translate(540, y); g.scale(s, s);
  rrect(g, -300, -150, 600, 300, 36); ink(g, "rgba(14,31,69,0.94)", 10);
  rrect(g, -284, -134, 568, 268, 26); g.lineWidth = 4; g.strokeStyle = "rgba(255,193,58,0.6)"; g.stroke();
  txt(g, big, 0, -28, fitSize(g, big, bigSize, 540), col, 14);
  txt(g, small, 0, 92, 56, "#ffffff", 8);
  g.restore();
};

// ---------------- captions ----------------
const CAPS: [number, string][] = [[0, "Dubai"], [0.4, "built a"], [0.64, "map of"], [0.88, "the entire"], [1.28, "world"], [1.52, "out of"], [1.76, "sand"], [2.08, "in the"], [2.24, "middle"], [2.4, "of the"], [2.56, "sea"],
  [2.96, "around"], [3.2, "300"], [3.6, "islands"], [4.0, "each one"], [4.32, "shaped"], [4.56, "like a"], [4.8, "country"], [5.36, "it took"], [5.52, "321"], [6.32, "million"], [6.56, "cubic"], [6.88, "meters"], [7.2, "of sand"],
  [7.68, "by the"], [7.92, "end of"], [8.08, "2008"], [8.8, "70%"], [9.28, "of the"], [9.44, "islands"], [9.84, "were"], [10.0, "already"], [10.24, "sold"], [10.64, "then the"], [10.88, "money"], [11.12, "ran out"],
  [11.52, "and"], [11.68, "here's the"], [11.92, "crazy"], [12.24, "part"], [12.64, "years"], [12.88, "later"], [13.12, "these"], [13.28, "islands"], [13.68, "still"], [13.84, "had no"], [14.08, "power"], [14.32, "lines"],
  [14.8, "the few"], [15.12, "hotels"], [15.52, "out there"], [15.76, "run on"], [16.08, "diesel"], [16.4, "generators"], [17.04, "you"], [17.2, "could own"], [17.52, "a whole"], [17.76, "country"],
  [18.24, "and still"], [18.64, "have"], [18.8, "no"], [18.96, "electricity"], [19.84, "so"], [20.08, "what"], [20.24, "went"], [20.48, "wrong"], [20.88, "the full"], [21.28, "story"], [21.6, "is on"], [21.92, "our"], [22.08, "channel"]];
const KEY = new Set(["300", "321", "2008", "70%", "sold", "money", "crazy", "no", "diesel", "electricity", "wrong", "sand", "million", "country", "ran out", "power", "had no", "generators"]);
const drawCaption = (g: G, t: number) => {
  const v = t - LEAD; let i = -1;
  for (let k = 0; k < CAPS.length; k++) if (CAPS[k][0] <= v) i = k;
  if (i < 0) return; const [ts, s] = CAPS[i]; const age = v - ts;
  if (age > 0.75) return;
  const up = s.toUpperCase(), sc = 1 + 0.16 * Math.exp(-age * 18) * Math.cos(age * 22);
  const size = fitSize(g, up, 118, 960);
  g.save(); g.translate(540, 1362); g.scale(sc, sc);
  txt(g, up, 0, 0, size, KEY.has(s) ? AMBER : "#ffffff", 22);
  g.restore();
};

// ---------------- shots ----------------
type Cam = { cx: number; cy: number; s: number; fx?: number; fy?: number };
const camT = (g: G, c: Cam, sh: P) => { g.translate((c.fx ?? 540) + sh[0], (c.fy ?? 760) + sh[1]); g.scale(c.s, c.s); g.translate(-c.cx, -c.cy); };
const prog = (t: number, i: number) => easeIO((t - B[i]) / (B[i + 1] - B[i]));

const renderShot = (g: G, i: number, f: number, t: number) => {
  const ts = t - B[i];
  if (i === 0) {
    g.save(); camT(g, { cx: 540, cy: 700, s: lerp(1, 1.17, prog(t, 0)), fy: 800 }, [0, 0]);
    drawSea(g, t); drawCoast(g, t); drawMap(g, (o) => popS(t, 0.55 + o.key * 2.35, 0.28)); g.restore();
  } else if (i === 1) {
    g.save(); camT(g, { cx: 520, cy: 740, s: lerp(2.3, 2.55, prog(t, 1)), fx: 640 }, shake(t, [[B[1] + 0.15, 5]]));
    drawSea(g, t); drawMap(g, () => 1); g.restore();
    badge(g, t, 3.8, "300", "ISLANDS", 400);
    drawArch(g, f, t, poseFor(t)!, B[1] + 0.15);
  } else if (i === 2) {
    g.save(); camT(g, { cx: 565, cy: 880, s: lerp(1.06, 1.16, prog(t, 2)), fy: 880 }, shake(t, [[7.9, 8]]));
    drawDredger(g, t, ts); g.restore();
    const v = 321000000 * easeIO((t - 5.96) / 1.95), str = Math.round(v).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    const s = popS(t, B[2] + 0.1, 0.3);
    g.save(); g.translate(540, 360); g.scale(s, s);
    rrect(g, -490, -110, 980, 220, 34); ink(g, "rgba(14,31,69,0.94)", 10);
    const bs = fitSize(g, "321,000,000 m³", 104, 900);
    txt(g, str + " m³", 0, -22, bs, AMBER, 14); txt(g, "CUBIC METERS OF SAND", 0, 66, 40, "#ffffff", 6);
    g.restore();
  } else if (i === 3) {
    const imp: [number, number][] = STAMPS.map((st) => [st.t + 0.1, 5.5]);
    g.save(); camT(g, { cx: S4.cx, cy: S4.cy, s: s4Scale(t), fx: 640 }, shake(t, imp));
    drawSea(g, t); drawMap(g, () => 1); STAMPS.forEach((st) => drawStamp(g, st, t)); g.restore();
    badge(g, t, 9.4, "70%", "OF ISLANDS SOLD", 400, 200);
    drawArch(g, f, t, poseFor(t)!, B[3] + 0.12);
  } else if (i === 4) {
    g.save(); camT(g, { cx: 480, cy: 900, s: lerp(1.25, 1.36, prog(t, 4)), fy: 860 }, shake(t, [[B[4] + 0.05, 9], [11.95, 20]]));
    drawCrane(g, t, ts); g.restore();
    const d = clamp01((t - 11.3) / 1.3); g.fillStyle = `rgba(10,14,48,${0.5 * d})`; g.fillRect(-10, -10, W + 20, H + 20);
    const vg = g.createRadialGradient(540, 900, 300, 540, 900, 1250); vg.addColorStop(0, "rgba(0,0,0,0)"); vg.addColorStop(1, `rgba(0,0,0,${0.55 * d})`); g.fillStyle = vg; g.fillRect(0, 0, W, H);
  } else if (i === 5) {
    g.save(); camT(g, { cx: 800, cy: 850, s: lerp(1.0, 1.12, prog(t, 5)), fx: 690, fy: 900 }, [0, 0]);
    drawDiorama(g, t); g.restore();
    drawArch(g, f, t, poseFor(t)!, B[5] + 0.12);
  } else if (i === 6) {
    g.save(); camT(g, { cx: 830, cy: 930, s: lerp(1.7, 1.95, prog(t, 6)), fy: 860 }, shake(t, [[B[6] + 0.05, 7]]));
    drawDiorama(g, t); g.restore();
  } else if (i === 7) {
    g.save(); camT(g, { cx: 780, cy: 880, s: lerp(1.05, 1.15, prog(t, 7)), fx: 680, fy: 900 }, shake(t, [[19.45, 10]]));
    drawDiorama(g, t); g.restore();
    drawArch(g, f, t, poseFor(t)!, B[7] + 0.12);
  } else {
    g.save(); g.translate(540, 960); g.scale(lerp(1, 1.04, easeOut((t - B[8]) / 6)), lerp(1, 1.04, easeOut((t - B[8]) / 6))); g.translate(-540, -960);
    drawEnd(g, t, t - B[8]); drawArch(g, f, t, poseFor(t)!, B[8] + 0.1, NAVY); g.restore();
  }
};

const renderFrame = (g: G, f: number, t: number) => {
  g.setTransform(1, 0, 0, 1, 0, 0); g.fillStyle = NAVY; g.fillRect(0, 0, W, H);
  let idx = 0; for (let k = 0; k < B.length - 1; k++) if (t >= B[k]) idx = k;
  const WH = 0.2;
  let off = 0;
  if (idx < B.length - 2) { const p = clamp01((t - (B[idx + 1] - WH)) / WH); if (p > 0) off = -p * p * 1600; }
  if (idx > 0) { const p = clamp01(1 - (t - B[idx]) / WH); if (p > 0) off = p * p * 1600; }
  if (Math.abs(off) > 40) {
    const dir = off < 0 ? 1 : -1;
    for (let j = 4; j >= 0; j--) { g.save(); g.globalAlpha = j === 0 ? 1 : 0.4; g.translate(off + dir * j * Math.min(60, Math.abs(off) * 0.06), 0); renderShot(g, idx, f, t); g.restore(); }
    g.fillStyle = "rgba(255,255,255,0.14)"; for (let k = 0; k < 9; k++) g.fillRect(0, 160 + k * 200 + (k % 3) * 40, W, 8);
  } else { g.save(); g.translate(off, 0); renderShot(g, idx, f, t); g.restore(); }
  drawCaption(g, t);
};

export const DemoDubai: React.FC = () => {
  const f = useCurrentFrame(), t = f / 30;
  const [h] = useState(() => delayRender("fonts")); const [ready, setReady] = useState(false);
  useLayoutEffect(() => {
    Promise.all([new FontFace(DISP, `url(${staticFile("Boldonse-Regular.ttf")})`).load(), new FontFace(TXT, `url(${staticFile("BeVietnamPro-Bold.ttf")})`, { weight: "700" }).load()])
      .then((fs) => { fs.forEach((x) => document.fonts.add(x)); setReady(true); });
  }, []);
  useEffect(() => { if (ready) continueRender(h); }, [ready, h]);
  const draw = (g: G) => { g.setTransform(1, 0, 0, 1, 0, 0); if (ready) renderFrame(g, f, t); };
  return <AbsoluteFill style={{ background: NAVY }}><Canvas w={W} h={H} draw={draw} /></AbsoluteFill>;
};
