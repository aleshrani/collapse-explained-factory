// Two mascot candidates as real 3D figures, built from primitives + decals so every style can re-material them:
//   YOLBO  - an egg: white egg body (no head), outline hull, big eyes + high brows, small mouth, floating cartoon gloves,
//            short yellow boots, red "07" supermarket stamp on the belly; panic adds a hairline crack and sweat. Beside him
//            an open pulp egg tray with three small replacement eggs peeking at him.
//   KREVVO - a ceramic arch: low, wide, asymmetric upside-down U whose thick ends are its legs (left thicker, right
//            turned out), short solid arms, glossy petrol glaze outside, apricot unglazed inside + feet + one chipped
//            corner; cream eyes with lids on the top, short black smile; panic adds a crack and a shard flying off.
import * as THREE from "three";
import { DecalGeometry } from "three/examples/jsm/geometries/DecalGeometry.js";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { MatFn, canvasTex, limb, jitter, rand, resetRand } from "../style_lab/core";

const V = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);
const smooth = (x: number) => { const u = Math.max(0, Math.min(1, x)); return u * u * (3 - 2 * u); };
const shadowAll = (g: THREE.Object3D) => g.traverse((o) => { if (o instanceof THREE.Mesh) { o.castShadow = true; o.receiveShadow = true; } });
const ball = (m: THREE.Material, p: THREE.Vector3, r: number) => { const s = new THREE.Mesh(new THREE.SphereGeometry(r, 28, 20), m); s.position.copy(p); return s; };

/** decal projected onto `target` (target and its parents must sit at identity world transform while building) */
const decalOn = (target: THREE.Mesh, m: THREE.Material, pos: THREE.Vector3, normal: THREE.Vector3, size: [number, number], spin = 0) => {
  target.updateMatrixWorld(true);
  const o = new THREE.Object3D(); o.position.copy(pos); o.lookAt(pos.clone().add(normal)); o.rotateZ(spin);
  const g = new DecalGeometry(target, pos, o.rotation, V(size[0], size[1], 0.3));
  const d = new THREE.Mesh(g, m); d.receiveShadow = true;
  return d;
};
export const decalMat = (map: THREE.Texture, rough = 0.6) =>
  new THREE.MeshStandardMaterial({ map, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -4, roughness: rough });

const stampTex = () => canvasTex(512, 256, (g) => {
  resetRand(21);
  g.strokeStyle = "#c4232c"; g.fillStyle = "#c4232c"; g.lineWidth = 14;
  g.beginPath(); g.roundRect(30, 30, 452, 196, 40); g.stroke();
  g.font = `900 170px "Arial Black", Arial, sans-serif`; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText("07", 256, 136);
  g.globalCompositeOperation = "destination-out";
  for (let i = 0; i < 900; i++) { g.fillStyle = `rgba(0,0,0,${0.3 + rand() * 0.7})`; g.fillRect(rand() * 512, rand() * 256, 2 + rand() * 4, 2 + rand() * 3); }
  g.globalAlpha = 0.35; g.fillRect(0, 180 + rand() * 30, 512, 14);
});
const crackTex = (seed = 3) => canvasTex(512, 512, (g) => {
  resetRand(seed);
  const run = (x: number, y: number, a: number, n: number, w: number) => {
    g.lineCap = "round"; g.lineJoin = "round";
    g.beginPath(); g.moveTo(x, y);
    for (let i = 0; i < n; i++) {
      a += (rand() - 0.5) * 1.3; x += Math.cos(a) * 30; y += Math.sin(a) * 30; g.lineTo(x, y);
      if (rand() < 0.22 && w > 3) { g.strokeStyle = "#2a1e22"; g.lineWidth = w; g.stroke(); run(x, y, a + (rand() < 0.5 ? 1 : -1) * 0.9, 3 + Math.floor(rand() * 3), w * 0.6); g.beginPath(); g.moveTo(x, y); }
    }
    g.strokeStyle = "#2a1e22"; g.lineWidth = w; g.stroke();
  };
  run(20, 250, 0, 17, 12);
});
const chipTex = () => canvasTex(256, 256, (g) => {
  resetRand(9);
  const pts: [number, number][] = [];
  for (let i = 0; i < 14; i++) { const a = (i / 14) * Math.PI * 2, r = 70 + rand() * 45; pts.push([128 + r * Math.cos(a), 128 + r * Math.sin(a) * 0.8]); }
  g.beginPath(); pts.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); g.closePath();
  g.fillStyle = "#e9a878"; g.fill();
  g.lineWidth = 8; g.strokeStyle = "#7c5a48"; g.stroke();
  g.lineWidth = 3; g.strokeStyle = "rgba(255,255,255,0.7)"; g.beginPath(); pts.slice(2, 7).forEach(([x, y], i) => (i ? g.lineTo(x + 6, y + 6) : g.moveTo(x + 6, y + 6))); g.stroke();
  for (let i = 0; i < 300; i++) { g.fillStyle = `rgba(120,70,40,${rand() * 0.25})`; g.fillRect(70 + rand() * 120, 70 + rand() * 120, 2, 2); }
});

