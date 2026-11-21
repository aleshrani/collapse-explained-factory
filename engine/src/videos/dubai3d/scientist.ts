// The Scientist, the "Collapse Explained" host, as an animation rig for the persona engine's Pen (toon.ts).
// Round 5: calmer than round 4 (a smaller soft cloud of white hair, simple goggles) and built from separate parts on
// pivots so videos can pose him by code, fast and cheaply:
//   root (x, y, scale) -> hips -> torso/lab coat (lean about the hips) -> neck -> head group (tilt about the neck, nod, turn)
//   head group: hair cloud, goggles, ears, brows (raise/tilt per side), eyes (blink, look, shock/happy/closed/lid),
//               moustache + mouth (lip-sync visemes and expression mouths)
//   arms: shoulder -> elbow -> hand, two-bone IK to a hand target (bend side per arm), hand shapes (glove)
//   legs: hip -> knee -> foot, two-bone IK to a foot target
// Design space 600 x 1000 units, soles at y = 975, body centred on x = 300 (same as the other casts).
// Follows brand/competitor_design_rules.md: R1 round head ~3.2 heads tall, torso 0.88 x head width; R2 outline 3.4 %
// of head width; R3 brows carry the expression; R4 hair = base + strands + highlights; R5 a few wrinkles; R6 few flat
// colours + one warm accent; R7 dark oval eyes with a catchlight; R8 modest costume detail; R9 original.
import { Pen, INK, mul, mix, blobPts, thickAngle, Blob, curve, rad, mouth as toonMouth, taper, P2, C3, rrect, ellPts } from "./toon";

// ---------------- palette ----------------
export const SCI = {
  skin: "#f1c9a5", hair: "#f3f1ec", hairDk: "#bdb7af", hairHi: "#ffffff", tips: "#ff9a5a",
  coat: "#f6f4ef", coatDk: "#e6e2da", shirt: "#13b5a0", pants: "#2f3550", shoes: "#e2453c", glove: "#ff8a3d",
  goggle: "#ff7a2f", lens: "#9fd4ff", moustache: "#d8d2ca", brow: "#cfc8be",
};
/** the Architect: same rig, a suit, a white hard hat by default (opts.hat: "white" | "yellow" | any hex), empty hands */
export const ARCH: typeof SCI = {
  skin: "#dfac82", hair: "#4a2f22", hairDk: "#2e1d15", hairHi: "#7a5a48", tips: "#4a2f22",
  coat: "#46617f", coatDk: "#3a5270", shirt: "#e3eef8", pants: "#3c5270", shoes: "#5a3b2a", glove: "#dfac82",
  goggle: "#f7f6f2", lens: "#ffffff", moustache: "#4a2f22", brow: "#4a2f22", // goggle = hard hat colour: white by default (architects / engineers on site)
};
export type Look = "scientist" | "architect";
let C: typeof SCI = SCI;
let LOOK: Look = "scientist";
const SH_SKIN: C3 = [0.95, 0.85, 0.83];
const SH_CLOTH: C3 = [0.7, 0.72, 0.8];
const WHITE = "#ffffff", MOUTH_IN = "#5a1e28", TONGUE = "#e86e78";

// ---------------- skeleton (rest pose, design units) ----------------
export const A = 120;                       // head half-width
const B = A * 0.96;                         // head half-height
const U = (2 * A) / 100;                    // 1 % of the head width
const OW = 3.4 * U, IW = 1.6 * U;           // outline, inner line (R2)
const R = 220;                              // body unit
export const SOLE = 975;
const TORSO_BOT = SOLE - 1.3 * R, CHIN = TORSO_BOT - R, HC = CHIN - 0.88 * B, CROWN = HC - B, HIP_Y = TORSO_BOT - 0.12 * R;
const TA_SCI = 0.88 * A, TA_ARCH = 0.76 * A; // torso half-width (R1: scientist 0.88, architect 0.76 of head width)
let TA = TA_SCI;
const UPPER = 0.43 * R, LOWER = 0.43 * R, THIGH = 0.69 * R, SHIN = 0.69 * R;
export const JOINTS = {
  neck: [300, CHIN] as P2, headCentre: [300, HC] as P2,
  shoulderL: [300 - 0.84 * TA_SCI, CHIN + 0.14 * R] as P2, shoulderR: [300 + 0.84 * TA_SCI, CHIN + 0.14 * R] as P2,
  hipL: [300 - 13 * U, HIP_Y] as P2, hipR: [300 + 13 * U, HIP_Y] as P2, hips: [300, HIP_Y] as P2,
};

// ---------------- pose ----------------
export type Viseme = "closed" | "A" | "E" | "O" | "MB" | "FV";
export type MouthShape = Viseme | "smile" | "grin" | "laugh" | "smirk" | "frown" | "shockO";
export type EyeShape = "open" | "shock" | "happy" | "closed" | "lid";
export type HandShape = "relaxed" | "open" | "fist" | "point" | "chart" | "palm";
/** target = hand position in the design space; bend 1 = elbow out (default), -1 = elbow in */
export type Arm = { target: P2; bend?: 1 | -1; hand?: HandShape };
export type Pose = {
  root?: { x?: number; y?: number; scale?: number };
  lean?: number;                                     // degrees, torso about the hips (+ = toward viewer's right)
  head?: { tilt?: number; nod?: number; turn?: number };  // tilt degrees about the neck, nod = y shift in U, turn -1..1 (3/4 to the viewer's left / right)
  brows?: { raise?: [number, number]; tilt?: [number, number] }; // [viewer-left, viewer-right] in U, + = up
  eyes?: { shape?: EyeShape; blink?: number; look?: [number, number] }; // blink 0..1, look -1..1
  mouth?: MouthShape;
  armL?: Arm; armR?: Arm;
  footL?: P2; footR?: P2;                            // foot targets (default: standing)
};

const HANG_L: P2 = [JOINTS.shoulderL[0] - 8 * U, JOINTS.shoulderL[1] + 0.86 * R];
const HANG_R: P2 = [JOINTS.shoulderR[0] + 8 * U, JOINTS.shoulderR[1] + 0.86 * R];
const HANG_AL: P2 = [300 - 0.84 * TA_ARCH - 8 * U, JOINTS.shoulderL[1] + 0.86 * R];
const HANG_AR: P2 = [300 + 0.84 * TA_ARCH + 8 * U, JOINTS.shoulderR[1] + 0.86 * R];
const FX = 300, FY = HC + 0.1 * B;                  // face centre (rest)

