// Round 3 host candidates for "Collapse Explained": warmer, likeable archetypes in the persona engine's Pen language.
// Same construction as host.ts (600 x 1000 design space, soles at y = 975, plum thick-thin ink, painted crescents, stick
// limbs with ink-dot hands) plus a warmth pass: big friendly eyes with a catchlight, soft blush, a smile at rest,
// rounder heads and one signature prop each that survives 48 px.
//   professor - mortarboard with an orange tassel, white beard, olive tweed jacket with elbow patches, pointer
//   scientist - wild white hair singed orange at the tips, goggles pushed up, lab coat, bubbling flask (not any real person)
//   clerk     - green eyeshade visor, red tie, sleeve garters, rubber stamp and a stack of files
//   reporter  - fedora with a press card, tan trench coat, red scarf, notepad
//   guide     - bucket hat, coral polo, lanyard, raised tour flag (a guide to famous ruins)
//   archivist - grandma with a grey bun, red cardigan, brass magnifying glass held up to one (huge) eye
import { Pen, INK, mul, mix, blobPts, thickAngle, Blob, curve, rad, mouth, taper, P2, C3, rrect, ellPts } from "../persona/toon";

const SH_SKIN: C3 = [0.96, 0.86, 0.84];
const SH_CLOTH: C3 = [0.64, 0.66, 0.74];
const WHITE = "#ffffff";
const BLUSH = "rgba(255,110,110,0.32)";

export type Face3 = "neutral" | "shock" | "laugh";
export type Cast3 = {
  key: string; name: string; skin: string; headA: number; aspect: number; nBot: number; egg: number;
  top: "tweed" | "labcoat" | "shirt" | "trench" | "polo" | "cardigan"; topCol: string; inner: string; accent: string; pants: string; shoes: string;
  hair: "tufts" | "wild" | "slick" | "short" | "bun"; hairCol: string;
  hat?: "mortar" | "fedora" | "bucket" | "visor"; hatCol?: string;
  beard?: string; moustache?: string; brows?: string;
  prop: "pointer" | "flask" | "stamp" | "notepad" | "flag" | "magnifier";
};

export const CAST3: Cast3[] = [
  { key: "professor", name: "The Professor", skin: "#f5c9a0", headA: 120, aspect: 0.95, nBot: 2.3, egg: -0.04, top: "tweed", topCol: "#7d8a3c", inner: "#e3a92a", accent: "#ff7a2f", pants: "#3b3f52", shoes: "#6e4427",
    hair: "tufts", hairCol: "#f2efe8", hat: "mortar", hatCol: "#23305e", beard: "#f2efe8", brows: "#e8e4dc", prop: "pointer" },
  { key: "scientist", name: "The Scientist", skin: "#ecd0b6", headA: 116, aspect: 0.9, nBot: 3.0, egg: 0.06, top: "labcoat", topCol: "#f4f1ea", inner: "#13b5a0", accent: "#ff7a2f", pants: "#2f3550", shoes: "#e2453c",
    hair: "wild", hairCol: "#f4f2ee", moustache: "#cfc9c2", brows: "#d9d4cc", prop: "flask" },
  { key: "clerk", name: "The Clerk", skin: "#c99067", headA: 118, aspect: 0.98, nBot: 2.4, egg: -0.06, top: "shirt", topCol: "#fff1b8", inner: "#e2453c", accent: "#2fae6a", pants: "#4a4f5e", shoes: "#2b2a33",
    hair: "slick", hairCol: "#231c26", hat: "visor", hatCol: "#2fae6a", prop: "stamp" },
  { key: "reporter", name: "The Reporter", skin: "#ffe2c2", headA: 116, aspect: 0.96, nBot: 2.3, egg: -0.08, top: "trench", topCol: "#d9b77e", inner: "#e2453c", accent: "#e2453c", pants: "#3b3f52", shoes: "#4a3426",
    hair: "short", hairCol: "#c0582b", hat: "fedora", hatCol: "#3b3f52", prop: "notepad" },
  { key: "guide", name: "The Guide", skin: "#8d5a3b", headA: 118, aspect: 0.96, nBot: 2.3, egg: -0.06, top: "polo", topCol: "#ff6b4a", inner: "#2456f5", accent: "#ffc21a", pants: "#c9b27a", shoes: "#f4f1ea",
    hair: "short", hairCol: "#231c26", hat: "bucket", hatCol: "#13b5a0", prop: "flag" },
  { key: "archivist", name: "The Archivist", skin: "#f5c9a0", headA: 116, aspect: 0.97, nBot: 2.2, egg: -0.1, top: "cardigan", topCol: "#d6453d", inner: "#f6ecdc", accent: "#d9a441", pants: "#4a3f5c", shoes: "#6e4427",
    hair: "bun", hairCol: "#c9c6cf", prop: "magnifier" },
];