const outline = (mesh: THREE.Mesh, w: number, col = "#2a2030") => {
  const m = new THREE.MeshBasicMaterial({ color: col, side: THREE.BackSide });
  m.onBeforeCompile = (sh) => { sh.vertexShader = sh.vertexShader.replace("#include <begin_vertex>", "vec3 transformed = position + normal * " + w.toFixed(4) + ";"); };
  const h = new THREE.Mesh(mesh.geometry, m); mesh.add(h); return h;
};
const sweat = (mat: MatFn, G: THREE.Group, drops: [number, number, number, number][]) => {
  const sm = mat("sweat", "#8fd2ff");
  for (const [x, y, z, s] of drops) {
    const d = new THREE.Group();
    d.add(ball(sm, V(0, 0, 0), 0.03 * s));
    const c = new THREE.Mesh(new THREE.ConeGeometry(0.029 * s, 0.06 * s, 16), sm); c.position.y = 0.036 * s; d.add(c);
    d.position.set(x, y, z); d.rotation.z = Math.sign(x) * 0.5; G.add(d);
  }
};

// ---------------- YOLBO ----------------
const EGG_H = 1.0, EGG_R = 0.37, EGG_K = 0.13, EGG_Y = 0.2 + EGG_H / 2;
const eggR = (y: number) => { const c = Math.max(-1, Math.min(1, -2 * y / EGG_H)), s = Math.sqrt(1 - c * c); return EGG_R * s * (1 + EGG_K * c); };
/** point + normal on the egg shell at height y (relative to the egg centre) and yaw (deg) */
const eggPt = (yaw: number, y: number, push = 0) => {
  const a = THREE.MathUtils.degToRad(yaw), r = eggR(y), dr = (eggR(y + 0.005) - eggR(y - 0.005)) / 0.01;
  const n = V(Math.sin(a), -dr, Math.cos(a)).normalize();
  return { pos: V(r * Math.sin(a), EGG_Y + y, r * Math.cos(a)).addScaledVector(n, push), n };
};
const glove = (mat: MatFn, up: boolean, side: number) => {
  const G = new THREE.Group(), W = mat("glove", "#fbfaf6"), L = mat("brow", "#2a2030");
  const palm = new THREE.Mesh(new THREE.SphereGeometry(1, 28, 20), W); palm.scale.set(0.085, 0.095, 0.05); G.add(palm);
  for (let i = 0; i < 3; i++) {
    const a = (i - 1) * 0.28 + (up ? 0 : 0), b = V(Math.sin(a) * 0.06 - 0.01 + i * 0.0, 0.07, 0), base = V((i - 1) * 0.042, 0.05, 0);
    G.add(limb(W, base, base.clone().add(b.multiplyScalar(up ? 1.25 : 1)), 0.024));
  }
  G.add(limb(W, V(side * 0.06, -0.01, 0.01), V(side * 0.12, 0.04, 0.02), 0.024));
  const cuff = new THREE.Mesh(new THREE.TorusGeometry(0.06, 0.026, 12, 28), W); cuff.rotation.x = Math.PI / 2; cuff.position.y = -0.09; G.add(cuff);
  const cuff2 = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.062, 0.05, 28), W); cuff2.position.y = -0.115; G.add(cuff2);
  for (const dx of [-0.025, 0, 0.025]) G.add(limb(L, V(dx, -0.02, -0.049), V(dx, 0.04, -0.047), 0.0045)); // back-of-hand seams
  for (const c of G.children) if (c instanceof THREE.Mesh && c.material === W) outline(c, 0.006);
  return G;
};
export const buildYolbo = (mat: MatFn, panic: boolean, opts: { wobble?: number; tray?: boolean } = {}) => {
  const G = new THREE.Group(), w = opts.wobble ?? 0;
  const SHELL = mat("shell", "#f6f2ea"), BOOT = mat("boot", "#f5c022"), white = mat("eyeWhite", "#fdfcf8"), black = mat("pupil", "#141216"), brow = mat("brow", "#2a2030");
  // shell
  const prof: THREE.Vector2[] = [];
  for (let i = 0; i <= 48; i++) { const th = (Math.PI * i) / 48, y = -Math.cos(th) * EGG_H / 2; prof.push(new THREE.Vector2(Math.max(0.0005, eggR(y)), y)); }
  const eg = new THREE.LatheGeometry(prof, 72); if (w) jitter(eg, w, 4);
  const egg = new THREE.Mesh(eg, SHELL); egg.position.y = EGG_Y; G.add(egg);
  outline(egg, 0.012);
  // boots
  for (const s of [-1, 1]) {
    const bt = new THREE.Group();
    const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.085, 0.095, 0.14, 28), BOOT); shaft.position.y = 0.15; bt.add(shaft);
    const toe = new THREE.Mesh(new RoundedBoxGeometry(0.19, 0.1, 0.27, 4, 0.045), BOOT); toe.position.set(0, 0.05, 0.05); bt.add(toe);
    const sole = new THREE.Mesh(new RoundedBoxGeometry(0.2, 0.03, 0.28, 3, 0.012), mat("bootSole", "#8a5a2a")); sole.position.set(0, 0.012, 0.05); bt.add(sole);
    const rim = new THREE.Mesh(new THREE.TorusGeometry(0.09, 0.016, 10, 28), BOOT); rim.rotation.x = Math.PI / 2; rim.position.y = 0.22; bt.add(rim);
    bt.position.set(s * 0.13, 0, 0); bt.rotation.y = s * (panic ? -0.35 : 0.15); G.add(bt);
  }
  // face
  const ew = panic ? 0.085 : 0.074, eh = panic ? 0.1 : 0.088;
  for (const s of [-1, 1]) {
    const e = eggPt(s * 17, 0.17, -0.03);
    const eye = new THREE.Mesh(new THREE.SphereGeometry(1, 32, 24), white); eye.scale.set(ew, eh, 0.05); eye.position.copy(e.pos); eye.lookAt(e.pos.clone().add(e.n)); G.add(eye);
    outline(eye, 0.006);
    const pp = e.pos.clone().addScaledVector(e.n, 0.045).add(V(-s * 0.008, panic ? 0 : -0.012, 0));
    G.add(ball(black, pp, panic ? 0.024 : 0.032));
    if (!panic) {
      const lid = new THREE.Mesh(new THREE.SphereGeometry(1, 32, 16, 0, Math.PI * 2, 0, Math.PI * 0.42), SHELL);
      lid.scale.set(ew * 1.08, eh * 1.08, 0.056); lid.position.copy(e.pos);
      lid.quaternion.setFromUnitVectors(V(0, 1, 0), V(0, 0.75, 0.66).normalize()); G.add(lid); outline(lid, 0.005);
    }
    const b = eggPt(s * 18, panic ? 0.355 : 0.31, 0.012);
    const half = 0.06, tilt = panic ? 0.35 : -0.12, dir = V(Math.cos(tilt), -s * Math.sin(tilt), 0).multiplyScalar(half);
    G.add(limb(brow, b.pos.clone().sub(dir), b.pos.clone().add(dir), 0.017));
  }
  const m = eggPt(0, 0.0, 0.0);
  if (panic) {
    const om = new THREE.Mesh(new THREE.SphereGeometry(1, 24, 18), mat("mouth", "#5c1a26")); om.scale.set(0.03, 0.04, 0.02); om.position.copy(m.pos); om.lookAt(m.pos.clone().add(m.n)); G.add(om);
  } else {
    const sm = new THREE.Mesh(new THREE.TorusGeometry(0.04, 0.009, 8, 24, Math.PI * 0.75), brow);
    sm.position.copy(m.pos).add(V(0, 0.028, 0.004)); sm.rotation.z = Math.PI + Math.PI * 0.125; G.add(sm);
  }
  // belly stamp + panic crack (decals onto the shell)
  const st = eggPt(-6, -0.2, 0); G.add(decalOn(egg, decalMat(stampTex(), 0.8), st.pos, st.n, [0.26, 0.13], 0.08));
  if (panic) { const c = eggPt(-22, 0.12, 0); G.add(decalOn(egg, decalMat(crackTex(), 0.8), c.pos, c.n, [0.62, 0.62], -0.35)); }
  // floating gloves
  const gl = [glove(mat, panic, -1), glove(mat, panic, 1)];
  if (panic) {
    gl[0].position.set(-0.5, 1.3, 0.12); gl[0].rotation.set(0, 0.2, 0.3);
    gl[1].position.set(0.5, 1.2, 0.14); gl[1].rotation.set(0, -0.2, -0.45);
  } else {
    gl[0].position.set(-0.5, 0.6, 0.06); gl[0].rotation.set(0.1, 0.5, Math.PI - 0.25);
    gl[1].position.set(0.5, 0.6, 0.06); gl[1].rotation.set(0.1, -0.5, Math.PI + 0.25);
  }
  G.add(...gl);
  if (panic) sweat(mat, G, [[-0.33, 1.42, 0.12, 1], [0.36, 1.36, 0.1, 0.9], [-0.42, 1.12, 0.14, 0.7]]);
  shadowAll(G);
  return G;
};
/** open pulp egg tray (2 x 6 cups) with three small eggs peeking at Yolbo; built at the origin */
export const eggTray = (mat: MatFn, lookX: number) => {
  const G = new THREE.Group(), P = mat("pulp", "#bcae96"), S = mat("shell", "#f6f2ea"), black = mat("pupil", "#141216");
  const base = new THREE.Mesh(jitter(new RoundedBoxGeometry(0.98, 0.09, 0.36, 3, 0.03), 0.004, 2), P); base.position.y = 0.045; G.add(base);
  const lid = new THREE.Mesh(jitter(new RoundedBoxGeometry(0.98, 0.03, 0.36, 3, 0.012), 0.004, 3), P);
  lid.geometry.translate(0, 0, -0.18); lid.position.set(0, 0.09, -0.18); lid.rotation.x = -1.95; G.add(lid);
  for (let i = 0; i < 6; i++) for (const z of [-0.085, 0.085]) {
    const cup = new THREE.Mesh(new THREE.CylinderGeometry(0.068, 0.05, 0.08, 18), P); cup.position.set(-0.4 + i * 0.16, 0.12, z); G.add(cup);
  }
  const small = (x: number, z: number, h: number, peek: number) => {
    const prof: THREE.Vector2[] = [];
    for (let i = 0; i <= 32; i++) { const th = (Math.PI * i) / 32, y = -Math.cos(th) * h / 2, c = Math.cos(th); prof.push(new THREE.Vector2(Math.max(0.0005, 0.37 * h * Math.sin(th) * (1 + 0.13 * c)), y)); }
    const e = new THREE.Mesh(new THREE.LatheGeometry(prof, 40), S); e.position.set(x, 0.1 + h / 2 - 0.05, z); G.add(e); outline(e, 0.006);
    const yaw = Math.atan2(lookX - x, 1.2);
    for (const s of [-1, 1]) {
      const a = yaw + s * 0.32, r = 0.37 * h * 0.97;
      G.add(ball(black, V(x + Math.sin(a) * r, e.position.y + h * (0.12 + peek), z + Math.cos(a) * r), 0.013));
    }
  };
  small(-0.4, 0.085, 0.24, 0.02); small(-0.08, -0.085, 0.24, 0.06); small(0.24, 0.085, 0.24, 0.0);
  shadowAll(G);
  return G;
};

