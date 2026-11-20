// Cast and effect cards in the 3D world (the bridge engine's sprite system): our architect host as a lit,
// camera-facing card (cardShade: scene tint, bright floor, side gradient toward the sun, plum ink of his own drawing),
// a tight contact shadow under his feet, SOLD signs (upright cards that pop with overshoot), smoke puffs, sand mist.
// Cards, effects and blobs live on the NOINK layer so the world ink never outlines their quads.
import * as THREE from "three";
import { Pen, INK, rrect, fxContact, mix } from "./toon";
import { drawScientist, ARCH_PRESETS, Pose, MouthShape, Viseme } from "./scientist";
import { NOINK } from "./ink";
import { cardShade, blobMaterial, CARD_K } from "./cardshade";
import { RMS } from "./rms";
import {
  FPS, V3, EV, SHOTS, DREDGE, HEAD, ARCH2, ARCH6, ARCH8, ARCH_SCALE, GEN, LAND, NOZ, arcPt, hh, popE, smooth, clamp01, duskAt, windowsAt, W,
} from "./story";
import { Island } from "./islands";

// ---------------- canvas pool ----------------
type Entry = { cv: HTMLCanvasElement; tex: THREE.CanvasTexture; w: number; h: number };
export type Req = { key: string; w: number; h: number; k: number; draw: (p: Pen) => void; tex?: THREE.CanvasTexture };
const makeEntry = (w: number, h: number): Entry => {
  const cv = document.createElement("canvas");
  cv.width = w; cv.height = h;
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 8;
  return { cv, tex, w, h };
};
export class Pool {
  private live = new Map<string, Entry>();
  private free: Entry[] = [];
  private reqs: Req[] = [];
  req(key: string, w: number, h: number, k: number, draw: (p: Pen) => void) {
    const r: Req = { key: `${w}x${h}|${key}`, w, h, k, draw };
    this.reqs.push(r);
    return r;
  }
  flush() {
    const want = new Map<string, Req[]>();
    for (const r of this.reqs) { const l = want.get(r.key); if (l) l.push(r); else want.set(r.key, [r]); }
    for (const [key, e] of this.live) if (!want.has(key)) { this.live.delete(key); this.free.push(e); }
    for (const [key, rs] of want) {
      let e = this.live.get(key);
      if (!e) {
        const r = rs[0], i = this.free.findIndex((x) => x.w === r.w && x.h === r.h);
        e = i >= 0 ? this.free.splice(i, 1)[0] : makeEntry(r.w, r.h);
        const g = e.cv.getContext("2d")!;
        g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, e.w, e.h); g.setTransform(r.k, 0, 0, r.k, 0, 0);
        r.draw(new Pen(g));
        e.tex.needsUpdate = true;
        this.live.set(key, e);
      }
      for (const r of rs) r.tex = e.tex;
    }
    this.reqs = [];
  }
}

// ---------------- sprite meshes ----------------
const blank = (() => { const c = document.createElement("canvas"); c.width = c.height = 2; return new THREE.CanvasTexture(c); })();
export const SU = 0.00216; // metres per design unit: 1000 units = 2.16 m
const BODY = (() => { const g = new THREE.PlaneGeometry(600 * SU, 1000 * SU); g.translate(0, (975 - 500) * SU, 0); return g; })();
const CARD = new THREE.PlaneGeometry(1, 1);