/** the six expression presets (pose them, then override any field, e.g. { ...PRESETS.explaining, mouth: "O" }) */
export const PRESETS: Record<"neutral" | "shocked" | "laughing" | "explaining" | "smug" | "facepalm", Pose> = {
  neutral: { brows: { raise: [0, 0] }, eyes: { shape: "open" }, mouth: "smile",
    armL: { target: HANG_L, bend: 1, hand: "relaxed" }, armR: { target: [452, 600], bend: 1, hand: "chart" } },
  shocked: { head: { nod: -3 }, brows: { raise: [9, 9] }, eyes: { shape: "shock" }, mouth: "shockO",
    armL: { target: [FX - A + 16 * U, HC + 0.48 * B], bend: 1, hand: "palm" }, armR: { target: [FX + A - 16 * U, HC + 0.48 * B], bend: 1, hand: "palm" } },
  laughing: { head: { tilt: -6, nod: -2 }, lean: -3, brows: { raise: [4, 4] }, eyes: { shape: "happy" }, mouth: "laugh",
    armL: { target: HANG_L, bend: 1, hand: "relaxed" }, armR: { target: [330, 640], bend: 1, hand: "fist" } },
  explaining: { head: { tilt: 3 }, brows: { raise: [3, 8] }, eyes: { shape: "open", look: [0.5, -0.3] }, mouth: "grin",
    armL: { target: [196, 560], bend: 1, hand: "open" }, armR: { target: [476, 330], bend: 1, hand: "point" } },
  smug: { head: { tilt: 6 }, brows: { raise: [-2, 6], tilt: [0, -3] }, eyes: { shape: "lid", look: [0.5, 0] }, mouth: "smirk",
    armL: { target: [372, 598], bend: 1, hand: "fist" }, armR: { target: [230, 590], bend: 1, hand: "fist" } },
  facepalm: { head: { tilt: -4, nod: 5 }, brows: { raise: [-4, -1] }, eyes: { shape: "closed" }, mouth: "frown",
    armL: { target: HANG_L, bend: 1, hand: "relaxed" }, armR: { target: [FX + 8 * U, FY - 4 * U], bend: 1, hand: "palm" } },
};
/** the architect's presets: same expressions, empty hands (no prop, gestures only), hang targets for his slimmer frame */
const archArm = (a?: Arm): Arm | undefined => !a ? a : a.target === HANG_L ? { ...a, target: HANG_AL } : a.target === HANG_R ? { ...a, target: HANG_AR } : a;
export const ARCH_PRESETS = Object.fromEntries(Object.entries(PRESETS).map(([k, v]) => [k, { ...v, armL: archArm(v.armL), armR: archArm(v.armR) }])) as typeof PRESETS;
ARCH_PRESETS.neutral = { ...ARCH_PRESETS.neutral, armR: { target: HANG_AR, bend: 1, hand: "relaxed" } };
export const presetsFor = (look: Look) => (look === "architect" ? ARCH_PRESETS : PRESETS);
export const VISEMES: Viseme[] = ["closed", "A", "E", "O", "MB", "FV"];

// ---------------- helpers ----------------
const rot = (q: P2, a: number, c: P2): P2 => [c[0] + (q[0] - c[0]) * Math.cos(a) - (q[1] - c[1]) * Math.sin(a), c[1] + (q[0] - c[0]) * Math.sin(a) + (q[1] - c[1]) * Math.cos(a)];
/** two-bone IK: joint position for a limb from root to target with segment lengths l1, l2 (bend picks the side) */
export const ik = (root: P2, target: P2, l1: number, l2: number, bend = 1): [P2, P2] => {
  const dx = target[0] - root[0], dy = target[1] - root[1], d = Math.min(Math.max(Math.hypot(dx, dy), 1e-3), l1 + l2 - 1e-3);
  const a = Math.atan2(dy, dx), c = Math.max(-1, Math.min(1, (l1 * l1 + d * d - l2 * l2) / (2 * l1 * d))), al = Math.acos(c);
  const joint: P2 = [root[0] + l1 * Math.cos(a + bend * al), root[1] + l1 * Math.sin(a + bend * al)];
  const end: P2 = [root[0] + d * Math.cos(a), root[1] + d * Math.sin(a)];
  return [joint, end];
};
/** IK with the joint on the outside of the body (bend = 1, elbows out / knees out) or the inside (bend = -1) */
export const ikSide = (root: P2, target: P2, l1: number, l2: number, bend = 1): [P2, P2] => {
  const a = ik(root, target, l1, l2, 1), b = ik(root, target, l1, l2, -1);
  const outA = Math.abs(a[0][0] - 300) + 0.001 * a[0][1], outB = Math.abs(b[0][0] - 300) + 0.001 * b[0][1];
  return (outA >= outB) === (bend >= 0) ? a : b;
};
const strands = (p: Pen, n: number, f: (t: number) => [P2, P2, P2], w: number, col: string) => {
  for (let i = 0; i < n; i++) { const [a, m, b] = f(i / Math.max(1, n - 1)); p.stroke(curve(a, m, b, 8), w, col); }
};
const tuftPts = (c: P2, dir: number, len: number, wid: number, seed: number): P2[] => {
  const pts: P2[] = [];
  for (let i = 0; i <= 36; i++) {
    const t = (i / 36) * Math.PI * 2, base = 1 + 0.1 * Math.cos(3 * t + seed);
    const along = Math.cos(t) > 0 ? len * Math.pow(Math.cos(t), 0.9) * base : wid * 0.55 * Math.cos(t);
    const across = wid * 0.5 * Math.sin(t) * (Math.cos(t) > 0 ? 1 - 0.3 * Math.cos(t) : 1);
    pts.push([c[0] + along * Math.cos(dir) - across * Math.sin(dir), c[1] + along * Math.sin(dir) + across * Math.cos(dir)]);
  }
  return pts;
};

