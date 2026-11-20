// Painted textures for the World short (same hand-painted recipe as the bridge's paint.ts HD painters: flat base,
// broad soft blotches, sparse marks, seams painted in as dark tints, nothing left as one flat colour).
// sand, wet sand, desert, glass towers (+ their lit-window maps), hotel / villa facades, ship hull and
// superstructure, generator housing, palm bark.
import * as THREE from "three";
import { ctex } from "./paint";

type R = () => number;
type G = CanvasRenderingContext2D;
const U = (r: R, a: number, b: number) => a + (b - a) * r();
const TAU = Math.PI * 2;
const pick = <T,>(r: R, a: T[]) => a[Math.floor(r() * a.length) % a.length];
const wrap2 = (W: number, H: number, x: number, y: number, rad: number, fn: (x: number, y: number) => void) => {
  for (const ox of [0, -W, W]) for (const oy of [0, -H, H]) {
    const X = x + ox, Y = y + oy;
    if (X + rad > 0 && X - rad < W && Y + rad > 0 && Y - rad < H) fn(X, Y);
  }
};
const blotch = (g: G, x: number, y: number, rad: number, sx: number, rgb: string, a: number) => {
  g.save(); g.translate(x, y); g.scale(sx, 1);
  const gr = g.createRadialGradient(0, 0, 0, 0, 0, rad);
  gr.addColorStop(0, `rgba(${rgb},${a})`); gr.addColorStop(1, `rgba(${rgb},0)`);
  g.fillStyle = gr; g.fillRect(-rad, -rad, rad * 2, rad * 2);
  g.restore();
};

/** dry island sand, 1024 px = 8 m: warm cream with broad dune blotches, wind ripples, shell dots */
export const sandHD = () => ctex("sandHD", 1024, 1024, (g, r) => {
  const S = 1024;
  g.fillStyle = "#f2d9a4"; g.fillRect(0, 0, S, S);
  for (let i = 0; i < 22; i++) {
    const x = U(r, 0, S), y = U(r, 0, S), rad = U(r, 90, 260), light = r() > 0.45;
    wrap2(S, S, x, y, rad * 1.6, (xx, yy) => blotch(g, xx, yy, rad, 1.6, light ? "255,240,205" : "214,170,110", light ? 0.35 : 0.22));
  }
  g.lineCap = "round";
  for (let i = 0; i < 260; i++) { // wind ripples: short soft arcs, lit lip over a shaded trough
    const x = U(r, 0, S), y = U(r, 0, S), w = U(r, 40, 120), a = U(r, -0.25, 0.25);
    wrap2(S, S, x, y, w, (xx, yy) => {
      g.save(); g.translate(xx, yy); g.rotate(a);
      g.strokeStyle = "rgba(190,140,80,0.22)"; g.lineWidth = 3; g.beginPath(); g.moveTo(-w / 2, 2); g.quadraticCurveTo(0, -6, w / 2, 2); g.stroke();
      g.strokeStyle = "rgba(255,246,222,0.35)"; g.lineWidth = 2; g.beginPath(); g.moveTo(-w / 2, -2); g.quadraticCurveTo(0, -10, w / 2, -2); g.stroke();
      g.restore();
    });
  }
  for (let i = 0; i < 380; i++) { // shells and pebbles
    const x = U(r, 0, S), y = U(r, 0, S), c = pick(r, ["#fff6e6", "#e8c7a0", "#c99f74", "#ffffff", "#d8b08a"]);
    wrap2(S, S, x, y, 4, (xx, yy) => { g.fillStyle = c; g.beginPath(); g.ellipse(xx, yy, U(r, 1.5, 3.5), U(r, 1, 2.5), r() * 3, 0, TAU); g.fill(); });
  }
});

