// Shared 3D build for the style exploration: the crash-test dummy mascot as a real 3D figure (segmented yellow body,
// grey joint balls, black/yellow quadrant targets, "07") and a small street set (curb, parked car, lamp post, hydrant,
// row of house fronts). Every surface asks the style for its material through mat(role, colour, map?), so one build
// serves the clay, vinyl-toy and cel-shaded looks; each style only changes materials, lights and post.
import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";

export type MatFn = (role: string, color: string, map?: THREE.Texture | null) => THREE.Material;
const V = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);

// ---------------- canvas textures ----------------
export const canvasTex = (w: number, h: number, draw: (g: CanvasRenderingContext2D) => void, srgb = true, rep: [number, number] = [1, 1]) => {
  const c = document.createElement("canvas"); c.width = w; c.height = h;
  draw(c.getContext("2d")!);
  const t = new THREE.CanvasTexture(c);
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  if (rep[0] !== 1 || rep[1] !== 1) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(rep[0], rep[1]); }
  return t;
};
let seedN = 7;
export const rand = () => { seedN = (seedN * 16807) % 2147483647; return (seedN - 1) / 2147483646; };
export const resetRand = (s = 7) => { seedN = s; };

/** quadrant crash-test target (transparent outside the disc) */
export const targetTex = () => canvasTex(256, 256, (g) => {
  g.fillStyle = "#f7cd36"; g.beginPath(); g.arc(128, 128, 120, 0, Math.PI * 2); g.fill();
  g.fillStyle = "#151318";
  for (const a of [0, Math.PI]) { g.beginPath(); g.moveTo(128, 128); g.arc(128, 128, 120, a, a + Math.PI / 2); g.closePath(); g.fill(); }
  g.lineWidth = 12; g.strokeStyle = "#151318"; g.beginPath(); g.arc(128, 128, 116, 0, Math.PI * 2); g.stroke();
});
export const numberTex = (txt = "07", col = "#151318") => canvasTex(256, 160, (g) => {
  g.font = `900 140px "Arial Black", Arial, sans-serif`; g.textAlign = "center"; g.textBaseline = "middle"; g.fillStyle = col;
  g.fillText(txt, 128, 86);
});
export const asphaltTex = (base = "#55565e") => canvasTex(512, 512, (g) => {
  g.fillStyle = base; g.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 9000; i++) { const v = rand(); g.fillStyle = v < 0.5 ? "rgba(0,0,0,0.18)" : "rgba(255,255,255,0.12)"; g.fillRect(rand() * 512, rand() * 512, 2, 2); }
  for (let i = 0; i < 6; i++) { g.strokeStyle = "rgba(20,20,26,0.35)"; g.lineWidth = 2; g.beginPath(); let x = rand() * 512, y = rand() * 512; g.moveTo(x, y); for (let k = 0; k < 6; k++) { x += (rand() - 0.5) * 60; y += rand() * 40; g.lineTo(x, y); } g.stroke(); }
}, true, [6, 6]);
export const tileTex = (base = "#c9c1b4", line = "#9c9387") => canvasTex(512, 512, (g) => {
  g.fillStyle = base; g.fillRect(0, 0, 512, 512);
  for (let y = 0; y < 4; y++) for (let x = 0; x < 4; x++) {
    const k = 0.92 + rand() * 0.14;
    g.fillStyle = `rgba(${k > 1 ? 255 : 0},${k > 1 ? 255 : 0},${k > 1 ? 255 : 0},${Math.abs(k - 1) * 1.2})`;
    g.fillRect(x * 128 + 3, y * 128 + 3, 122, 122);
  }
  for (let i = 0; i < 4000; i++) { g.fillStyle = rand() < 0.5 ? "rgba(0,0,0,0.08)" : "rgba(255,255,255,0.1)"; g.fillRect(rand() * 512, rand() * 512, 2, 2); }
  g.strokeStyle = line; g.lineWidth = 6;
  for (let i = 0; i <= 4; i++) { g.beginPath(); g.moveTo(i * 128, 0); g.lineTo(i * 128, 512); g.stroke(); g.beginPath(); g.moveTo(0, i * 128); g.lineTo(512, i * 128); g.stroke(); }
}, true, [8, 8]);
export const brickTex = (base: string, mortar = "#e8dccb") => canvasTex(512, 512, (g) => {
  g.fillStyle = mortar; g.fillRect(0, 0, 512, 512);
  const bh = 32, bw = 96;
  for (let r = 0; r < 512 / bh; r++) for (let c = -1; c < 512 / bw + 1; c++) {
    const x = c * bw + (r % 2) * bw / 2, k = 0.85 + rand() * 0.3;
    const n = parseInt(base.slice(1), 16), ch = (s: number) => Math.min(255, Math.round(((n >> s) & 255) * k));
    g.fillStyle = `rgb(${ch(16)},${ch(8)},${ch(0)})`; g.fillRect(x + 3, r * bh + 3, bw - 6, bh - 6);
  }
}, true, [2, 3]);
/** grey-scale bump noise: soft blotches (thumbprints in clay, fibres in paper) */
export const bumpTex = (kind: "thumb" | "fibre" | "fine", rep = 2) => canvasTex(512, 512, (g) => {
  g.fillStyle = "#808080"; g.fillRect(0, 0, 512, 512);
  if (kind === "thumb") {
    for (let i = 0; i < 160; i++) {
      const x = rand() * 512, y = rand() * 512, r = 22 + rand() * 20;
      for (let k = 0; k < 5; k++) { g.strokeStyle = `rgba(${rand() < 0.5 ? 0 : 255},${rand() < 0.5 ? 0 : 255},${rand() < 0.5 ? 0 : 255},0.10)`; g.lineWidth = 2; g.beginPath(); g.ellipse(x, y, Math.max(1, r - k * 4), Math.max(1, (r - k * 4) * 0.7), rand() * 3, 0, Math.PI * 2); g.stroke(); }
      const gr = g.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, "rgba(0,0,0,0.12)"); gr.addColorStop(1, "rgba(0,0,0,0)");
      g.fillStyle = gr; g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill();
    }
  } else if (kind === "fibre") {
    for (let i = 0; i < 2600; i++) { const x = rand() * 512, y = rand() * 512, a = rand() * Math.PI, l = 4 + rand() * 14; g.strokeStyle = `rgba(${rand() < 0.5 ? 0 : 255},${rand() < 0.5 ? 0 : 255},${rand() < 0.5 ? 0 : 255},0.18)`; g.lineWidth = 1; g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l); g.stroke(); }
    for (let i = 0; i < 6000; i++) { g.fillStyle = `rgba(0,0,0,${rand() * 0.08})`; g.fillRect(rand() * 512, rand() * 512, 2, 2); }
  } else for (let i = 0; i < 9000; i++) { g.fillStyle = `rgba(${rand() < 0.5 ? 0 : 255},${rand() < 0.5 ? 0 : 255},${rand() < 0.5 ? 0 : 255},0.12)`; g.fillRect(rand() * 512, rand() * 512, 3, 3); }
}, false, [rep, rep]);

