// Mascot persona concepts drawn in the engine's own language (toon.ts): 600 x 1000 design canvas, soles at y = 975,
// plum variable-width ink (inkRing, thick side away from the light), painted crescents (shadedFill / gradFill),
// stick limbs with ink-dot hands, and the shared face parts (eye / mouth / taper brows from the FACE library).
// Four concepts, each in a calm and a panicked pose:
//   dummy   - crash-test dummy: yellow segmented body, grey joint discs, black/yellow quadrant targets, chest number
//   capy    - capybara: chunky brown pear body, boxy head with big snout, sleepy lids, a tangerine balanced on top
//   hivis   - everyman safety inspector: oversized orange hard hat, moustache, hi-vis vest, clipboard
//   chicken - the panic chicken: white egg body, red comb, beak + wattle, wing arms, orange stick legs with toes
import {
  Pen, INK, mul, mix, shade, blobPts, headBlob, thickAngle, Blob, curve, rnd, rad, eye, mouth, taper, faceFront, Expr, P2, C3,
  rrect, EyeK, MouthK,
} from "./toon";

export type PersonaKind = "dummy" | "capy" | "hivis" | "chicken";
export const PERSONAS: PersonaKind[] = ["dummy", "capy", "hivis", "chicken"];
export type PersonaOpts = { panic: boolean; light: number; seed: number; blink?: number };

const WHITE = "#ffffff";
const SWEAT = "#9fd4ff";
const SH_YEL: C3 = [0.86, 0.74, 0.7];
const SH_FUR: C3 = [0.7, 0.66, 0.74];
const SH_WHITE: C3 = [0.8, 0.8, 0.9];
const SH_ORANGE: C3 = [0.8, 0.62, 0.62];

// ---------------- shared helpers ----------------
/** ink-rimmed capsule (segmented limbs, straps) */
const capsule = (p: Pen, pts: P2[], fill: string, w: number, rim: number) => {
  p.stroke(pts, w + 2 * rim, INK);
  p.stroke(pts, w, fill);
};
const foot = (p: Pen, a: P2, b: P2, w: number, col: string) => {
  if (col !== INK) p.stroke([a, b], w + 3, INK);
  p.stroke([a, b], w, col);
};
/** quadrant crash-test target: yellow/black pie quarters, ink rim, cross hair */
const target = (p: Pen, x: number, y: number, r: number, rim: number, rot = 0) => {
  p.ell(x, y, r, r, "#f7cf3d", 0);
  for (const a0 of [0, 180]) {
    const pts: P2[] = [[x, y]];
    for (let i = 0; i <= 12; i++) { const a = rad(a0 + rot + (90 * i) / 12); pts.push([x + r * Math.cos(a), y + r * Math.sin(a)]); }
    p.poly(pts, INK, 0);
  }
  p.ell(x, y, r, r, null, rim);
};
/** sweat drops flying off a panicking head + two tremble ticks on each side */
const panicMarks = (p: Pen, cx: number, cy: number, R: number, u: number, seed: number) => {
  const drops: [number, number, number][] = [[-1.05, -0.55, 0.9], [1.12, -0.35, 1], [-0.95, 0.05, 0.7]];
  for (const [dx, dy, s] of drops) {
    const x = cx + dx * R, y = cy + dy * R, r = 4.2 * u * s, side = Math.sign(dx);
    // teardrop pointing back at the head
    const pts: P2[] = [];
    for (let i = 0; i <= 20; i++) { const a = rad(-90 + (360 * i) / 20); pts.push([x + r * Math.cos(a), y + r * 1.15 * Math.sin(a)]); }
    pts.splice(5, 0, [x - side * r * 0.4, y - r * 2.6]);
    p.poly(pts, SWEAT, 2 * u);
  }
  for (const side of [-1, 1]) for (let k = 0; k < 2; k++) {
    const x = cx + side * (R * 1.32 + k * 7 * u), y = cy + R * (0.35 + 0.18 * k) + 4 * u * (rnd(seed, 40 + k) - 0.5);
    p.arc(x, y, 5 * u, 10 * u, side > 0 ? -50 : 130, side > 0 ? 50 : 230, 2.4 * u);
  }
};
/** brows from the face library offsets: [inner, outer] in u, + = down */
const brows = (p: Pen, x0: number, y0: number, sep: number, u: number, dI: number, dO: number, w = 5) => {
  for (const side of [-1, 1]) {
    const x = x0 + side * sep;
    taper(p, [x - side * 8.5 * u, y0 + dI * u], [x + side * 8.5 * u, y0 + dO * u], w * u, w * 0.5 * u);
  }
};

