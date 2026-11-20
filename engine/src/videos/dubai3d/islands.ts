// The archipelago: ~300 sandy islands whose layout draws a world map seen from the air (our own rough continent
// outlines, no real survey data). Seeds on a jittered hex grid inside the continents -> Voronoi cells with a water
// channel between neighbours, capped by a wobbly circle (rounded coasts) and Chaikin-smoothed into soft blobs.
// Each island: domed sand top (painted sand, world UVs, per-island tint), a wet-sand lip and an underwater shelf; a
// quarter get a painted lawn patch. The shallow-water mask (foam line / turquoise shallows / broad lagoon tint) is a
// canvas the sea shader samples in world XZ.
import * as THREE from "three";
import { rng } from "./paint";
import { SAND_Y, SANDBAR, HOTEL, HOTEL_R, NZ } from "./story";

export type P2 = [number, number];
export type Island = { id: number; c: P2; poly: P2[]; green: boolean; kind: "map" | "sandbar" | "hotel" | "nz"; tint: [number, number, number] };

// ---------------- continents (lon, lat) ----------------
const CONT: P2[][] = [
  // North America
  [[-168, 66], [-150, 71], [-125, 70], [-95, 72], [-80, 68], [-64, 60], [-55, 51], [-66, 44], [-76, 36], [-81, 26], [-90, 29], [-97, 26], [-97, 19],
    [-88, 16], [-82, 9], [-92, 15], [-105, 20], [-112, 28], [-118, 33], [-124, 40], [-125, 49], [-134, 57], [-150, 60], [-165, 60]],
  // Greenland
  [[-55, 61], [-43, 60], [-24, 68], [-19, 77], [-30, 83], [-55, 82], [-68, 77], [-56, 70]],
  // South America
  [[-80, 9], [-62, 11], [-50, 1], [-35, -6], [-39, -16], [-42, -23], [-49, -28], [-58, -36], [-64, -42], [-67, -54], [-73, -50], [-74, -38], [-71, -18], [-81, -5]],
  // Europe
  [[-10, 37], [-9, 43], [-2, 47], [-5, 49], [3, 52], [6, 58], [12, 64], [20, 70], [32, 71], [42, 67], [44, 48], [36, 46], [28, 41], [22, 38], [15, 38], [9, 44], [3, 43]],
  // Africa
  [[-17, 21], [-12, 30], [-6, 36], [10, 37], [20, 32], [32, 31], [37, 22], [43, 12], [51, 12], [42, -2], [40, -15], [33, -26], [20, -35], [16, -27], [12, -17], [9, -2], [-4, 5], [-13, 8], [-17, 15]],
  // Asia (with Arabia and India)
  [[36, 37], [44, 48], [42, 67], [70, 73], [100, 77], [140, 72], [175, 67], [165, 60], [155, 59], [142, 53], [140, 46], [132, 42], [127, 37], [122, 31], [118, 23], [108, 18],
    [106, 10], [101, 2], [99, 13], [92, 21], [86, 21], [80, 13], [77, 8], [72, 20], [66, 25], [58, 25], [56, 20], [52, 16], [44, 13], [38, 22], [34, 29]],
  // Australia
  [[114, -22], [122, -17], [130, -12], [137, -12], [142, -11], [146, -19], [153, -26], [150, -37], [141, -38], [133, -32], [124, -34], [115, -34]],
  // islands: Britain, Japan, Madagascar, Indonesia, Iceland
  [[-6, 50], [2, 51], [0, 56], [-4, 59], [-7, 56]],
  [[130, 31], [136, 34], [141, 38], [142, 45], [139, 41], [133, 35]],
  [[44, -16], [50, -14], [48, -25], [44, -24]],
  [[96, 4], [106, -6], [116, -8], [120, -3], [110, 0], [100, 2]],
  [[-24, 64], [-14, 64], [-15, 66], [-22, 66]],
];
/** map projection: lon/lat degrees -> world x/z metres (north = -z) */
export const CONTINENTS: ReadonlyArray<ReadonlyArray<P2>> = CONT;
export const proj = (lon: number, lat: number): P2 => [lon * 0.72, 6 - lat * 0.78];
const CONT_W = CONT.map((poly) => poly.map(([lo, la]) => proj(lo, la)));
const inPoly = (p: P2, poly: P2[]) => {
  let c = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, zi] = poly[i], [xj, zj] = poly[j];
    if ((zi > p[1]) !== (zj > p[1]) && p[0] < ((xj - xi) * (p[1] - zi)) / (zj - zi) + xi) c = !c;
  }
  return c;
};
const inLand = (p: P2) => CONT_W.some((poly) => inPoly(p, poly));