// ---------------- geometry helpers ----------------
/** capsule from a to b (radius r) */
export const limb = (m: THREE.Material, a: THREE.Vector3, b: THREE.Vector3, r: number, wobble = 0) => {
  const d = b.clone().sub(a), len = d.length();
  const g = new THREE.CapsuleGeometry(r, Math.max(0.001, len), 8, 20);
  if (wobble) jitter(g, wobble);
  const mesh = new THREE.Mesh(g, m);
  mesh.position.copy(a).add(b).multiplyScalar(0.5);
  mesh.quaternion.setFromUnitVectors(V(0, 1, 0), d.normalize());
  return mesh;
};
/** low-frequency vertex wobble (hand-made imperfection); keeps shared vertices together (position-keyed) */
export const jitter = (g: THREE.BufferGeometry, amt: number, seed = 1) => {
  const p = g.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
    const n = Math.sin(x * 9.1 + seed) * Math.cos(y * 7.3 + seed * 2) + 0.6 * Math.sin(z * 11.7 + y * 5.1 + seed * 3);
    const l = Math.hypot(x, y, z) || 1;
    p.setXYZ(i, x + (x / l) * n * amt, y + (y / l) * n * amt, z + (z / l) * n * amt);
  }
  g.computeVertexNormals();
  return g;
};
const at = <T extends THREE.Object3D>(o: T, p: THREE.Vector3) => { o.position.copy(p); return o; };
const ball = (m: THREE.Material, p: THREE.Vector3, r: number, seg = 24) => { const s = new THREE.Mesh(new THREE.SphereGeometry(r, seg, seg * 0.75), m); s.position.copy(p); return s; };
const rbox = (m: THREE.Material, w: number, h: number, d: number, r: number, p: THREE.Vector3) => {
  const b = new THREE.Mesh(new RoundedBoxGeometry(w, h, d, 4, Math.min(r, w / 2, h / 2, d / 2)), m); b.position.copy(p); return b;
};
const decal = (m: THREE.Material, w: number, h: number, p: THREE.Vector3, normal: THREE.Vector3) => {
  const q = new THREE.Mesh(new THREE.PlaneGeometry(w, h), m);
  q.position.copy(p); q.lookAt(p.clone().add(normal));
  return q;
};

