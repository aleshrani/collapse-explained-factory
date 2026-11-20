// Timeline of the bridge short: shots timed to the the voice words (~/bridge-short/voice/words.json),
// story physics (column position, march phase, deck bounce, collapse) and the camera grammar measured in the
// reference study: continuous slow push-ins; symmetric ease-in-out moves ~23 f (10 in / 10 out), peak ~15 px/f at 720p;
// big reframes are cuts; impacts are 7-frame kicks that flip sign every frame; no hand-held float.
export const FPS = 30;
export const TOTAL = 450;
export const D0 = 6.0; // bank top + deck height (m)
export const HALF = 27; // towers at z = +-27, span 54 m
export const FILES = [-1.65, -0.55, 0.55, 1.65];
export const ROW_GAP = 1.3;
export const COUNT = 74;
export const PARK: V3 = [70, D0, -75]; // swing pivot base (x, ground y, z)
export type V3 = [number, number, number];

export const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
export const smooth = (x: number) => { const u = clamp01(x); return u * u * (3 - 2 * u); };
export const easeOut = (u: number) => 1 - (1 - clamp01(u)) ** 4;
const lin = (pts: [number, number][], x: number) => {
  if (x <= pts[0][0]) return pts[0][1];
  for (let i = 1; i < pts.length; i++) if (x <= pts[i][0]) {
    const [x0, y0] = pts[i - 1], [x1, y1] = pts[i];
    return y0 + ((y1 - y0) * (x - x0)) / (x1 - x0);
  }
  return pts[pts.length - 1][1];
};

// ---------------- story physics (tau = story time in seconds) ----------------
export const front = (tau: number) => 26 - 1.6 * (tau - 4.4); // z of the front row, marching toward -z
export const marchPhase = (tau: number) => ((tau % 1) + 1) % 1; // 1 Hz cycle = 2 steps/s, footfalls at 0 and 0.5
export const SNAP = 34.62, DROP0 = 36.35, DROP1 = 36.95;
export const amp = (tau: number) =>
  lin([[14.85, 0], [17.8, 0.07], [21.4, 0.13], [27.4, 0.26], [33.0, 0.46], [SNAP, 0.55], [SNAP + 0.35, 0.0]], tau);
export const stomp = (tau: number) => lin([[21.4, 1.0], [27.4, 1.35], [33, 1.5]], tau); // "a little harder every step"
export const shapeZ = (z: number) => (Math.abs(z) < HALF ? Math.cos((Math.PI * z) / (2 * HALF)) : 0);
export const dropW = (z: number) => smooth((20 - z) / 26); // 1 on the near half, 0 at the far tower
export const dropU = (tau: number) => (tau < DROP0 ? 0 : Math.min(1, ((tau - DROP0) / (DROP1 - DROP0)) ** 2));
export const DROP_H = 6.6;

export type BridgeState = { bounce: number; drop: number; snap: number; collapsed: boolean };
export const deckY = (z: number, b: BridgeState) => D0 + b.bounce * shapeZ(z) - b.drop * DROP_H * dropW(z);


// ================= "Your car just went off a bridge" (CarRiver, 15 s) =================
import { carAt, carYawPoint, EV } from "./car";
export { carAt, EV };

// ---------------- shots ----------------
export type Light = "day" | "golden";
export type Crowd = "march" | "fall" | "water" | "bank" | "tourists" | "none";
export type ShotDef = { id: number; a: number; b: number; light: Light; crowd: Crowd; tau: (t: number) => number; towns?: boolean; sunAz?: number; sunEl?: number };
export const SHOTS: ShotDef[] = [
  { id: 1, a: 0, b: 34, light: "day", crowd: "none", tau: (t) => t, sunAz: 125, sunEl: 42 }, // on the deck, the car comes at us
  { id: 2, a: 34, b: 105, light: "day", crowd: "none", tau: (t) => t, sunAz: 120, sunEl: 45 }, // over the river: rail, fall, splash
  { id: 3, a: 105, b: 450, light: "day", crowd: "none", tau: (t) => t, sunAz: 135, sunEl: 40 }, // through the driver's window, pull-out
];
export const XFADE: Record<number, number> = {};
export const FLASH_AT = -100;
export const shotAt = (f: number) => SHOTS.find((s) => f >= s.a && f < s.b) ?? SHOTS[SHOTS.length - 1];
export const layersAt = (f: number): { id: number; alpha: number }[] => [{ id: shotAt(f).id, alpha: 1 }];
export const bridgeState = (_id: number, _t: number): BridgeState => ({ bounce: 0, drop: 0, snap: 0, collapsed: false });

