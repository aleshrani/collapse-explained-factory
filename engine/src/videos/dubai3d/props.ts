// Static and animated props of the World short: mainland + generic skyline (no landmark copies), resort island
// (hotel, villas, palms, wire-less utility poles, diesel generator, jetty), palms on the sandbar and on some map
// islands, and the dredger with its rainbow sand jet (rebuilt every frame). Everything is two-tone lit (shade.ts)
// with painted maps; lit windows are emissive maps driven per frame.
import * as THREE from "three";
import { Batch, V, quad, boxGeo, lam } from "./build";
import { twoTone } from "./shade";
import { rng, rep, beam, planksHD } from "./paint";
import { desertHD, towerTex, towerLit, hotelTex, villaTex, hullTex, superTex, genTex, barkTex, poleTex, jetTex, sandHD, plateTex } from "./paint2";
import { HOTEL, GEN, SANDBAR, SAND_Y, DREDGE, HEAD, NOZ, arcPt, V3, ARCH6 } from "./story";
import { Island } from "./islands";

const M4 = (x: number, y: number, z: number, yaw = 0, sx = 1, sy = 1, sz = 1) =>
  new THREE.Matrix4().compose(V(x, y, z), new THREE.Quaternion().setFromAxisAngle(V(0, 1, 0), yaw), V(sx, sy, sz));
const UB = new THREE.BoxGeometry(1, 1, 1);
const box = (b: Batch, m: THREE.Material, x0: number, x1: number, y0: number, y1: number, z0: number, z1: number, base?: THREE.Matrix4) => {
  const l = new THREE.Matrix4().compose(V((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2), new THREE.Quaternion(), V(x1 - x0, y1 - y0, z1 - z0));
  b.add(UB, m, base ? base.clone().multiply(l) : l);
};
const cyl = (b: Batch, m: THREE.Material, r0: number, r1: number, h: number, mat: THREE.Matrix4, seg = 12) =>
  b.add(new THREE.CylinderGeometry(r1, r0, h, seg).translate(0, h / 2, 0), m, mat);
const col = (key: string, c: string) => lam(key, () => ({ color: c }));
const plate = (key: string, c: string, k = 0.4) => lam("pl" + key, () => ({ map: rep(plateTex(c), 1 / k, 1 / k) }));

// ---------------- emissive materials (driven per frame) ----------------
export type Glow = { mat: THREE.MeshLambertMaterial; base: THREE.Color };
const glowMat = (key: string, map: THREE.Texture, emap: THREE.Texture, tint: string): Glow => {
  const mat = twoTone(new THREE.MeshLambertMaterial({ map, emissiveMap: emap, emissive: new THREE.Color(0, 0, 0) }));
  mat.name = key;
  return { mat, base: new THREE.Color(tint) };
};

// ---------------- mainland + skyline ----------------
export const SHORE_Z = -640;
export const buildMainland = (root: THREE.Object3D) => {
  const b = new Batch(), r = rng(2008);
  const ground = lam("desert", () => ({ map: rep(desertHD(), 1, 1) }));
  const q = (x0: number, x1: number, z0: number, z1: number, y: number, u: number, v: number) => quad(V(x0, y, z1), V(x1, y, z1), V(x1, y, z0), V(x0, y, z0), u, v);
  b.add(q(-3000, 3000, -4000, SHORE_Z - 14, 1.4, 150, 92), ground);
  b.add(quad(V(-3000, -1, SHORE_Z), V(3000, -1, SHORE_Z), V(3000, 1.4, SHORE_Z - 14), V(-3000, 1.4, SHORE_Z - 14), 600, 2), lam("beach", () => ({ map: rep(sandHD(), 1, 1) })));
  // promenade wall + palms row are too small to read at 300 m: a light seawall band instead
  box(b, col("seawall", "#e9dcc4"), -3000, 3000, 1.2, 2.2, SHORE_Z - 16, SHORE_Z - 13);
  const glows: Glow[] = [];
  const mats = [0, 1, 2, 3].map((k) => { const g = glowMat("tower" + k, rep(towerTex(k), 1, 0.5), rep(towerLit(k), 1, 0.5), "#ffcf8a"); glows.push(g); return g.mat; });
  const lowM = glows[3].mat;
  const tb = new Batch();
  const tower = (x: number, z: number, w: number, d: number, h: number, k: number, kind: number) => {
    const m = mats[k];
    if (kind === 0) tb.add(boxGeo(V(x - w / 2, 0, z - d / 2), V(x + w / 2, h, z + d / 2), 30), m);
    else if (kind === 1) { // stepped setbacks
      tb.add(boxGeo(V(x - w / 2, 0, z - d / 2), V(x + w / 2, h * 0.55, z + d / 2), 30), m);
      tb.add(boxGeo(V(x - w * 0.38, h * 0.55, z - d * 0.38), V(x + w * 0.38, h * 0.82, z + d * 0.38), 30), m);
      tb.add(boxGeo(V(x - w * 0.24, h * 0.82, z - d * 0.24), V(x + w * 0.24, h, z + d * 0.24), 30), m);
    } else if (kind === 2) { // round tower
      const g = new THREE.CylinderGeometry(w / 2, w / 2, h, 20, 1).translate(x, h / 2, z);
      const uv = g.attributes.uv as THREE.BufferAttribute;
      for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * (Math.PI * w) / 30, uv.getY(i) * h / 30);
      tb.add(g, m);
    } else { // slab with a slanted crown
      tb.add(boxGeo(V(x - w / 2, 0, z - d / 2), V(x + w / 2, h * 0.9, z + d / 2), 30), m);
      tb.add(boxGeo(V(x - w / 2, h * 0.9, z - d / 2), V(x + w / 2 - w * 0.5, h, z + d / 2), 30), m);
    }
    if (kind !== 2) for (let y = 12; y < h*.52; y += 14) {
      tb.add(boxGeo(V(x-w*.51,y,z-d*.51),V(x+w*.51,y+1.15,z+d*.51),18),plate("skyBand","#72869a",1));
    }
    if (h > 110 && r() < 0.6) cyl(tb, col("mast", "#d9dde4"), 0.5, 0.15, h * 0.12, M4(x, h, z), 6);
  };
  for (let i = 0; i < 70; i++) {
    const x = (r() - 0.5) * 1100, centre = Math.exp(-((x / 260) ** 2));
    const z = SHORE_Z - 40 - r() * 220, h = 30 + r() * 40 + centre * (30 + r() * 80);
    tower(x, z, 16 + r() * 14, 16 + r() * 12, h, Math.floor(r() * 3), Math.floor(r() * 4));
  }
  for (let i = 0; i < 90; i++) { // low-rise blocks along the shore
    const x = (r() - 0.5) * 1300, z = SHORE_Z - 22 - r() * 60, w = 12 + r() * 16, h = 10 + r() * 22;
    tb.add(boxGeo(V(x - w / 2, 0, z - 6), V(x + w / 2, h, z + 6), 30), lowM);
  }
  b.build(root, false);
  tb.build(root, false);
  return glows;
};