/** desert ground of the mainland, 1024 px = 40 m: pinkish beige with long dune bands */
export const desertHD = () => ctex("desertHD", 1024, 1024, (g, r) => {
  const S = 1024;
  g.fillStyle = "#e2bf8c"; g.fillRect(0, 0, S, S);
  for (let i = 0; i < 26; i++) {
    const x = U(r, 0, S), y = U(r, 0, S), rad = U(r, 80, 240), light = r() > 0.5;
    wrap2(S, S, x, y, rad * 2.4, (xx, yy) => blotch(g, xx, yy, rad, 2.4, light ? "250,226,180" : "190,140,96", 0.3));
  }
  for (let i = 0; i < 120; i++) {
    const x = U(r, 0, S), y = U(r, 0, S), w = U(r, 60, 200);
    wrap2(S, S, x, y, w, (xx, yy) => { g.strokeStyle = "rgba(170,120,80,0.18)"; g.lineWidth = 3; g.beginPath(); g.moveTo(xx - w / 2, yy); g.quadraticCurveTo(xx, yy - 8, xx + w / 2, yy); g.stroke(); });
  }
});

/** island grass patch, 512 px = 6 m: saturated lawn with clumps and a few flowers */
export const lawnHD = () => ctex("lawnHD", 512, 512, (g, r) => {
  const S = 512;
  g.fillStyle = "#6fb23e"; g.fillRect(0, 0, S, S);
  for (let i = 0; i < 14; i++) {
    const x = U(r, 0, S), y = U(r, 0, S), rad = U(r, 50, 140), light = r() > 0.5;
    wrap2(S, S, x, y, rad * 1.4, (xx, yy) => blotch(g, xx, yy, rad, 1.4, light ? "150,206,84" : "70,140,50", 0.4));
  }
  g.lineCap = "round"; g.lineWidth = 2;
  for (let i = 0; i < 900; i++) {
    const x = U(r, 0, S), y = U(r, 0, S), h = U(r, 6, 13), light = r() < 0.4;
    wrap2(S, S, x, y, 16, (xx, yy) => { g.strokeStyle = light ? "rgba(178,226,110,0.45)" : "rgba(52,118,38,0.45)"; g.beginPath(); g.moveTo(xx - 2, yy - h); g.lineTo(xx, yy); g.lineTo(xx + 3, yy - h * 0.8); g.stroke(); });
  }
  for (let i = 0; i < 10; i++) {
    const x = U(r, 0, S), y = U(r, 0, S), c = pick(r, ["#fff3f0", "#ff8fb0", "#ffd84a"]);
    wrap2(S, S, x, y, 6, (xx, yy) => { g.fillStyle = c; g.beginPath(); g.arc(xx, yy, 3.5, 0, TAU); g.fill(); });
  }
});

/** glass tower facade + its night window map. 512 x 1024 per 30 x 60 m tile. kind 0 blue glass, 1 teal glass,
 *  2 bronze glass, 3 white concrete grid. Floors every 3.75 m (16 per tile), mullions every 1.875 m. */