export class Actor {
  mesh: THREE.Mesh; mat: THREE.MeshLambertMaterial; dmat: THREE.MeshDepthMaterial; r: Req | null = null;
  constructor(parent: THREE.Object3D) {
    this.mat = cardShade(new THREE.MeshLambertMaterial({ map: blank, alphaTest: 0.5, side: THREE.DoubleSide }));
    this.dmat = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking, map: blank, alphaTest: 0.5, side: THREE.DoubleSide });
    this.mesh = new THREE.Mesh(BODY, this.mat);
    this.mesh.customDepthMaterial = this.dmat;
    this.mesh.onBeforeRender = (r) => { const rt = r.getRenderTarget(); CARD_K.uPx.value = (rt ? rt.height : r.domElement.height) / 1920; };
    this.mesh.castShadow = true; this.mesh.receiveShadow = true; this.mesh.visible = false;
    this.mesh.rotation.order = "YXZ"; this.mesh.renderOrder = 1; this.mesh.layers.set(NOINK);
    parent.add(this.mesh);
  }
  bind() { const t = this.r?.tex; if (t) { this.mat.map = t; this.dmat.map = t; } }
}
export class Fx {
  mesh: THREE.Mesh; mat: THREE.MeshBasicMaterial; soft: THREE.MeshBasicMaterial; blob: THREE.MeshBasicMaterial; r: Req | null = null;
  constructor(parent: THREE.Object3D) {
    this.mat = new THREE.MeshBasicMaterial({ map: blank, alphaTest: 0.5, side: THREE.DoubleSide });
    this.soft = new THREE.MeshBasicMaterial({ map: blank, transparent: true, depthWrite: false, side: THREE.DoubleSide });
    this.blob = blobMaterial(blank);
    this.mesh = new THREE.Mesh(CARD, this.mat);
    this.mesh.visible = false; this.mesh.layers.set(NOINK);
    parent.add(this.mesh);
  }
  use(soft: boolean, tint: THREE.Color) { this.mesh.material = soft ? this.soft : this.mat; this.mat.color.copy(tint); this.soft.color.copy(tint); }
  bind() {
    const t = this.r?.tex;
    if (!t) return;
    if (this.r!.key.includes("|blob|")) {
      if (t.generateMipmaps) { t.generateMipmaps = false; t.minFilter = THREE.LinearFilter; t.needsUpdate = true; }
      this.blob.map = t; this.mesh.material = this.blob; this.mesh.renderOrder = 0.5;
    } else { this.mat.map = t; this.soft.map = t; this.mesh.renderOrder = 2; }
  }
}

// ---------------- placements ----------------
export type Place = { key: string; draw: (p: Pen) => void; x: number; y: number; z: number; scale: number; size: [number, number, number] };
/** upright = yaw-only billboard anchored at its centre; flat = lying on the ground; else full billboard */
export type FxPlace = { key: string; cw: number; ch: number; draw: (p: Pen) => void; x: number; y: number; z: number; w: number; h: number;
  flat?: boolean; upright?: boolean; rot?: number; soft?: boolean; lit?: boolean };
export type CamInfo = { pos: THREE.Vector3; right: THREE.Vector3; sun: THREE.Vector3 };
export type Stage = { places: Place[]; fx: FxPlace[] };
const q = (v: number, n = 120) => Math.round(v * n) / n;
const tier = (d: number): [number, number, number] => d < 3.4 ? [1800, 3000, 3.0] : d < 7 ? [1080, 1800, 1.8] : d < 16 ? [600, 1000, 1.0] : [300, 500, 0.5];

