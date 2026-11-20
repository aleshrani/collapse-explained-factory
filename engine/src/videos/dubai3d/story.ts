// "The World" (Collapse Explained demo, 26 s): timeline, shots, cameras, lens and impact kicks.
// Everything is timed to the voice-over words (episodes/demo-dubai/words.json, voice placed at LEAD = 0.5 s):
// every visual reaction lands 0-3 frames before its word. Camera grammar from the bridge engine: hard cuts on big
// jumps, smootherstep glides, every hold creeps, impact kicks flip sign every frame and decay over 7 frames.
export const FPS = 30;
export const TOTAL = 780;
export const LEAD = 0.5; // s of silence before the voice
export type V3 = [number, number, number];
export const D0 = 0;

/** frame of a voice word time (seconds in words.json) */
export const W = (t: number) => Math.round((t + LEAD) * FPS);

export const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
export const smooth = (x: number) => { const u = clamp01(x); return u * u * (3 - 2 * u); };
export const glide = (u: number) => { const x = clamp01(u); return x * x * x * (x * (6 * x - 15) + 10); };
/** back-out ease: overshoots ~10 % then settles */
export const popE = (u: number) => { const x = clamp01(u) - 1; return 1 + 2.7 * x * x * x + 1.7 * x * x; };
export const hh = (i: number, s = 0) => { const v = Math.sin(i * 127.1 + s * 311.7) * 43758.5453; return v - Math.floor(v); };

// ---------------- places (metres; sea level y = 0, north = -z) ----------------
export const SAND_Y = 0.48;                       // island top height
export const SANDBAR: V3 = [-8, 0, 62];           // the architect's sandbar, south of the map
export const ARCH2: V3 = [-8.2, SAND_Y, 61.6];    // architect on the sandbar (shots 2 + 4)
export const HOTEL: V3 = [57, 0, -14];            // resort island centre (the "India" island)
export const HOTEL_R = 19;
export const ARCH6: V3 = [HOTEL[0] - 7.5, SAND_Y, HOTEL[2] + 12.5]; // shot 6: in front of the wire-less poles
export const ARCH8: V3 = [HOTEL[0] + 1.5, SAND_Y, HOTEL[2] + 13]; // shot 8: in front of the hotel
export const GEN: V3 = [HOTEL[0] + 9, SAND_Y, HOTEL[2] - 11.5];    // diesel generator behind the hotel
export const NZ: V3 = [121, 0, 38];               // the island being built (New Zealand)
export const DREDGE: V3 = [156.8, 0, 79.8];           // dredger midship
const HD = Math.hypot(NZ[0] - DREDGE[0], NZ[2] - DREDGE[2]);
export const HEAD: [number, number] = [(NZ[0] - DREDGE[0]) / HD, (NZ[2] - DREDGE[2]) / HD]; // dredger heading (x, z), bow toward NZ
export const NOZ: V3 = [DREDGE[0] + HEAD[0] * 15.5, 7.2, DREDGE[2] + HEAD[1] * 15.5];   // rainbow nozzle tip
export const LAND: V3 = [NZ[0] - HEAD[0] * 3, 0.9, NZ[2] - HEAD[1] * 3];                // where the jet lands
export const ARC_H = 14;
/** point on the sand jet, u 0 at the nozzle .. 1 at the landing */
export const arcPt = (u: number): V3 => [NOZ[0] + (LAND[0] - NOZ[0]) * u, NOZ[1] + (LAND[1] - NOZ[1]) * u + 4 * ARC_H * u * (1 - u), NOZ[2] + (LAND[2] - NOZ[2]) * u];
export const ARCH_SCALE = 1.15;