// ---------------- palms ----------------
const FROND = [[0.42, 0.78, 0.22], [0.34, 0.68, 0.2], [0.5, 0.84, 0.26]] as const;
export const palm = (b: Batch, x: number, y: number, z: number, h: number, seed: number) => {
  const r = rng(seed * 31 + 7), lean = r() * Math.PI * 2, lk = 0.08 + r() * 0.1;
  const pts = [0, 0.33, 0.66, 1].map((t) => V(x + Math.cos(lean) * lk * h * t * t, y + h * t, z + Math.sin(lean) * lk * h * t * t));
  const curve = new THREE.CatmullRomCurve3(pts);
  const trunk = new THREE.TubeGeometry(curve, 10, 0.17 * (h / 7), 7, false);
  const pos = trunk.attributes.position as THREE.BufferAttribute, uv = trunk.attributes.uv as THREE.BufferAttribute;
  for (let i = 0; i < pos.count; i++) { // taper toward the crown, rings every ~0.3 m
    const t = uv.getX(i), c = curve.getPoint(t), k = 1.25 - 0.45 * t;
    pos.setXYZ(i, c.x + (pos.getX(i) - c.x) * k, pos.getY(i), c.z + (pos.getZ(i) - c.z) * k);
    uv.setXY(i, uv.getY(i), (t * h) / 3);
  }
  trunk.computeVertexNormals();
  b.add(trunk, lam("palmBark", () => ({ map: barkTex() })));
  const top = pts[3];
  const n = 8 + Math.floor(r() * 3), frondM = lam("frond", () => ({ vertexColors: true, side: THREE.DoubleSide }));
  for (let k = 0; k < n; k++) {
    const a = (k / n) * Math.PI * 2 + r() * 0.4, up = 0.25 + r() * 0.45, L = h * (0.5 + r() * 0.12), N = 14;
    const dir = V(Math.cos(a), 0, Math.sin(a)), side = V(-Math.sin(a), 0, Math.cos(a));
    const p: number[] = [], c: number[] = [], idx: number[] = [];
    const [mr, mg, mb] = FROND[k % 3];
    const brown = r() < 0.15;
    for (let i = 0; i <= N; i++) {
      const s = i / N, along = L * s, drop = L * (up * s - (0.62 + up * 0.5) * s * s);
      const cpt = top.clone().addScaledVector(dir, along).add(V(0, drop + 0.1, 0));
      const w = L * 0.17 * Math.pow(Math.sin(Math.PI * Math.min(1, s * 1.08 + 0.04)), 0.7) * (i % 2 ? 1 : 0.5);
      const fold = 0.25 * w;
      for (const sg of [-1, 0, 1]) {
        const q = cpt.clone().addScaledVector(side, sg * w).add(V(0, sg === 0 ? fold : 0, 0));
        p.push(q.x, q.y, q.z);
        const lightK = sg === 0 ? 1.25 : 0.85, tip = brown ? s * 0.6 : s * 0.25;
        c.push((mr + tip * 0.5) * lightK, (mg - tip * 0.15) * lightK, mb * lightK);
      }
      if (i < N) { const o = i * 3; idx.push(o, o + 3, o + 4, o, o + 4, o + 1, o + 1, o + 4, o + 5, o + 1, o + 5, o + 2); }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(p, 3)); g.setAttribute("color", new THREE.Float32BufferAttribute(c, 3));
    g.setAttribute("uv", new THREE.Float32BufferAttribute(new Float32Array((p.length / 3) * 2), 2));
    g.setIndex(idx); g.computeVertexNormals();
    b.add(g, frondM);
  }
  const nut = col("coconut", "#6b4a2c");
  for (let k = 0; k < 3; k++) b.add(new THREE.SphereGeometry(0.13 * (h / 7), 8, 6), nut, M4(top.x + Math.cos(k * 2.1) * 0.18, top.y - 0.15, top.z + Math.sin(k * 2.1) * 0.18));
};