// ---------------- KREVVO ----------------
type Ring = { p: THREE.Vector3; n: THREE.Vector3; r: number };
const archPath = (n = 90): Ring[] => {
  const out: Ring[] = [];
  const at = (t: number) => {
    const A = t < 0.5 ? 0.5 : 0.45, H = 0.7;
    let x = -A * Math.cos(Math.PI * t), y = H * Math.sin(Math.PI * t);
    if (t > 0.82) x += 0.09 * ((t - 0.82) / 0.18) ** 2; // right leg turned out
    if (t < 0.12) x -= 0.02 * ((0.12 - t) / 0.12) ** 2;
    return V(x, y, 0);
  };
  for (let i = 0; i <= n; i++) {
    const t = i / n, p = at(t), tg = at(Math.min(1, t + 0.002)).sub(at(Math.max(0, t - 0.002))).normalize();
    const nrm = V(-tg.y, tg.x, 0); // outward (away from the arch hole)
    let r = t < 0.5 ? 0.215 + (0.15 - 0.215) * smooth(t / 0.5) : 0.15 + (0.168 - 0.15) * smooth((t - 0.5) / 0.5);
    r *= 1 + 0.18 * smooth((0.07 - Math.min(t, 1 - t)) / 0.07);
    out.push({ p, n: nrm, r });
  }
  return out;
};
/** swept tube over the angular range [f0, f1] (deg; 0 = outward/top of the arch, 90 = front, 180 = inside) */
const sweep = (rings: Ring[], f0: number, f1: number, segs = 40) => {
  const pos: number[] = [], idx: number[] = [], uv: number[] = [];
  rings.forEach((R, i) => {
    for (let j = 0; j <= segs; j++) {
      const f = THREE.MathUtils.degToRad(f0 + ((f1 - f0) * j) / segs), d = R.n.clone().multiplyScalar(Math.cos(f)).add(V(0, 0, Math.sin(f)));
      pos.push(R.p.x + d.x * R.r, R.p.y + d.y * R.r, d.z * R.r); uv.push(i / (rings.length - 1) * 4, j / segs);
    }
  });
  for (let i = 0; i < rings.length - 1; i++) for (let j = 0; j < segs; j++) {
    const a = i * (segs + 1) + j, b = a + segs + 1;
    idx.push(a, a + 1, b, b, a + 1, b + 1);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx);
  g.computeVertexNormals();
  return g;
};
export const buildKrevvo = (mat: MatFn, panic: boolean, opts: { wobble?: number } = {}) => {
  const G = new THREE.Group(), w = opts.wobble ?? 0, rings = archPath();
  const GLAZE = mat("glaze", "#1f6f78"), BISQUE = mat("bisque", "#e7a77a"), white = mat("eyeWhite", "#f4e8cc"), black = mat("pupil", "#141216");
  const outer = new THREE.Mesh(w ? jitter(sweep(rings, -115, 115, 48), w, 2) : sweep(rings, -115, 115, 48), GLAZE);
  const inner = new THREE.Mesh(w ? jitter(sweep(rings, 112, 248, 24), w, 2) : sweep(rings, 112, 248, 24), BISQUE);
  G.add(outer, inner);
  for (const R of [rings[0], rings[rings.length - 1]]) { const cap = new THREE.Mesh(new THREE.CircleGeometry(R.r * 1.02, 32), BISQUE); cap.rotation.x = Math.PI / 2; cap.position.set(R.p.x, 0.002, 0); G.add(cap); }
  const ringAt = (t: number) => rings[Math.round(t * (rings.length - 1))];
  const surf = (t: number, fdeg: number, push = 0) => {
    const R = ringAt(t), f = THREE.MathUtils.degToRad(fdeg), d = R.n.clone().multiplyScalar(Math.cos(f)).add(V(0, 0, Math.sin(f))).normalize();
    return { pos: R.p.clone().addScaledVector(d, R.r + push), n: d };
  };
  // eyes on the top of the arch, facing up-front
  const er = panic ? 0.112 : 0.1;
  for (const [t, s] of [[0.415, -1], [0.585, 1]] as const) {
    const e = surf(t, 52, -er * 0.4);
    const eye = new THREE.Mesh(new THREE.SphereGeometry(er, 32, 24), white); eye.position.copy(e.pos); G.add(eye);
    const look = V(0.05 * -s, -0.08, 1).normalize();
    G.add(ball(black, e.pos.clone().addScaledVector(look, er * 0.92), panic ? 0.028 : 0.042));
    if (!panic) {
      const lid = new THREE.Mesh(new THREE.SphereGeometry(er * 1.08, 32, 16, 0, Math.PI * 2, 0, Math.PI * 0.4), GLAZE);
      lid.position.copy(e.pos); lid.quaternion.setFromUnitVectors(V(0, 1, 0), V(0, 0.8, 0.6).normalize()); G.add(lid);
    } else {
      const bpos = e.pos.clone().add(V(0, er * 1.45, 0.03)), dir = V(0.06, -s * 0.022, 0);
      G.add(limb(mat("brow", "#1d1a20"), bpos.clone().sub(dir), bpos.clone().add(dir), 0.014));
    }
  }
  const mpt = surf(0.5, 98, 0.0);
  const smile = new THREE.Mesh(new THREE.TorusGeometry(0.055, 0.011, 8, 24, Math.PI * 0.7), mat("brow", "#1d1a20"));
  smile.position.copy(mpt.pos).add(V(0, 0.04, 0.01)); smile.rotation.z = Math.PI + Math.PI * 0.15; G.add(smile);
  // short solid arms from the outer sides
  for (const [t, s] of [[0.2, -1], [0.8, 1]] as const) {
    const a = surf(t, 0, -0.03);
    const end = panic ? a.pos.clone().add(V(s * 0.2, 0.2, 0.06)) : a.pos.clone().add(V(s * 0.18, -0.12, 0.05));
    G.add(limb(GLAZE, a.pos, end, 0.058, w));
    G.add(ball(BISQUE, end.clone().add(end.clone().sub(a.pos).normalize().multiplyScalar(0.035)), 0.05));
  }
  // signature: one chipped unglazed corner on the right shoulder
  const chip = surf(0.7, 62, 0); G.add(decalOn(outer, decalMat(chipTex(), 0.95), chip.pos, chip.n, [0.22, 0.19], 0.4));
  if (panic) {
    const c = surf(0.3, 80, 0); G.add(decalOn(outer, decalMat(crackTex(7), 0.8), c.pos, c.n, [0.5, 0.5], 1.1));
    // shard flying off the top left, glaze outside / bisque inside
    const sh = new THREE.Group();
    const a = new THREE.Mesh(new THREE.TetrahedronGeometry(0.085, 0), GLAZE); a.scale.set(1.2, 0.5, 1); sh.add(a);
    const b = new THREE.Mesh(new THREE.TetrahedronGeometry(0.075, 0), BISQUE); b.scale.set(1.1, 0.45, 0.9); b.position.y = -0.012; sh.add(b);
    sh.position.copy(surf(0.32, 30, 0.22).pos).add(V(-0.1, 0.12, 0)); sh.rotation.set(0.6, 0.3, 0.9); G.add(sh);
    for (const [dx, dy] of [[0.07, -0.05], [0.12, -0.11], [0.03, -0.12]]) G.add(ball(BISQUE, sh.position.clone().add(V(dx, dy, 0)), 0.01));
    sweat(mat, G, [[-0.25, 1.05, 0.15, 1], [0.27, 1.0, 0.12, 0.85]]);
  }
  shadowAll(G);
  return G;
};