// ---------------- parts ----------------
/** soft white cloud: 4 side tufts + 1 low top tuft, one shared silhouette, few strands (R4), 2 small orange tips */
const HAIR: { c: P2; dir: number; len: number; wid: number; tip: boolean }[] = [
  { c: [300 - 0.84 * A, HC - 0.2 * B], dir: rad(192), len: 0.42 * A, wid: 0.56 * A, tip: true },
  { c: [300 - 0.78 * A, HC + 0.1 * B], dir: rad(168), len: 0.32 * A, wid: 0.42 * A, tip: false },
  { c: [300 + 0.84 * A, HC - 0.2 * B], dir: rad(-12), len: 0.42 * A, wid: 0.56 * A, tip: true },
  { c: [300 + 0.78 * A, HC + 0.1 * B], dir: rad(12), len: 0.32 * A, wid: 0.42 * A, tip: false },
];
const drawCloud = (p: Pen, light: number, group: typeof HAIR) => {
  const shapes = group.map((t, i) => tuftPts(t.c, t.dir, t.len, t.wid, i * 1.7));
  for (const pts of shapes) p.stroke([...pts, pts[0]], 2 * OW, INK);
  shapes.forEach((pts, i) => p.shadedFill(pts, C.hair, mul(C.hair, [0.88, 0.88, 0.92]), light, group[i].len, 0.35));
  shapes.forEach((pts, i) => {
    const t = group[i], ax = Math.cos(t.dir), ay = Math.sin(t.dir), nx = -ay, ny = ax;
    p.clip(pts, () => {
      strands(p, 3, (q) => { const o = (q - 0.5) * t.wid * 0.6; const a0: P2 = [t.c[0] + nx * o - ax * 0.2 * t.len, t.c[1] + ny * o - ay * 0.2 * t.len];
        const b0: P2 = [t.c[0] + nx * o * 0.5 + ax * 0.85 * t.len, t.c[1] + ny * o * 0.5 + ay * 0.85 * t.len]; return [a0, [(a0[0] + b0[0]) / 2 + nx * 2 * U, (a0[1] + b0[1]) / 2 + ny * 2 * U], b0]; }, 0.9 * U, C.hairDk);
      strands(p, 1, () => { const a0: P2 = [t.c[0], t.c[1]], b0: P2 = [t.c[0] + ax * 0.5 * t.len, t.c[1] + ay * 0.5 * t.len]; return [a0, [(a0[0] + b0[0]) / 2 - nx * 2 * U, (a0[1] + b0[1]) / 2 - ny * 2 * U], b0]; }, 1.3 * U, C.hairHi);
      if (t.tip) p.ell(t.c[0] + ax * t.len, t.c[1] + ay * t.len, 0.16 * t.wid, 0.13 * t.wid, C.tips, 0, 0, 360, (t.dir * 180) / Math.PI);
    });
  });
};

const drawMouth = (p: Pen, m: MouthShape, x: number, y: number) => {
  const u = U, lw = 3.2 * u;
  switch (m) {
    case "closed": p.arc(x, y - 3 * u, 7 * u, 3 * u, 20, 160, lw); break;
    case "MB": p.stroke([[x - 7 * u, y - 1 * u], [x + 7 * u, y - 1 * u]], lw); p.arc(x, y - 1 * u, 5 * u, 2 * u, 20, 160, 1.6 * u, mul(C.skin, [0.7, 0.55, 0.5])); break;
    case "FV": p.ell(x, y, 8 * u, 3.5 * u, MOUTH_IN, 2.6 * u, 0, 180); p.poly(rrect(x - 6 * u, y - 0.5 * u, x + 6 * u, y + 2.5 * u, 1 * u), WHITE, 1.2 * u); break;
    case "A": p.ell(x, y + 2 * u, 9 * u, 9 * u, MOUTH_IN, 2.8 * u); p.ell(x, y + 7 * u, 5 * u, 3 * u, TONGUE, 0); p.ell(x, y + 2 * u, 9 * u, 9 * u, null, 2.8 * u); break;
    case "E": p.ell(x, y + 1 * u, 11 * u, 5 * u, MOUTH_IN, 2.8 * u); p.clip(ellPts(x, y + 1 * u, 11 * u, 5 * u), () => p.poly(rrect(x - 12 * u, y - 5 * u, x + 12 * u, y - 0.5 * u, 0), WHITE, 0)); p.ell(x, y + 1 * u, 11 * u, 5 * u, null, 2.8 * u); break;
    case "O": p.ell(x, y + 1 * u, 5.5 * u, 7 * u, MOUTH_IN, 2.8 * u); break;
    case "shockO": toonMouth(p, "O", x, y, u, 0.9); break;
    case "smile": toonMouth(p, "smileWide", x, y - 1 * u, u, 0.85); break;
    case "grin": toonMouth(p, "grin", x, y - 1 * u, u, 0.9); break;
    case "laugh": toonMouth(p, "laugh", x, y - 1 * u, u, 0.95); break;
    case "smirk": p.arc(x + 3 * u, y - 4 * u, 8 * u, 4.5 * u, 10, 150, lw); p.stroke([[x + 10 * u, y - 4 * u], [x + 12 * u, y - 6 * u]], 2 * u); break;
    case "frown": p.arc(x, y + 3 * u, 6.5 * u, 3.5 * u, 200, 340, lw); break;
  }
};