export const towerTex = (kind: number) => ctex("tower" + kind, 512, 1024, (g, r) => {
  const W = 512, H = 1024, fl = H / 16, col = W / 16;
  const pal = [
    { top: "#9fc3e6", bot: "#4a6fa6", band: "#2c3e62", mul: "#dfe8f2" },
    { top: "#a6dcd8", bot: "#3c8a94", band: "#24505a", mul: "#e2f1ef" },
    { top: "#f0d2a0", bot: "#9a6a44", band: "#5a3a26", mul: "#f4e4cc" },
    { top: "#f3efe6", bot: "#d9d2c4", band: "#6f7c94", mul: "#ffffff" },
  ][kind];
  const gr = g.createLinearGradient(0, 0, 0, H);
  gr.addColorStop(0, pal.top); gr.addColorStop(1, pal.bot);
  g.fillStyle = gr; g.fillRect(0, 0, W, H);
  // sky reflections: broad soft diagonal sheens
  for (let i = 0; i < 5; i++) {
    g.save(); g.translate(U(r, 0, W), U(r, 0, H)); g.rotate(-0.6);
    const s = g.createLinearGradient(-60, 0, 60, 0);
    s.addColorStop(0, "rgba(255,255,255,0)"); s.addColorStop(0.5, "rgba(255,255,255,0.22)"); s.addColorStop(1, "rgba(255,255,255,0)");
    g.fillStyle = s; g.fillRect(-60, -700, 120, 1400); g.restore();
  }
  if (kind === 3) { // punched windows in a white frame
    for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
      const gx = x * col + col * 0.2, gy = y * fl + fl * 0.25;
      const w = g.createLinearGradient(0, gy, 0, gy + fl * 0.55);
      w.addColorStop(0, "#7f95c4"); w.addColorStop(1, "#4b5c92");
      g.fillStyle = w; g.fillRect(gx, gy, col * 0.6, fl * 0.55);
    }
  }
  for (let y = 0; y < 16; y++) { // floor bands (dark spandrel) with a lit lip
    g.fillStyle = pal.band; g.globalAlpha = kind === 3 ? 0.25 : 0.55; g.fillRect(0, y * fl, W, fl * 0.14); g.globalAlpha = 1;
    g.fillStyle = "rgba(255,255,255,0.35)"; g.fillRect(0, y * fl + fl * 0.14, W, 2);
  }
  g.fillStyle = pal.mul; g.globalAlpha = kind === 3 ? 0.9 : 0.4;
  for (let x = 0; x < 16; x++) g.fillRect(x * col, 0, kind === 3 ? 4 : 2, H);
  g.globalAlpha = 1;
});
/** lit windows for the tower texture layout (black = dark): warm, a third of the windows on */
export const towerLit = (kind: number) => ctex("towerLit" + kind, 256, 512, (g, r) => {
  const W = 256, H = 512, fl = H / 16, col = W / 16;
  g.fillStyle = "#000"; g.fillRect(0, 0, W, H);
  for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
    if (r() > 0.36) continue;
    g.fillStyle = pick(r, ["#ffd79a", "#ffe9c4", "#ffc070", "#fff2dc"]);
    g.fillRect(x * col + 2, y * fl + fl * 0.22, col - 4, fl * 0.62);
  }
});

/** hotel facade, 2048 x 1024 = 26 x 15 m (5 floors x 3 m): white render, recessed glass, balcony slabs with glass
 *  rails, sun shades; `lit` = the matching window-light map */
export const hotelTex = (lit: boolean) => ctex(lit ? "hotelLit" : "hotel", 2048, 1024, (g, r) => {
  const W = 2048, H = 1024, PX = W / 26, floors = 5, fh = H / floors, bays = 10, bw = W / bays;
  if (lit) { g.fillStyle = "#000"; g.fillRect(0, 0, W, H); }
  else {
    g.fillStyle = "#f4ede0"; g.fillRect(0, 0, W, H);
    for (let i = 0; i < 18; i++) blotch(g, U(r, 0, W), U(r, 0, H), U(r, 60, 200), 1.6, r() > 0.5 ? "255,255,255" : "170,150,120", 0.08);
  }
  for (let f = 0; f < floors; f++) for (let b = 0; b < bays; b++) {
    const x0 = b * bw + bw * 0.1, y0 = H - (f + 1) * fh + fh * 0.12, w = bw * 0.8, h = fh * 0.66;
    if (lit) {
      if (r() < 0.78) { g.fillStyle = pick(r, ["#ffd38c", "#ffe2a8", "#ffc46e", "#fff0d0"]); g.fillRect(x0 + 6, y0 + 6, w - 12, h - 10); }
      continue;
    }
    const gl = g.createLinearGradient(0, y0, 0, y0 + h);
    gl.addColorStop(0, "#7fa6d8"); gl.addColorStop(1, "#3f5f9a");
    g.fillStyle = "#c9bfae"; g.fillRect(x0 - 6, y0 - 6, w + 12, h + 12);
    g.fillStyle = gl; g.fillRect(x0, y0, w, h);
    g.save(); g.beginPath(); g.rect(x0, y0, w, h); g.clip(); g.fillStyle = "rgba(255,255,255,0.35)";
    g.translate(x0 + w * 0.3, y0); g.rotate(0.6); g.fillRect(0, -40, 14, h * 2); g.fillRect(30, -40, 6, h * 2); g.restore();
    if (r() < 0.4) { g.fillStyle = pick(r, ["#f3e3c6", "#e9d6d6", "#d9e6dc"]); g.fillRect(x0, y0, w * 0.22, h); g.fillRect(x0 + w * 0.78, y0, w * 0.22, h); }
    g.fillStyle = "#e7dccb"; g.fillRect(x0 + w / 2 - 3, y0, 6, h);
    // balcony slab + glass rail
    const by = y0 + h - fh * 0.05;
    g.fillStyle = "#fbf7ef"; g.fillRect(b * bw, by, bw, fh * 0.07);
    g.fillStyle = "rgba(60,50,45,0.45)"; g.fillRect(b * bw, by + fh * 0.07, bw, 3);
    g.fillStyle = "rgba(170,215,230,0.45)"; g.fillRect(b * bw + 4, by - fh * 0.2, bw - 8, fh * 0.2);
    g.fillStyle = "rgba(255,255,255,0.8)"; g.fillRect(b * bw + 4, by - fh * 0.2, bw - 8, 4);
  }
  if (!lit) { // bay pilasters + parapet
    for (let b = 0; b <= bays; b++) { g.fillStyle = "#fffaf2"; g.fillRect(b * bw - 6, 0, 12, H); g.fillStyle = "rgba(90,70,60,0.25)"; g.fillRect(b * bw + 6, 0, 3, H); }
    g.fillStyle = "#c86c3c"; g.fillRect(0, 0, W, PX * 0.35); // terracotta parapet band
    g.fillStyle = "rgba(60,40,30,0.4)"; g.fillRect(0, PX * 0.35, W, 3);
  }
});