// ---------------- polygon helpers ----------------
const clipHalf = (poly: P2[], n: P2, d: number): P2[] => { // keep n . x <= d
  const out: P2[] = [];
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i], b = poly[(i + 1) % poly.length];
    const da = n[0] * a[0] + n[1] * a[1] - d, db = n[0] * b[0] + n[1] * b[1] - d;
    if (da <= 0) out.push(a);
    if ((da < 0) !== (db < 0)) { const t = da / (da - db); out.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]); }
  }
  return out;
};
const chaikin = (p: P2[], n: number): P2[] => {
  let q = p;
  for (let k = 0; k < n; k++) {
    const o: P2[] = [];
    for (let i = 0; i < q.length; i++) {
      const a = q[i], b = q[(i + 1) % q.length];
      o.push([0.75 * a[0] + 0.25 * b[0], 0.75 * a[1] + 0.25 * b[1]], [0.25 * a[0] + 0.75 * b[0], 0.25 * a[1] + 0.75 * b[1]]);
    }
    q = o;
  }
  return q;
};
export const area = (p: P2[]) => { let s = 0; for (let i = 0; i < p.length; i++) { const a = p[i], b = p[(i + 1) % p.length]; s += a[0] * b[1] - b[0] * a[1]; } return s / 2; };
export const centroid = (p: P2[]): P2 => { let x = 0, z = 0; for (const q of p) { x += q[0]; z += q[1]; } return [x / p.length, z / p.length]; };
const blob = (c: P2, rx: number, rz: number, rot: number, r: () => number, n = 20, wob = 0.12): P2[] => {
  const ph = r() * 6.28, ph2 = r() * 6.28;
  return Array.from({ length: n }, (_, i) => {
    const a = (i / n) * Math.PI * 2, k = 1 + wob * Math.sin(2 * a + ph) + wob * 0.6 * Math.sin(3 * a + ph2);
    const x = Math.cos(a) * rx * k, z = Math.sin(a) * rz * k;
    return [c[0] + x * Math.cos(rot) - z * Math.sin(rot), c[1] + x * Math.sin(rot) + z * Math.cos(rot)] as P2;
  });
};

// ---------------- the archipelago ----------------
const S = 5.5, GAP = 1.45;
export const buildIslands = (): Island[] => {
  const r = rng(20081);
  const seeds: P2[] = [];
  for (let row = -12; row <= 12; row++) for (let col = -26; col <= 26; col++) {
    const x = (col + (row % 2 ? 0.5 : 0)) * S + (r() - 0.5) * 0.5 * S, z = row * S * 0.866 + (r() - 0.5) * 0.5 * S;
    if (!inLand([x, z])) continue;
    if (Math.hypot(x - NZ[0], z - NZ[2]) < 11 || Math.hypot(x - SANDBAR[0], z - SANDBAR[2]) < 12) continue;
    if (Math.hypot(x - HOTEL[0], z - HOTEL[2]) < HOTEL_R + 3.5) continue;
    seeds.push([x, z]);
  }
  const out: Island[] = [];
  seeds.forEach((p, i) => {
    let poly = blob(p, 0.66 * S, 0.66 * S, 0, r, 16, 0.1);
    for (const q of seeds) {
      if (q === p) continue;
      const dx = q[0] - p[0], dz = q[1] - p[1], d = Math.hypot(dx, dz);
      if (d > 2.4 * S) continue;
      const n: P2 = [dx / d, dz / d];
      poly = clipHalf(poly, n, n[0] * (p[0] + dx / 2) + n[1] * (p[1] + dz / 2) - GAP / 2);
    }
    // the resort island takes India's place: clip map cells against it too
    const hd = Math.hypot(HOTEL[0] - p[0], HOTEL[2] - p[1]);
    if (hd < HOTEL_R + 2.5 * S) { const n: P2 = [(HOTEL[0] - p[0]) / hd, (HOTEL[2] - p[1]) / hd]; poly = clipHalf(poly, n, n[0] * HOTEL[0] + n[1] * HOTEL[2] - HOTEL_R - GAP); }
    if (poly.length < 3 || Math.abs(area(poly)) < 4) return;
    poly = chaikin(poly, 2);
    if (area(poly) < 0) poly.reverse();
    const v = r();
    out.push({ id: i, c: centroid(poly), poly, green: v < 0.24, kind: "map", tint: [0.97 + 0.06 * r(), 0.95 + 0.06 * r(), 0.9 + 0.08 * r()] });
  });
  const rr = rng(77);
  out.push({ id: 900, c: [SANDBAR[0], SANDBAR[2]], poly: blob([SANDBAR[0], SANDBAR[2]], 9, 4.2, 0.18, rr, 28, 0.08), green: false, kind: "sandbar", tint: [1, 0.98, 0.94] });
  out.push({ id: 901, c: [HOTEL[0], HOTEL[2]], poly: blob([HOTEL[0], HOTEL[2]], HOTEL_R, HOTEL_R * 0.9, 0.3, rr, 40, 0.07), green: true, kind: "hotel", tint: [1, 0.98, 0.93] });
  out.push({ id: 902, c: [NZ[0], NZ[2]], poly: blob([NZ[0], NZ[2]], 7.5, 4.2, 0.85, rr, 28, 0.12), green: false, kind: "nz", tint: [0.96, 0.9, 0.82] });
  return out;
};