type Frame = { HH: number; u: number; W: number; hc: number; chin: number; torsoBot: number; hipY: number; T: Blob; tcx: number; tcy: number; tp: P2[] };
const frame = (H: Blob, legs: number, torso: number, tw: number, sole = 975, sink = 0): Frame => {
  const W = 2 * H.a, HH = 2 * H.b, u = W / 100;
  const torsoBot = sole - legs * HH, chin = torsoBot - torso * HH, hc = chin - H.b + sink * H.b, hipY = torsoBot - 0.12 * HH;
  const T: Blob = { a: ((tw / 2) * W) / 1.06, b: 0.5 * (torsoBot - (chin - 0.25 * HH)), nTop: 2.2, nBot: 2.6, egg: 0.12, asym: 0, rot: 0, noise: 0.006, seed: H.seed + 7 };
  const tcx = 300, tcy = torsoBot - T.b;
  return { HH, u, W, hc, chin, torsoBot, hipY, T, tcx, tcy, tp: blobPts(tcx, tcy, T) };
};
/** arm key points: calm = hanging, panic = flung up (left higher than right, so the pair is not symmetric) */
const armPts = (F: Frame, side: number, panic: boolean, reach = 1): [P2, P2, P2] => {
  const { T, tcx, chin, HH, u } = F, S: P2 = [tcx + side * 0.85 * T.a, chin + 0.12 * HH];
  if (!panic) {
    const ex = tcx + side * (1.12 * T.a + 4 * u);
    return [S, [ex, S[1] + 0.48 * HH * reach], [ex + side * 3 * u, S[1] + 0.92 * HH * reach]];
  }
  const hi = side < 0 ? 1.12 : 0.92;
  return [S, [tcx + side * (1.12 * T.a + 16 * u), S[1] - 0.18 * HH * reach * hi], [tcx + side * (1.22 * T.a + 30 * u), S[1] - 0.62 * HH * reach * hi]];
};
/** leg key points: calm = straight stance, panic = knock-kneed cower (knees in, feet out) */
const legPts = (F: Frame, side: number, panic: boolean, sole = 975, spread = 1): [P2, P2, P2] => {
  const { hipY, u } = F, hx = 300 + side * 15 * u * spread;
  if (!panic) { const fx = 300 + side * 22 * u * spread; return [[hx, hipY], [(hx + fx) / 2 + side * 1.5 * u, (hipY + sole) / 2], [fx, sole - 4 * u]]; }
  const fx = 300 + side * 36 * u * spread;
  return [[hx, hipY], [300 + side * 3 * u, (hipY + sole) / 2 + 4 * u], [fx, sole - 4 * u]];
};