// ---------------- story events (frames) ----------------
export const EV = {
  SHOCK: W(3.2) - 2,          // "three hundred" -> shocked
  CARD: W(5.52) - 2,          // "321" -> number card pops
  SPRAY0: -1000,              // spray running from before the film starts
  SOLD0: W(8.8) - 3,          // "70%" -> first SOLD sign
  SOLD1: W(10.24) - 2,        // "sold" -> last (nearest) sign
  SMUG: W(8.8) - 6,
  STOP: W(11.28) - 2,         // "out" -> the spray stops
  DARK0: W(10.88) - 3,        // "money" -> the sky starts to darken
  FACEPALM: W(13.92) - 3,     // "no power lines"
  SMOKE: W(16.08) - 3,        // "diesel" -> generator puffs harder
  OWN: W(17.28) - 3,          // "own a whole country" -> arms out
  OUT: W(18.8) - 2,           // "no electricity" -> lights out
  TITLE: W(20.5) + 2,         // after "wrong?" -> title pops
  TAG: W(21.04),
};

// ---------------- shots ----------------
export type ShotDef = { id: number; a: number; b: number; sunAz: number; sunEl: number; fog: [number, number] };
export const SHOTS: ShotDef[] = [
  { id: 1, a: 0, b: 101, sunAz: 40, sunEl: 32, fog: [500, 2400] },     // aerial descent over the world map
  { id: 2, a: 101, b: 172, sunAz: 38, sunEl: 9, fog: [150, 1400] },   // architect on the sandbar, shocked
  { id: 3, a: 172, b: 245, sunAz: 62, sunEl: 10, fog: [150, 1400] },  // dredger rainbowing sand
  { id: 4, a: 245, b: 334, sunAz: 32, sunEl: 10, fog: [150, 1400] },  // SOLD signs, architect smug
  { id: 5, a: 334, b: 372, sunAz: 62, sunEl: 8, fog: [150, 1400] },   // money ran out: dredger stops
  { id: 6, a: 372, b: 460, sunAz: 115, sunEl: 8, fog: [150, 1400] },   // resort island: poles without wires
  { id: 7, a: 460, b: 530, sunAz: -120, sunEl: 8, fog: [150, 1400] },  // generator smoke, flickering windows
  { id: 8, a: 530, b: 608, sunAz: 110, sunEl: 7, fog: [150, 1400] },   // lights out
  { id: 9, a: 608, b: TOTAL, sunAz: 10, sunEl: 6, fog: [320, 2200] }, // end card: wide golden
];
export const shotAt = (f: number) => SHOTS.find((s) => f >= s.a && f < s.b) ?? SHOTS[SHOTS.length - 1];

/** dusk amount 0 golden .. 1 dusk .. 1.35 dark (lights out) */
export const duskAt = (f: number) => {
  if (f >= SHOTS[8].a) return 0;
  if (f < EV.DARK0) return 0;
  let k = smooth((f - EV.DARK0) / 32);
  if (f >= EV.OUT) k += 0.35 * smooth((f - EV.OUT) / 8);
  return k;
};
/** window lights 0..1 (hotel / villas); skyline towers separately (towerLights) */
export const windowsAt = (f: number) => {
  if (f < SHOTS[5].a || f >= SHOTS[8].a) return 0;
  let on = 1;
  if (f >= SHOTS[6].a && f < SHOTS[7].a) { // shot 7: brown-out flicker
    const n = Math.floor(f / 2);
    on = hh(n, 5) < 0.22 ? 0.25 + 0.4 * hh(n, 6) : 0.85 + 0.15 * hh(n, 7);
  }
  if (f >= EV.OUT - 6 && f < EV.OUT) on = [1, 0.3, 0.9, 0.15, 0.7, 0.1][f - (EV.OUT - 6)];
  if (f >= EV.OUT) on = 0;
  return on;
};
export const towerLights = (f: number) => clamp01(duskAt(f) * 1.2);