/** big friendly eye: white oval, large pupil looking slightly in, one catchlight */
const friendlyEye = (p: Pen, x: number, y: number, u: number, side: number, big = 1) => {
  p.ell(x, y, 9.5 * u * big, 11 * u * big, WHITE, 2.8 * u);
  const px = x - side * 1.2 * u, py = y + 1.5 * u;
  p.ell(px, py, 5.6 * u * big, 6.4 * u * big, INK, 0);
  p.ell(px + 2 * u, py - 2.4 * u, 1.9 * u * big, 1.9 * u * big, WHITE, 0);
};

const face3 = (p: Pen, d: Cast3, cx: number, cy: number, W: number, f: Face3, fs: number, magnifier: boolean) => {
  const u = (W / 100) * fs, ex = 15 * u, ey = cy;
  // blush
  for (const s of [-1, 1]) p.ell(cx + s * 27 * u, cy + 13 * u, 8 * u, 5 * u, BLUSH, 0);
  for (const s of [-1, 1]) {
    const x = cx + s * ex, browCol = d.brows ?? INK, bw = d.brows ? 7 : 5;
    if (f === "laugh") { p.arc(x, ey + 2 * u, 8 * u, 6 * u, 200, 340, 4 * u); taper(p, [x - s * 8.5 * u, ey - 19 * u], [x + s * 8.5 * u, ey - 21 * u], bw * u, bw * 0.55 * u, browCol); continue; }
    if (f === "shock") {
      p.ell(x, ey, 11.5 * u, 12.5 * u, WHITE, 2.8 * u); p.dot(x - s * 1 * u, ey + 1 * u, 3.4 * u);
      p.arc(x, ey - 22 * u, 9 * u, 3.4 * u, 200, 340, (d.brows ? 6 : 4) * u, browCol);
      continue;
    }
    if (!(magnifier && s > 0)) friendlyEye(p, x, ey, u, s);
    taper(p, [x - s * 8.5 * u, ey - 19 * u], [x + s * 8.5 * u, ey - 22 * u], bw * u, bw * 0.55 * u, browCol);
  }
  const my = cy + 23 * u;
  if (f === "shock") mouth(p, "O", cx, my, u, 1);
  else if (f === "laugh") mouth(p, "laugh", cx, my - 1 * u, u, 1.05);
  else mouth(p, "smileWide", cx, my - 1 * u, u, 1.1);
  if (d.moustache) for (const s of [-1, 1]) {
    const m = blobPts(cx + s * 8 * u, my - 8 * u, { a: 10 * u, b: 5 * u, nTop: 2, nBot: 2, egg: 0, asym: 0, rot: rad(s * 14), noise: 0.02, seed: 4 + s });
    p.poly(m, d.moustache, 2.2 * u);
  }
};