// ---------------- the dummy ----------------
export type DummyOpts = { panic: boolean; wobble?: number; bigFace?: number };
export const HEAD_C = V(0, 1.43, 0), HEAD_R = 0.215, HEAD_S = V(1, 1.05, 0.96);
/** point on the head surface: yaw (deg, + = screen right), pitch (deg, + = up), extra = push along the normal */
export const onHead = (yaw: number, pitch: number, extra = 0) => {
  const y = THREE.MathUtils.degToRad(yaw), p = THREE.MathUtils.degToRad(pitch);
  const n = V(Math.sin(y) * Math.cos(p), Math.sin(p), Math.cos(y) * Math.cos(p));
  const pos = HEAD_C.clone().add(V(n.x * HEAD_R * HEAD_S.x, n.y * HEAD_R * HEAD_S.y, n.z * HEAD_R * HEAD_S.z)).addScaledVector(n, extra);
  return { pos, n };
};

export const buildDummy = (mat: MatFn, o: DummyOpts) => {
  const G = new THREE.Group(), w = o.wobble ?? 0, panic = o.panic, fk = o.bigFace ?? 1;
  const Y = mat("dummy", "#f2b630"), Yd = mat("dummyDark", "#dc9a2c"), J = mat("joint", "#45444e"), Jh = mat("jointHi", "#6d6c78");
  const add = (m: THREE.Object3D) => { m.castShadow = true; m.receiveShadow = true; G.add(m); return m; };
  // head + neck
  const hg = new THREE.SphereGeometry(HEAD_R, 48, 36); if (w) jitter(hg, w * 1.2, 3);
  const head = new THREE.Mesh(hg, Y); head.position.copy(HEAD_C); head.scale.copy(HEAD_S); add(head);
  add(limb(J, V(0, 1.12, 0), V(0, 1.24, 0), 0.06, w));
  add(new THREE.Mesh(new THREE.TorusGeometry(0.062, 0.012, 8, 24), Jh)).position.set(0, 1.18, 0);
  (G.children[G.children.length - 1] as THREE.Mesh).rotation.x = Math.PI / 2;
  // ear bolts + jaw seam rings on the head sides
  for (const s of [-1, 1]) {
    const e = onHead(s * 90, -5, -0.005);
    const bolt = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.03, 20), J); bolt.position.copy(e.pos);
    bolt.quaternion.setFromUnitVectors(V(0, 1, 0), e.n); add(bolt);
  }
  // chest (capsule), seam ring, abdomen rings, pelvis
  const chest = new THREE.Mesh(jitter(new THREE.CapsuleGeometry(0.185, 0.12, 10, 28), w, 5), Y);
  chest.position.set(0, 0.92, 0); chest.scale.set(1.18, 1, 0.84); add(chest);
  const seam = new THREE.Mesh(new THREE.TorusGeometry(0.186, 0.009, 8, 40), J);
  seam.position.set(0, 0.86, 0); seam.rotation.x = Math.PI / 2; seam.scale.set(1.18, 0.84, 1); add(seam);
  for (const [y, r] of [[0.68, 0.158], [0.6, 0.15]] as const) {
    const ring = new THREE.Mesh(jitter(new THREE.CylinderGeometry(r, r * 0.97, 0.07, 32, 2), w, 6), Yd);
    ring.position.set(0, y, 0); ring.scale.set(1.12, 1, 0.84); add(ring);
    const gap = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.94, r * 0.94, 0.012, 32), J); gap.position.set(0, y + 0.041, 0); gap.scale.set(1.12, 1, 0.84); add(gap);
  }
  add(rbox(J, 0.34, 0.13, 0.22, 0.05, V(0, 0.5, 0)));
  // markers: chest target + "07", head-side targets
  const tgt = mat("marker", "#ffffff", targetTex()), num = mat("number", "#ffffff", numberTex());
  add(decal(tgt, 0.12, 0.12, V(-0.085, 1.0, 0.152), V(-0.25, 0.1, 1).normalize()));
  add(decal(num, 0.13, 0.081, V(0.088, 1.0, 0.153), V(0.25, 0.1, 1).normalize()));
  for (const s of [-1, 1]) { const h = onHead(s * 50, 30, 0.003); add(decal(tgt, 0.1, 0.1, h.pos, h.n)); }
  // limbs
  const sh = [V(-0.245, 1.08, 0), V(0.245, 1.08, 0)];
  const arm = panic
    ? [[V(-0.4, 1.24, 0.06), V(-0.46, 1.52, 0.1)], [V(0.42, 1.18, 0.08), V(0.5, 1.42, 0.12)]]
    : [[V(-0.3, 0.82, 0.02), V(-0.32, 0.6, 0.06)], [V(0.3, 0.82, 0.02), V(0.32, 0.6, 0.06)]];
  sh.forEach((S, i) => {
    const [E, H] = arm[i];
    add(limb(Y, S, E, 0.052, w)); add(limb(Y, E, H, 0.047, w));
    add(ball(J, S, 0.07)); add(ball(J, E, 0.056)); add(ball(J, H, 0.062));
  });
  const legs = panic
    ? [[V(-0.1, 0.46, 0), V(-0.065, 0.27, 0.07), V(-0.23, 0.09, 0.02)], [V(0.1, 0.46, 0), V(0.065, 0.27, 0.07), V(0.23, 0.09, 0.02)]]
    : [[V(-0.1, 0.46, 0), V(-0.11, 0.27, 0.02), V(-0.11, 0.09, 0)], [V(0.1, 0.46, 0), V(0.11, 0.27, 0.02), V(0.11, 0.09, 0)]];
  for (const [Hp, K, A] of legs) {
    add(limb(Y, Hp, K, 0.058, w)); add(limb(Y, K, A, 0.052, w));
    add(ball(J, Hp, 0.06)); add(ball(J, K, 0.058));
    add(rbox(mat("shoe", "#2c2a33"), 0.12, 0.08, 0.22, 0.035, V(A.x * 1.05, 0.045, A.z + 0.045)));
  }
  // ---- face: protruding eye balls, pupils, lids (calm), brows, mouth ----
  const white = mat("eyeWhite", "#fbfaf6"), black = mat("pupil", "#141216"), brow = mat("brow", "#211a20"), mouthM = mat("mouth", "#5c1a26");
  const er = (panic ? 0.062 : 0.05) * fk;
  for (const s of [-1, 1]) {
    const e = onHead(s * 19 * Math.min(1.12, fk), 9, -er * 0.45);
    add(ball(white, e.pos, er, 28));
    const pr = (panic ? 0.019 : 0.024) * fk;
    add(ball(black, e.pos.clone().addScaledVector(e.n, er * 0.93), pr, 16));
    if (!panic) { // heavy upper lid: a head-coloured half shell over the top of the eye
      const lid = new THREE.Mesh(new THREE.SphereGeometry(er * 1.1, 28, 14, 0, Math.PI * 2, 0, Math.PI * 0.45), Y);
      lid.position.copy(e.pos); lid.quaternion.setFromUnitVectors(V(0, 1, 0), V(0, 0.82, 0.57).normalize()); add(lid);
      const lash = new THREE.Mesh(new THREE.TorusGeometry(er * 1.02, 0.009 * fk, 8, 28, Math.PI), brow);
      lash.position.copy(e.pos).addScaledVector(V(0, 0.82, 0.57).normalize(), er * 0.1);
      lash.lookAt(lash.position.clone().add(V(0, -0.57, 0.82))); lash.rotateZ(0); add(lash);
    }
    // brows: calm level and low, panic high and tilted up at the inner end
    const b = onHead(s * 19 * Math.min(1.12, fk), panic ? 37 : 27, 0.006);
    const half = 0.045 * fk, tilt = panic ? 0.32 : -0.06;
    const dir = V(Math.cos(tilt), s * Math.sin(tilt) * -1, 0).multiplyScalar(half);
    add(limb(brow, b.pos.clone().sub(dir).add(V(0, 0, 0)), b.pos.clone().add(dir), 0.013 * fk));
  }
  if (panic) {
    const m = onHead(0, -27, -0.02);
    const om = new THREE.Mesh(new THREE.SphereGeometry(1, 28, 20), mouthM);
    om.position.copy(m.pos); om.scale.set(0.05 * fk, 0.062 * fk, 0.03); om.lookAt(m.pos.clone().add(m.n)); add(om);
    const tongue = new THREE.Mesh(new THREE.SphereGeometry(1, 20, 14), mat("tongue", "#e46a74"));
    tongue.position.copy(m.pos).add(V(0, -0.032 * fk, 0.012)); tongue.scale.set(0.03 * fk, 0.018 * fk, 0.02); add(tongue);
    // sweat drops
    for (const [x, y, z, s] of [[-0.29, 1.58, 0.05, 1], [0.3, 1.52, 0.04, 0.85], [-0.27, 1.36, 0.1, 0.7]] as const) {
      const d = new THREE.Group();
      const sm = mat("sweat", "#8fd2ff");
      d.add(ball(sm, V(0, 0, 0), 0.026 * s, 16));
      const c = new THREE.Mesh(new THREE.ConeGeometry(0.025 * s, 0.05 * s, 16), sm); c.position.y = 0.03 * s; d.add(c);
      d.position.set(x, y, z); d.rotation.z = Math.sign(x) * 0.5; add(d);
    }
  } else {
    const m = onHead(0, -26, 0.004);
    const a = m.pos.clone().add(V(-0.045 * fk, 0.004, 0)), b = m.pos.clone().add(V(0.045 * fk, -0.004, 0));
    add(limb(brow, a, b, 0.011 * fk));
  }
  return G;
};