// ---------------- meshes ----------------
const offset = (poly: P2[], d: number): P2[] => poly.map((q, i) => {
  const a = poly[(i + poly.length - 1) % poly.length], b = poly[(i + 1) % poly.length];
  let nx = b[1] - a[1], nz = -(b[0] - a[0]); // outward for CCW in (x, z) with z down... checked by sign below
  const l = Math.hypot(nx, nz) || 1; nx /= l; nz /= l;
  return [q[0] + nx * d, q[1] + nz * d];
});
const scaleAbout = (poly: P2[], c: P2, k: number): P2[] => poly.map((q) => [c[0] + (q[0] - c[0]) * k, c[1] + (q[1] - c[1]) * k]);

type Buf = { pos: number[]; col: number[]; uv: number[]; idx: number[] };
const newBuf = (): Buf => ({ pos: [], col: [], uv: [], idx: [] });
const toGeo = (b: Buf) => {
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(b.pos, 3));
  g.setAttribute("color", new THREE.Float32BufferAttribute(b.col, 3));
  g.setAttribute("uv", new THREE.Float32BufferAttribute(b.uv, 2));
  g.setIndex(b.idx);
  g.computeVertexNormals();
  return g;
};
/** sand body of one island into buf: centre dome, top ring, wet lip, shelf (rings share a vertex count) */
const sandBody = (b: Buf, is: Island, top = SAND_Y, uvScale = 1 / 8) => {
  const P = is.poly, n = P.length, c = is.c;
  const outSign = area(P) > 0 ? 1 : -1;
  const rings: { p: P2[]; y: number; col: [number, number, number] }[] = [
    { p: scaleAbout(P, c, 0.5), y: top + 0.18, col: is.tint },
    { p: scaleAbout(P, c, 0.86), y: top + 0.08, col: is.tint },
    { p: P, y: top, col: [is.tint[0] * 0.98, is.tint[1] * 0.96, is.tint[2] * 0.93] },
    { p: offset(P, 0.45 * outSign), y: 0.1, col: [0.8, 0.68, 0.55] },
    { p: offset(P, 1.6 * outSign), y: -0.9, col: [0.62, 0.62, 0.55] },
  ];
  const base = b.pos.length / 3;
  b.pos.push(c[0], top + 0.22, c[1]); b.col.push(...is.tint); b.uv.push(c[0] * uvScale, c[1] * uvScale);
  for (const rg of rings) for (const q of rg.p) { b.pos.push(q[0], rg.y, q[1]); b.col.push(...rg.col); b.uv.push(q[0] * uvScale, q[1] * uvScale); }
  for (let i = 0; i < n; i++) { const j = (i + 1) % n; b.idx.push(base, base + 1 + j, base + 1 + i); }
  for (let k = 0; k < rings.length - 1; k++) for (let i = 0; i < n; i++) {
    const j = (i + 1) % n, a0 = base + 1 + k * n + i, a1 = base + 1 + k * n + j, b0 = a0 + n, b1 = a1 + n;
    b.idx.push(a0, a1, b1, a0, b1, b0);
  }
};
/** lawn patch on a green island (fan, slightly above the dome) */
const lawn = (b: Buf, is: Island, r: () => number, top = SAND_Y, k = 0.6) => {
  const c = is.c, P = chaikin(scaleAbout(is.poly, c, k).map((q) => [q[0] + (r() - 0.5) * 0.5, q[1] + (r() - 0.5) * 0.5] as P2), 1), n = P.length;
  const base = b.pos.length / 3, sh = 0.85 + 0.15 * r();
  b.pos.push(c[0], top + 0.34, c[1]); b.col.push(sh, sh, sh); b.uv.push(c[0] / 6, c[1] / 6);
  for (const q of P) {
    const d = Math.hypot(q[0] - c[0], q[1] - c[1]) / Math.max(1e-3, Math.max(...is.poly.map((p) => Math.hypot(p[0] - c[0], p[1] - c[1]))));
    b.pos.push(q[0], top + 0.32 - 0.14 * d * d, q[1]); b.col.push(sh, sh, sh); b.uv.push(q[0] / 6, q[1] / 6);
  }
  for (let i = 0; i < n; i++) { const j = (i + 1) % n; b.idx.push(base, base + 1 + j, base + 1 + i); }
};
export const islandGeos = (list: Island[]) => {
  const sand = newBuf(), grass = newBuf(), nz = newBuf(), r = rng(4242);
  for (const is of list) {
    if (is.kind === "nz") { sandBody(nz, is); continue; }
    sandBody(sand, is);
    if (is.green) lawn(grass, is, r, SAND_Y, is.kind === "hotel" ? 0.72 : 0.6);
  }
  return { sand: toGeo(sand), grass: toGeo(grass), nz: toGeo(nz) };
};