/** modern villa wall, 1024 x 512 = 10 x 5 m: white render with a big glass front and timber slats; `lit` map */
export const villaTex = (lit: boolean) => ctex(lit ? "villaLit" : "villa", 1024, 512, (g, r) => {
  const W = 1024, H = 512;
  if (lit) { g.fillStyle = "#000"; g.fillRect(0, 0, W, H); g.fillStyle = "#ffd08a"; g.fillRect(120, 170, 520, 300); g.fillStyle = "#ffe2b0"; g.fillRect(760, 200, 150, 200); return; }
  g.fillStyle = "#f6f1e8"; g.fillRect(0, 0, W, H);
  for (let i = 0; i < 8; i++) blotch(g, U(r, 0, W), U(r, 0, H), U(r, 60, 160), 1.5, r() > 0.5 ? "255,255,255" : "170,150,120", 0.08);
  const gl = g.createLinearGradient(0, 170, 0, 470); gl.addColorStop(0, "#86b2df"); gl.addColorStop(1, "#40639e");
  g.fillStyle = "#3b3a40"; g.fillRect(112, 162, 536, 316); g.fillStyle = gl; g.fillRect(120, 170, 520, 300);
  g.fillStyle = "#3b3a40"; for (const x of [250, 380, 510]) g.fillRect(x, 170, 6, 300);
  g.fillStyle = "rgba(255,255,255,0.35)"; g.save(); g.beginPath(); g.rect(120, 170, 520, 300); g.clip(); g.translate(260, 170); g.rotate(0.55); g.fillRect(0, -60, 26, 500); g.fillRect(50, -60, 10, 500); g.restore();
  g.fillStyle = "#3b3a40"; g.fillRect(752, 192, 166, 216); g.fillStyle = gl; g.fillRect(760, 200, 150, 200);
  for (let x = 680; x < 740; x += 14) { g.fillStyle = "#b07a4c"; g.fillRect(x, 120, 9, 360); g.fillStyle = "rgba(60,30,20,0.4)"; g.fillRect(x + 9, 120, 3, 360); } // timber slats
  g.fillStyle = "rgba(80,60,50,0.3)"; g.fillRect(0, H - 14, W, 14);
});