// ---------------- resort island ----------------
export const POLES: V3[] = [8, 2, -4, -10].map((dz, i) => [HOTEL[0] - 11 - (i % 2) * 0.4, SAND_Y, HOTEL[2] + dz]);
export const buildResort = (root: THREE.Object3D) => {
  const b = new Batch(), H = HOTEL, y = SAND_Y;
  const glows: Glow[] = [];
  // hotel block: 26 x 10 x 15 m, front facing +z
  const hg = glowMat("hotel", hotelTex(false), hotelTex(true), "#ffc77a"); glows.push(hg);
  const hx = H[0] + 4, hz = H[2] - 4, w = 10, d = 5, hh = 15;
  const hb = new Batch();
  hb.add(quad(V(hx - w, y, hz + d), V(hx + w, y, hz + d), V(hx + w, y + hh, hz + d), V(hx - w, y + hh, hz + d)), hg.mat);
  hb.add(quad(V(hx + w, y, hz - d), V(hx - w, y, hz - d), V(hx - w, y + hh, hz - d), V(hx + w, y + hh, hz - d)), hg.mat);
  hb.add(quad(V(hx - w, y, hz - d), V(hx - w, y, hz + d), V(hx - w, y + hh, hz + d), V(hx - w, y + hh, hz - d), 0.4, 1), hg.mat);
  hb.add(quad(V(hx + w, y, hz + d), V(hx + w, y, hz - d), V(hx + w, y + hh, hz - d), V(hx + w, y + hh, hz + d), 0.4, 1), hg.mat);
  hb.build(root);
  const white = col("render", "#f7f1e6"), terra = col("terra", "#c8693c");
  box(b, white, hx - w - 0.6, hx + w + 0.6, y + hh, y + hh + 0.5, hz - d - 0.6, hz + d + 0.6);       // roof slab
  box(b, terra, hx - 4, hx + 4, y + hh + 0.5, y + hh + 3.2, hz - 2.5, hz + 2.5);                      // rooftop stair house
  box(b, white, hx - 9, hx - 6, y + hh + 0.5, y + hh + 1.8, hz - 3, hz);                               // plant boxes
  for (const s of [-1, 1]) box(b, white, hx + s * (w + 0.1) - 0.3, hx + s * (w + 0.1) + 0.3, y, y + hh + 0.5, hz - d - 0.3, hz + d + 0.3); // corner fins
  box(b, col("canopy", "#2f6a7a"), hx - 4, hx + 4, y + 3.1, y + 3.4, hz + d, hz + d + 3);              // entrance canopy
  for (const s of [-1, 1]) cyl(b, white, 0.12, 0.12, 3.1, M4(hx + s * 3.7, y, hz + d + 2.8), 8);
  // pool in front (turquoise water slab with a white coping)
  box(b, white, hx + 4, hx + 12, y - 0.05, y + 0.12, hz + d + 2, hz + d + 6);
  box(b, col("pool", "#36c6d4"), hx + 4.4, hx + 11.6, y + 0.1, y + 0.13, hz + d + 2.4, hz + d + 5.6);
  // villas
  const vg = glowMat("villa", villaTex(false), villaTex(true), "#ffc77a"); glows.push(vg);
  for (const [dx, dz, yaw] of [[-8, -14, 0.4], [16, 5, -0.7], [10, 11.5, -0.25]] as const) {
    const m = M4(H[0] + dx, y, H[2] + dz, yaw), vw = 5, vd = 3.5, vh = 3.6;
    b.add(quad(V(-vw, 0, vd), V(vw, 0, vd), V(vw, vh, vd), V(-vw, vh, vd)), vg.mat, m);
    b.add(quad(V(vw, 0, -vd), V(-vw, 0, -vd), V(-vw, vh, -vd), V(vw, vh, -vd), 0.6, 1), vg.mat, m);
    b.add(quad(V(-vw, 0, -vd), V(-vw, 0, vd), V(-vw, vh, vd), V(-vw, vh, -vd), 0.35, 0.45), white, m);
    b.add(quad(V(vw, 0, vd), V(vw, 0, -vd), V(vw, vh, -vd), V(vw, vh, vd), 0.35, 0.45), white, m);
    box(b, white, -vw - 0.8, vw + 0.8, vh, vh + 0.35, -vd - 0.6, vd + 1.6, m);
    box(b, col("deckwood", "#b98256"), -vw, vw, -0.05, 0.12, vd, vd + 2.6, m);
  }
  // utility poles without cables
  const poleM = lam("pole", () => ({ map: poleTex() })), insM = col("insul", "#e9efe8");
  POLES.forEach(([x, py, z], i) => {
    const lean = (i % 2 ? 1 : -1) * 0.025, m = new THREE.Matrix4().compose(V(x, py, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(lean, 0, -lean * 0.6)), V(1, 1, 1));
    cyl(b, poleM, 0.17, 0.12, 9.2, m, 9);
    box(b, poleM, -1.25, 1.25, 8.2, 8.42, -0.1, 0.1, m);
    box(b, poleM, -0.7, 0.7, 7.3, 7.48, -0.08, 0.08, m);
    for (const dx of [-1.05, 0, 1.05]) cyl(b, insM, 0.08, 0.06, 0.32, m.clone().multiply(M4(dx, 8.42, 0)), 8);
    for (const dx of [-0.55, 0.55]) cyl(b, insM, 0.06, 0.05, 0.26, m.clone().multiply(M4(dx, 7.48, 0)), 8);
    if (i === 1) box(b, col("tfbox", "#8c9198"), 0.18, 0.72, 6.2, 7.0, -0.3, 0.3, m); // empty transformer can
  });
  // diesel generator + fuel drums
  const gm = lam("genset", () => ({ map: genTex() })), dark = col("gendark", "#3a3a3e");
  const gy = new THREE.Matrix4().compose(V(GEN[0], GEN[1], GEN[2]), new THREE.Quaternion().setFromAxisAngle(V(0, 1, 0), 0.35), V(1, 1, 1));
  box(b, dark, -1.9, 1.9, 0, 0.25, -1.0, 1.0, gy);
  b.add(quad(V(-1.6, 0.25, 0.8), V(1.6, 0.25, 0.8), V(1.6, 2.05, 0.8), V(-1.6, 2.05, 0.8)), gm, gy);
  b.add(quad(V(1.6, 0.25, -0.8), V(-1.6, 0.25, -0.8), V(-1.6, 2.05, -0.8), V(1.6, 2.05, -0.8)), gm, gy);
  box(b, col("genyel", "#d9a22c"), -1.6, -1.55, 0.25, 2.05, -0.8, 0.8, gy); box(b, col("genyel", "#d9a22c"), 1.55, 1.6, 0.25, 2.05, -0.8, 0.8, gy);
  box(b, col("genyel", "#d9a22c"), -1.7, 1.7, 2.05, 2.2, -0.9, 0.9, gy);
  cyl(b, dark, 0.13, 0.11, 2.3, gy.clone().multiply(M4(1.0, 2.2, 0.2)), 10);
  box(b, dark, 0.8, 1.2, 4.45, 4.52, 0.0, 0.4, gy);
  for (const [dx, dz, c] of [[-2.6, 0.4, "#2f5fa6"], [-2.6, -0.5, "#c8432f"], [-3.3, 0.0, "#2f5fa6"]] as const) cyl(b, col("drum" + c, c), 0.3, 0.3, 0.9, gy.clone().multiply(M4(dx, 0, dz)), 14);
  // jetty
  const wood = lam("jettyWood", () => ({ map: rep(planksHD(), 0.5, 0.5) }));
  const jm = M4(H[0] + 12, 0, H[2] + 12.5, -0.8);
  box(b, wood, -1.2, 1.2, 0.55, 0.75, 0, 14, jm);
  for (let k = 0; k <= 4; k++) for (const s of [-1, 1]) box(b, lam("beamW", () => ({ map: beam() })), s * 1.1 - 0.12, s * 1.1 + 0.12, -0.8, 1.4, k * 3.4 - 0.12, k * 3.4 + 0.12, jm);
  // palms: around the hotel and villas, two on the sandbar
  const palmsAt: [number, number, number][] = [[-15.5, 4, 7.5], [-14, -9, 8], [-1, -14, 7], [16, -9, 7.8], [17, 0, 7], [-4, 9.5, 6.8], [4, 15, 6.4], [14, 14, 6.6], [-12, 13, 5.8], [-16, -3, 6.2]];
  palmsAt.forEach(([dx, dz, h], i) => palm(b, H[0] + dx, y, H[2] + dz, h, i + 3));
  palm(b, SANDBAR[0] + 4.8, y, SANDBAR[2] - 1.6, 6.6, 51);
  palm(b, SANDBAR[0] - 5.5, y, SANDBAR[2] + 0.8, 5.4, 52);
  b.build(root);
  return glows;
};
/** palms on some green map islands */
export const buildIslandPalms = (root: THREE.Object3D, list: Island[]) => {
  const b = new Batch(), r = rng(99);
  let n = 0;
  for (const is of list) {
    if (is.kind !== "map" || !is.green || n > 46) continue;
    const k = r() < 0.5 ? 1 : 2;
    for (let i = 0; i < k; i++) { palm(b, is.c[0] + (r() - 0.5) * 2, SAND_Y + 0.15, is.c[1] + (r() - 0.5) * 2, 3.6 + r() * 1.6, is.id * 7 + i); n++; }
  }
  b.build(root);
};
/** keep anything out of the architect's spot (shot 6 sanity) */
export const ARCH6_CLEAR = ARCH6;