const hand = (p: Pen, at: P2, dir: number, shape: HandShape, side: number) => {
  if (shape === "chart" && LOOK === "architect") shape = "relaxed"; // the architect carries no prop
  const u = U, g = C.glove, dk = mul(g, [0.75, 0.6, 0.55]);
  const R0 = (q: P2) => rot(q, dir - Math.PI / 2, at);
  if (shape === "palm") { // open glove seen flat (cheeks, facepalm): palm + four fingers + thumb
    for (const k of [-1.5, -0.5, 0.5, 1.5]) { const f = R0([at[0] + k * 4.6 * u, at[1] + 11 * u]); p.ell(f[0], f[1], 2.6 * u, 6 * u, g, IW, 0, 360, ((dir - Math.PI / 2) * 180) / Math.PI + k * 6); }
    const th = R0([at[0] - side * 9 * u, at[1] + 2 * u]); p.ell(th[0], th[1], 2.6 * u, 5 * u, g, IW, 0, 360, ((dir - Math.PI / 2) * 180) / Math.PI - side * 40);
    p.ell(at[0], at[1], 9 * u, 8.5 * u, g, IW * 1.2, 0, 360, ((dir - Math.PI / 2) * 180) / Math.PI);
    p.ell(at[0], at[1], 8 * u, 7.5 * u, g, 0);
    return;
  }
  p.ell(at[0], at[1], 6.5 * u, 7.5 * u, g, IW * 1.2, 0, 360, ((dir - Math.PI / 2) * 180) / Math.PI);
  const th = R0([at[0] - side * 5.5 * u, at[1] - 1 * u]); p.ell(th[0], th[1], 2.6 * u, 4.4 * u, g, IW, 0, 360, ((dir - Math.PI / 2) * 180) / Math.PI - side * 30);
  if (shape === "point") { const f = R0([at[0], at[1] + 10 * u]); p.ell(f[0], f[1], 2.4 * u, 6 * u, g, IW, 0, 360, ((dir - Math.PI / 2) * 180) / Math.PI); }
  if (shape === "open") for (const k of [-1, 0, 1]) { const f = R0([at[0] + k * 4 * u, at[1] + 9 * u]); p.ell(f[0], f[1], 2.2 * u, 5 * u, g, IW, 0, 360, ((dir - Math.PI / 2) * 180) / Math.PI + k * 12); }
  if (shape === "fist") p.arc(at[0], at[1] + 1 * u, 4 * u, 3 * u, 200, 340, 1.2 * u, dk);
  if (shape === "chart") {
    // signature prop: a small tablet showing a chart that climbs and then crashes (the channel in one picture)
    const w = 40 * u, h = 30 * u, x0 = at[0] - 6 * u, y0 = at[1] - h + 6 * u, tilt = -8;
    const R1 = (q: P2) => rot(q, rad(tilt), at);
    const frame = rrect(x0, y0, x0 + w, y0 + h, 3 * u).map(R1), screen = rrect(x0 + 3 * u, y0 + 3 * u, x0 + w - 3 * u, y0 + h - 3 * u, 1.5 * u).map(R1);
    p.poly(frame, "#3b3f52", IW * 1.2);
    p.poly(screen, "#fbf8f2", 0);
    const L = (fx: number, fy: number) => R1([x0 + 3 * u + fx * (w - 6 * u), y0 + 3 * u + fy * (h - 6 * u)]);
    p.stroke([L(0.08, 0.1), L(0.08, 0.9), L(0.94, 0.9)], 1.2 * u, "#9aa6c8");
    const line = [L(0.12, 0.78), L(0.3, 0.6), L(0.45, 0.66), L(0.62, 0.22), L(0.78, 0.86)];
    p.stroke(line, 2.6 * u, "#e2453c");
    const [ex, ey] = line[line.length - 1]; p.poly([[ex - 3.4 * u, ey - 4 * u], [ex + 3.4 * u, ey - 3 * u], [ex + 0.4 * u, ey + 2.6 * u]], "#e2453c", 0);
    p.ell(at[0], at[1], 6.5 * u, 7.5 * u, g, IW * 1.2, 0, 360, ((dir - Math.PI / 2) * 180) / Math.PI);
    const th = R0([at[0] - side * 5.5 * u, at[1] - 1 * u]); p.ell(th[0], th[1], 2.6 * u, 4.4 * u, g, IW, 0, 360, ((dir - Math.PI / 2) * 180) / Math.PI - side * 30);
  }
};

/** a yellow pencil from a (eraser end) to b (point) */
const pencil = (p: Pen, a: P2, b: P2) => {
  const dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy), ux = dx / l, uy = dy / l;
  const at = (t: number): P2 => [a[0] + ux * t, a[1] + uy * t];
  p.band([at(0), at(l - 7 * U)], "#ffc21a", 5 * U, IW, "butt");
  p.stroke([at(1 * U), at(l - 8 * U)], 1 * U, "#e59a00");
  p.band([at(-4 * U), at(0)], "#f28aa0", 5 * U, IW, "butt");
  p.band([at(-0.5 * U), at(1.5 * U)], "#c9ccd4", 5 * U, 0, "butt");
  const n: P2 = [-uy * 2.5 * U, ux * 2.5 * U], t0 = at(l - 7 * U);
  p.poly([[t0[0] + n[0], t0[1] + n[1]], [b[0], b[1]], [t0[0] - n[0], t0[1] - n[1]]], "#f3d3a2", IW);
  const t1 = at(l - 2.4 * U); p.poly([[t1[0] + n[0] * 0.35, t1[1] + n[1] * 0.35], [b[0], b[1]], [t1[0] - n[0] * 0.35, t1[1] - n[1] * 0.35]], INK, 0);
};

