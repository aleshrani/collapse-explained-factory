// Collision model of the CarRiver scene (pure math, no three.js, no DOM): oriented boxes for the car parts and for
// the static world (deck, ribs, railings + posts, hangers, chains, towers, quay walls, banks, river bed, water,
// landing stage), a separating-axis OBB-vs-OBB penetration test, and the railing break geometry shared with
// world.ts (so what the checker tests is exactly what is drawn). Used by car.ts (deck contact while tipping, hit
// frame, railing gap) and by scripts/carriver-collide.mjs (frame-by-frame penetration report).
export type V3 = [number, number, number];
export type Box = { c: V3; ax: [V3, V3, V3]; h: V3; name: string };

export const DECK = 6.0;
export const DECK_HALF = 2.5;
export const WORLD = { bed: -3.0 }; // world.ts bed / wall foot (was -0.6: the floating car's wheels touched it)
export const RAIL_X = 2.42, POST_X = 2.42, HANGER_X = 2.62, CHAIN_X = 2.7;
export const RAILS: [number, number, number][] = [[1.08, 0.1, 0.1], [0.6, 0.07, 0.07]]; // [height over deck, w, h]
export const ZS = Array.from({ length: 121 }, (_, j) => -30 + j * 0.5);
export const POSTS = Array.from({ length: 41 }, (_, k) => -30 + k * 1.5);
export const HANG = Array.from({ length: 35 }, (_, k) => -25.5 + k * 1.5);
export const CZ = Array.from({ length: 73 }, (_, k) => -27 + k * 0.75);
export const catY = (z: number) => 8.5 + 8.1 * (z / 27) ** 2;

// ---------------- car parts (car-local AABBs: x right, y up from tyre bottom, z forward) ----------------
export const CAR_PARTS: { name: string; min: V3; max: V3 }[] = [
  { name: "hood", min: [-0.9, 0.3, 0.75], max: [0.9, 0.82, 2.0] },
  { name: "trunk", min: [-0.9, 0.3, -2.0], max: [0.9, 0.85, -1.2] },
  { name: "doors", min: [-0.9, 0.3, -1.2], max: [0.9, 0.85, 0.75] },
  { name: "cabin", min: [-0.86, 0.85, -1.42], max: [0.86, 1.6, 1.0] },
  { name: "bumperF", min: [-0.95, 0.3, 1.98], max: [0.95, 0.44, 2.1] },
  { name: "bumperR", min: [-0.95, 0.3, -2.1], max: [0.95, 0.44, -1.98] },
  { name: "mirrorL", min: [-1.08, 0.98, 0.62], max: [-0.9, 1.12, 0.78] },
  { name: "mirrorR", min: [0.9, 0.98, 0.62], max: [1.08, 1.12, 0.78] },
  ...[-1.35, 1.35].flatMap((zc) => [-1, 1].map((s) => ({ name: `wheel${s < 0 ? "L" : "R"}${zc < 0 ? "r" : "f"}`, min: [s < 0 ? -0.92 : 0.68, 0, zc - 0.33] as V3, max: [s < 0 ? -0.68 : 0.92, 0.66, zc + 0.33] as V3 }))),
];
/** free space inside the cabin the driver card must stay in (inside the door skins, floor to roof liner) */
export const CABIN_IN = { min: [-0.83, 0.42, -1.4] as V3, max: [0.83, 1.52, 0.95] as V3 };

export type Pose = { x: number; y: number; z: number; yaw: number; pitch: number; roll: number };
/** rotation matrix columns of the car (three.js Euler order YXZ: R = Ry * Rx * Rz) */
export const axesOf = (p: Pose): [V3, V3, V3] => {
  const cy = Math.cos(p.yaw), sy = Math.sin(p.yaw), cx = Math.cos(p.pitch), sx = Math.sin(p.pitch), cz = Math.cos(p.roll), sz = Math.sin(p.roll);
  // R = Ry Rx Rz; columns = images of the local x, y, z axes
  const Ry = [[cy, 0, sy], [0, 1, 0], [-sy, 0, cy]], Rx = [[1, 0, 0], [0, cx, -sx], [0, sx, cx]], Rz = [[cz, -sz, 0], [sz, cz, 0], [0, 0, 1]];
  const mm = (A: number[][], B: number[][]) => A.map((r) => [0, 1, 2].map((j) => r[0] * B[0][j] + r[1] * B[1][j] + r[2] * B[2][j]));
  const R = mm(mm(Ry, Rx), Rz);
  return [[R[0][0], R[1][0], R[2][0]], [R[0][1], R[1][1], R[2][1]], [R[0][2], R[1][2], R[2][2]]];
};
export const toWorld = (p: Pose, ax: [V3, V3, V3], l: V3): V3 =>
  [p.x + ax[0][0] * l[0] + ax[1][0] * l[1] + ax[2][0] * l[2], p.y + ax[0][1] * l[0] + ax[1][1] * l[1] + ax[2][1] * l[2], p.z + ax[0][2] * l[0] + ax[1][2] * l[1] + ax[2][2] * l[2]];