// ---------------- the street ----------------
export const SIDEWALK_Y = 0.15;
export const buildStreet = (mat: MatFn, o: { wobble?: number; textured?: boolean } = {}) => {
  resetRand(11);
  const G = new THREE.Group(), w = o.wobble ?? 0, tx = o.textured ?? true;
  const add = (m: THREE.Object3D, shadow = true) => { m.castShadow = shadow; m.receiveShadow = true; G.add(m); return m; };
  // road, near sidewalk + curb, far sidewalk
  const road = new THREE.Mesh(new THREE.PlaneGeometry(60, 12), mat("asphalt", "#55565e", tx ? asphaltTex() : null));
  road.rotation.x = -Math.PI / 2; road.position.set(0, 0, -6.8); add(road, false);
  for (let x = -20; x < 20; x += 3) add(rbox(mat("roadLine", "#f2ead2"), 1.6, 0.01, 0.14, 0.004, V(x, 0.005, -5.6)), false);
  const walk = new THREE.Mesh(new THREE.BoxGeometry(60, SIDEWALK_Y, 8), mat("sidewalk", "#c9c1b4", tx ? tileTex() : null));
  walk.position.set(0, SIDEWALK_Y / 2, 3.2); add(walk, false);
  add(rbox(mat("curb", "#b9b3aa"), 60, SIDEWALK_Y + 0.02, 0.2, 0.04, V(0, (SIDEWALK_Y + 0.02) / 2, -0.85)), false);
  const far = new THREE.Mesh(new THREE.BoxGeometry(60, SIDEWALK_Y, 3), mat("sidewalk", "#c9c1b4", tx ? tileTex() : null)); far.position.set(0, SIDEWALK_Y / 2, -14); add(far, false);
  // house fronts across the road
  const walls = ["#c96a4a", "#e6c27a", "#7fa7c9", "#d98ca0", "#9bbf7a", "#e8dcc4"];
  let x = -14;
  for (let i = 0; x < 14; i++) {
    const wd = 3.6 + rand() * 1.6, h = 6 + rand() * 3.5, col = walls[i % walls.length];
    const wall = mat(`wall${i % walls.length}`, col, tx && i % 3 === 0 ? brickTex(col) : null);
    add(rbox(wall, wd, h, 3, 0.06, V(x + wd / 2, h / 2, -17)));
    add(rbox(mat("cornice", "#f3eee4"), wd + 0.1, 0.25, 3.2, 0.05, V(x + wd / 2, h, -17)));
    const cols = Math.max(2, Math.floor(wd / 1.3));
    for (let fl = 0; fl < Math.floor((h - 1.5) / 2); fl++) for (let c = 0; c < cols; c++) {
      const wx = x + (wd * (c + 0.5)) / cols, wy = 2.4 + fl * 2;
      if (fl === 0 && c === Math.floor(cols / 2)) { add(rbox(mat("door", "#5a3c2c"), 0.9, 1.9, 0.1, 0.03, V(wx, 1.1, -15.47))); continue; }
      add(rbox(mat("frame", "#f4f0e8"), 0.84, 1.14, 0.08, 0.02, V(wx, wy, -15.47)));
      add(rbox(mat("window", "#3a5070"), 0.68, 0.98, 0.1, 0.01, V(wx, wy, -15.45)));
      add(rbox(mat("frame", "#f4f0e8"), 0.9, 0.08, 0.2, 0.02, V(wx, wy - 0.6, -15.42)));
    }
    x += wd + 0.05;
  }
  // parked car behind the dummy (left)
  const car = new THREE.Group();
  const body = mat("car", "#d8483a"), trim = mat("carTrim", "#e9e6e0"), glass = mat("glass", "#9cc3dc"), tire = mat("tire", "#25242a");
  const cb = new THREE.Mesh(jitter(new RoundedBoxGeometry(3.7, 0.62, 1.7, 5, 0.22), w, 2), body); cb.position.set(0, 0.62, 0); car.add(cb);
  const cab = new THREE.Mesh(jitter(new RoundedBoxGeometry(2.0, 0.62, 1.5, 5, 0.22), w, 3), body); cab.position.set(-0.15, 1.18, 0); car.add(cab);
  for (const z of [-0.752, 0.752]) {
    const win = new THREE.Mesh(new RoundedBoxGeometry(1.7, 0.42, 0.02, 3, 0.008), glass); win.position.set(-0.15, 1.21, z); car.add(win);
    const pil = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.44, 0.04), body); pil.position.set(-0.12, 1.21, z); car.add(pil);
  }
  for (const xx of [-1.16, 1.16]) {
    const ws = new THREE.Mesh(new RoundedBoxGeometry(0.02, 0.42, 1.3, 3, 0.008), glass); ws.position.set(xx * 0.71 - 0.15 + Math.sign(xx) * -0.01, 1.2, 0); car.add(ws);
  }
  for (const xx of [-1.2, 1.2]) for (const z of [-0.78, 0.78]) {
    const t = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.34, 0.26, 28), tire); t.rotation.x = Math.PI / 2; t.position.set(xx, 0.34, z); car.add(t);
    const hb = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.17, 0.28, 20), trim); hb.rotation.x = Math.PI / 2; hb.position.set(xx, 0.34, z); car.add(hb);
  }
  for (const xx of [-1.86, 1.86]) {
    car.add(at(new THREE.Mesh(new RoundedBoxGeometry(0.12, 0.16, 1.6, 3, 0.05), trim), V(xx, 0.42, 0)));
    for (const z of [-0.55, 0.55]) car.add(at(new THREE.Mesh(new THREE.SphereGeometry(0.1, 16, 12), mat(xx > 0 ? "lampGlass" : "tail", xx > 0 ? "#fff2c0" : "#ff6a50")), V(xx, 0.7, z)));
  }
  car.traverse((m) => { m.castShadow = true; m.receiveShadow = true; });
  car.position.set(-2.3, 0, -2.6); car.rotation.y = 0.04; G.add(car);
  // lamp post on the curb (right)
  const lampM = mat("lamp", "#2f5a4a");
  add(limb(lampM, V(1.55, 0.1, -0.55), V(1.55, 3.6, -0.55), 0.055, w));
  add(rbox(lampM, 0.3, 0.4, 0.3, 0.06, V(1.55, 0.2 + SIDEWALK_Y, -0.55)));
  add(limb(lampM, V(1.55, 3.55, -0.55), V(1.2, 3.75, -0.55), 0.035, w));
  add(ball(mat("lampGlass", "#fff2c0"), V(1.12, 3.62, -0.55), 0.16));
  add(new THREE.Mesh(new THREE.ConeGeometry(0.24, 0.18, 20), lampM)).position.set(1.12, 3.8, -0.55);
  // fire hydrant (left of the dummy)
  const hy = mat("hydrant", "#d8402f");
  add(limb(hy, V(-0.85, SIDEWALK_Y, -0.45), V(-0.85, SIDEWALK_Y + 0.5, -0.45), 0.09, w));
  add(ball(hy, V(-0.85, SIDEWALK_Y + 0.62, -0.45), 0.1));
  add(limb(hy, V(-1.0, SIDEWALK_Y + 0.42, -0.45), V(-0.7, SIDEWALK_Y + 0.42, -0.45), 0.045, w));
  add(rbox(hy, 0.3, 0.06, 0.3, 0.02, V(-0.85, SIDEWALK_Y + 0.03, -0.45)));
  return G;
};

/** vertical sky gradient as a screen-space scene background */
export const skyTex = (top: string, bottom: string) => canvasTex(16, 512, (g) => {
  const gr = g.createLinearGradient(0, 0, 0, 512); gr.addColorStop(0, top); gr.addColorStop(1, bottom); g.fillStyle = gr; g.fillRect(0, 0, 16, 512);
});