// ---------------- camera ----------------
export type Cam = { pos: V3; look: V3; fov: number; roll: number };
type Shot = Partial<Cam> & { pos: V3; look: V3 };
type Key = { f: number; dur?: number; cut?: boolean; s: (f: number) => Shot };
export const glide = (u: number) => { const x = clamp01(u); return x * x * x * (x * (6 * x - 15) + 10); };
const mix = (a: Cam, b: Cam, k: number): Cam => ({
  pos: a.pos.map((v, i) => v + (b.pos[i] - v) * k) as V3, look: a.look.map((v, i) => v + (b.look[i] - v) * k) as V3,
  fov: a.fov + (b.fov - a.fov) * k, roll: a.roll + (b.roll - a.roll) * k,
});
const full = (c: Shot): Cam => ({ fov: 40, roll: 0, ...c });
const run = (keys: Key[], f: number) => {
  let cur = full(keys[0].s(f));
  for (let i = 1; i < keys.length; i++) {
    const k = keys[i];
    if (f < k.f) break;
    cur = k.cut ? full(k.s(f)) : mix(cur, full(k.s(f)), glide((f - k.f) / (k.dur ?? 24)));
  }
  return cur;
};
const T = (f: number) => f / FPS;
const pushK = (f: number, f0: number, rate: number, punch = 0, n = 35) => {
  const x = Math.max(0, f - f0);
  let s = rate * x;
  if (punch > rate) for (let i = 0; i < Math.min(x, n); i++) s += (punch - rate) * Math.max(0, Math.min(1, (i + 0.5) / 8, (n - i - 0.5) / 8));
  return Math.exp(-s);
};
const dolly = (pos: V3, look: V3, k: number, rest: Partial<Cam> = {}): Shot =>
  ({ pos: [look[0] + (pos[0] - look[0]) * k, look[1] + (pos[1] - look[1]) * k, look[2] + (pos[2] - look[2]) * k], look, ...rest });
const zoom = (pos: V3, look: V3, fov: number, k: number, rest: Partial<Cam> = {}): Shot =>
  ({ pos, look, fov: (360 / Math.PI) * Math.atan(Math.tan((fov * Math.PI) / 360) * k), ...rest });
/** close-up framing in car space (yaw only): lens outside the driver's door, looking in at the driver */
const inCar = (pos: V3, look: V3, f0: number, rate: number, rest: Partial<Cam> = {}) => (f: number): Shot =>
  dolly(carYawPoint(f, pos), carYawPoint(f, look), pushK(f, f0, rate), rest);

const land = () => carAt(EV.LAND + 2);
// shot 1: lens on the deck ahead of the car, panning with it, slow zoom creep
const S1a = (f: number) => { const c = carAt(f); return zoom([-1.3, D0 + 1.35, -8.5], [0.45 * c.x, D0 + 0.9, c.z], 40, pushK(f, 0, 0.003)); };
// shot 2: over the river, the car comes through the rail at us; then down with it to the water
const S2a = (f: number) => dolly([12.5, D0 - 1.6, EV.ZHIT + 7.5], [3.2, D0 + 0.6, EV.ZHIT - 0.6], pushK(f, 34, 0.002), { fov: 42 });
const S2b = (f: number) => { const L = land(); return dolly([L.x + 8.5, 2.6, L.z + 8.0], [L.x, 0.7, L.z], pushK(f, EV.TIP + 6, 0.0025), { fov: 42, roll: -0.03 }); };
// shot 3: through the driver's window (car-local, yaw only), every hold creeping in
const CU1 = inCar([-2.4, 1.14, 0.14], [-0.4, 1.14, 0.08], 105, 0.0016);
const CU2 = inCar([-2.15, 1.2, 0.2], [-0.4, 1.2, 0.12], 165, 0.0015, { roll: 0.035 });
const CU3 = inCar([-2.55, 1.1, 0.1], [-0.4, 1.1, 0.06], 255, 0.0015, { roll: -0.03 });
const CU4 = inCar([-2.3, 1.14, 0.18], [-0.45, 1.12, 0.12], 345, 0.0018);
const WIDE = (f: number): Shot => { const c = carAt(f); return dolly([c.x + 0.3, 2.9, c.z + 7.4], [c.x + 0.9, 0.3, c.z - 1.6], pushK(f, 438, 0.002), { fov: 46 }); };