// ---------------- 1. crash-test dummy ----------------
const YEL = "#f0b431", JOINT = "#4a4954", JOINT_HI = "#6c6b78";
const dummy = (p: Pen, o: PersonaOpts) => {
  const { panic, light, seed } = o, thick = thickAngle(light);
  const H: Blob = { ...headBlob(seed, 112, 0), nTop: 2.05, nBot: 2.4, egg: -0.06, asym: 0, rot: rad(panic ? -4 : 0) };
  const F = frame(H, 1.36, 1.1, 0.88);
  const { u, HH, T, tcx, chin, torsoBot, tp } = F, ow = 5 * u;
  const hc = F.hc - 0.1 * HH; // a visible neck segment lifts the head
  const ysh = mul(YEL, SH_YEL);
  // legs: thigh + shin capsules with knee / hip discs, black shoes
  for (const side of [-1, 1]) {
    const [h, k, f] = legPts(F, side, panic);
    const knee: P2 = [k[0], k[1]];
    capsule(p, [h, knee], YEL, 9 * u, 2.2 * u);
    capsule(p, [knee, [f[0], f[1] - 6 * u]], YEL, 8 * u, 2.2 * u);
    p.ell(knee[0], knee[1], 6.5 * u, 6.5 * u, JOINT, 2 * u); p.dot(knee[0], knee[1], 2 * u, JOINT_HI);
    foot(p, [f[0] - side * 4 * u, f[1]], [f[0] + side * 14 * u, f[1] + 0.5 * u], 9 * u, "#2e2c35");
  }
  // pelvis block peeking under the torso
  p.poly(rrect(tcx - 0.62 * T.a, torsoBot - 0.16 * HH, tcx + 0.62 * T.a, torsoBot + 0.07 * HH, 7 * u), JOINT, 2.4 * u);
  for (const side of [-1, 1]) { p.ell(tcx + side * 0.42 * T.a, torsoBot - 0.02 * HH, 5 * u, 5 * u, JOINT_HI, 1.6 * u); }
  // arms behind the torso: upper arm + forearm capsules, elbow discs, grey mitts
  const arms = [-1, 1].map((s) => armPts(F, s, panic));
  for (const [S, E, Hn] of arms) {
    capsule(p, [S, E], YEL, 8.5 * u, 2.2 * u);
    capsule(p, [E, Hn], YEL, 7.5 * u, 2.2 * u);
    p.ell(E[0], E[1], 6 * u, 6 * u, JOINT, 2 * u); p.dot(E[0], E[1], 1.8 * u, JOINT_HI);
    p.ell(Hn[0], Hn[1], 7 * u, 7 * u, JOINT, 2.2 * u);
  }
  // neck: two grey ring segments
  const nw = 15 * u, n0 = hc + H.b - 8 * u, n1 = chin + 6 * u;
  p.poly(rrect(tcx - nw, n0, tcx + nw, n1, 4 * u), JOINT, 2.4 * u);
  p.stroke([[tcx - nw + 2 * u, (n0 + n1) / 2], [tcx + nw - 2 * u, (n0 + n1) / 2]], 2 * u, INK);
  // torso: chest plate over a darker abdomen, seam + rivets, quadrant target, chest number
  const Tq: P2[] = blobPts(tcx, F.tcy, { ...T, nTop: 2.7, nBot: 2.4 });
  p.gradFill(Tq, YEL, ysh, light);
  const seamY = chin + 0.5 * HH;
  p.clip(Tq, () => {
    const belly: P2[] = [[tcx - 2 * T.a, seamY], ...curve([tcx - T.a * 1.05, seamY], [tcx, seamY + 9 * u], [tcx + T.a * 1.05, seamY]), [tcx + 2 * T.a, seamY], [tcx + 2 * T.a, torsoBot + HH], [tcx - 2 * T.a, torsoBot + HH]];
    p.poly(belly, mix(YEL, "#b8741c", 0.28), 0);
    p.stroke(curve([tcx - T.a * 1.05, seamY], [tcx, seamY + 9 * u], [tcx + T.a * 1.05, seamY]), 2.6 * u);
    // ribbed abdomen: two thin rings
    for (const k of [0.32, 0.6]) { const y = seamY + k * (torsoBot - seamY); p.stroke(curve([tcx - T.a, y], [tcx, y + 7 * u], [tcx + T.a, y]), 1.6 * u, mix(YEL, INK, 0.55)); }
    for (const side of [-1, 1]) { p.dot(tcx + side * 0.72 * T.a, seamY - 6 * u, 2.6 * u, INK); p.dot(tcx + side * 0.72 * T.a, seamY - 6 * u, 1.4 * u, "#f6d77a"); }
    // shoulder plate line
    p.stroke(curve([tcx - 0.6 * T.a, chin - 0.05 * HH], [tcx, chin + 0.07 * HH], [tcx + 0.6 * T.a, chin - 0.05 * HH]), 1.8 * u, mix(YEL, INK, 0.5));
    target(p, tcx - 0.36 * T.a, chin + 0.26 * HH, 12 * u, 2 * u, 0);
    const g = p.g;
    g.font = `900 ${17 * u}px "Arial Black", Arial, sans-serif`; g.textAlign = "center"; g.textBaseline = "middle"; g.fillStyle = INK;
    g.fillText("07", tcx + 0.4 * T.a, chin + 0.27 * HH);
  });
  p.inkRing(Tq, ow, thick);
  // shoulder discs over the torso edge
  for (const [S] of arms) { p.ell(S[0], S[1] + 2 * u, 8 * u, 8 * u, JOINT, 2.2 * u); p.dot(S[0], S[1] + 2 * u, 2.2 * u, JOINT_HI); }
  // head: yellow helmet-round bean, jaw seams, ear bolts, side target, the shared face
  const hp = blobPts(300, hc, H);
  p.shadedFill(hp, YEL, ysh, light, H.a);
  p.clip(hp, () => {
    target(p, 300 + 0.86 * H.a, hc - 0.42 * H.b, 15 * u, 2.2 * u, 20);
    for (const side of [-1, 1]) p.stroke(curve([300 + side * 0.98 * H.a, hc + 0.12 * H.b], [300 + side * 0.66 * H.a, hc + 0.46 * H.b], [300 + side * 0.4 * H.a, hc + 0.98 * H.b]), 2 * u, mix(YEL, INK, 0.6));
    p.stroke(curve([300 - 0.2 * H.a, hc - 1.02 * H.b], [300 - 0.1 * H.a, hc - 0.8 * H.b], [300 - 0.22 * H.a, hc - 0.55 * H.b]), 1.6 * u, mix(YEL, INK, 0.45));
  });
  p.inkRing(hp, ow, thick);
  for (const side of [-1, 1]) { p.ell(300 + side * 0.97 * H.a, hc + 0.05 * H.b, 5.5 * u, 7 * u, JOINT, 2 * u); }
  const W = 2 * H.a;
  faceFront(p, 300, hc, W, panic ? "shock" : "neutral", 0, 0, o.blink ?? 0, false, YEL);
  if (panic) panicMarks(p, 300, hc, H.a, u, seed);
};