// ---------------- the architect ----------------
const LIDS = [0.5, 1, 1, 0.5];
const blinkAt = (f: number, swaps: number[]) => {
  for (const s of swaps) { const k = f - s + 1; if (k >= 0 && k < 4) return LIDS[k]; }
  let s = 8;
  for (let n = 0; s <= f && n < 200; n++) { const k = f - s; if (k >= 0 && k < 4) return LIDS[k]; s += Math.round(48 + 60 * hh(n, 13)); }
  return 0;
};
/** viseme from the voice loudness (the voice is the host's); a little variety so the mouth never strobes */
const visemeAt = (f: number): Viseme => {
  f = Math.floor(f / 3) * 3;
  const v = RMS[Math.max(0, Math.min(RMS.length - 1, f))] ?? 0, prev = RMS[Math.max(0, f - 1)] ?? 0;
  if (v < 12) return prev > 30 ? "MB" : "closed";
  const k = Math.floor(f / 2), h = hh(k, 3);
  if (v > 62) return h < 0.6 ? "A" : "O";
  if (v > 34) return h < 0.45 ? "E" : h < 0.75 ? "O" : "A";
  return h < 0.5 ? "E" : h < 0.8 ? "FV" : "MB";
};
type Mood = "neutral" | "shocked" | "smug" | "facepalm" | "explaining";
const moodAt = (id: number, f: number): Mood => {
  if (id === 2) return f >= EV.SHOCK ? "shocked" : "neutral";
  if (id === 4) return f >= EV.SMUG ? "smug" : "neutral";
  if (id === 6) return f >= EV.FACEPALM ? "facepalm" : "neutral";
  if (id === 8) return f >= EV.OUT + 1 ? "shocked" : f >= EV.OWN ? "explaining" : "neutral";
  return "neutral";
};
const SWAPS = [EV.SHOCK, EV.SMUG, EV.FACEPALM, EV.OWN, EV.OUT + 1];
const archPose = (id: number, f: number): Pose => {
  const mood = moodAt(id, f), base = ARCH_PRESETS[mood];
  const talk = visemeAt(f), loud = (RMS[Math.floor(f / 3) * 3] ?? 0) > 12;
  let mouth: MouthShape = talk;
  if (!loud) mouth = mood === "shocked" ? "shockO" : mood === "smug" ? "smirk" : mood === "facepalm" ? "frown" : "smile";
  const t = f / FPS;
  const sway = Math.sin(t * 2.1 + id) * 1.6, nod = loud ? 1.2 * Math.sin(t * 9.3) : 0;
  const ageIn = mood === "shocked" ? clamp01((f - (id === 2 ? EV.SHOCK : EV.OUT)) / 4) : 1;
  const pose: Pose = { ...base, mouth, lean: (base.lean ?? 0) + sway * 0.6, head: { ...(base.head ?? {}), tilt: (base.head?.tilt ?? 0) + sway, nod: (base.head?.nod ?? 0) + nod - (1 - ageIn) * 4 },
    eyes: { ...(base.eyes ?? {}), blink: mood === "facepalm" ? 0 : blinkAt(f, SWAPS) } };
  if (mood === "explaining" && id === 8) { // "own a whole country": both arms out wide, palms open
    pose.armL = { target: [70, 470], bend: 1, hand: "open" }; pose.armR = { target: [530, 470], bend: 1, hand: "open" };
    pose.brows = { raise: [6, 6] }; pose.eyes = { ...pose.eyes, shape: "happy" };
  }
  return pose;
};
const light2D = (cam: CamInfo) => {
  const sx = cam.sun.dot(cam.right), sy = -cam.sun.y;
  return Math.round(Math.atan2(sy, sx) / (Math.PI / 4)) * (Math.PI / 4);
};
const architect = (id: number, f: number, at: V3, cam: CamInfo, out: Stage) => {
  const d = cam.pos.distanceTo(new THREE.Vector3(at[0], at[1] + 1.4, at[2])) / ARCH_SCALE;
  const [w, h, k] = tier(d), pose = archPose(id, f), light = light2D(cam);
  const key = `arch|${JSON.stringify(pose, (_k, v) => (typeof v === "number" ? q(v, 20) : v))}|${q(light, 10)}`;
  out.places.push({ key, x: at[0], y: at[1], z: at[2], scale: ARCH_SCALE, size: [w, h, k],
    draw: (p) => { drawScientist(p, pose, { look: "architect", glasses: true, hat: "white", light }); } });
  contact(out, at, ARCH_SCALE);
};
const contact = (out: Stage, at: V3, sc: number) => {
  const cc = "#5c5674";
  out.fx.push({ key: `blob|contact|${cc}`, cw: 128, ch: 128, draw: (p) => fxContact(p, cc), x: at[0], y: at[1] + 0.025, z: at[2], w: 0.62 * sc, h: 0.42 * sc, flat: true });
};