// ---------------- camera ----------------
export type Cam = { pos: V3; look: V3; fov: number; roll: number };
type Shot = Partial<Cam> & { pos: V3; look: V3 };
type Key = { f: number; dur?: number; cut?: boolean; s: (f: number) => Shot };
const mixC = (a: Cam, b: Cam, k: number): Cam => ({
  pos: a.pos.map((v, i) => v + (b.pos[i] - v) * k) as V3, look: a.look.map((v, i) => v + (b.look[i] - v) * k) as V3,
  fov: a.fov + (b.fov - a.fov) * k, roll: a.roll + (b.roll - a.roll) * k,
});
const full = (c: Shot): Cam => ({ fov: 40, roll: 0, ...c });
const run = (keys: Key[], f: number) => {
  let cur = full(keys[0].s(f));
  for (let i = 1; i < keys.length; i++) {
    const k = keys[i];
    if (f < k.f) break;
    cur = k.cut ? full(k.s(f)) : mixC(cur, full(k.s(f)), glide((f - k.f) / (k.dur ?? 24)));
  }
  return cur;
};
/** creeping push-in: distance factor exp(-rate * frames), with an optional faster punch for n frames */
const pushK = (f: number, f0: number, rate: number, punch = 0, n = 30) => {
  const x = Math.max(0, f - f0);
  let s = rate * x;
  if (punch > rate) for (let i = 0; i < Math.min(x, n); i++) s += (punch - rate) * Math.max(0, Math.min(1, (i + 0.5) / 6, (n - i - 0.5) / 6));
  return Math.exp(-s);
};
const dolly = (pos: V3, look: V3, k: number, rest: Partial<Cam> = {}): Shot =>
  ({ pos: [look[0] + (pos[0] - look[0]) * k, look[1] + (pos[1] - look[1]) * k, look[2] + (pos[2] - look[2]) * k], look, ...rest });
/** camera around a target: az degrees from +z (0 = south of the target looking north), el degrees up, dist metres */
export const around = (t: V3, az: number, el: number, dist: number): V3 => {
  const a = (az * Math.PI) / 180, e = (el * Math.PI) / 180;
  return [t[0] + dist * Math.sin(a) * Math.cos(e), t[1] + dist * Math.sin(e), t[2] + dist * Math.cos(a) * Math.cos(e)];
};
const add = (a: V3, b: V3): V3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];

// head / chest of the architect (card base + design-space heights x scale)
const SUY = 0.00216 * ARCH_SCALE;
export const headOf = (p: V3): V3 => [p[0], p[1] + (975 - 368) * SUY, p[2]];
export const chestOf = (p: V3): V3 => [p[0], p[1] + (975 - 560) * SUY, p[2]];