// ---------------- 2. capybara ----------------
const FUR = "#9a6942", FUR_DK = "#6c4529", NOSE = "#47302a", MANDARIN = "#f28a24";
const fuzz = (p: Pen, x0: number, y0: number, x1: number, y1: number, n: number, u: number, seed: number, col: string, skip?: (x: number, y: number) => boolean) => {
  for (let i = 0; i < n; i++) {
    const x = x0 + (x1 - x0) * rnd(seed, 100 + i), y = y0 + (y1 - y0) * rnd(seed, 300 + i);
    if (skip && skip(x, y)) continue;
    const a = rad(70 + 40 * (rnd(seed, 500 + i) - 0.5)), l = (5 + 4 * rnd(seed, 700 + i)) * u;
    p.stroke(curve([x, y], [x + 0.5 * l * Math.cos(a) + 1.5 * u, y + 0.5 * l * Math.sin(a)], [x + l * Math.cos(a), y + l * Math.sin(a)], 4), 1.5 * u, col);
  }
};
const capy = (p: Pen, o: PersonaOpts) => {
  const { panic, light, seed } = o, thick = thickAngle(light);
  const H: Blob = { a: 116, b: 134, nTop: 3.0, nBot: 3.4, egg: 0.1, asym: 0, rot: rad(panic ? 3 : -2), noise: 0.007, seed };
  const F = frame(H, 0.7, 1.2, 1.32, 975, 0.3);
  const { u, HH, T, tcx, chin, hc, tp } = F, ow = 5 * u, fsh = mul(FUR, SH_FUR), limb = mix(FUR_DK, INK, 0.3);
  // short stick legs with paw ovals
  for (const side of [-1, 1]) {
    const [h, k, f] = legPts(F, side, panic, 975, 1.7);
    p.stroke(curve(h, k, f), 7 * u, limb);
    p.ell(f[0] + side * 5 * u, f[1] - 2 * u, 11 * u, 6 * u, NOSE, 2 * u);
  }
  // arms behind the body
  const arms = [-1, 1].map((s) => armPts(F, s, panic, 0.8));
  for (const [S, E, Hn] of arms) { p.stroke(curve(S, E, Hn), 6.5 * u, limb); p.dot(Hn[0], Hn[1], 6 * u); }
  // pear body with a lighter belly and fur ticks
  const B: Blob = { ...T, nTop: 2.0, nBot: 2.4, egg: 0.22 };
  const bp = blobPts(tcx, F.tcy, B);
  p.gradFill(bp, FUR, fsh, light);
  p.clip(bp, () => {
    p.ell(tcx + 4 * u, F.tcy + 0.35 * B.b, 0.62 * B.a, 0.62 * B.b, mix(FUR, "#e2b98a", 0.3), 0);
    fuzz(p, tcx - B.a, F.tcy - B.b, tcx + B.a, F.tcy + B.b, 70, u, seed, mix(FUR, INK, 0.38));
  });
  p.inkRing(bp, ow, thick);
  // ears behind the head
  const crown = hc - H.b;
  for (const side of [-1, 1]) {
    p.ell(300 + side * 0.78 * H.a, crown + 0.1 * H.b, 10 * u, 8 * u, FUR_DK, 3.6 * u, 0, 360, side * 30);
    p.ell(300 + side * 0.78 * H.a, crown + 0.12 * H.b, 4.5 * u, 3.5 * u, mix(FUR_DK, INK, 0.5), 0, 0, 360, side * 30);
  }
  // boxy head, fur ticks on the crown and cheeks, big snout pad
  const hp = blobPts(300, hc, H);
  p.shadedFill(hp, FUR, fsh, light, H.a);
  const ey = hc - 0.36 * H.b, ex = 0.5 * H.a;
  p.clip(hp, () => {
    fuzz(p, 300 - H.a, hc - H.b, 300 + H.a, hc + 0.3 * H.b, 40, u, seed + 9, mix(FUR, INK, 0.38),
      (x, y) => Math.abs(y - ey) < 16 * u && Math.abs(Math.abs(x - 300) - ex) < 18 * u);
    p.ell(300, hc + 0.5 * H.b, 0.86 * H.a, 0.56 * H.b, mix(FUR, "#5a3a24", 0.32), 0);
  });
  p.inkRing(hp, ow, thick);
  // snout ring (top arc only), nose bar + nostrils
  p.ell(300, hc + 0.5 * H.b, 0.86 * H.a, 0.56 * H.b, null, 2.2 * u, 200, 340);
  for (const side of [-1, 1]) p.ell(300 + side * 0.24 * H.a, hc + 0.2 * H.b, 7 * u, 4 * u, NOSE, 1.6 * u, 0, 360, side * -28);
  p.stroke([[300, hc + 0.27 * H.b], [300, hc + 0.5 * H.b]], 2.4 * u, mix(FUR, INK, 0.6));
  const my = hc + 0.58 * H.b;
  if (panic) mouth(p, "O", 300, my - 2 * u, u * 0.9);
  else { p.arc(300 - 5 * u, my - 3 * u, 5 * u, 4 * u, 20, 160, 3 * u); p.arc(300 + 5 * u, my - 3 * u, 5 * u, 4 * u, 20, 160, 3 * u); }
  // eyes: sleepy slits calm, saucers panicked
  for (const side of [-1, 1]) eye(p, panic ? "shock" : "slit", 300 + side * ex, ey, u, side, 0, FUR);
  if (panic) for (const side of [-1, 1]) p.arc(300 + side * ex, ey - 26 * u, 9 * u, 3 * u, 200, 340, 4 * u);
  else brows(p, 300, ey - 14 * u, ex, u, 1, 2, 4.4);
  // the tangerine: sits on the crown calm, pops up on panic
  const tx = 300 + 0.12 * H.a, ty = crown - 16 * u - (panic ? 34 * u : 0), tr = 22 * u;
  const tg: P2[] = blobPts(tx, ty, { a: tr, b: tr * 0.9, nTop: 2, nBot: 2, egg: 0, asym: 0, rot: 0, noise: 0.01, seed: seed + 4 });
  p.shadedFill(tg, MANDARIN, mul(MANDARIN, SH_ORANGE), light, tr);
  p.clip(tg, () => { for (let i = 0; i < 9; i++) p.dot(tx - 12 * u + 24 * u * rnd(seed, 900 + i), ty - 10 * u + 20 * u * rnd(seed, 950 + i), 1.1 * u, mix(MANDARIN, "#b35a12", 0.6)); });
  p.inkRing(tg, 4 * u, thick);
  p.stroke([[tx, ty - tr * 0.85], [tx + 2 * u, ty - tr * 0.85 - 6 * u]], 2.6 * u);
  p.ell(tx + 10 * u, ty - tr * 0.95, 9 * u, 4.5 * u, "#4f9a3e", 2 * u, 0, 360, -25);
  if (panic) {
    for (const side of [-1, 1]) p.stroke([[tx + side * 12 * u, ty + tr + 8 * u], [tx + side * 15 * u, ty + tr + 22 * u]], 2.4 * u);
    panicMarks(p, 300, hc, H.a * 0.95, u, seed);
  }
};