// ---------------- the rig ----------------
export type Rigged = { joints: Record<string, P2> };
/** draw the scientist in a pose. Coordinates are the 600 x 1000 design space; set the canvas transform to place him. */
/** how a side character differs from the architect: tie colour (or "none"), glasses off, long hair, what he or she wears, build */
export type PersonLook = { tie?: string; noGlasses?: boolean; hair?: "long" | "short"; garment?: "suit" | "shirt" | "sweater" | "dress" | "kandura"; width?: number };
export const drawScientist = (p: Pen, pose: Pose = PRESETS.neutral, opts: { light?: number; showJoints?: boolean; look?: Look; glasses?: boolean; hat?: string; palette?: Partial<typeof SCI>; pencil?: "ear" | "brim"; rim?: string; person?: PersonLook } = {}): Rigged => {
  const garment = opts.person?.garment ?? "suit", TIE = opts.person?.tie && opts.person.tie !== "none" ? opts.person.tie : (opts.person?.tie === "none" ? (opts.palette?.shirt ?? "#e3eef8") : "#ff7a2f");
  LOOK = opts.look ?? "scientist"; C = { ...(LOOK === "architect" ? ARCH : SCI), ...(opts.palette ?? {}) };
  const arch = LOOK === "architect";
  TA = arch ? TA_ARCH : TA_SCI;
  const light = opts.light ?? rad(-120), thick = thickAngle(light);
  const g = p.g;
  const root = pose.root ?? {};
  g.save();
  if (root.x || root.y || (root.scale && root.scale !== 1)) { const s = root.scale ?? 1; g.translate((root.x ?? 0) + 300 * (1 - s), (root.y ?? 0) + SOLE * (1 - s)); g.scale(s, s); }
  if (opts.person?.width && opts.person.width !== 1) { g.translate(300, 0); g.scale(opts.person.width, 1); g.translate(-300, 0); }
  const lean = rad(pose.lean ?? 0), hips = JOINTS.hips;
  const L = (q: P2) => rot(q, lean, hips);
  const head = pose.head ?? {}, tilt = rad(head.tilt ?? 0), nod = (head.nod ?? 0) * U, turn = head.turn ?? 0;
  const neck = L(JOINTS.neck);
  const shL = L([300 - 0.84 * TA, CHIN + 0.14 * R]), shR = L([300 + 0.84 * TA, CHIN + 0.14 * R]);
  const joints: Record<string, P2> = { hips, neck, shoulderL: shL, shoulderR: shR };

  // legs (IK to the foot targets)
  for (const [side, hip, foot] of [[-1, JOINTS.hipL, pose.footL ?? [300 - 21 * U, SOLE - 5 * U]], [1, JOINTS.hipR, pose.footR ?? [300 + 21 * U, SOLE - 5 * U]]] as const) {
    const [knee, f] = ikSide(hip, foot as P2, THIGH, SHIN, -1);
    p.stroke(curve(hip, knee, f), 2.6 * U * 1.15, mix(C.pants, INK, 0.35));
    const a: P2 = [f[0] - side * 3 * U, f[1]], b: P2 = [f[0] + side * 13 * U, f[1] + 1 * U];
    p.stroke([a, b], 9 * U + 2 * OW * 0.6, INK); p.stroke([a, b], 9 * U, C.shoes);
    p.stroke([[a[0], a[1] + 2.6 * U], [b[0], b[1] + 2.6 * U]], 1.6 * U, mix(C.shoes, WHITE, 0.5));
    joints[side < 0 ? "kneeL" : "kneeR"] = knee; joints[side < 0 ? "footL" : "footR"] = f;
  }

  // head group transform (tilt about the neck, nod) is applied through Pen.rot
  const hdx = neck[0] - JOINTS.neck[0], hdy = neck[1] - JOINTS.neck[1] + nod, htot = tilt + lean;
  const headXf = (q: P2): P2 => { const r = rot(q, htot, JOINTS.neck); return [r[0] + hdx, r[1] + hdy]; };
  const headRot = (fn: () => void) => { const prev = p.rot; p.rot = [htot, JOINTS.neck[0], JOINTS.neck[1], hdx, hdy]; fn(); p.rot = prev; };

  // hair cloud behind the head
  if (!arch) headRot(() => drawCloud(p, light, HAIR));
  if (arch && opts.person?.hair === "long") headRot(() => p.shadedFill([[300 - 1.12 * A, HC - 0.5 * B], [300 - 1.22 * A, HC + 1.5 * B], [300 - 0.6 * A, HC + 1.62 * B], [300 + 0.6 * A, HC + 1.62 * B], [300 + 1.22 * A, HC + 1.5 * B], [300 + 1.12 * A, HC - 0.5 * B], [300, CROWN - 0.1 * B]], C.hair, mul(C.hair, [0.88, 0.88, 0.92]), light, A, 0.3));

  // torso: lab coat (lean about the hips)
  const T: Blob = { a: TA, b: 0.5 * (TORSO_BOT - (CHIN - 0.22 * R)) + 0.1 * R, nTop: 2.2, nBot: 3.4, egg: 0.08, asym: 0, rot: 0, noise: 0.004, seed: 12 };
  const prevRot = p.rot; p.rot = lean ? [lean, hips[0], hips[1]] : null;
  const tp = blobPts(300, TORSO_BOT - T.b + 0.1 * R, arch ? { ...T, nTop: 2.6, nBot: 2.7, egg: -0.08 } : T); // suit: squarer shoulders, tapered waist
  p.gradFill(tp, C.coat, mul(C.coat, SH_CLOTH), light);
  if (arch && garment !== "suit") p.clip(tp, () => {
    // shirt / sweater / dress / kandura: no jacket, tie or lapels, just a neckline and a few seams
    if (garment === "shirt") { for (const s of [-1, 1]) p.poly([[300 + s * 2 * U, CHIN - 0.05 * R], [300 + s * 0.3 * TA, CHIN - 0.08 * R], [300 + s * 0.2 * TA, CHIN + 0.14 * R]], mul(C.coat, [1.08, 1.08, 1.08]), IW); p.stroke([[300, CHIN + 0.1 * R], [300, TORSO_BOT + 0.2 * R]], IW); for (const k of [0.3, 0.55, 0.8]) p.ell(300, CHIN + k * R, 1.8 * U, 1.8 * U, "#f4f1e8", 0.8 * U); }
    else if (garment === "sweater") { p.ell(300, CHIN + 0.02 * R, 0.3 * TA, 0.07 * R, mul(C.coat, [0.8, 0.8, 0.8]), IW); for (const k of [0.45, 0.7, 0.95]) p.stroke([[300 - 0.74 * TA, CHIN + k * R], [300 + 0.74 * TA, CHIN + k * R]], 0.8 * U, mul(C.coat, [0.86, 0.86, 0.86])); p.stroke([[300 - 0.74 * TA, TORSO_BOT + 0.15 * R], [300 + 0.74 * TA, TORSO_BOT + 0.15 * R]], 3 * U, mul(C.coat, [0.8, 0.8, 0.8])); }
    else { p.poly([[300 - 0.34 * TA, CHIN - 0.04 * R], [300 + 0.34 * TA, CHIN - 0.04 * R], [300, CHIN + 0.3 * R]], C.skin, IW); if (garment === "kandura") p.stroke([[300, CHIN + 0.3 * R], [300, TORSO_BOT + 0.2 * R]], IW); }
  });
  else if (arch) p.clip(tp, () => {
    // suit: light blue shirt V, orange tie, notched lapels, two buttons, breast pocket line, hem seam
    p.poly([[300 - 0.3 * TA, CHIN - 0.05 * R], [300 + 0.3 * TA, CHIN - 0.05 * R], [300, CHIN + 0.5 * R]], C.shirt, IW);
    p.poly([[300 - 5 * U, CHIN + 0.02 * R], [300 + 5 * U, CHIN + 0.02 * R], [300 + 6.5 * U, CHIN + 0.4 * R], [300, CHIN + 0.48 * R], [300 - 6.5 * U, CHIN + 0.4 * R]], TIE, IW);
    p.poly([[300 - 4 * U, CHIN - 0.02 * R], [300 + 4 * U, CHIN - 0.02 * R], [300 + 3 * U, CHIN + 0.05 * R], [300 - 3 * U, CHIN + 0.05 * R]], mul(TIE, [0.85, 0.8, 0.8]), IW * 0.8);
    for (const s of [-1, 1]) p.poly([[300 + s * 0.3 * TA, CHIN - 0.05 * R], [300 + s * 0.62 * TA, CHIN + 0.18 * R], [300 + s * 0.44 * TA, CHIN + 0.24 * R], [300 + s * 0.26 * TA, CHIN + 0.28 * R], [300 + s * 0.04 * TA, CHIN + 0.58 * R]], C.coatDk, IW);
    p.stroke([[300 + 0.04 * TA, CHIN + 0.58 * R], [300 + 0.02 * TA, TORSO_BOT + 0.2 * R]], IW);
    for (const k of [0.68, 0.84]) p.ell(300 + 0.12 * TA, CHIN + k * R, 2.4 * U, 2.4 * U, "#2a3a50", 1 * U);
    p.stroke([[300 - 0.66 * TA, CHIN + 0.44 * R], [300 - 0.3 * TA, CHIN + 0.44 * R]], IW);
    p.poly([[300 - 0.6 * TA, CHIN + 0.44 * R], [300 - 0.52 * TA, CHIN + 0.38 * R], [300 - 0.44 * TA, CHIN + 0.44 * R]], "#ffffff", 0.8 * U);
    for (const s of [-1, 1]) p.stroke([[300 + s * 0.2 * TA, CHIN + 0.95 * R], [300 + s * 0.6 * TA, CHIN + 0.95 * R]], IW);
    for (const s of [-1, 1]) { // lapel edge light, waist folds (subtle fabric shading)
      p.stroke([[300 + s * 0.31 * TA, CHIN - 0.03 * R], [300 + s * 0.6 * TA, CHIN + 0.17 * R]], 1.2 * U, mix(C.coat, "#ffffff", 0.35));
      p.stroke(curve([300 + s * 0.78 * TA, CHIN + 0.62 * R], [300 + s * 0.7 * TA, CHIN + 0.72 * R], [300 + s * 0.76 * TA, CHIN + 0.82 * R]), 1 * U, mul(C.coat, [0.78, 0.8, 0.86]));
      p.stroke(curve([300 + s * 0.5 * TA, CHIN + 1.0 * R], [300 + s * 0.46 * TA, CHIN + 1.06 * R], [300 + s * 0.52 * TA, CHIN + 1.12 * R]), 1 * U, mul(C.coat, [0.78, 0.8, 0.86]));
    }
    p.poly([[300 - 0.95 * TA, CHIN], [300 - 0.55 * TA, CHIN], [300 - 0.75 * TA, TORSO_BOT + 0.3 * R], [300 - 1.1 * TA, TORSO_BOT + 0.3 * R]], "rgba(255,255,255,0.07)", 0);
  });
  else p.clip(tp, () => {
    p.poly([[300 - 0.32 * TA, CHIN - 0.05 * R], [300 + 0.32 * TA, CHIN - 0.05 * R], [300, CHIN + 0.42 * R]], C.shirt, IW);
    p.stroke([[300, CHIN + 0.42 * R], [300, TORSO_BOT + 0.2 * R]], IW);
    for (const s of [-1, 1]) p.poly([[300 + s * 0.32 * TA, CHIN - 0.05 * R], [300 + s * 0.7 * TA, CHIN + 0.26 * R], [300 + s * 0.18 * TA, CHIN + 0.38 * R], [300, CHIN + 0.42 * R]], C.coatDk, IW);
    const bx = 300 - 0.62 * TA, by = CHIN + 0.46 * R;
    for (const [k, c] of [[0, "#e2453c"], [1, "#2456f5"]] as const) p.stroke([[bx + (5 + k * 7) * U, by - 6 * U], [bx + (5 + k * 7) * U, by + 4 * U]], 2.6 * U, c);
    p.poly(rrect(bx, by, bx + 0.34 * TA, by + 0.15 * R, 1.5 * U), C.coatDk, IW);
    for (const s of [-1, 1]) p.poly(rrect(300 + s * 0.25 * TA - (s < 0 ? 0.42 * TA : 0), CHIN + 0.86 * R, 300 + s * 0.25 * TA + (s > 0 ? 0.42 * TA : 0), CHIN + 1.02 * R, 1.5 * U), C.coatDk, IW);
  });
  p.inkRing(tp, OW, thick);
  if (!arch) p.ell(300, CHIN + 0.02 * R, 0.24 * 2 * A, 0.045 * R, C.shirt, IW);
  else if (garment === "suit") {
    for (const s of [-1, 1]) p.poly([[300 + s * 2 * U, CHIN - 0.03 * R], [300 + s * 0.34 * TA, CHIN - 0.08 * R], [300 + s * 0.24 * TA, CHIN + 0.12 * R]], C.shirt, IW);
    p.poly([[300 - 4.5 * U, CHIN - 0.02 * R], [300 + 4.5 * U, CHIN - 0.02 * R], [300 + 3 * U, CHIN + 0.07 * R], [300 - 3 * U, CHIN + 0.07 * R]], mul(TIE, [0.9, 0.84, 0.84]), IW);
    p.stroke([[300 - 1.5 * U, CHIN], [300 + 1 * U, CHIN + 0.05 * R]], 0.8 * U, mul(TIE, [0.7, 0.6, 0.6]));
  }
  if (arch && (garment === "dress" || garment === "kandura")) {
    const top = TORSO_BOT - 0.15 * R, hem = garment === "kandura" ? SOLE - 0.1 * R : TORSO_BOT + 0.95 * R, w0 = 0.62 * TA, w1 = garment === "kandura" ? 1.0 * TA : 1.2 * TA;
    const sk: P2[] = [[300 - w0, top], [300 + w0, top], [300 + w1, hem], [300 - w1, hem]];
    p.gradFill(sk, C.coat, mul(C.coat, SH_CLOTH), light); p.stroke([...sk, sk[0]], OW * 0.8, INK);
    if (garment === "kandura") p.stroke([[300, top], [300, hem]], IW);
  }
  p.rot = prevRot;

  // arms (IK) behind the head unless the hand is on the face
  const armTarget = (a: Arm | undefined, def: P2) => (a?.target ?? def);
  const arms = [
    { side: -1, sh: shL, a: pose.armL, def: arch ? HANG_AL : HANG_L },
    { side: 1, sh: shR, a: pose.armR, def: arch ? HANG_AR : HANG_R },
  ].map((x) => {
    const tgt0 = armTarget(x.a, x.def), tgt = x.a?.hand === "palm" ? headXf(tgt0) : tgt0, [el, wr] = ikSide(x.sh, tgt, UPPER, LOWER, x.a?.bend ?? 1);
    joints[x.side < 0 ? "elbowL" : "elbowR"] = el; joints[x.side < 0 ? "handL" : "handR"] = wr;
    return { ...x, el, wr, shape: x.a?.hand ?? "relaxed", onFace: x.a?.hand === "palm" };
  });
  const drawArm = (x: (typeof arms)[number]) => {
    p.stroke(curve(x.sh, x.el, x.wr), 2.6 * U, mix(C.coat, INK, 0.3));
    hand(p, x.wr, Math.atan2(x.wr[1] - x.el[1], x.wr[0] - x.el[0]), x.shape, x.side);
  };
  arms.filter((x) => !x.onFace).forEach(drawArm);

  // head
  headRot(() => {
    const fx = FX + 9 * U * turn, fy = FY;
    if (arch && opts.pencil === "ear") pencil(p, [300 + A - 4 * U, HC - 0.5 * B], [300 + A + 20 * U, HC + 0.26 * B]);
    for (const s of turn > 0 ? [-1] : turn < 0 ? [1] : [-1, 1]) { const ex = 300 + s * (A + 1 * U) + 10 * U * turn, ey = HC + 0.08 * B; p.ell(ex, ey, 6.5 * U, 9 * U, s < 0 ? C.skin : mul(C.skin, SH_SKIN), IW * 1.3); }
    const H: Blob = { a: A, b: B, nTop: 2.0, nBot: 2.25, egg: -0.04, asym: 0.06 * turn, rot: 0, noise: 0.004, seed: 7 };
    const hp = blobPts(300, HC, H);
    p.shadedFill(hp, C.skin, mul(C.skin, SH_SKIN), light, A);
    if (opts.rim) p.clip(hp, () => p.stroke([...hp, hp[0]].map(([x, y]) => [x - 5 * U, y - 3 * U] as P2), 8 * U, opts.rim!));
    if (arch) p.clip(hp, () => { // short brown hair under the hat, with sideburns
      const hl = HC - 0.5 * B;
      p.shadedFill([[300 - 1.2 * A, HC + 0.12 * B], [300 - 0.86 * A, HC + 0.1 * B], [300 - 0.8 * A, hl], [300 + 0.8 * A, hl], [300 + 0.86 * A, HC + 0.1 * B], [300 + 1.2 * A, HC + 0.12 * B], [300 + 1.2 * A, CROWN - 30], [300 - 1.2 * A, CROWN - 30]], C.hair, C.hairDk, light, A, 0.3);
      strands(p, 6, (t) => { const x = 300 + (t - 0.5) * 1.5 * A; return [[x, hl - 0.02 * B], [x + 0.03 * A, hl - 0.1 * B], [x + 0.06 * A, hl - 0.16 * B]]; }, 1 * U, C.hairHi);
      p.stroke([[300 - 0.86 * A, HC + 0.1 * B], [300 - 0.8 * A, hl], [300 + 0.8 * A, hl], [300 + 0.86 * A, HC + 0.1 * B]], IW);
    });
    else p.clip(hp, () => { // low soft fringe
      const fr: P2[] = [];
      for (let i = 0; i <= 10; i++) fr.push([300 - 1.15 * A + (2.3 * A * i) / 10, HC - (0.6 + 0.04 * Math.sin(i * 2.1)) * B + (i === 0 || i === 10 ? 0.3 * B : 0)]);
      p.shadedFill([...fr, [300 + 1.2 * A, CROWN - 30], [300 - 1.2 * A, CROWN - 30]], C.hair, mul(C.hair, [0.88, 0.88, 0.92]), light, A, 0.3);
      strands(p, 8, (t) => { const x = 300 + (t - 0.5) * 1.8 * A; return [[x - 0.08 * A, CROWN], [x + 0.04 * A, HC - 0.74 * B], [x + 0.08 * A, HC - 0.62 * B]]; }, 0.9 * U, C.hairDk);
      p.stroke(fr, IW);
    });
    p.inkRing(hp, OW, thick);
    // simple goggles resting on the hairline (scientist) / yellow hard hat (architect)
    const gy = HC - 0.7 * B;
    if (arch && garment === "kandura") {   // ghutra (white head cloth) with a black agal ring
      p.poly([[300 - 1.02 * A, HC + 0.75 * B], [300 - 1.14 * A, HC - 0.2 * B], [300 - 0.95 * A, HC - 0.95 * B], [300, CROWN - 0.16 * B], [300 + 0.95 * A, HC - 0.95 * B], [300 + 1.14 * A, HC - 0.2 * B], [300 + 1.02 * A, HC + 0.75 * B], [300 + 0.8 * A, HC + 0.2 * B], [300 + 0.78 * A, HC - 0.5 * B], [300, HC - 0.62 * B], [300 - 0.78 * A, HC - 0.5 * B], [300 - 0.8 * A, HC + 0.2 * B]], "#f6f4ee", OW);
      p.stroke([[300 - 0.92 * A, HC - 0.82 * B], [300, HC - 0.98 * B], [300 + 0.92 * A, HC - 0.82 * B]], 3.2 * U, "#1d1d20");
    }
    if (arch && opts.hat !== "none") {
      const hatC = opts.hat === "white" ? "#f7f6f2" : opts.hat === "yellow" ? "#ffc21a" : opts.hat ?? C.goggle, white = Math.min(parseInt(hatC.slice(1, 3), 16), parseInt(hatC.slice(3, 5), 16), parseInt(hatC.slice(5, 7), 16)) > 0xd0;
      const yb = HC - 0.52 * B, dw = 1.04 * A, dh = 0.7 * B, dome: P2[] = [];
      for (let i = 0; i <= 40; i++) { const t = Math.PI + (Math.PI * i) / 40, c = Math.cos(t), sn = Math.sin(t); dome.push([300 + dw * Math.sign(c) * Math.abs(c) ** 0.75, yb + dh * Math.sign(sn) * Math.abs(sn) ** 0.8]); }
      p.ell(300, yb + 1 * U, 1.22 * A, 0.1 * B, mul(hatC, white ? [0.9, 0.91, 0.94] : [0.86, 0.78, 0.7]), OW * 0.8);
      p.shadedFill(dome, hatC, mul(hatC, white ? [0.84, 0.86, 0.9] : [0.8, 0.68, 0.6]), light, dw, 0.4);
      p.clip(dome, () => { p.band([[300, yb + 4 * U], [300, yb - dh - 4 * U]], mix(hatC, "#ffffff", 0.25), 12 * U, 1.2 * U); p.arc(300 - 0.45 * dw, yb - 0.55 * dh, 0.22 * dw, 0.18 * dh, 200, 280, 2.4 * U, (white ? "#ffffff" : "#fff3c4")); });
      p.inkRing(dome, OW, thick);
      p.stroke([[300 - 1.1 * A, yb + 1 * U], [300 + 1.1 * A, yb + 1 * U]], 1.2 * U, mul(hatC, white ? [0.7, 0.72, 0.78] : [0.7, 0.6, 0.5]));
      p.stroke([[300 - 1.0 * A, yb - 1.6 * U], [300 - 0.3 * A, yb - 1.6 * U]], 1.4 * U, (white ? "#ffffff" : "#fff3c4"));
      p.ell(300 - 0.18 * dw, yb - 0.82 * dh, 2.4 * U, 1.6 * U, "#fff8dc", 0);
      if (opts.pencil === "brim") pencil(p, [300 - 0.98 * A, yb - 6 * U], [300 - 0.22 * A, yb - 10 * U]);
    }
    if (!arch) {
    p.band([[300 - 1.0 * A, gy + 2 * U], [300 + 1.0 * A, gy + 2 * U]], "#3b3f52", 4 * U, 1 * U);
    for (const s of [-1, 1]) { const x = fx + s * 14 * U; p.ell(x, gy, 10.5 * U, 8.5 * U, C.goggle, IW * 1.2); p.ell(x, gy, 7 * U, 5.5 * U, C.lens, IW); }
    }
    // face: blush, wrinkles (R5), brows (R3), eyes (R7), nose, moustache, mouth
    const ey = fy - 2 * U, br = pose.brows ?? {}, raise = br.raise ?? [0, 0], btilt = br.tilt ?? [0, 0];
    for (const s of [-1, 1]) p.ell(fx + s * 27 * U, fy + 12 * U, 7 * U, 4 * U, "rgba(255,110,110,0.26)", 0);
    for (const s of [-1, 1]) p.stroke([[fx + s * 26 * U, ey], [fx + s * 30 * U, ey + 3 * U]], IW * 0.6, mul(C.skin, [0.8, 0.64, 0.58]));
    const es = pose.eyes ?? {}, shape = es.shape ?? "open", blink = es.blink ?? 0, look = es.look ?? [0, 0];
    for (const s of [-1, 1]) {
      const i = s < 0 ? 0 : 1, x = fx + s * 15 * U * (1 - 0.08 * Math.abs(turn)), by = ey - 17 * U - raise[i] * U;
      taper(p, [x - s * 9 * U, by + btilt[i] * U * s], [x + s * 9 * U, by - 2 * U - btilt[i] * U * s], 6 * U, 3.6 * U, C.brow);
      p.stroke([[x - s * 9 * U, by + btilt[i] * U * s + 2.2 * U], [x + s * 9 * U, by - 2 * U - btilt[i] * U * s + 1.6 * U]], 1.3 * U, mul(C.brow, [0.62, 0.62, 0.66]));
      const lx = x + look[0] * 2 * U, ly = ey + look[1] * 2 * U;
      if (shape === "happy") p.arc(x, ey + 2 * U, 7 * U, 5 * U, 200, 340, 3.2 * U);
      else if (shape === "closed" || blink > 0.85) p.arc(x, ey, 6 * U, 2 * U, 20, 160, 3 * U);
      else if (shape === "shock") { p.ell(x, ey, 9.5 * U, 10.5 * U * (1 - blink), WHITE, IW * 1.3); p.dot(lx, ly + 1 * U, 3 * U); }
      else {
        const ry = 6 * U * (1 - blink) * (shape === "lid" ? 0.6 : 1);
        p.ell(lx, ly + (shape === "lid" ? 2 * U : 0), 4.6 * U, ry, INK, 0); if (ry > 2 * U) p.dot(lx + 1.6 * U, ly - 2 * U, 1.5 * U, WHITE);
        if (shape === "lid") p.stroke([[x - 6 * U, ey - 1.5 * U], [x + 6 * U, ey - 1.5 * U]], 2.6 * U);
      }
    }
    if ((arch && !opts.person?.noGlasses) || opts.glasses) { // the architect always wears the channel's rectangular frames
      for (const s of [-1, 1]) {
        const x = fx + s * 15 * U * (1 - 0.08 * Math.abs(turn)), fr = rrect(x - 11 * U, ey - 9.5 * U, x + 11 * U, ey + 7 * U, 4 * U);
        p.poly(fr, "rgba(225,240,255,0.12)", 0);
        p.stroke([...fr, fr[0]], 2.4 * U, "#2b2a33");
        p.stroke([[x - 10 * U, ey - 9 * U], [x + 10 * U, ey - 9 * U]], 3.2 * U, "#2b2a33");
        p.stroke([[x + 4 * U, ey + 3 * U], [x + 8 * U, ey - 1 * U]], 1.2 * U, "rgba(255,255,255,0.7)");
      }
      p.stroke(curve([fx - 4 * U, ey - 6 * U], [fx, ey - 8 * U], [fx + 4 * U, ey - 6 * U]), 2.4 * U, "#2b2a33");
      for (const s of [-1, 1]) p.stroke([[fx + s * 26 * U, ey - 6 * U], [fx + s * 36 * U, ey - 4 * U]], 2.4 * U, "#2b2a33");
    }
    { const ns = turn < 0 ? -1 : 1; p.stroke(curve([fx + ns * 2 * U + 4 * U * turn, ey + 7 * U], [fx + ns * 6 * U + 4 * U * turn, ey + 11 * U], [fx + 4 * U * turn, ey + 13 * U]), IW * 1.1, mul(C.skin, [0.62, 0.45, 0.4])); }
    const m = pose.mouth ?? "smile", my = ey + 23 * U, open = m === "A" || m === "O" || m === "laugh" || m === "shockO" ? 1.5 * U : 0;
    drawMouth(p, m, fx, my);
    if (!arch) for (const s of [-1, 1]) {
      const mp = blobPts(fx + s * 6.5 * U, my - 8.5 * U - open, { a: 7.5 * U, b: 3.2 * U, nTop: 2, nBot: 2, egg: 0, asym: 0, rot: rad(s * 12), noise: 0.01, seed: 4 + s });
      p.poly(mp, C.moustache, IW * 0.8);
    }
    joints.headCentre = [300, HC];
  });

  arms.filter((x) => x.onFace).forEach((x) => { // hands on the face: drawn over the head, transformed with it
    const prev = p.rot; drawArm(x); p.rot = prev;
  });

  if (opts.showJoints) for (const [, q] of Object.entries(joints)) { p.ell(q[0], q[1], 5 * U, 5 * U, "#ff2d55", 1.2 * U); }
  g.restore();
  return { joints };
};