// ---------------- SOLD signs ----------------
const signDraw = (p: Pen) => {
  const g = p.g;
  p.poly(rrect(182, 250, 218, 515, 8), "#9a6b45", 9);                       // post
  p.poly(rrect(30, 40, 370, 270, 26), "#e2373a", 12);                        // board
  p.poly(rrect(52, 62, 348, 248, 16), null, 0);
  g.save(); g.strokeStyle = "#ffffff"; g.lineWidth = 8; g.beginPath(); g.roundRect(52, 62, 296, 186, 16); g.stroke(); g.restore();
  g.save(); g.font = `700 112px BeVietnam, "Arial Black", sans-serif`; g.textAlign = "center"; g.textBaseline = "middle";
  g.lineJoin = "round"; g.lineWidth = 14; g.strokeStyle = INK; g.strokeText("SOLD", 200, 160); g.fillStyle = "#ffffff"; g.fillText("SOLD", 200, 160); g.restore();
  p.dot(200, 42, 9, "#d9dde0");
};
export type SignSpot = { x: number; z: number; t: number; s: number };
let SIGNS: SignSpot[] = [];
/** choose islands in the shot-4 view for the signs; called once by the world with the island list */
export const placeSigns = (list: Island[], camPos: THREE.Vector3, camLook: THREE.Vector3) => {
  const fwd = camLook.clone().sub(camPos).setY(0).normalize();
  const cand = list.filter((is) => is.kind === "map").map((is) => {
    const v = new THREE.Vector3(is.c[0] - camPos.x, 0, is.c[1] - camPos.z), d = v.length(), ang = Math.acos(Math.max(-1, Math.min(1, v.normalize().dot(fwd))));
    return { is, d, ang };
  }).filter((c) => c.d > 14 && c.d < 95 && c.ang < 0.33).sort((a, b) => a.d - b.d);
  const pickd: typeof cand = [];
  for (const c of cand) if (pickd.every((p) => Math.hypot(p.is.c[0] - c.is.c[0], p.is.c[1] - c.is.c[1]) > 7) && hh(c.is.id, 4) < 0.8) pickd.push(c);
  const n = Math.min(26, pickd.length);
  SIGNS = pickd.slice(0, n).map((c, i) => {
    const order = n - 1 - i; // far ones first, nearest lands on "sold"
    return { x: c.is.c[0], z: c.is.c[1], t: EV.SOLD0 + Math.round((order / Math.max(1, n - 1)) ** 1.15 * (EV.SOLD1 - EV.SOLD0 - 4)) + Math.round(hh(i, 8) * 3), s: 0.8 + Math.min(1.0, c.d / 60) };
  }).reverse();
};
export const signTimes = () => SIGNS.map((s) => s.t);
const signs = (f: number, out: Stage) => {
  for (const s of SIGNS) {
    const u = (f - s.t) / 7;
    if (u <= 0) continue;
    const k = popE(u) * s.s, w = 3.0 * k, h = 3.9 * k;
    out.fx.push({ key: "sold", cw: 400, ch: 520, draw: signDraw, x: s.x, y: 0.48 + h / 2, z: s.z, w, h, upright: true, lit: true, rot: 0.06 * Math.sin(f * 0.3 + s.x) * Math.max(0, 1 - u) });
  }
};