/** ship hull side, 2048 x 256 = 32 x 4 m: red below the white boot-top line, dark blue topsides, plate seams, rust */
export const hullTex = () => ctex("hull", 2048, 256, (g, r) => {
  const W = 2048, H = 256;
  g.fillStyle = "#2a3e66"; g.fillRect(0, 0, W, H * 0.62);
  g.fillStyle = "#c8432f"; g.fillRect(0, H * 0.66, W, H * 0.34);
  g.fillStyle = "#f4efe6"; g.fillRect(0, H * 0.62, W, H * 0.04);
  for (let x = 0; x < W; x += 128) { g.fillStyle = "rgba(10,15,30,0.35)"; g.fillRect(x, 0, 3, H); g.fillStyle = "rgba(255,255,255,0.12)"; g.fillRect(x + 3, 0, 2, H); }
  for (const y of [0.2, 0.42, 0.82]) { g.fillStyle = "rgba(10,15,30,0.3)"; g.fillRect(0, y * H, W, 3); }
  for (let i = 0; i < 46; i++) { // rust streaks from the deck edge and scuppers
    const x = U(r, 0, W), l = U(r, 20, 120);
    const gr = g.createLinearGradient(0, 0, 0, l); gr.addColorStop(0, "rgba(150,70,40,0.55)"); gr.addColorStop(1, "rgba(150,70,40,0)");
    g.fillStyle = gr; g.fillRect(x, 4, U(r, 3, 8), l);
  }
  g.fillStyle = "#f4efe6"; g.fillRect(0, 0, W, 6); // deck edge
  for (let k = 0; k < 6; k++) { g.fillStyle = "#f4efe6"; g.fillRect(60 + k * 6, H * 0.7 + k * 12, 18, 3); } // draft marks
});

/** white superstructure wall with a band of bridge windows, 512 x 256 = 8 x 4 m */
export const superTex = () => ctex("superstr", 512, 256, (g, r) => {
  g.fillStyle = "#f3efe8"; g.fillRect(0, 0, 512, 256);
  for (let i = 0; i < 6; i++) blotch(g, U(r, 0, 512), U(r, 0, 256), U(r, 40, 90), 1.4, "150,140,130", 0.08);
  for (let x = 20; x < 500; x += 58) { g.fillStyle = "#263a58"; g.fillRect(x, 40, 44, 54); g.fillStyle = "rgba(160,200,240,0.5)"; g.fillRect(x + 4, 44, 12, 46); }
  for (let x = 30; x < 500; x += 70) { g.fillStyle = "#3a4a66"; g.beginPath(); g.arc(x + 20, 170, 10, 0, TAU); g.fill(); g.fillStyle = "rgba(255,255,255,0.4)"; g.beginPath(); g.arc(x + 17, 167, 3, 0, TAU); g.fill(); }
  g.fillStyle = "rgba(40,40,50,0.35)"; g.fillRect(0, 120, 512, 3);
  g.fillStyle = "#c8432f"; g.fillRect(0, 0, 512, 10);
});

/** diesel generator housing, 512 x 256 = 3.2 x 1.6 m: safety yellow panels, louvres, warning plate, grime */
export const genTex = () => ctex("genset", 512, 256, (g, r) => {
  g.fillStyle = "#e9b130"; g.fillRect(0, 0, 512, 256);
  for (let i = 0; i < 10; i++) blotch(g, U(r, 0, 512), U(r, 60, 256), U(r, 30, 80), 1.6, "90,70,40", 0.18);
  for (const x0 of [24, 280]) {
    g.fillStyle = "#c98f1e"; g.fillRect(x0, 40, 200, 150);
    for (let y = 52; y < 182; y += 14) { g.fillStyle = "#3a2f22"; g.fillRect(x0 + 12, y, 176, 6); g.fillStyle = "rgba(255,240,200,0.5)"; g.fillRect(x0 + 12, y + 6, 176, 2); }
    g.strokeStyle = "rgba(50,35,20,0.6)"; g.lineWidth = 3; g.strokeRect(x0, 40, 200, 150);
  }
  g.fillStyle = "#2b2b2e"; g.fillRect(0, 226, 512, 30);
  g.fillStyle = "#f4f1ea"; g.fillRect(212, 200, 88, 22); g.fillStyle = "#2b2b2e"; g.font = "bold 16px Arial"; g.fillText("DIESEL", 224, 217);
  const gr = g.createLinearGradient(0, 0, 0, 60); gr.addColorStop(0, "rgba(40,30,20,0.45)"); gr.addColorStop(1, "rgba(40,30,20,0)");
  g.fillStyle = gr; g.fillRect(0, 0, 512, 60); // exhaust soot
});