export const toLocal = (p: Pose, ax: [V3, V3, V3], w: V3): V3 => {
  const d: V3 = [w[0] - p.x, w[1] - p.y, w[2] - p.z];
  return [0, 1, 2].map((i) => ax[i][0] * d[0] + ax[i][1] * d[1] + ax[i][2] * d[2]) as V3;
};
export const carBoxes = (p: Pose): Box[] => {
  const ax = axesOf(p);
  return CAR_PARTS.map((q) => ({ name: q.name, ax, h: [0, 1, 2].map((i) => (q.max[i] - q.min[i]) / 2) as V3,
    c: toWorld(p, ax, [0, 1, 2].map((i) => (q.max[i] + q.min[i]) / 2) as V3) }));
};
/** points on every face of every car part (n x n grid per face), world space */
export const carSamples = (p: Pose, n = 5): V3[] => {
  const ax = axesOf(p), out: V3[] = [];
  for (const q of CAR_PARTS) for (let a = 0; a < 3; a++) for (const s of [0, 1]) for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
    const l: V3 = [0, 0, 0], b = (a + 1) % 3, c = (a + 2) % 3;
    l[a] = s ? q.max[a] : q.min[a];
    l[b] = q.min[b] + ((q.max[b] - q.min[b]) * i) / (n - 1);
    l[c] = q.min[c] + ((q.max[c] - q.min[c]) * j) / (n - 1);
    out.push(toWorld(p, ax, l));
  }
  return out;
};