// shot 1: overhead the whole map -> descending glide to a low pass over the southern islands toward the skyline
const S1a = (f: number): Shot => dolly([0, 540, 34], [0, 0, -4], pushK(f, 0, 0.0016));
const S1b = (_f: number): Shot => ({ pos: [-2, 250, 150], look: [0, 0, -16], fov: 40 });
const S1c = (f: number): Shot => dolly([-14, 26, 108], [14, 1, -20], pushK(f, 76, 0.0035), { fov: 44, roll: -0.03 });
// shot 2: the architect on his sandbar, islands behind; punch in on "three hundred"
const H2 = add(headOf(ARCH2), [0, -0.25, 0]);
const S2a = (f: number): Shot => dolly(around(H2, -22, 1, 5.6), add(H2, [0, -0.45, 0]), pushK(f, 101, 0.0022), { fov: 36 });
const S2b = (f: number): Shot => dolly(around(H2, -18, 2, 4.0), add(H2, [0, -0.3, 0]), pushK(f, EV.SHOCK + 10, 0.0026), { fov: 36, roll: 0.07 });
// shot 3: the dredger rainbowing sand onto the new island, then a nudge in on "cubic metres"
const ARC_MID: V3 = arcPt(0.45);
const S3a = (f: number): Shot => dolly([214, 15, 46], [139, 8.5, 56.5], pushK(f, 172, 0.0018, 0.012, 14), { fov: 49 });
const S3b = (f: number): Shot => dolly([208, 14, 48], [139, 8.5, 56.5], pushK(f, W(6.56), 0.0022), { fov: 49, roll: -0.04 });
// shot 4: behind-over the architect's shoulder line: him smug in the right foreground, signs popping on the islands
const S4a = (f: number): Shot => dolly([ARCH2[0] - 1.6, 2.7, ARCH2[2] + 7.4], [ARCH2[0] + 6, -0.2, ARCH2[2] - 34], pushK(f, 245, 0.0015));
const S4b = (f: number): Shot => dolly([ARCH2[0] - 1.3, 2.6, ARCH2[2] + 6.2], [ARCH2[0] + 5, 0.1, ARCH2[2] - 32], pushK(f, EV.SOLD1 - 8, 0.003), { roll: 0.05 });
// shot 5: close on the dredger's nozzle as the spray stops; kick on "out"
const NOZ_V: V3 = arcPt(0.08);
const STERN: V3 = [DREDGE[0] - HEAD[0] * 16, 0, DREDGE[2] - HEAD[1] * 16];
const S5a = (f: number): Shot => dolly([STERN[0] - HEAD[0] * 13 - HEAD[1] * 24, 13, STERN[2] - HEAD[1] * 13 + HEAD[0] * 24], [NOZ[0] + HEAD[0] * 10, 4.5, NOZ[2] + HEAD[1] * 10], pushK(f, 334, 0.0035), { fov: 44, roll: 0.03 });
// shot 6: resort island establishing, then down to the architect in front of the poles (facepalm)
const S6a = (f: number): Shot => dolly(around([HOTEL[0] + 1, 4, HOTEL[2]], 18, 22, 92), [HOTEL[0] + 1, 3, HOTEL[2]], pushK(f, 372, 0.0025));
const H6 = add(headOf(ARCH6), [0, -0.35, 0]);
const S6b = (f: number): Shot => dolly(add(ARCH6, [2.1, 0.15, 4.4]), [(ARCH6[0] + HOTEL[0] - 11) / 2, 4.4, (ARCH6[2] + HOTEL[2] + 2) / 2], pushK(f, EV.FACEPALM - 12, 0.0022, 0.009, 12), { fov: 52, roll: -0.06 });
// shot 7: the generator puffing, hotel windows flickering behind
const S7a = (f: number): Shot => dolly(add(GEN, [-8.5, 2.4, -7.5]), add(GEN, [0, 2.3, 1]), pushK(f, 460, 0.0024, 0.009, 12), { fov: 50 });
const S7b = (f: number): Shot => dolly(add(GEN, [-6.2, 1.2, -4.6]), add(GEN, [0.6, 3.6, 0.8]), pushK(f, EV.SMOKE + 20, 0.003), { fov: 50, roll: 0.05 });
// shot 8: the architect in front of the hotel; lights out
const H8 = add(headOf(ARCH8), [0, -0.1, 0]);
const S8a = (f: number): Shot => dolly(add(ARCH8, [0.9, 1.0, 5.6]), add(H8, [0, -0.1, -4]), pushK(f, 530, 0.002), { fov: 46 });
const S8b = (f: number): Shot => dolly(add(ARCH8, [0.7, 0.95, 4.4]), add(H8, [0, -0.15, -4]), pushK(f, EV.OUT, 0.0025), { fov: 46, roll: 0.05 });
// shot 9: wide golden over the whole archipelago, the skyline and the sun
const S9a = (f: number): Shot => dolly([34, 150, 230], [0, 0, -250], pushK(f, 608, 0.0012), { fov: 42 });