// ---------------- smoke and sand ----------------
const puff = (col: string, a: number) => (p: Pen) => {
  const g = p.g;
  for (const [x, y, r] of [[100, 128, 62], [152, 104, 70], [168, 156, 54], [118, 88, 48], [70, 150, 40]] as const) {
    const gr = g.createRadialGradient(x - r * 0.3, y - r * 0.35, r * 0.2, x, y, r);
    gr.addColorStop(0, mix(col, "#ffffff", 0.18) + "85"); gr.addColorStop(0.52, col + "43"); gr.addColorStop(1, col + "00");
    g.globalAlpha = a; g.fillStyle = gr; g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill();
  }
  g.globalAlpha = 1;
};
const smoke = (out: Stage, f: number, src: V3, rate: number, dark: string, n: number, size: number, drift: [number, number], stopAt = 1e9) => {
  const t = f / FPS;
  for (let k = 0; k < n; k++) {
    const life = 2.6, ph = ((t * rate + k / n) % 1), born = t - ph * life;
    if (born * FPS > stopAt) continue;
    const u = ph, sz = size * (0.6 + 2.2 * u);
    const a = q((1 - u) ** 1.3 * 0.92, 12);
    if (a < 0.05) continue;
    out.fx.push({ key: `puff|${dark}|${a}`, cw: 256, ch: 256, draw: puff(dark, a), soft: true,
      x: src[0] + drift[0] * u * 14 + Math.sin(k * 2.3) * 1.2 * u, y: src[1] + u * 6 + u * u * 4, z: src[2] + drift[1] * u * 14, w: sz * 1.46, h: sz * .71, rot: k * 0.7 + u });
  }
};
const sandDraw = (a: number) => (p: Pen) => {
  const g = p.g;
  for (let i = 0; i < 9; i++) {
    const x = 128 + 70 * Math.cos(i * 2.4), y = 140 + 50 * Math.sin(i * 1.7), r = 40 + 14 * Math.sin(i * 3.1);
    g.globalAlpha = a * (0.55 + 0.45 * ((i * 37) % 10) / 10); g.fillStyle = i % 2 ? "#f6dcaa" : "#e3bd82";
    g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill();
  }
  g.globalAlpha = 1;
};
const sandFx = (out: Stage, f: number, on: boolean) => {
  const t = f / FPS;
  if (on) {
    for (let k = 0; k < 10; k++) { // mist billowing up where the jet lands
      const u = ((t * 0.7 + k / 10) % 1), a = q((1 - u) * 0.8, 10);
      out.fx.push({ key: `sand|${a}`, cw: 256, ch: 256, draw: sandDraw(a), soft: true, x: LAND[0] + Math.sin(k * 1.9) * (1 + 3 * u), y: LAND[1] + 0.6 + u * 4, z: LAND[2] + Math.cos(k * 2.7) * (1 + 3 * u), w: 3 + 5 * u, h: 3 + 5 * u });
    }
    for (let k = 0; k < 16; k++) { // spray flecks peeling off the jet
      const u0 = (k / 16 + t * 0.9) % 1, p = arcPt(u0), a = q(0.7 * Math.sin(Math.PI * u0), 10);
      out.fx.push({ key: `sand|${a}`, cw: 256, ch: 256, draw: sandDraw(a), soft: true, x: p[0] + Math.sin(k * 5.1) * 1.2, y: p[1] - 0.5 - u0 * 0.6, z: p[2] + Math.cos(k * 3.3) * 1.2, w: 1.2 + 2 * u0, h: 1.2 + 2 * u0 });
    }
  }
};

/** everything with a face or a puff in shot `id` at frame f */
export const stage = (id: number, f: number, cam: CamInfo): Stage => {
  const out: Stage = { places: [], fx: [] };
  if (id === 2) architect(id, f, ARCH2, cam, out);
  if (id === 4) { architect(id, f, ARCH2, cam, out); signs(f, out); }
  if (id === 6) architect(id, f, ARCH6, cam, out);
  if (id === 8) architect(id, f, ARCH8, cam, out);
  if (id === 1 || id === 3 || id === 5 || id === 9) sandFx(out, f, f < EV.STOP);
  const dk = duskAt(f);
  // dredger funnel smoke (stops with the money)
  if (id === 1 || id === 3 || id === 5) smoke(out, f, [DREDGE[0] - HEAD[0] * 14.3, 13.6, DREDGE[2] - HEAD[1] * 14.3], 0.32, dk > 0.3 ? "#6a6474" : "#8d8794", 5, 1.6, [0.6, 0.4], EV.STOP);
  // generator exhaust: grey, then black and heavier from "diesel"
  if (id >= 6 && id <= 8) {
    const heavy = f >= EV.SMOKE, stopAt = EV.OUT + 3;
    smoke(out, f, [GEN[0] + 1.01, GEN[1] + 4.6, GEN[2] - 0.16], heavy ? 0.5 : 0.3, heavy ? "#746c78" : "#918c97", heavy ? 9 : 5, heavy ? 1.1 : 0.8, [0.5, 0.3], stopAt);
  }
  return out;
};
export { windowsAt, W, smooth, SHOTS };