// ---------------- 3. hi-vis safety inspector ----------------
const HAT = "#f26a1b", VEST = "#c9dc3f", SHIRT = "#4d6893", BAND = "#e3e6ea";
const clipboard = (p: Pen, x: number, y: number, u: number, ang: number, panic: boolean) => {
  const R = (pts: P2[]) => pts.map(([px, py]) => [x + (px - x) * Math.cos(ang) - (py - y) * Math.sin(ang), y + (px - x) * Math.sin(ang) + (py - y) * Math.cos(ang)] as P2);
  p.poly(R(rrect(x - 26 * u, y - 34 * u, x + 26 * u, y + 34 * u, 3 * u)), "#b07a43", 2.6 * u);
  p.poly(R(rrect(x - 21 * u, y - 27 * u, x + 21 * u, y + 30 * u, 1 * u)), "#fbf8f0", 1.4 * u);
  for (let i = 0; i < 4; i++) {
    const ly = y - 14 * u + i * 11 * u;
    p.poly(R([[x - 17 * u, ly - 3 * u], [x - 11 * u, ly - 3 * u], [x - 11 * u, ly + 3 * u], [x - 17 * u, ly + 3 * u]]), null, 1.2 * u);
    p.stroke(R([[x - 7 * u, ly], [x + 16 * u, ly]]), 1.6 * u, "#8a8f9a");
    if (i < 2 || !panic) p.stroke(R([[x - 16.5 * u, ly - 0.5 * u], [x - 14 * u, ly + 2 * u], [x - 9 * u, ly - 5 * u]]), 1.8 * u, "#2f8a3e");
    else { p.stroke(R([[x - 17 * u, ly - 4 * u], [x - 10 * u, ly + 4 * u]]), 1.8 * u, "#d0342c"); p.stroke(R([[x - 10 * u, ly - 4 * u], [x - 17 * u, ly + 4 * u]]), 1.8 * u, "#d0342c"); }
  }
  p.poly(R(rrect(x - 10 * u, y - 38 * u, x + 10 * u, y - 28 * u, 2 * u)), "#9aa0aa", 1.8 * u);
};
const hivis = (p: Pen, o: PersonaOpts) => {
  const { panic, light, seed } = o, thick = thickAngle(light), skin = "#f5c9a0";
  const H: Blob = { ...headBlob(seed, 116, 0), rot: rad(panic ? -3 : 1) };
  const F = frame(H, 1.38, 1.12, 0.86);
  const { u, HH, T, tcx, chin, hc, torsoBot, tp } = F, ow = 5 * u, W = 2 * H.a;
  // legs: work trousers, chunky boots
  const pants = "#3c4252", legCol = mix(pants, INK, 0.45);
  for (const side of [-1, 1]) {
    const [h, k, f] = legPts(F, side, panic);
    p.stroke(curve(h, k, f), 6.2 * u, legCol);
    foot(p, [f[0] - side * 4 * u, f[1] - 1 * u], [f[0] + side * 15 * u, f[1]], 10 * u, "#6e4427");
  }
  // arms: left hangs (calm) / flails (panic); right holds the clipboard in front (calm) / up as a shield (panic)
  const armCol = mix(SHIRT, INK, 0.45);
  const L = armPts(F, -1, panic);
  p.stroke(curve(L[0], L[1], L[2]), 5.4 * u, armCol); p.dot(L[2][0], L[2][1], 5.6 * u);
  const S: P2 = [tcx + 0.85 * T.a, chin + 0.12 * HH];
  const R: [P2, P2, P2] = panic
    ? [S, [tcx + 1.15 * T.a + 18 * u, S[1] - 0.22 * HH], [tcx + 1.3 * T.a + 26 * u, S[1] - 0.68 * HH]]
    : [S, [tcx + 1.12 * T.a + 6 * u, S[1] + 0.46 * HH], [tcx + 0.42 * T.a, S[1] + 0.5 * HH]];
  // torso: shirt, hi-vis vest panels with reflective bands, pen in the pocket
  p.gradFill(tp, SHIRT, mul(SHIRT, [0.64, 0.66, 0.74]), light);
  p.clip(tp, () => {
    for (const side of [-1, 1]) {
      const panel: P2[] = [[tcx + side * 8 * u, chin - 0.1 * HH], [tcx + side * 1.3 * T.a, chin - 0.1 * HH], [tcx + side * 1.3 * T.a, torsoBot + 0.1 * HH], [tcx + side * 5 * u, torsoBot + 0.1 * HH], [tcx + side * 5 * u, chin + 0.42 * HH]];
      p.gradFill(panel, VEST, mul(VEST, [0.72, 0.74, 0.62]), light, 0.3);
      p.clip(panel, () => {
        for (const k of [0.5, 0.78]) {
          const y = chin + k * HH;
          p.band([[tcx - 1.4 * T.a, y], [tcx + 1.4 * T.a, y]], BAND, 7 * u, 1.4 * u);
          p.stroke([[tcx - 1.4 * T.a, y + 1.2 * u], [tcx + 1.4 * T.a, y + 1.2 * u]], 1.2 * u, "#b5bac4");
        }
      });
      p.path(panel, true); p.g.lineWidth = 2.4 * u; p.g.strokeStyle = INK; p.g.lineJoin = "round"; p.g.stroke();
    }
    p.band([[tcx - 0.52 * T.a, chin + 0.24 * HH], [tcx - 0.52 * T.a, chin + 0.12 * HH]], "#e33b2f", 2.4 * u, 1 * u, "round");
    p.stroke([[tcx - 0.7 * T.a, chin + 0.25 * HH], [tcx - 0.3 * T.a, chin + 0.25 * HH]], 1.8 * u);
  });
  p.inkRing(tp, ow, thick);
  // right arm + clipboard in front of the body
  p.stroke(curve(R[0], R[1], R[2]), 5.4 * u, armCol);
  clipboard(p, R[2][0] + (panic ? 6 * u : 6 * u), R[2][1] + (panic ? -26 * u : 10 * u), u, rad(panic ? 18 : 8), panic);
  p.dot(R[2][0], R[2][1], 5.6 * u);
  // head + moustache face
  const hp = blobPts(300, hc, H);
  p.shadedFill(hp, skin, mul(skin, [0.96, 0.86, 0.84]), light, H.a);
  p.inkRing(hp, ow, thick);
  faceFront(p, 300, hc + 4 * u, W, panic ? "shock" : "smile", 0, 0, o.blink ?? 0, true, skin, "#5a3524", true);
  // oversized hard hat: dome 1.3 W wide, ridge rib, wide brim, sticker
  const crown = hc - H.b, yb = crown + 0.3 * HH, a = H.rot;
  const RH = (pts: P2[]) => pts.map(([x, y]) => [300 + (x - 300) * Math.cos(a) - (y - hc) * Math.sin(a), hc + (x - 300) * Math.sin(a) + (y - hc) * Math.cos(a)] as P2);
  const dw = 0.64 * W, dh = 0.5 * HH;
  const dome: P2[] = [];
  for (let i = 0; i <= 40; i++) {
    const t = Math.PI + (Math.PI * i) / 40, c = Math.cos(t), s = Math.sin(t);
    dome.push([300 + dw * Math.sign(c) * Math.abs(c) ** 0.8, yb + dh * Math.sign(s) * Math.abs(s) ** 0.85]);
  }
  const dp = RH(dome);
  p.shadedFill(dp, HAT, mul(HAT, SH_ORANGE), light, dw, 0.4);
  p.clip(dp, () => {
    p.band(RH([[300, yb + 4 * u], [300, yb - dh - 4 * u]]), shade(HAT, 1.08), 16 * u, 1.6 * u);
    p.poly(RH(rrect(300 - 0.42 * dw - 11 * u, yb - 0.45 * dh, 300 - 0.42 * dw + 11 * u, yb - 0.45 * dh + 16 * u, 3 * u)), WHITE, 1.4 * u);
    const [sx, sy] = RH([[300 - 0.42 * dw, yb - 0.45 * dh + 8 * u]])[0];
    p.stroke([[sx - 5 * u, sy], [sx + 5 * u, sy]], 3 * u, "#2f8a3e"); p.stroke([[sx, sy - 5 * u], [sx, sy + 5 * u]], 3 * u, "#2f8a3e");
  });
  p.inkRing(dp, ow, thick);
  const [bx, by] = RH([[300, yb + 1 * u]])[0];
  p.ell(bx, by, dw + 14 * u, 0.07 * HH, mul(HAT, [0.9, 0.78, 0.76]), ow * 0.85, 0, 360, (a * 180) / Math.PI);
  if (panic) panicMarks(p, 300, hc + 6 * u, H.a, u, seed);
};