const CAMS: Record<number, Key[]> = {
  1: [{ f: 0, s: S1a }, { f: 10, dur: 44, s: S1b }, { f: 46, dur: 52, s: S1c }],
  2: [{ f: 101, s: S2a }, { f: EV.SHOCK - 1, dur: 9, s: S2b }],
  3: [{ f: 172, s: S3a }, { f: W(6.56) - 2, dur: 22, s: S3b }],
  4: [{ f: 245, s: S4a }, { f: EV.SOLD1 - 10, dur: 16, s: S4b }],
  5: [{ f: 334, s: S5a }],
  6: [{ f: 372, s: S6a }, { f: W(13.28) - 4, dur: 26, s: S6b }],
  7: [{ f: 460, s: S7a }, { f: EV.SMOKE - 6, dur: 26, s: S7b }],
  8: [{ f: 530, s: S8a }, { f: EV.OUT - 3, dur: 7, s: S8b }],
  9: [{ f: 608, s: S9a }],
};

// impact kicks: offset flips sign every frame and decays over 7 f (frame, gain)
const KICKS: [number, number][] = [[EV.SHOCK + 1, 0.9], [EV.STOP + 1, 1.4], [EV.FACEPALM + 2, 0.5], [EV.OUT, 1.2], [EV.SOLD1, 0.45]];
export const kickAt = (f: number) => {
  let a = 0;
  for (const [f0, g] of KICKS) {
    const n = f - f0;
    if (n >= 0 && n < 7) a += g * (Math.sin(Math.PI * (n + 1) / 3.5)) * (1 - n / 7) ** 1.5;
  }
  return a;
};
export const camAt = (id: number, f: number): Cam => {
  const c = run(CAMS[id], f), a = kickAt(f);
  if (!a) return c;
  const d: V3 = [c.look[0] - c.pos[0], c.look[1] - c.pos[1], c.look[2] - c.pos[2]];
  const L = Math.hypot(...d), h = Math.hypot(d[0], d[2]) || 1;
  const m = (3 / 640) * Math.tan((c.fov * Math.PI) / 360) * L * a;
  return { ...c, look: [c.look[0] - (d[2] / h) * m, c.look[1] + 0.6 * m, c.look[2] + (d[0] / h) * m], roll: c.roll + a * 0.004 };
};

// ---------------- lens ----------------
export type Dof = { f: number; dur?: number; cInf: number; focus?: (f: number) => V3 };
export const DOF: Dof[] = [
  { f: 0, cInf: 0 },
  { f: 101, cInf: 13, focus: () => headOf(ARCH2) },          // sandbar close-up: islands soft
  { f: 172, cInf: 0 },                                        // dredger wide: sharp
  { f: 245, cInf: 4, focus: () => headOf(ARCH2) },            // signs readable, softened
  { f: 334, cInf: 5, focus: () => NOZ_V },
  { f: 372, cInf: 0 },
  { f: W(13.28) - 4, dur: 20, cInf: 11, focus: () => headOf(ARCH6) },
  { f: 460, cInf: 6, focus: () => add(GEN, [0, 1.2, 0]) },
  { f: 530, cInf: 10, focus: () => headOf(ARCH8) },
  { f: 608, cInf: 0 },
];
export const dofAt = (f: number) => {
  let i = 0; while (i + 1 < DOF.length && f >= DOF[i + 1].f) i++;
  const d = DOF[i], p = DOF[Math.max(0, i - 1)];
  const k = d.dur ? Math.min(1, (f - d.f) / d.dur) : 1;
  return { cInf: p.cInf + (d.cInf - p.cInf) * k, focus: d.focus ?? (k < 1 ? p.focus : undefined) };
};

// ---------------- dredger spray ----------------
/** spray strength 0..1: on from the start, off at STOP (the jet detaches and falls) */
export const sprayOn = (f: number) => (f < EV.STOP ? 1 : 0);
/** island growth under the arc 0..1 */
export const nzGrow = (f: number) => clamp01(0.45 + 0.55 * smooth((Math.min(f, EV.STOP) - 150) / 200));