// ---------------- the dredger ----------------
export const buildDredger = (root: THREE.Object3D) => {
  const g = new THREE.Group();
  const yaw = Math.atan2(-HEAD[1], HEAD[0]);
  g.position.set(DREDGE[0], 0, DREDGE[2]); g.rotation.y = yaw;
  const b = new Batch();
  // hull: deck outline (x along the ship, bow +x) extruded down with a slight tumblehome
  const L = 16, B2 = 4.2, D = 4.0;
  const deck: [number, number][] = [[-L, -B2], [L - 5, -B2], [L - 1.5, -B2 * 0.55], [L + 0.6, 0], [L - 1.5, B2 * 0.55], [L - 5, B2], [-L, B2]];
  const keel = deck.map(([x, z]) => [x * 0.97, z * 0.86] as [number, number]);
  const hullM = lam("hull", () => ({ map: hullTex(), side: THREE.DoubleSide }));
  let u = 0;
  for (let i = 0; i < deck.length; i++) {
    const j = (i + 1) % deck.length, a = deck[i], c = deck[j], ka = keel[i], kc = keel[j];
    const len = Math.hypot(c[0] - a[0], c[1] - a[1]);
    b.add(quad(V(ka[0], -1.6, ka[1]), V(kc[0], -1.6, kc[1]), V(c[0], D, c[1]), V(a[0], D, a[1]), (u + len) / 32, 1, u / 32, 0), hullM);
    u += len;
  }
  const deckG = new THREE.ShapeGeometry(new THREE.Shape(deck.map(([x, z]) => new THREE.Vector2(x, -z))));
  deckG.rotateX(-Math.PI / 2); deckG.translate(0, D, 0);
  deckG.attributes.uv.array.forEach((_v, i, arr) => { (arr as Float32Array)[i] = (arr as Float32Array)[i] / 4; }); b.add(deckG, plate("deckRed", "#8f4b3c", 1));
  // hopper well with sand, hatch coamings, pipes
  box(b, plate("coam", "#e5e0d6"), -9, 6, D, D + 0.9, -3.0, 3.0);
  box(b, lam("hopSand", () => ({ map: rep(sandHD(), 2, 0.6) })), -8.6, 5.6, D + 0.9, D + 0.95, -2.6, 2.6);
  for (const s of [-1, 1]) { const p = new THREE.CylinderGeometry(0.32, 0.32, 18, 10); p.rotateZ(Math.PI / 2); b.add(p, col("pipe", "#d9d4c8"), M4(-1.5, D + 0.4, s * 3.55)); }
  // superstructure aft, funnel, mast
  const sup = lam("super", () => ({ map: superTex() }));
  box(b, sup, -15.5, -9.5, D, D + 3.2, -3.6, 3.6);
  box(b, sup, -14.8, -10.3, D + 3.2, D + 5.8, -3.0, 3.0);
  box(b, plate("bridgeRoof", "#e9e4da"), -15.2, -9.9, D + 5.8, D + 6.1, -4.4, 4.4);
  box(b, plate("funnelRed", "#c8432f"), -15.2, -13.4, D + 6.1, D + 8.6, -0.9, 0.9);
  box(b, col("funnelTop", "#26262a"), -15.25, -13.35, D + 8.6, D + 9.2, -0.95, 0.95);
  cyl(b, col("mastW", "#efeae0"), 0.12, 0.08, 4.5, M4(-11.5, D + 6.1, 0), 6);
  box(b, col("radar", "#3a3a40"), -12.3, -10.7, D + 9.6, D + 9.75, -0.12, 0.12);
  // forecastle + rainbow nozzle pedestal and pipe (pointing along the first part of the jet)
  box(b, plate("fcastle", "#e5e0d6"), L - 6.5, L - 1.2, D, D + 1.6, -2.4, 2.4);
  box(b, plate("pedestal", "#c8432f"), L - 2.6, L - 0.8, D + 1.6, D + 2.6, -0.8, 0.8);
  const n0 = arcPt(0), n1 = arcPt(0.04), dirW = V(n1[0] - n0[0], n1[1] - n0[1], n1[2] - n0[2]).normalize();
  const dirL = dirW.clone().applyAxisAngle(V(0, 1, 0), -yaw);
  const tipL = V(NOZ[0] - DREDGE[0], NOZ[1], NOZ[2] - DREDGE[2]).applyAxisAngle(V(0, 1, 0), -yaw);
  const pipeLen = 3.4, base = tipL.clone().addScaledVector(dirL, -pipeLen);
  const pg = new THREE.CylinderGeometry(0.26, 0.38, pipeLen, 12).translate(0, pipeLen / 2, 0);
  b.add(pg, col("nozzle", "#3c3f46"), new THREE.Matrix4().compose(base, new THREE.Quaternion().setFromUnitVectors(V(0, 1, 0), dirL), V(1, 1, 1)));
  // railings
  const rail = col("rail", "#f2efe8");
  for (const s of [-1, 1]) { box(b, rail, -9, L - 5, D + 1.0, D + 1.07, s * B2 - 0.05, s * B2 + 0.05); for (let x = -9; x < L - 5; x += 1.6) box(b, rail, x - 0.03, x + 0.03, D, D + 1.0, s * B2 - 0.03, s * B2 + 0.03); }
  b.build(g);
  root.add(g);
  return g;
};