// ---------------- shallow-water mask (sea shader) ----------------
export const MASK = { x0: -175, x1: 185, z0: -85, z1: 95, w: 2048, h: 1024 };
export const maskTex = (list: Island[]) => {
  const { x0, x1, z0, z1, w, h } = MASK, kx = w / (x1 - x0), kz = h / (z1 - z0);
  const layer = (draw: (g: CanvasRenderingContext2D) => void, blur: number) => {
    const cv = document.createElement("canvas"); cv.width = w; cv.height = h;
    const g = cv.getContext("2d")!;
    g.fillStyle = "#000"; g.fillRect(0, 0, w, h);
    g.filter = `blur(${blur}px)`;
    g.setTransform(kx, 0, 0, kz, -x0 * kx, -z0 * kz);
    draw(g);
    return g.getImageData(0, 0, w, h).data;
  };
  const path = (g: CanvasRenderingContext2D, p: P2[]) => { g.beginPath(); p.forEach((q, i) => (i ? g.lineTo(q[0], q[1]) : g.moveTo(q[0], q[1]))); g.closePath(); };
  // R: foam line just outside the waterline; G: turquoise shallows (~2 m); B: broad lagoon tint (~7 m)
  const R = layer((g) => { g.strokeStyle = "#fff"; g.lineWidth = 0.55; for (const is of list) { path(g, offset(is.poly, area(is.poly) > 0 ? 0.55 : -0.55)); g.stroke(); } }, 1.2);
  const Gc = layer((g) => { g.fillStyle = "#fff"; for (const is of list) { path(g, offset(is.poly, area(is.poly) > 0 ? 1.4 : -1.4)); g.fill(); } }, 9);
  const B = layer((g) => { g.fillStyle = "#fff"; for (const is of list) { path(g, offset(is.poly, area(is.poly) > 0 ? 3.5 : -3.5)); g.fill(); } }, 34);
  const data = new Uint8Array(w * h * 4);
  for (let i = 0; i < w * h; i++) { data[i * 4] = R[i * 4]; data[i * 4 + 1] = Gc[i * 4]; data[i * 4 + 2] = B[i * 4]; data[i * 4 + 3] = 255; }
  const t = new THREE.DataTexture(data, w, h, THREE.RGBAFormat);
  t.colorSpace = THREE.NoColorSpace; t.magFilter = THREE.LinearFilter; t.minFilter = THREE.LinearMipmapLinearFilter; t.generateMipmaps = true;
  t.anisotropy = 16; t.flipY = false; t.needsUpdate = true;
  return t;
};