const CAMS: Record<number, Key[]> = {
  1: [{ f: 0, s: S1a }],
  2: [{ f: 34, s: S2a }, { f: EV.TIP + 6, dur: 26, s: S2b }],
  3: [
    { f: 105, s: CU1 },
    { f: 165, dur: 20, s: CU2 }, // option A: a little closer on the phone
    { f: 255, dur: 18, s: CU3 }, // option B: wider for the shove
    { f: 345, dur: 20, s: CU4 }, // option C: on the window
    { f: 398, dur: 40, s: WIDE }, // pull out
  ],
};

// impact kicks: offset flips sign every frame and decays over 7 f (seconds, gain)
export const STAMP_A = 235, STAMP_B = 325, CHECK_C = 372, SHOVES = [272, 291, 310];
const KICKS: [number, number][] = [[EV.HIT / FPS, 1.0], [EV.LAND / FPS, 1.6], [STAMP_A / FPS, 0.45], [STAMP_B / FPS, 0.45], ...SHOVES.map((s) => [s / FPS, 0.3] as [number, number])];
export const kickAt = (t: number) => {
  let a = 0;
  for (const [t0, g] of KICKS) {
    const n = Math.floor((t - t0) * FPS + 1e-6);
    if (n >= 0 && n < 7) a += g * (n % 2 ? -1 : 1) * (1 - n / 7) ** 1.5;
  }
  return a;
};
export const camAt = (id: number, f: number): Cam => {
  const c = run(CAMS[id], f), a = kickAt(T(f));
  if (!a) return c;
  const d: V3 = [c.look[0] - c.pos[0], c.look[1] - c.pos[1], c.look[2] - c.pos[2]];
  const L = Math.hypot(...d), h = Math.hypot(d[0], d[2]) || 1;
  const m = (3 / 640) * Math.tan((c.fov * Math.PI) / 360) * L * a;
  return { ...c, look: [c.look[0] - (d[2] / h) * m, c.look[1] + 0.6 * m, c.look[2] + (d[0] / h) * m], roll: c.roll + a * 0.004 };
};
export const keyEnd = (id: number, f: number) => {
  let e = 0;
  for (const k of CAMS[id]) if (f >= k.f) e = k.f + (k.cut ? 0 : k.dur ?? 24);
  return Math.max(f, e);
};

// ---------------- lens ----------------
export type Dof = { f: number; dur?: number; cInf: number; focus?: (f: number) => V3 };
export const HEAD_LOCAL: V3 = [-0.4, 1.3, 0.05];
const head = (f: number): V3 => carYawPoint(f, HEAD_LOCAL);
export const DOF: Dof[] = [
  { f: 0, cInf: 0 },
  { f: 105, cInf: 12, focus: head }, // through the window: driver's eyes sharp, the far bank soft
  { f: 398, dur: 40, cInf: 0 }, // pull-out to the wide
];
export const dofAt = (f: number) => {
  let i = 0; while (i + 1 < DOF.length && f >= DOF[i + 1].f) i++;
  const d = DOF[i], p = DOF[Math.max(0, i - 1)];
  const k = d.dur ? Math.min(1, (f - d.f) / d.dur) : 1;
  return { cInf: p.cInf + (d.cInf - p.cInf) * k, focus: d.focus ?? p.focus };
};
export const focusAt = (id: number, f: number): V3 => { const d = dofAt(f); return d.focus ? d.focus(f) : camAt(id, f).look; };

// legacy exports the copied engine still references
export const ANCHOR: V3 = [-2.7, D0 + 0.62, -37];
export const snapEnd = (_snap: number): V3 => ANCHOR;
export type Fg = { a: number; b: number; kit: string; pos: V3; s?: number; yaw?: number };
export const FOREGROUND: Fg[] = [];