export const drawCast3 = (p: Pen, d: Cast3, o: { face?: Face3; fs?: number; light?: number; arms?: "prop" | "cheeks" | "hang" } = {}) => {
  const light = o.light ?? rad(-120), thick = thickAngle(light), f = o.face ?? "neutral", fs = o.fs ?? 1.1, armsMode = o.arms ?? "prop";
  const H: Blob = { a: d.headA, b: d.headA * d.aspect, nTop: 1.8, nBot: d.nBot, egg: d.egg, asym: 0, rot: 0, noise: 0.006, seed: 5 };
  const W = 2 * H.a, u = W / 100, ow = 5 * u, sole = 975;
  const R = 2 * 116 * 0.95, U = 2.4, tw = 196.8;
  const torsoBot = sole - 1.3 * R, chin = torsoBot - R, hc = chin - 0.88 * H.b, hipY = torsoBot - 0.12 * R, crown = hc - H.b;
  const T: Blob = { a: tw / 2 / 1.06, b: 0.5 * (torsoBot - (chin - 0.25 * R)), nTop: 2.2, nBot: 2.6, egg: 0.1, asym: 0, rot: 0, noise: 0.006, seed: 12 };
  const tcx = 300, tp = blobPts(tcx, torsoBot - T.b, T);
  const coatLong = d.top === "labcoat" || d.top === "trench";
  const armCol = mix(d.topCol === "#f4f1ea" ? "#d9d4cc" : d.topCol, INK, 0.4), legCol = mix(d.pants, INK, 0.4);
  const S = (s: number): P2 => [tcx + s * 0.82 * T.a, chin + 0.14 * R];

  // ---- legs + shoes ----
  for (const s of [-1, 1]) {
    const hx = 300 + s * 15 * U, fx = 300 + s * 24 * U;
    p.stroke(curve([hx, hipY], [(hx + fx) / 2 + s * 1.5 * U, (hipY + sole) / 2], [fx, sole - 5 * U]), 6.4 * U, legCol);
    const a: P2 = [fx - s * 4 * U, sole - 6 * U], b: P2 = [fx + s * 15 * U, sole - 5 * U];
    p.stroke([a, b], 11.5 * U + 3.4, INK); p.stroke([a, b], 11.5 * U, d.shoes);
  }
  // ---- hair behind the head ----
  if (d.hair === "wild") {
    // untamed cloud of white hair, jagged, wider than the head; the tips singed orange
    const pts: P2[] = [];
    for (let i = 0; i < 26; i++) {
      const t = rad(-200 + (220 * i) / 25), r = (i % 2 ? 1.18 : 1.5) * H.a * (1 + 0.08 * Math.sin(i * 2.3));
      pts.push([300 + r * Math.cos(t), hc - 0.15 * H.b + r * 0.9 * Math.sin(t)]);
    }
    pts.push([300 + 0.9 * H.a, hc + 0.3 * H.b], [300 - 0.9 * H.a, hc + 0.3 * H.b]);
    p.shadedFill(pts, d.hairCol, mul(d.hairCol, [0.82, 0.82, 0.9]), light, 1.4 * H.a, 0.4);
    p.clip(pts, () => { for (const i of [5, 13, 21]) p.ell(pts[i][0], pts[i][1], 0.14 * H.a, 0.14 * H.a, d.accent, 0); });
    p.inkRing(pts, ow, thick);
    // a small wisp of smoke off the top
    for (const [dx, dy, r] of [[0.35, -1.62, 0.13], [0.52, -1.82, 0.1], [0.42, -2.0, 0.07]] as const) p.ell(300 + dx * H.a, hc + dy * H.b, r * H.a, r * H.a, "#cfd3dc", 2.4 * u);
  }
  if (d.hair === "bun") { const bp = blobPts(300 + 0.05 * H.a, crown - 0.12 * H.a, { a: 0.34 * H.a, b: 0.3 * H.a, nTop: 2, nBot: 2, egg: 0, asym: 0, rot: 0, noise: 0.01, seed: 3 }); p.shadedFill(bp, d.hairCol, mul(d.hairCol, [0.78, 0.78, 0.86]), light, 0.3 * H.a); p.inkRing(bp, ow * 0.85, thick);
    p.arc(300 + 0.05 * H.a, crown - 0.12 * H.a, 0.2 * H.a, 0.16 * H.a, 200, 320, 2 * u, mix(d.hairCol, WHITE, 0.4)); }
  // ---- torso ----
  const torsoPts = coatLong ? blobPts(tcx, torsoBot - T.b + 0.18 * R, { ...T, b: T.b + 0.18 * R, nBot: 3.4 }) : tp;
  p.gradFill(torsoPts, d.topCol, mul(d.topCol, SH_CLOTH), light);
  p.clip(torsoPts, () => {
    const v: P2[] = [[tcx - 0.34 * T.a, chin - 0.05 * R], [tcx + 0.34 * T.a, chin - 0.05 * R], [tcx, chin + 0.45 * R]];
    if (d.top === "tweed") {
      p.poly(v, d.inner, 2.4 * U);
      for (let i = -9; i <= 9; i++) for (let j = 0; j < 9; j++) p.dot(tcx + i * 11 * U + (j % 2) * 5 * U, chin + 0.1 * R + j * 0.12 * R, 1.1 * U, mul(d.topCol, [0.8, 0.8, 0.8]));
      for (const s of [-1, 1]) p.poly([[tcx + s * 0.34 * T.a, chin - 0.05 * R], [tcx + s * 0.6 * T.a, chin + 0.18 * R], [tcx + s * 0.28 * T.a, chin + 0.2 * R], [tcx, chin + 0.45 * R]], mul(d.topCol, [0.88, 0.88, 0.88]), 2.4 * U);
      for (const s of [-1, 1]) p.ell(tcx + s * 0.95 * T.a, chin + 0.62 * R, 0.16 * T.a, 0.12 * R, "#6e4427", 2 * U);
    }
    if (d.top === "labcoat") {
      p.poly(v, d.inner, 2.4 * U);
      p.stroke([[tcx, chin + 0.45 * R], [tcx, torsoBot + 0.3 * R]], 2.4 * U);
      for (const s of [-1, 1]) p.poly([[tcx + s * 0.34 * T.a, chin - 0.05 * R], [tcx + s * 0.66 * T.a, chin + 0.24 * R], [tcx, chin + 0.45 * R]], "#e6e2da", 2.4 * U);
      p.poly(rrect(tcx - 0.62 * T.a, chin + 0.46 * R, tcx - 0.26 * T.a, chin + 0.62 * R, 3 * U), "#e6e2da", 2 * U);
      for (const [x, c] of [[-0.52, "#e2453c"], [-0.42, "#2456f5"], [-0.33, INK]] as const) p.stroke([[tcx + x * T.a, chin + 0.42 * R], [tcx + x * T.a, chin + 0.5 * R]], 2.6 * U, c);
    }
    if (d.top === "shirt") {
      p.poly([[tcx - 0.2 * T.a, chin - 0.05 * R], [tcx + 0.2 * T.a, chin - 0.05 * R], [tcx, chin + 0.1 * R]], mul(d.topCol, [0.9, 0.9, 0.85]), 2 * U);
      p.poly([[tcx - 6 * U, chin + 0.06 * R], [tcx + 6 * U, chin + 0.06 * R], [tcx + 8 * U, chin + 0.6 * R], [tcx, chin + 0.7 * R], [tcx - 8 * U, chin + 0.6 * R]], d.inner, 2 * U);
      p.poly(rrect(tcx + 0.3 * T.a, chin + 0.28 * R, tcx + 0.62 * T.a, chin + 0.46 * R, 2 * U), mul(d.topCol, [0.92, 0.92, 0.88]), 1.8 * U);
      p.stroke([[tcx + 0.4 * T.a, chin + 0.22 * R], [tcx + 0.42 * T.a, chin + 0.34 * R]], 2.4 * U, "#2456f5");
    }
    if (d.top === "trench") {
      for (const s of [-1, 1]) p.poly([[tcx + s * 0.1 * T.a, chin - 0.05 * R], [tcx + s * 0.72 * T.a, chin + 0.22 * R], [tcx + s * 0.3 * T.a, chin + 0.3 * R], [tcx + s * 0.05 * T.a, chin + 0.6 * R]], mul(d.topCol, [0.9, 0.88, 0.84]), 2.4 * U);
      p.band([[tcx - 1.4 * T.a, chin + 0.78 * R], [tcx + 1.4 * T.a, chin + 0.78 * R]], mul(d.topCol, [0.78, 0.72, 0.66]), 0.08 * R, 1.6 * U);
      p.poly(rrect(tcx - 9 * U, chin + 0.74 * R, tcx + 9 * U, chin + 0.82 * R, 1.5 * U), null, 2 * U);
      for (const k of [0.4, 0.58]) for (const s of [-1, 1]) p.ell(tcx + s * 0.32 * T.a, chin + k * R, 2.6 * U, 2.6 * U, "#6e4427", 1.4 * U);
    }
    if (d.top === "polo") {
      p.poly([[tcx - 0.3 * T.a, chin - 0.05 * R], [tcx + 0.3 * T.a, chin - 0.05 * R], [tcx + 0.2 * T.a, chin + 0.1 * R], [tcx - 0.2 * T.a, chin + 0.1 * R]], mul(d.topCol, [0.9, 0.88, 0.88]), 2 * U);
      p.stroke(curve([tcx - 0.36 * T.a, chin], [tcx, chin + 0.5 * R], [tcx + 0.36 * T.a, chin]), 2.6 * U, d.inner);
      p.poly(rrect(tcx - 9 * U, chin + 0.44 * R, tcx + 9 * U, chin + 0.6 * R, 2 * U), WHITE, 2 * U);
    }
    if (d.top === "cardigan") {
      p.poly(v, d.inner, 2.4 * U);
      for (let k = 0; k < 4; k++) p.ell(tcx + 3 * U, chin + (0.5 + 0.14 * k) * R, 3 * U, 3 * U, "#f6ecdc", 1.4 * U);
      for (let i = -6; i <= 6; i++) p.stroke([[tcx + i * 8 * U, torsoBot - 0.08 * R], [tcx + i * 8 * U, torsoBot]], 1.4 * U, mul(d.topCol, SH_CLOTH));
      // pearl necklace
      for (let i = -4; i <= 4; i++) p.ell(tcx + i * 4.5 * U, chin + 0.06 * R + 0.002 * R * i * i * 6, 2.4 * U, 2.4 * U, "#fbf6ee", 1 * U);
    }
  });
  p.inkRing(torsoPts, ow, thick);
  if (d.top === "trench") { // red scarf
    p.ell(300, chin + 0.04 * R, 0.4 * 240, 0.08 * R, d.inner, ow * 0.7);
    p.poly([[300 + 0.16 * 240, chin + 0.06 * R], [300 + 0.3 * 240, chin + 0.06 * R], [300 + 0.26 * 240, chin + 0.5 * R], [300 + 0.12 * 240, chin + 0.46 * R]], mul(d.inner, [0.9, 0.86, 0.86]), 2.4 * U);
  }
  if (d.top === "labcoat" || d.top === "tweed") p.ell(300, chin + 0.02 * R, 0.26 * 240, 0.05 * R, d.inner, ow * 0.6);
  if (d.top === "polo") { // lanyard
    p.stroke(curve([tcx - 0.3 * T.a, chin], [tcx - 0.05 * T.a, chin + 0.3 * R], [tcx, chin + 0.44 * R]), 2.4 * U, d.inner);
    p.stroke(curve([tcx + 0.3 * T.a, chin], [tcx + 0.05 * T.a, chin + 0.3 * R], [tcx, chin + 0.44 * R]), 2.4 * U, d.inner);
  }
  // ---- arms + props held in front of the body ----
  const right = (): P2[] => {
    const s = S(1);
    if (armsMode === "cheeks") return curve(s, [tcx + 1.32 * T.a + 6 * U, chin + 0.18 * R], [300 + H.a - 12 * u, hc + 0.5 * H.b]);
    if (armsMode === "hang") { const ex = tcx + 1.1 * T.a + 4 * U; return curve(s, [ex, s[1] + 0.46 * R], [ex + 2 * U, s[1] + 0.86 * R]); }
    if (d.prop === "flag") return curve(s, [tcx + 1.3 * T.a + 18 * U, s[1] - 0.2 * R], [tcx + 1.36 * T.a + 34 * U, s[1] - 0.7 * R]);
    if (d.prop === "magnifier") return curve(s, [tcx + 1.25 * T.a + 12 * U, chin + 0.3 * R], [300 + 0.42 * H.a + 30 * u, hc + 0.55 * H.b]);
    if (d.prop === "pointer") return curve(s, [tcx + 1.2 * T.a + 14 * U, s[1] + 0.22 * R], [tcx + 1.36 * T.a + 30 * U, s[1] + 0.12 * R]);
    return curve(s, [tcx + 1.18 * T.a + 8 * U, s[1] + 0.4 * R], [tcx + 0.55 * T.a, s[1] + 0.52 * R]);
  };
  const left = (): P2[] => {
    const s = S(-1);
    if (armsMode === "cheeks") return curve(s, [tcx - 1.32 * T.a - 6 * U, chin + 0.18 * R], [300 - H.a + 12 * u, hc + 0.5 * H.b]);
    if (armsMode === "prop" && (d.prop === "stamp" || d.prop === "notepad")) return curve(s, [tcx - 1.18 * T.a - 8 * U, s[1] + 0.4 * R], [tcx - 0.5 * T.a, s[1] + 0.46 * R]);
    const ex = tcx - 1.1 * T.a - 4 * U; return curve(s, [ex, s[1] + 0.46 * R], [ex - 2 * U, s[1] + 0.86 * R]);
  };
  const R0 = right(), L0 = left(), rh = R0[R0.length - 1], lh = L0[L0.length - 1];
  const handsLate = armsMode === "cheeks" || (armsMode === "prop" && d.prop === "magnifier");
  const drawArm = (a: P2[], h: P2) => { p.stroke(a, 5.8 * U, armCol); if (armsMode === "cheeks") p.ell(h[0], h[1], 9 * u, 12.5 * u, d.skin, 3.4 * u); else p.dot(h[0], h[1], 6.4 * U); };
  if (d.prop === "flag" && armsMode === "prop") { // flag pole behind the hand
    p.stroke([[rh[0] - 4 * U, rh[1] + 40 * U], [rh[0] + 4 * U, rh[1] - 70 * U]], 3.4 * U);
    const fx = rh[0] + 4 * U, fy = rh[1] - 70 * U;
    p.poly([[fx, fy], [fx + 52 * U, fy + 12 * U], [fx + 2 * U, fy + 30 * U]], d.accent, 2.6 * U);
    p.ell(fx, fy - 2 * U, 3.4 * U, 3.4 * U, d.accent, 2 * U);
  }
  if (d.prop === "pointer" && armsMode === "prop") { p.stroke([[rh[0] - 6 * U, rh[1] + 6 * U], [rh[0] + 58 * U, rh[1] - 86 * U]], 3.6 * U, "#8a5a2b"); p.stroke([[rh[0] + 54 * U, rh[1] - 80 * U], [rh[0] + 58 * U, rh[1] - 86 * U]], 4 * U, "#f6ecdc"); }
  if (!handsLate) { drawArm(L0, lh); drawArm(R0, rh); }
  if (armsMode === "prop") {
    if (d.prop === "stamp") {
      // files stacked on the left forearm, stamp in the right hand
      for (let k = 0; k < 4; k++) p.poly(rrect(lh[0] - 30 * U + k * 2 * U, lh[1] - 10 * U - k * 7 * U, lh[0] + 22 * U + k * 2 * U, lh[1] - 3 * U - k * 7 * U, 1.5 * U), k % 2 ? "#e9c46a" : "#f0d58a", 1.8 * U);
      p.dot(lh[0], lh[1], 6.4 * U);
      p.poly(rrect(rh[0] - 3 * U, rh[1] - 20 * U, rh[0] + 3 * U, rh[1] - 4 * U, 2 * U), "#8a5a2b", 1.6 * U);
      p.ell(rh[0], rh[1] - 22 * U, 6 * U, 5 * U, "#8a5a2b", 1.6 * U);
      p.poly(rrect(rh[0] - 11 * U, rh[1] - 2 * U, rh[0] + 11 * U, rh[1] + 6 * U, 1.5 * U), "#e2453c", 1.8 * U);
      p.dot(rh[0], rh[1] - 6 * U, 5 * U);
    }
    if (d.prop === "notepad") {
      p.poly(rrect(lh[0] - 16 * U, lh[1] - 26 * U, lh[0] + 12 * U, lh[1] + 8 * U, 2 * U), "#fbf6ee", 1.8 * U);
      for (let k = 0; k < 4; k++) p.stroke([[lh[0] - 11 * U, lh[1] - 16 * U + k * 6 * U], [lh[0] + 7 * U, lh[1] - 16 * U + k * 6 * U]], 1.2 * U, "#9aa6c8");
      p.dot(lh[0], lh[1], 6.4 * U);
      p.stroke([[rh[0] - 4 * U, rh[1] + 8 * U], [rh[0] + 6 * U, rh[1] - 20 * U]], 3.4 * U, "#ffc21a"); p.dot(rh[0], rh[1], 6.4 * U);
    }
    if (d.prop === "flask") {
      const fx = rh[0], fy = rh[1] - 18 * U;
      p.stroke([[fx, fy - 10 * U], [fx, fy - 26 * U]], 8 * U, INK); p.stroke([[fx, fy - 10 * U], [fx, fy - 25 * U]], 5 * U, "#dff3ff");
      p.ell(fx, fy, 15 * U, 14 * U, "#dff3ff", 2.4 * U);
      p.clip(ellPts(fx, fy, 15 * U, 14 * U), () => p.poly(rrect(fx - 16 * U, fy - 2 * U, fx + 16 * U, fy + 16 * U, 0), "#7ee08a", 0));
      p.ell(fx, fy, 15 * U, 14 * U, null, 2.4 * U);
      for (const [dx, dy, r] of [[-4, -32, 3.4], [3, -40, 2.6], [-1, -47, 2]] as const) p.ell(fx + dx * U, fy + dy * U, r * U, r * U, "#7ee08a", 1.4 * U);
      p.dot(rh[0], rh[1], 6.4 * U);
    }
  }
  // ---- head ----
  if (d.hair !== "wild") for (const s of [-1, 1]) p.ell(300 + s * (H.a + 1 * u), hc + 0.06 * H.b, 7 * u, 10 * u, s < 0 ? d.skin : mul(d.skin, SH_SKIN), 3.2 * u);
  const hp = blobPts(300, hc, H);
  p.shadedFill(hp, d.skin, mul(d.skin, SH_SKIN), light, H.a);
  p.clip(hp, () => {
    const hs = mul(d.hairCol, [0.82, 0.8, 0.86]);
    if (d.hair === "slick" || d.hair === "short" || d.hair === "bun" || d.hair === "wild") {
      const y = hc - (d.hair === "wild" ? 0.62 : 0.52) * H.b, fr: P2[] = [];
      for (let i = 0; i <= 8; i++) fr.push([300 - 1.15 * H.a + (2.3 * H.a * i) / 8, y + (i === 0 || i === 8 ? 0.3 * H.b : 0.03 * H.b * Math.sin(i * 1.7))]);
      p.shadedFill([...fr, [300 + 1.2 * H.a, crown - 20], [300 - 1.2 * H.a, crown - 20]], d.hairCol, hs, light, H.a, 0.3);
      p.stroke(fr, 2.6 * u);
      if (d.hair === "slick") for (const k of [-0.5, -0.15, 0.2, 0.55]) p.arc(300 + k * H.a, hc - 0.72 * H.b, 0.25 * H.a, 0.1 * H.b, 200, 330, 2 * u, mix(d.hairCol, WHITE, 0.3));
    }
    if (d.hair === "tufts") for (const s of [-1, 1]) for (const [dy, r] of [[-0.1, 0.22], [0.12, 0.2], [-0.32, 0.18]] as const) p.ell(300 + s * 1.0 * H.a, hc + dy * H.b, r * H.a, r * H.a, d.hairCol, 2.2 * u);
  });
  p.inkRing(hp, ow, thick);
  if (d.hair === "tufts") for (const s of [-1, 1]) for (const [dy, r] of [[-0.1, 0.22], [0.12, 0.2], [-0.32, 0.18]] as const) { // fluffy white side tufts over the ears
    p.ell(300 + s * 1.02 * H.a, hc + dy * H.b, r * H.a, r * H.a, d.hairCol, ow * 0.7);
  }
  if (d.beard) {
    // soft rounded beard along the jaw, a little below the chin
    const bp: P2[] = [];
    for (let i = 0; i <= 24; i++) { const t = rad(28 + (124 * i) / 24); bp.push([300 + 0.86 * H.a * Math.cos(t), hc + 0.2 * H.b + 0.98 * H.b * Math.sin(t)]); }
    bp.push([300 - 0.5 * H.a, hc + 0.62 * H.b], [300, hc + 0.7 * H.b], [300 + 0.5 * H.a, hc + 0.62 * H.b]);
    p.shadedFill(bp, d.beard, mul(d.beard, [0.86, 0.86, 0.92]), light, H.a, 0.3); p.inkRing(bp, ow * 0.8, thick);
  }
  // ---- face ----
  const fcY = hc + 0.1 * H.b;
  if (d.beard) { // keep the mouth readable on the beard: cut a skin patch
    p.ell(300, fcY + 24 * u * fs, 16 * u, 9 * u, d.skin, 0);
  }
  face3(p, d, 300, fcY, W, f, fs, d.prop === "magnifier" && armsMode === "prop" && f === "neutral");
  // ---- hats / headgear on top ----
  if (d.hair === "wild") { // goggles pushed up onto the forehead
    const gy = hc - 0.52 * H.b;
    p.band([[300 - 1.05 * H.a, gy + 4 * u], [300 + 1.05 * H.a, gy + 4 * u]], "#3b3f52", 5 * u, 1.4 * u);
    for (const s of [-1, 1]) { p.ell(300 + s * 17 * u, gy, 14 * u, 11 * u, d.accent, 2.6 * u); p.ell(300 + s * 17 * u, gy, 9 * u, 7 * u, "#9fd4ff", 2 * u); p.ell(300 + s * 17 * u - 3 * u, gy - 2 * u, 2.4 * u, 2 * u, WHITE, 0); }
  }
  if (d.hat === "mortar") {
    const by = crown + 0.18 * H.b;
    const cap = rrect(300 - 0.7 * H.a, by - 0.12 * H.b, 300 + 0.7 * H.a, by + 0.18 * H.b, 6 * u);
    p.shadedFill(cap, d.hatCol!, mul(d.hatCol!, [0.7, 0.7, 0.8]), light, H.a); p.poly(cap, null, ow * 0.8);
    const board: P2[] = [[300 - 1.15 * H.a, by - 0.14 * H.b], [300, by - 0.42 * H.b], [300 + 1.15 * H.a, by - 0.14 * H.b], [300, by + 0.12 * H.b]];
    p.shadedFill(board, mix(d.hatCol!, WHITE, 0.08), mul(d.hatCol!, [0.75, 0.75, 0.85]), light, H.a, 0.3); p.inkRing(board, ow * 0.8, thick);
    p.ell(300, by - 0.15 * H.b, 4 * u, 3 * u, d.accent, 1.6 * u);
    p.stroke(curve([300, by - 0.15 * H.b], [300 + 0.6 * H.a, by - 0.05 * H.b], [300 + 0.95 * H.a, by + 0.1 * H.b]), 2.4 * u, d.accent);
    p.stroke([[300 + 0.95 * H.a, by + 0.1 * H.b], [300 + 0.97 * H.a, by + 0.42 * H.b]], 3 * u, d.accent);
    p.poly([[300 + 0.9 * H.a, by + 0.4 * H.b], [300 + 1.04 * H.a, by + 0.4 * H.b], [300 + 1.06 * H.a, by + 0.62 * H.b], [300 + 0.88 * H.a, by + 0.62 * H.b]], d.accent, 2 * u);
  }
  if (d.hat === "visor") {
    const vy = hc - 0.46 * H.b;
    p.band([[300 - 1.02 * H.a, vy], [300 + 1.02 * H.a, vy]], mul(d.hatCol!, [0.8, 0.8, 0.8]), 6 * u, 1.4 * u);
    const brim: P2[] = [[300 - 0.95 * H.a, vy], [300 + 0.95 * H.a, vy], [300 + 0.7 * H.a, vy + 0.36 * H.b], [300 - 0.7 * H.a, vy + 0.36 * H.b]];
    p.poly(brim, "rgba(47,174,106,0.72)", ow * 0.7);
    p.stroke([[300 - 0.7 * H.a, vy + 0.34 * H.b], [300 + 0.7 * H.a, vy + 0.34 * H.b]], 2 * u, "#c9f2da");
  }
  if (d.hat === "fedora") {
    const by = crown + 0.3 * H.b;
    const crownPts: P2[] = [[300 - 0.82 * H.a, by], [300 - 0.7 * H.a, by - 0.62 * H.b], [300 - 0.2 * H.a, by - 0.7 * H.b], [300, by - 0.6 * H.b], [300 + 0.2 * H.a, by - 0.7 * H.b], [300 + 0.7 * H.a, by - 0.62 * H.b], [300 + 0.82 * H.a, by]];
    p.ell(300, by + 0.02 * H.b, 1.4 * H.a, 0.16 * H.b, mul(d.hatCol!, [0.9, 0.9, 0.94]), ow * 0.8);
    p.shadedFill(crownPts, d.hatCol!, mul(d.hatCol!, [0.7, 0.7, 0.8]), light, H.a, 0.3); p.inkRing(crownPts, ow * 0.85, thick);
    p.band([[300 - 0.8 * H.a, by - 0.12 * H.b], [300 + 0.8 * H.a, by - 0.12 * H.b]], d.accent, 0.12 * H.b, 0);
    p.poly(rrect(300 + 0.3 * H.a, by - 0.42 * H.b, 300 + 0.62 * H.a, by - 0.14 * H.b, 2 * u), "#fbf6ee", 2 * u);
    p.stroke([[300 + 0.36 * H.a, by - 0.3 * H.b], [300 + 0.56 * H.a, by - 0.3 * H.b]], 2.2 * u, INK);
  }
  if (d.hat === "bucket") {
    const by = crown + 0.3 * H.b;
    const brim: P2[] = [[300 - 0.88 * H.a, by - 0.06 * H.b], [300 + 0.88 * H.a, by - 0.06 * H.b], [300 + 1.08 * H.a, by + 0.16 * H.b], [300 + 0.9 * H.a, by + 0.2 * H.b], [300 - 0.9 * H.a, by + 0.2 * H.b], [300 - 1.08 * H.a, by + 0.16 * H.b]];
    const dome: P2[] = [];
    for (let i = 0; i <= 24; i++) { const t = Math.PI + (Math.PI * i) / 24; dome.push([300 + 0.9 * H.a * Math.sign(Math.cos(t)) * Math.abs(Math.cos(t)) ** 0.7, by + 0.55 * H.b * Math.sin(t)]); }
    p.shadedFill(dome, d.hatCol!, mul(d.hatCol!, [0.76, 0.74, 0.74]), light, H.a, 0.3); p.inkRing(dome, ow * 0.85, thick);
    p.shadedFill(brim, mix(d.hatCol!, WHITE, 0.1), mul(d.hatCol!, [0.78, 0.76, 0.76]), light, H.a, 0.3); p.poly(brim, null, ow * 0.8);
    p.band([[300 - 0.84 * H.a, by - 0.08 * H.b], [300 + 0.84 * H.a, by - 0.08 * H.b]], d.accent, 0.1 * H.b, 0);
  }
  // ---- late hands (cheeks / magnifier) ----
  if (handsLate) {
    drawArm(L0, lh);
    if (armsMode === "prop" && d.prop === "magnifier") {
      // brass magnifier in front of the viewer's-right eye: the eye behind it is drawn huge
      const lx = 300 + 15 * u * fs, ly = fcY, r = 24 * u;
      p.stroke([[lx + 0.7 * r, ly + 0.7 * r], [rh[0], rh[1]]], 7 * u, "#6e4427");
      p.ell(lx, ly, r, r, "rgba(214,236,255,0.9)", 0);
      p.clip(ellPts(lx, ly, r, r), () => friendlyEye(p, lx, ly, u * 1.9, 1));
      p.ell(lx, ly, r, r, null, 4.2 * u); p.ell(lx, ly, r - 3 * u, r - 3 * u, null, 2.6 * u);
      p.stroke(ellPts(lx, ly, r - 1 * u, r - 1 * u), 2.6 * u, d.accent);
      p.stroke(R0, 5.8 * U, armCol); p.dot(rh[0], rh[1], 6.4 * U);
    } else drawArm(R0, rh);
  }
  return { hc, crown, chin, H };
};

export const castHeadCentre = (d: Cast3) => { const R = 2 * 116 * 0.95, chin = 975 - 2.3 * R; return chin - 0.88 * d.headA * d.aspect; };