// ---------------- OBB vs OBB (separating axis theorem) ----------------
const dot = (a: V3, b: V3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const crs = (a: V3, b: V3): V3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const rad = (b: Box, n: V3) => b.h[0] * Math.abs(dot(b.ax[0], n)) + b.h[1] * Math.abs(dot(b.ax[1], n)) + b.h[2] * Math.abs(dot(b.ax[2], n));
/** penetration depth (m) along the axis of least overlap; 0 when separated */
export const penetration = (A: Box, B: Box) => {
  const d: V3 = [B.c[0] - A.c[0], B.c[1] - A.c[1], B.c[2] - A.c[2]];
  const axes: V3[] = [...A.ax, ...B.ax];
  for (const a of A.ax) for (const b of B.ax) { const c = crs(a, b), l = Math.hypot(...c); if (l > 1e-6) axes.push([c[0] / l, c[1] / l, c[2] / l]); }
  let best = Infinity;
  for (const n of axes) {
    const o = rad(A, n) + rad(B, n) - Math.abs(dot(d, n));
    if (o <= 0) return 0;
    best = Math.min(best, o);
  }
  return best;
};
const I3: [V3, V3, V3] = [[1, 0, 0], [0, 1, 0], [0, 0, 1]];
export const aabb = (name: string, min: V3, max: V3): Box => ({ name, ax: I3, c: [0, 1, 2].map((i) => (min[i] + max[i]) / 2) as V3, h: [0, 1, 2].map((i) => (max[i] - min[i]) / 2) as V3 });
/** thin box along segment a -> b with half-section r */
export const seg = (name: string, a: V3, b: V3, r: number): Box => {
  const d: V3 = [b[0] - a[0], b[1] - a[1], b[2] - a[2]], L = Math.hypot(...d) || 1e-6, u: V3 = [d[0] / L, d[1] / L, d[2] / L];
  const t: V3 = Math.abs(u[1]) < 0.9 ? [0, 1, 0] : [1, 0, 0];
  const v = crs(u, t), vl = Math.hypot(...v), v1: V3 = [v[0] / vl, v[1] / vl, v[2] / vl], w = crs(u, v1);
  return { name, ax: [u, v1, w], c: [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2], h: [L / 2, r, r] };
};

// ---------------- railing break (shared with world.ts) ----------------
/** gap = z range the car sweeps through the right railing line (car.ts fills it); bending ends 1.6 m beyond it */
export const GAP = { z0: 0, z1: 0, hit: 0 };
const BEND = 1.6;
const bendW = (z: number) => { const d = z < GAP.z0 ? GAP.z0 - z : z > GAP.z1 ? z - GAP.z1 : 0; return Math.max(0, 1 - d / BEND) ** 2; };
/** 0 before the hit, eases to 1 over 5 frames */
export const breakK = (f: number) => { const u = Math.max(0, Math.min(1, (f - GAP.hit) / 5)); return f < GAP.hit ? 0 : u * u * (3 - 2 * u); };
/** right-hand rail polylines at frame f: one whole rail before the hit, then two bent stubs (null = none) */
export const rightRail = (h: number, f: number): [V3[], V3[] | null] => {
  const k = breakK(f), pt = (z: number): V3 => { const w = bendW(z) * k; return [RAIL_X + 0.9 * w, DECK + h - 0.25 * w, z + Math.sign(z - (GAP.z0 + GAP.z1) / 2) * 0.1 * w]; };
  if (!k) return [ZS.map(pt), null];
  return [ZS.filter((z) => z <= GAP.z0 - 0.15).map(pt), ZS.filter((z) => z >= GAP.z1 + 0.15).map(pt).reverse()];
};
/** right-hand post at z: null = knocked away, else tilt angle (rad, outward) */
export const rightPost = (z: number, f: number): number | null => {
  const k = breakK(f);
  if (k > 0 && z > GAP.z0 - 0.1 && z < GAP.z1 + 0.1) return null;
  return 1.0 * bendW(z) * k;
};
export const hangerGone = (x: number, z: number, f: number) => x > 0 && f >= GAP.hit && z > GAP.z0 - 0.3 && z < GAP.z1 + 0.3;

// ---------------- static world ----------------
export type Static = { box: Box; tag: "rail" | "railbreak" | "water" | "world" };
export const staticBoxes = (f: number, dock: V3 | null): Static[] => {
  const out: Static[] = [], W = (b: Box, tag: Static["tag"] = "world") => out.push({ box: b, tag });
  W(aabb("deck", [-DECK_HALF, DECK - 0.45, -30], [DECK_HALF, DECK, 30]));
  for (const z of POSTS) W(aabb(`rib@${z}`, [-2.85, DECK - 0.71, z - 0.12], [2.85, DECK - 0.45, z + 0.12]));
  // left railing + posts (never broken)
  for (const [h, w, hh] of RAILS) W(aabb(`railL${h}`, [-RAIL_X - w / 2, DECK + h - hh / 2, -30], [-RAIL_X + w / 2, DECK + h + hh / 2, 30]), "rail");
  for (const z of POSTS) W(aabb(`postL@${z}`, [-POST_X - 0.055, DECK, z - 0.055], [-POST_X + 0.055, DECK + 1.12, z + 0.055]), "rail");
  // right railing: whole / snapped and bent; the stretch inside the break zone is exempt while it breaks
  const brk = f >= GAP.hit && f < GAP.hit + 6;
  const inZone = (z: number) => z > GAP.z0 - BEND && z < GAP.z1 + BEND;
  for (const [h, w] of RAILS) for (const line of rightRail(h, f)) if (line) for (let i = 0; i + 1 < line.length; i++) {
    const a = line[i], b = line[i + 1];
    W(seg(`railR${h}@${a[2].toFixed(1)}`, a, b, w / 2), brk && (inZone(a[2]) || inZone(b[2])) ? "railbreak" : "rail");
  }
  for (const z of POSTS) {
    const t = rightPost(z, f);
    if (t === null) continue;
    const top: V3 = [POST_X + 1.12 * Math.sin(t), DECK + 1.12 * Math.cos(t), z];
    W(seg(`postR@${z}`, [POST_X, DECK, z], top, 0.055), brk && inZone(z) ? "railbreak" : "rail");
  }
  // hangers and chains
  for (const z of HANG) for (const x of [-HANGER_X, HANGER_X]) if (!hangerGone(x, z, f)) W(seg(`hanger${x > 0 ? "R" : "L"}@${z}`, [x, DECK, z], [x, catY(z), z], 0.035));
  for (const x of [-CHAIN_X, CHAIN_X]) for (let i = 0; i + 1 < CZ.length; i++) W(seg(`chain${x > 0 ? "R" : "L"}@${CZ[i]}`, [x, catY(CZ[i]), CZ[i]], [x, catY(CZ[i + 1]), CZ[i + 1]], 0.15));
  // towers (columns + plinths + lintel), quay walls, banks, bed, water, landing stage
  for (const zc of [-27, 27]) {
    for (const xc of [-3.35, 3.35]) { W(aabb(`tower${xc}@${zc}`, [xc - 0.7, WORLD.bed, zc - 0.8], [xc + 0.7, 15.6, zc + 0.8])); W(aabb(`plinth${xc}@${zc}`, [xc - 0.95, WORLD.bed, zc - 1.05], [xc + 0.95, 1.1, zc + 1.05])); }
    W(aabb(`lintel@${zc}`, [-4.3, 15.6, zc - 1.0], [4.3, 17.9, zc + 1.0]));
  }
  for (const s of [-1, 1]) W(aabb(`bank${s}`, [-900, WORLD.bed, s < 0 ? -900 : 30], [900, DECK, s < 0 ? -30 : 900]));
  W(aabb("riverbed", [-900, WORLD.bed - 1, -30], [900, WORLD.bed, 30]));
  W(aabb("water", [-900, WORLD.bed, -30], [900, 0, 30]), "water");
  if (dock) W(aabb("dock", [dock[0] - 1.55, -0.12, dock[2] - 1.2], [dock[0] + 1.55, 0.3, dock[2] + 1.36]));
  return out;
};