/** palm bark: horizontal leaf-scar rings, 128 x 512 */
export const barkTex = () => ctex("palmBark", 128, 512, (g, r) => {
  g.fillStyle = "#a67a52"; g.fillRect(0, 0, 128, 512);
  for (let y = 0; y < 512; y += 22) {
    g.fillStyle = "rgba(70,45,28,0.55)"; g.beginPath(); g.moveTo(0, y); g.quadraticCurveTo(64, y + 10, 128, y); g.lineTo(128, y + 5); g.quadraticCurveTo(64, y + 15, 0, y + 5); g.fill();
    g.fillStyle = "rgba(240,210,170,0.35)"; g.fillRect(0, y + 8, 128, 3);
    for (let k = 0; k < 6; k++) { g.fillStyle = "rgba(80,55,35,0.25)"; g.fillRect(U(r, 0, 128), y + U(r, 10, 20), U(r, 6, 18), 2); }
  }
});

/** wooden pole, 64 x 512: weathered grey-brown with long grain and a few splits */
export const poleTex = () => ctex("poleWood", 64, 512, (g, r) => {
  g.fillStyle = "#8a6a4e"; g.fillRect(0, 0, 64, 512);
  for (let i = 0; i < 26; i++) { g.fillStyle = r() > 0.5 ? "rgba(60,40,28,0.3)" : "rgba(220,200,170,0.22)"; g.fillRect(U(r, 0, 64), U(r, 0, 512), U(r, 1.5, 3), U(r, 60, 220)); }
});

/** soft sand spray streaks for the dredger jet, 64 x 512 along the jet (alpha) */
export const jetTex = () => {
  const t = ctex("jet", 128, 512, (g, r) => {
    g.fillStyle = "#e9c58a"; g.fillRect(0, 0, 128, 512);
    for (let i = 0; i < 70; i++) {
      const x = U(r, 0, 128), y = U(r, 0, 512), l = U(r, 40, 160);
      g.fillStyle = r() > 0.5 ? "rgba(255,240,210,0.55)" : "rgba(170,120,70,0.35)";
      g.fillRect(x, y, U(r, 2, 6), l); g.fillRect(x, y - 512, U(r, 2, 6), l);
    }
  });
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
};

/** steel deck / roof plating, 512 px = 4 m: painted plates with welded seams, scuffs and a few rust spots */
export const plateTex = (base: string) => ctex("plate" + base, 512, 512, (g, r) => {
  g.fillStyle = base; g.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 12; i++) blotch(g, U(r, 0, 512), U(r, 0, 512), U(r, 40, 120), 1.3, r() > 0.5 ? "255,255,255" : "60,50,45", 0.1);
  for (let y = 0; y < 512; y += 128) for (let x = (y / 128) % 2 ? -96 : 0; x < 512; x += 192) {
    g.strokeStyle = "rgba(40,30,30,0.35)"; g.lineWidth = 3; g.strokeRect(x + 1.5, y + 1.5, 189, 125);
    g.strokeStyle = "rgba(255,255,255,0.2)"; g.lineWidth = 1.5; g.strokeRect(x + 4, y + 4, 183, 119);
  }
  for (let i = 0; i < 14; i++) { g.fillStyle = "rgba(150,70,40,0.35)"; g.beginPath(); g.arc(U(r, 0, 512), U(r, 0, 512), U(r, 2, 7), 0, TAU); g.fill(); }
  for (let i = 0; i < 40; i++) { g.fillStyle = "rgba(40,40,45,0.6)"; g.beginPath(); g.arc(U(r, 0, 512), U(r, 0, 512), 2.2, 0, TAU); g.fill(); }
});