// ---------------- 4. panic chicken ----------------
const FEATHER = "#fbf6ee", COMB = "#de3b35", BEAK = "#f3a12b", LEGC = "#ea9b2e";
const feather = (p: Pen, x: number, y: number, s: number, ang: number, u: number) => {
  const pts: P2[] = [];
  for (let i = 0; i <= 20; i++) { const t = rad((360 * i) / 20); pts.push([x + 4 * s * u * Math.cos(t), y + 11 * s * u * Math.sin(t) * (Math.sin(t) > 0 ? 1 : 0.8)]); }
  const c = Math.cos(ang), sn = Math.sin(ang);
  p.poly(pts.map(([px, py]) => [x + (px - x) * c - (py - y) * sn, y + (px - x) * sn + (py - y) * c] as P2), FEATHER, 1.6 * u);
  p.stroke([[x - 9 * s * u * sn * -1, y - 9 * s * u * c], [x + 12 * s * u * -sn, y + 12 * s * u * c]], 1.2 * u);
};
const chicken = (p: Pen, o: PersonaOpts) => {
  const { panic, light, seed } = o, thick = thickAngle(light);
  const H: Blob = { a: 96, b: 92, nTop: 1.9, nBot: 2.2, egg: -0.08, asym: 0, rot: rad(panic ? 6 : -3), noise: 0.006, seed };
  const u = 2.3, ow = 5 * u, sole = 975, legL = 150;
  const B: Blob = { a: 158, b: 178, nTop: 1.9, nBot: 2.5, egg: 0.24, asym: 0, rot: rad(panic ? -3 : 2), noise: 0.006, seed: seed + 5 };
  const bcy = sole - legL - B.b * 0.92, btop = bcy - B.b, hc = btop - 22 * u + (panic ? -14 * u : 0);
  const wsh = mul(FEATHER, SH_WHITE);
  // legs: orange sticks, three-toed feet; panic: knock-kneed
  for (const side of [-1, 1]) {
    const hx = 300 + side * 34 * u, hy = bcy + B.b * 0.8, fx = 300 + side * (panic ? 48 : 30) * u, fy = sole - 4 * u;
    const kx = panic ? 300 + side * 18 * u : (hx + fx) / 2 + side * 3 * u;
    const leg = curve([hx, hy], [kx, (hy + fy) / 2], [fx, fy]);
    p.stroke(leg, 6 * u + 3.2 * u, INK); p.stroke(leg, 6 * u, LEGC);
    for (const a of [-35, 0, 35]) {
      const ta = rad(90 - side * 10 + a), tl = 15 * u;
      const tip: P2 = [fx + Math.cos(ta - Math.PI / 2 + Math.PI / 2) * 0, fy];
      const end: P2 = [fx + tl * Math.sin(rad(a + side * 12)), fy + 3 * u - tl * 0.15 * Math.cos(rad(a))];
      p.stroke([tip, end], 4.6 * u + 3 * u, INK); p.stroke([tip, end], 4.6 * u, LEGC);
    }
  }
  // tail feathers behind the body (upper back, both sides)
  for (const [dx, dy, r] of [[-0.86, -0.38, -35], [-0.98, -0.12, -55], [0.86, -0.38, 35], [0.98, -0.12, 55]] as const) {
    p.ell(300 + dx * B.a, bcy + dy * B.b, 18 * u, 30 * u, FEATHER, ow * 0.7, 0, 360, r);
  }
  // body: white egg with scalloped chest feathers
  const bp = blobPts(300, bcy, B);
  p.shadedFill(bp, FEATHER, wsh, light, B.a, 0.4);
  p.clip(bp, () => {
    const sc = mix(FEATHER, "#8e86a8", 0.32);
    for (let r = 0; r < 4; r++) for (let i = -2; i <= 2; i++) {
      const x = 300 + i * 22 * u + (r % 2) * 11 * u, y = bcy - 0.15 * B.b + r * 17 * u;
      if (Math.abs(x - 300) > 62 * u - r * 4 * u) continue;
      p.arc(x, y, 10 * u, 7 * u, 20, 160, 1.6 * u, sc);
    }
  });
  p.inkRing(bp, ow, thick);
  // wings: folded on the body (calm) / flung up and out (panic), with feather tips
  for (const side of [-1, 1]) {
    const wx = 300 + side * 0.78 * B.a, wy = bcy - 0.12 * B.b;
    const ang = panic ? -side * (side < 0 ? 132 : 118) : side * 12;
    const wp: P2[] = blobPts(wx, wy, { a: 26 * u, b: 46 * u, nTop: 2, nBot: 1.7, egg: 0.25, asym: 0, rot: 0, noise: 0.006, seed: seed + 20 + side }).map(([x, y]) => {
      const dx = x - wx, dy = y - (wy - 30 * u), r = rad(ang);
      return [wx + dx * Math.cos(r) - dy * Math.sin(r), wy - 30 * u + dx * Math.sin(r) + dy * Math.cos(r)] as P2;
    });
    p.shadedFill(wp, FEATHER, wsh, light, 40 * u, 0.4);
    p.clip(wp, () => {
      const r = rad(ang), tipx = wx - 30 * u * -Math.sin(r) * -1, tipy = wy - 30 * u + 70 * u * Math.cos(r);
      for (const k of [-1, 0, 1]) p.stroke([[wx + k * 12 * u, wy], [tipx + k * 10 * u, tipy]], 1.5 * u, mix(FEATHER, "#8e86a8", 0.35));
    });
    p.inkRing(wp, ow * 0.85, thick);
  }
  // comb behind the head top, then head, beak, wattle
  const crown = hc - H.b;
  for (const [dx, dy, r] of [[-20, 6, 15], [0, -6, 19], [20, 4, 14]] as const) p.ell(300 + dx * u, crown + dy * u, r * u, r * u * 1.1, COMB, ow * 0.8);
  p.ell(300, crown + 6 * u, 26 * u, 10 * u, COMB, 0);
  const hp = blobPts(300, hc, H);
  p.shadedFill(hp, FEATHER, wsh, light, H.a);
  p.inkRing(hp, ow, thick);
  const W = 2 * H.a, uf = W / 100 * 1.12, ey = hc - 0.12 * H.b, ex = 0.4 * H.a;
  for (const side of [-1, 1]) eye(p, panic ? "shock" : "lid", 300 + side * ex, ey, uf, side, 0, FEATHER);
  if (panic) for (const side of [-1, 1]) p.arc(300 + side * ex, ey - 22 * uf, 9 * uf, 3 * uf, 200, 340, 4 * uf);
  else brows(p, 300, ey - 17 * uf, ex, uf, 0, 1);
  const by = hc + 0.28 * H.b, bw = 15 * u;
  if (panic) {
    p.poly([[300 - bw, by - 2 * u], [300, by - 10 * u], [300 + bw, by - 2 * u], [300, by + 9 * u]], BEAK, 2.4 * u);
    p.ell(300, by + 13 * u, 9 * u, 9 * u, "#5a1e28", 2.4 * u, 0, 180);
    p.poly([[300 - bw * 0.8, by + 13 * u], [300 + bw * 0.8, by + 13 * u], [300, by + 26 * u]], mul(BEAK, [0.92, 0.85, 0.8]), 2.4 * u);
  } else {
    p.poly([[300 - bw, by], [300, by - 9 * u], [300 + bw, by], [300, by + 20 * u]], BEAK, 2.4 * u);
    p.stroke([[300 - bw + 2 * u, by + 0.5 * u], [300 + bw - 2 * u, by + 0.5 * u]], 1.6 * u);
  }
  p.ell(300 + 6 * u, by + (panic ? 34 : 28) * u, 7 * u, 11 * u, COMB, 2.4 * u);
  if (panic) {
    for (const [dx, dy, s, a] of [[-1.25, -0.9, 1, 40], [1.3, -1.25, 0.9, -30], [-1.45, 0.2, 0.8, 70], [1.4, 0.4, 0.85, -60], [0.2, -1.75, 0.75, 10]] as const)
      feather(p, 300 + dx * B.a, bcy + dy * B.b, s * 1.6, rad(a), u);
    panicMarks(p, 300, hc, H.a, u, seed);
  }
};

export const drawPersona = (p: Pen, kind: PersonaKind, o: PersonaOpts) => {
  if (kind === "dummy") dummy(p, o);
  else if (kind === "capy") capy(p, o);
  else if (kind === "hivis") hivis(p, o);
  else chicken(p, o);
};
export type { Expr, EyeK, MouthK };