/** the sand jet as a tube between u0 and u1 along arcPt, radius growing toward the landing; rebuilt every frame */
export class Jet {
  mesh: THREE.Mesh;
  private geo: THREE.BufferGeometry;
  private N = 48; private S = 10;
  tex: THREE.Texture;
  constructor(root: THREE.Object3D) {
    this.tex = jetTex();
    const mat = twoTone(new THREE.MeshLambertMaterial({ map: this.tex, color: 0xffffff, side: THREE.DoubleSide, emissive: new THREE.Color(0.5, 0.33, 0.16), emissiveMap: this.tex }));
    const n = (this.N + 1) * (this.S + 1);
    this.geo = new THREE.BufferGeometry();
    this.geo.setAttribute("position", new THREE.BufferAttribute(new Float32Array(n * 3), 3));
    this.geo.setAttribute("normal", new THREE.BufferAttribute(new Float32Array(n * 3), 3));
    this.geo.setAttribute("uv", new THREE.BufferAttribute(new Float32Array(n * 2), 2));
    const idx: number[] = [];
    for (let i = 0; i < this.N; i++) for (let k = 0; k < this.S; k++) {
      const a = i * (this.S + 1) + k, b = a + 1, c = a + this.S + 1, d = c + 1;
      idx.push(a, c, b, b, c, d);
    }
    this.geo.setIndex(idx);
    this.mesh = new THREE.Mesh(this.geo, mat);
    this.mesh.frustumCulled = false; this.mesh.castShadow = true; this.mesh.receiveShadow = false;
    root.add(this.mesh);
  }
  set(u0: number, u1: number, t: number, fall = 0) {
    this.mesh.visible = u1 - u0 > 0.01;
    if (!this.mesh.visible) return;
    const P = this.geo.attributes.position.array as Float32Array, Nn = this.geo.attributes.normal.array as Float32Array, UV = this.geo.attributes.uv.array as Float32Array;
    const up = V(0, 1, 0), p = V(0, 0, 0), q = V(0, 0, 0), tg = V(0, 0, 0), s1 = V(0, 0, 0), s2 = V(0, 0, 0);
    for (let i = 0; i <= this.N; i++) {
      const u = u0 + (u1 - u0) * (i / this.N);
      p.set(...arcPt(u)); q.set(...arcPt(Math.min(1, u + 0.01))); tg.copy(q).sub(p);
      if (u >= 0.99) tg.set(...arcPt(1)).sub(V(...arcPt(0.99)));
      tg.normalize();
      s1.crossVectors(tg, up).normalize(); s2.crossVectors(s1, tg).normalize();
      const rad = (0.42 + 1.5 * u ** 1.3 + 0.1 * Math.sin(u * 40 - t * 18)) * (1 - 0.6 * fall);
      for (let k = 0; k <= this.S; k++) {
        const a = (k / this.S) * Math.PI * 2, c = Math.cos(a), sn = Math.sin(a), o = (i * (this.S + 1) + k) * 3;
        const nx = s1.x * c + s2.x * sn, ny = s1.y * c + s2.y * sn, nz = s1.z * c + s2.z * sn;
        P[o] = p.x + nx * rad; P[o + 1] = Math.max(0.2, p.y - fall * fall * 9 * (1 - u * 0.7)) + ny * rad * 0.8; P[o + 2] = p.z + nz * rad;
        Nn[o] = nx; Nn[o + 1] = ny; Nn[o + 2] = nz;
        const ou = (i * (this.S + 1) + k) * 2; UV[ou] = k / this.S; UV[ou + 1] = u * 4 - t * 2.2;
      }
    }
    this.geo.attributes.position.needsUpdate = true; this.geo.attributes.normal.needsUpdate = true; this.geo.attributes.uv.needsUpdate = true;
  }
}
