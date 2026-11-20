// Parody caricatures for a "what if" channel, drawn in the bridge engine's own language (toon.ts Pen: 600 x 1000
// design canvas, soles at 975, plum thick-thin ink rings, painted crescents, stick limbs, ink-dot hands, the shared
// eye/mouth library). Signature traits carry the likeness; no logos, crests, brand marks or readable kit details.
//   striker - white "royal" kit with gold/violet trim + vague round badge blob, number 7, tan skin, sharp jaw, high quiff
//             with faded sides, thin brows, huge white grin; poses: hands on hips / mid-air celebration shout
//   fighter - ginger full beard, slicked side-part hair, raised brow + smirk, muscular, bold simplified tattoo shapes
//             (chest ape-with-heart silhouette, arm sleeve, belly stripes); fight shorts + hand wraps / checked
//             three-piece suit + flat cap; poses: arms crossed / wide-armed strut
import { Pen, INK, mul, mix, blobPts, headBlob, thickAngle, Blob, curve, rnd, rad, eye, mouth, taper, P2, rrect, lerp2 } from "./toon";

export type CelebKind = "striker" | "fighter";
export type CelebPose = "a" | "b";
export type CelebOpts = { pose: CelebPose; light: number; seed?: number; suit?: boolean; shock?: boolean };

const WHITE = "#ffffff", MOUTH = "#5a1e28", TONGUE = "#e86e78";
const SH_SKIN: [number, number, number] = [0.94, 0.84, 0.82];
const SH_CLOTH: [number, number, number] = [0.72, 0.74, 0.82];
const GOLD = "#d2a743", VIOLET = "#55438c";

const foot = (p: Pen, a: P2, b: P2, w: number, col: string) => { if (col !== INK) p.stroke([a, b], w + 3, INK); p.stroke([a, b], w, col); };
/** ink-rimmed stroke (thick limbs that must read when they cross the body) */
const rimmed = (p: Pen, pts: P2[], col: string, w: number, rim: number) => { p.stroke(pts, w + 2 * rim, INK); p.stroke(pts, w, col); };
const pathPts = (pts: P2[]) => pts;

type Fig = { H: Blob; W: number; HH: number; u: number; hc: number; chin: number; torsoBot: number; hipY: number; T: Blob; tcx: number; tcy: number; tp: P2[] };
const figure = (seed: number, a: number, legs: number, torso: number, tw: number, egg: number, nTop: number): Fig => {
  const H = headBlob(seed, a, 0), W = 2 * H.a, HH = 2 * H.b, u = W / 100;
  const torsoBot = 975 - legs * HH, chin = torsoBot - torso * HH, hc = chin - H.b, hipY = torsoBot - 0.12 * HH;
  const T: Blob = { a: ((tw / 2) * W) / 1.06, b: 0.5 * (torsoBot - (chin - 0.25 * HH)), nTop, nBot: 2.3, egg, asym: 0, rot: 0, noise: 0.005, seed: seed + 7 };
  const tcx = 300, tcy = torsoBot - T.b;
  return { H, W, HH, u, hc, chin, torsoBot, hipY, T, tcx, tcy, tp: blobPts(tcx, tcy, T) };
};
/** hair cap over the top of the head: head contour between the temples, pushed out, with an optional quiff bump */
const hairCap = (H: Blob, cx: number, hc: number, u: number, o: { temple: number; line: number; push: number; quiff?: number; qx?: number; qw?: number; dip?: number }) => {
  const hp = blobPts(cx, hc, H, 96), out: P2[] = [];
  for (let i = 0; i < 96; i++) {
    const t = (i / 96) * Math.PI * 2;
    if (t < Math.PI + o.temple || t > 2 * Math.PI - o.temple) continue;
    let [x, y] = hp[i];
    const dx = x - cx, dy = y - hc, l = Math.hypot(dx, dy) || 1;
    x += (dx / l) * o.push * u; y += (dy / l) * o.push * u;
    if (o.quiff) y -= o.quiff * H.b * Math.exp(-(((x - (cx + (o.qx ?? 0) * H.a)) / ((o.qw ?? 0.5) * H.a)) ** 2));
    out.push([x, y]);
  }
  // hairline back across the forehead (right -> left), slight centre dip
  const r = out[out.length - 1], l0 = out[0], n = 10;
  for (let k = 1; k < n; k++) {
    const s = k / n, x = r[0] + (l0[0] - r[0]) * s;
    const yl = hc - o.line * H.b + (o.dip ?? 0) * H.b * Math.sin(Math.PI * s);
    out.push([x, Math.min(yl, r[1] + (l0[1] - r[1]) * s)]);
  }
  return out;
};

// ---------------- shared: V-shaped torso whose sleeves / deltoids are part of the silhouette ----------------
/** Chaikin corner cutting (closed polygon) */
const chaikin = (pts: P2[], n = 2): P2[] => {
  let a = pts;
  for (let k = 0; k < n; k++) {
    const b: P2[] = [];
    for (let i = 0; i < a.length; i++) { const p0 = a[i], p1 = a[(i + 1) % a.length]; b.push(lerp2(p0, p1, 0.25), lerp2(p0, p1, 0.75)); }
    a = b;
  }
  return a;
};
type ArmSpec = { dir: P2; len: number; w: number };
/** shirt / bare-torso silhouette, clockwise: neck -> trapezius -> shoulder cap -> sleeve (along the upper arm) ->
 *  armpit -> chest -> waist -> hem, both sides; far = x scale of the screen-left half (half-turned body) */
const torsoShape = (tcx: number, neckY: number, sh: number, ww: number, hemY: number, HH: number, u: number, arms: [ArmSpec, ArmSpec], far = 1, neckDip = 10) => {
  const side = (s: number) => {
    const k = s < 0 ? far : 1, X = (dx: number) => tcx + s * dx * k;
    const A = arms[s < 0 ? 0 : 1], S: P2 = [X(sh - 10 * u), neckY + 15 * u];
    const n: P2 = [A.dir[1] * s, -A.dir[0] * s];
    const E: P2 = [S[0] + A.dir[0] * A.len, S[1] + A.dir[1] * A.len];
    return {
      top: [[X(15 * u), neckY], [X(sh * 0.62), neckY + 5 * u], [S[0] + n[0] * A.w * 1.05, S[1] + n[1] * A.w * 1.05 - 2 * u],
        [E[0] + n[0] * A.w, E[1] + n[1] * A.w], [E[0] - n[0] * A.w, E[1] - n[1] * A.w]] as P2[],
      body: [[X(sh - 14 * u), neckY + 0.36 * HH], [X(sh - 16 * u), neckY + 0.5 * HH], [X(ww), hemY - 0.18 * HH], [X(ww + 2 * u), hemY]] as P2[],
      S, E,
    };
  };
  const R = side(1), L = side(-1);
  const pts: P2[] = [...R.top, ...R.body, [tcx, hemY + 3 * u], ...L.body.slice().reverse(), ...L.top.slice().reverse(), [tcx, neckY + neckDip * u]];
  return { pts: chaikin(pts, 2), S: [L.S, R.S] as [P2, P2], E: [L.E, R.E] as [P2, P2] };
};
const norm = (x: number, y: number): P2 => { const l = Math.hypot(x, y) || 1; return [x / l, y / l]; };

// ---------------- the striker ----------------
const TAN = "#d79d6c", HAIR_S = "#2a1c16";
const browArc = (p: Pen, a: P2, peak: P2, b: P2, w: number, col = INK) => { taper(p, a, peak, w, w * 0.75, col); taper(p, peak, b, w * 0.75, w * 0.3, col); };
const strikerFace = (p: Pen, cx: number, hc: number, H: Blob, u: number, shout: boolean, facing: number, shock = false) => {
  const fx = cx + 7 * u * facing, ey = hc - 3 * u;
  for (const side of [-1, 1]) {
    const x = fx + side * 14 * u;
    if (shock) {
      eye(p, "shock", x, ey, u, side, 0, TAN);
      browArc(p, [x - side * 9 * u, ey - 20 * u], [x + side * 2 * u, ey - 27 * u], [x + side * 11 * u, ey - 24 * u], 5 * u);
    } else if (shout) {
      p.stroke([[x + 7 * u * side, ey - 5 * u], [x - 7 * u * side, ey + 1 * u], [x + 7 * u * side, ey + 4 * u]], 3.8 * u);
      browArc(p, [x - side * 10 * u, ey - 10 * u], [x + side * 1 * u, ey - 15 * u], [x + side * 11 * u, ey - 16 * u], 5 * u);
    } else {
      eye(p, "dot", x, ey, u, side, 0, TAN);
      browArc(p, [x - side * 9 * u, ey - 15 * u], [x + side * 3 * u, ey - 19.5 * u], [x + side * 11 * u, ey - 17 * u], 5 * u);
    }
  }
  p.stroke([[fx + 2 * u, ey + 7 * u], [fx + 5 * u, ey + 14 * u], [fx + 1 * u, ey + 15 * u]], 2.4 * u);
  const mx = fx + 1 * u, my = hc + 27 * u;
  if (shock) mouth(p, "O", mx, my, u * 1.1);
  else if (shout) {
    const pts: P2[] = [];
    for (let i = 0; i <= 40; i++) { const a = (i / 40) * Math.PI * 2; pts.push([mx + 15 * u * Math.cos(a), my + 3 * u + 14 * u * Math.sin(a) * (Math.sin(a) > 0 ? 1.1 : 0.55)]); }
    p.poly(pts, MOUTH, 0);
    p.clip(pts, () => { p.poly(rrect(mx - 16 * u, my - 10 * u, mx + 16 * u, my - 2 * u, 1), WHITE, 0); p.ell(mx + 2 * u, my + 14 * u, 9 * u, 6 * u, TONGUE, 0); });
    p.poly(pts, null, 3 * u);
  } else {
    const top = curve([mx - 23 * u, my - 7 * u], [mx, my - 4 * u], [mx + 23 * u, my - 7 * u], 16), bot = curve([mx + 23 * u, my - 7 * u], [mx, my + 15 * u], [mx - 23 * u, my - 7 * u], 16);
    const pts = [...top, ...bot.slice(1)];
    p.poly(pts, WHITE, 0);
    p.clip(pts, () => { p.stroke(curve([mx - 22 * u, my - 0.5 * u], [mx, my + 3.5 * u], [mx + 22 * u, my - 0.5 * u], 12), 1.6 * u, "#b9b2c4"); for (const k of [-11, -4, 4, 11]) p.stroke([[mx + k * u, my - 5 * u], [mx + k * u, my + 1.5 * u]], 0.9 * u, "#cfc8d8"); });
    p.poly(pts, null, 3 * u);
    for (const s of [-1, 1]) p.arc(mx + s * 25 * u, my - 7 * u, 3 * u, 4 * u, s > 0 ? 200 : -20, s > 0 ? 270 : 70, 2 * u);
  }
};
/** short textured quiff on top + crisp edge; returns the cap polygon */
const quiffCap = (H: Blob, cx: number, hc: number, u: number) => {
  const hp = blobPts(cx, hc, H, 120), out: P2[] = [];
  for (let i = 0; i < 120; i++) {
    const t = (i / 120) * Math.PI * 2;
    if (t < Math.PI + 0.78 || t > 2 * Math.PI - 0.78) continue;
    let [x, y] = hp[i];
    const dx = x - cx, dy = y - hc, l = Math.hypot(dx, dy) || 1;
    x += (dx / l) * 2 * u; y += (dy / l) * 2 * u;
    const q = Math.exp(-(((x - (cx + 0.12 * H.a)) / (0.48 * H.a)) ** 2));
    y -= q * (0.2 * H.b + (i % 2 ? 4 * u : 0)); // spiky textured quiff
    out.push([x, y]);
  }
  const r = out[out.length - 1], l0 = out[0];
  for (let k = 1; k < 8; k++) { const s = k / 8; out.push([r[0] + (l0[0] - r[0]) * s, Math.min(hc - 0.62 * H.b + 0.04 * H.b * Math.sin(Math.PI * s * 2), r[1] + (l0[1] - r[1]) * s)]); }
  return out;
};
const striker = (p: Pen, o: CelebOpts) => {
  const { pose, light } = o, seed = o.seed ?? 5, thick = thickAngle(light), jump = pose === "b";
  const F = figure(seed, 110, 1.42, 1.1, 0.98, -0.3, 2.9);
  const { H, u, HH, tcx, chin, torsoBot, hipY } = F, ow = 5 * u, facing = jump ? 1 : 0;
  const H2: Blob = { ...H, nTop: 1.9, nBot: 1.55, egg: -0.3, b: H.b * 1.07, asym: 0.03 * facing }; // sharp jaw, longer face
  const hc = F.hc - 0.05 * HH;
  const skinD = mix(TAN, INK, 0.3), kit = "#f7f6f1", kitSh = mul(kit, SH_CLOTH);
  const tilt = jump ? -7 : 0, far = jump ? 0.8 : 1;
  const sh = 56 * u, ww = 33 * u, neckY = chin - 0.08 * HH, hemY = torsoBot + 0.02 * HH;
  // ---- legs ----
  p.rot = null;
  for (const side of [-1, 1]) {
    const hx = 300 + side * 15 * u;
    let k: P2, f: P2;
    if (jump) { k = side > 0 ? [300 + 44 * u, hipY + 0.36 * HH] : [300 - 34 * u, hipY + 0.58 * HH]; f = side > 0 ? [300 + 36 * u, hipY + 0.86 * HH] : [300 - 62 * u, 975 - 24 * u]; }
    else { k = [300 + side * 22 * u, (hipY + 975) / 2]; f = [300 + side * 25 * u, 975 - 4 * u]; }
    p.stroke(curve([hx, hipY], lerp2([hx, hipY], k, 0.5), k, 6), 6.2 * u, skinD);
    rimmed(p, curve(k, lerp2(k, f, 0.5), f, 6), kit, 6.6 * u, 1.3 * u);
    p.stroke([lerp2(k, f, 0.04), lerp2(k, f, 0.1)], 7 * u, VIOLET);
    if (jump) foot(p, [f[0] - side * 2 * u, f[1] - 2 * u], [f[0] + side * 8 * u, f[1] + 12 * u], 8 * u, "#24232b");
    else foot(p, [f[0] - side * 3 * u, f[1]], [f[0] + side * 13 * u, f[1] + 0.5 * u], 8 * u, "#24232b");
  }
  if (jump) for (const dx of [-30, 0, 30]) p.stroke([[300 + dx * u, 975 - 2 * u], [300 + dx * u, 975 - 16 * u]], 2.6 * u); // lift-off lines
  // ---- shorts ----
  const sw = ww + 6 * u, sy0 = torsoBot - 0.14 * HH, sy1 = hipY + 0.3 * HH;
  const shorts: P2[] = jump
    ? [[tcx - sw, sy0], [tcx + sw, sy0], [tcx + sw + 22 * u, sy1 - 6 * u], [tcx + 6 * u, sy1 - 2 * u], [tcx, sy1 - 14 * u], [tcx - 6 * u, sy1], [tcx - sw - 16 * u, sy1 + 4 * u]]
    : [[tcx - sw, sy0], [tcx + sw, sy0], [tcx + sw + 6 * u, sy1], [tcx + 5 * u, sy1], [tcx, sy1 - 12 * u], [tcx - 5 * u, sy1], [tcx - sw - 6 * u, sy1]];
  p.gradFill(shorts, kit, kitSh, light);
  p.clip(shorts, () => { for (const s of [-1, 1]) p.stroke([[tcx + s * (sw + 1 * u), sy0], [tcx + s * (sw + (jump ? 20 : 5) * u), sy1]], 3 * u, GOLD); });
  p.poly(shorts, null, ow * 0.8);
  // ---- upper body ----
  p.rot = tilt ? [rad(tilt), 300, hipY] : null;
  const dirs: [P2, P2] = jump ? [norm(-0.78, 0.62), norm(0.8, 0.6)] : [norm(-0.6, 0.8), norm(0.6, 0.8)];
  const body = torsoShape(tcx, neckY, sh, ww, hemY, HH, u, [{ dir: dirs[0], len: 26 * u, w: 10 * u }, { dir: dirs[1], len: 26 * u, w: 10 * u }], far);
  // arms behind the shirt: from the shoulder joint through the sleeve opening
  for (let i = 0; i < 2; i++) {
    const s = i ? 1 : -1, S = body.S[i], d = dirs[i];
    let E: P2, Hd: P2;
    if (jump) { E = [S[0] + d[0] * 0.5 * HH, S[1] + d[1] * 0.5 * HH]; Hd = [S[0] + d[0] * 0.98 * HH + s * 4 * u, S[1] + d[1] * 0.98 * HH + 10 * u]; }
    else { E = [S[0] + d[0] * 0.46 * HH + s * 6 * u, S[1] + d[1] * 0.46 * HH]; Hd = [tcx + s * (ww + 4 * u) * (s < 0 ? far : 1), hemY - 0.14 * HH]; }
    p.stroke(curve(S, E, Hd, 10), 6 * u, skinD); p.dot(Hd[0], Hd[1], 6.4 * u);
  }
  p.gradFill(body.pts, kit, kitSh, light);
  p.clip(body.pts, () => {
    for (const s of [-1, 1]) p.stroke(curve([tcx + s * 40 * u, neckY + 0.3 * HH], [tcx + s * 32 * u, neckY + 0.6 * HH], [tcx + s * ww * 0.9, hemY], 8), 2 * u, mix(kit, "#b8b3c8", 0.6));
    for (let i = 0; i < 2; i++) { const E = body.E[i], d = dirs[i], n: P2 = [d[1], -d[0]]; p.stroke([[E[0] - n[0] * 14 * u - d[0] * 3 * u, E[1] - n[1] * 14 * u - d[1] * 3 * u], [E[0] + n[0] * 14 * u - d[0] * 3 * u, E[1] + n[1] * 14 * u - d[1] * 3 * u]], 4 * u, VIOLET); }
    const vn: P2[] = [[tcx - 15 * u, neckY - 2 * u], [tcx, neckY + 0.14 * HH], [tcx + 15 * u, neckY - 2 * u]];
    p.stroke(vn, 6.5 * u, VIOLET); p.stroke(vn, 3.2 * u, GOLD);
    const g = p.g, [nx, ny] = p.P(tcx + 4 * u, chin + 0.47 * HH);
    g.save(); g.translate(nx, ny); if (tilt) g.rotate(rad(tilt));
    g.font = `900 ${40 * u}px "Arial Black", Arial, sans-serif`; g.textAlign = "center"; g.textBaseline = "middle";
    g.lineWidth = 5 * u; g.strokeStyle = VIOLET; g.lineJoin = "round"; g.strokeText("7", 0, 0); g.fillStyle = GOLD; g.fillText("7", 0, 0);
    g.restore();
    p.ell(tcx - 26 * u * far, chin + 0.2 * HH, 6 * u, 6.5 * u, "#e9dfb8", 1.6 * u); p.ell(tcx - 26 * u * far, chin + 0.2 * HH + 0.5 * u, 3 * u, 3 * u, mix(GOLD, VIOLET, 0.4), 0);
  });
  p.inkRing(body.pts, ow, thick);
  // ---- head: sharp jaw, faded sides, short textured quiff ----
  const hp = blobPts(300, hc, H2);
  p.shadedFill(hp, TAN, mul(TAN, SH_SKIN), light, H2.a);
  p.clip(hp, () => {
    const fade = mix(TAN, HAIR_S, 0.42);
    for (const s of [-1, 1]) {
      p.poly([[300 + s * 0.58 * H2.a, hc - 1.1 * H2.b], [300 + s * 1.2 * H2.a, hc - 1.1 * H2.b], [300 + s * 1.2 * H2.a, hc + 0.02 * H2.b], [300 + s * 0.9 * H2.a, hc + 0.02 * H2.b], [300 + s * 0.74 * H2.a, hc - 0.45 * H2.b]], fade, 0);
      for (let i = 0; i < 14; i++) { const x = 300 + s * (0.8 + 0.3 * rnd(seed, 60 + i)) * H2.a, y = hc - (0.1 + 0.7 * rnd(seed, 120 + i)) * H2.b; p.stroke([[x, y], [x + s * 1.2 * u, y - 4 * u]], 0.8 * u, mix(fade, HAIR_S, 0.35)); }
      p.stroke(curve([300 + s * 0.7 * H2.a, hc + 0.32 * H2.b], [300 + s * 0.52 * H2.a, hc + 0.66 * H2.b], [300 + s * 0.2 * H2.a, hc + 0.94 * H2.b]), 2 * u, mul(TAN, [0.78, 0.66, 0.62]));
    }
    p.stroke([[300 + 1 * u, hc + 0.9 * H2.b], [300 + 1 * u, hc + 0.99 * H2.b]], 1.6 * u, mul(TAN, [0.72, 0.6, 0.56])); // chin cleft
  });
  p.inkRing(hp, ow, thick);
  const hair = quiffCap(H2, 300, hc, u);
  p.shadedFill(hair, HAIR_S, mix(HAIR_S, INK, 0.5), light, H2.a, 0.35);
  p.clip(hair, () => { for (let i = 0; i < 9; i++) { const x0 = 300 - 0.55 * H2.a + i * 0.14 * H2.a; p.stroke(curve([x0, hc - 0.62 * H2.b], [x0 + 4 * u, hc - 0.95 * H2.b], [x0 + 12 * u, hc - 1.25 * H2.b], 8), 1.5 * u, "#6a5242"); } });
  p.inkRing(hair, ow * 0.85, thick);
  strikerFace(p, 300, hc, H2, u, jump, facing, !!o.shock);
  if (jump) for (const s of [-1, 1]) for (let k = 0; k < 3; k++)
    p.stroke([[300 + s * (1.15 * H2.a + k * 2 * u), hc + (k - 1) * 22 * u], [300 + s * (1.4 * H2.a + k * 2 * u), hc + (k - 1) * 30 * u]], 3 * u);
  p.rot = null;
};

// ---------------- the fighter ----------------
const PALE = "#f2c6a4", GINGER = "#c2582a", GINGER_D = "#8f3c1c", HAIR_F = "#9a4d2a", TAT = "#2c3446";
const fighterFace = (p: Pen, cx: number, hc: number, H: Blob, u: number) => {
  const ey = hc - 4 * u;
  for (const side of [-1, 1]) eye(p, "lid", cx + side * 13 * u, ey, u, side, -0.3, PALE);
  // one brow cocked high, the other low and flat: the smug look
  taper(p, [cx - 6 * u, ey - 16 * u], [cx - 22 * u, ey - 16 * u], 6 * u, 3 * u, GINGER_D);
  p.stroke(curve([cx + 5 * u, ey - 20 * u], [cx + 13 * u, ey - 28 * u], [cx + 23 * u, ey - 23 * u], 8), 5.6 * u, GINGER_D);
  p.stroke([[cx + 1 * u, ey + 7 * u], [cx + 4 * u, ey + 13 * u], [cx, ey + 14 * u]], 2.4 * u);
};
const beard = (p: Pen, cx: number, hc: number, H: Blob, u: number, light: number, thick: number, seed: number) => {
  const hp = blobPts(cx, hc, H, 96), ring: P2[] = [];
  for (let k = -3; k <= 51; k++) { // right temple -> round the jaw -> left temple (clockwise on screen)
    const i = (k + 96) % 96, t = (k / 96) * Math.PI * 2, [x, y] = hp[i];
    const dx = x - cx, dy = y - hc, l = Math.hypot(dx, dy) || 1, s = Math.max(0, Math.sin(t));
    const push = (4 + 15 * s ** 3) * u + (k % 2 ? 3 * u : -1 * u);
    ring.push([x + (dx / l) * push, y + (dy / l) * push]);
  }
  const cheek = curve([cx - 0.9 * H.a, hc + 0.06 * H.b], [cx, hc + 0.36 * H.b], [cx + 0.9 * H.a, hc + 0.06 * H.b], 14);
  const bd = ring;
  const full: P2[] = [...bd, ...cheek];
  p.shadedFill(full, GINGER, mul(GINGER, [0.78, 0.7, 0.72]), light, H.a * 1.1, 0.35);
  p.clip(full, () => { for (let i = 0; i < 70; i++) { const x = cx - 1.1 * H.a + 2.2 * H.a * rnd(seed, 200 + i), y = hc + 0.2 * H.b + 1.05 * H.b * rnd(seed, 300 + i); p.stroke([[x, y], [x + 1.5 * u, y + 6 * u]], 1.6 * u, i % 3 ? GINGER_D : "#e07a42"); } });
  p.inkRing(full, 4.4 * u, thick);
  return full;
};
const fighter = (p: Pen, o: CelebOpts) => {
  const { pose, light } = o, seed = o.seed ?? 9, thick = thickAngle(light), strut = pose === "b", suit = !!o.suit;
  const F = figure(seed, 116, 1.34, 1.14, 1.12, -0.24, 2.7);
  const { H, u, HH, T, tcx, chin, torsoBot, hipY } = F, ow = 5 * u;
  const hc = F.hc - (strut ? 0.03 * HH : 0);
  const skinD = mix(PALE, INK, 0.28), armW = 8.5 * u;
  const CHECK = "#7d8896", CHECK_D = mul(CHECK, SH_CLOTH);
  const tilt = strut ? 5 : 0;
  // ---- legs ----
  p.rot = null;
  for (const side of [-1, 1]) {
    const hx = 300 + side * 17 * u;
    const k: P2 = strut ? [300 + side * 30 * u, (hipY + 975) / 2] : [300 + side * 24 * u, (hipY + 975) / 2];
    const f: P2 = strut ? [300 + side * 40 * u, 975 - (side > 0 ? 14 : 4) * u] : [300 + side * 27 * u, 975 - 4 * u];
    if (suit) { rimmed(p, curve([hx, hipY], k, f), CHECK, 7.5 * u, 1.2 * u); foot(p, [f[0] - side * 3 * u, f[1]], [f[0] + side * 14 * u, f[1] + u], 8.5 * u, "#6b3f24"); }
    else { p.stroke(curve([hx, hipY], k, f), 7.5 * u, skinD); foot(p, [f[0] - side * 3 * u, f[1]], [f[0] + side * 12 * u, f[1] + u], 7 * u, PALE); }
  }
  // ---- fight shorts ----
  if (!suit) {
    const sw = 46 * u, sy0 = torsoBot - 0.18 * HH, sy1 = hipY + 0.26 * HH;
    const sh: P2[] = [[tcx - sw, sy0], [tcx + sw, sy0], [tcx + sw + 9 * u, sy1], [tcx + 4 * u, sy1], [tcx, sy1 - 12 * u], [tcx - 4 * u, sy1], [tcx - sw - 9 * u, sy1]];
    p.gradFill(sh, "#2a2930", "#16151a", light);
    p.clip(sh, () => { p.band([[tcx - sw - 10 * u, sy0 + 5 * u], [tcx + sw + 10 * u, sy0 + 5 * u]], "#4b4a55", 8 * u, 0); for (const s of [-1, 1]) p.stroke([[tcx + s * (sw + 2 * u), sy0 + 10 * u], [tcx + s * (sw + 9 * u), sy1]], 2.4 * u, "#5c5b66"); });
    p.poly(sh, null, ow * 0.8);
  }
  // ---- upper body ----
  p.rot = tilt ? [rad(tilt), 300, hipY] : null;
  const fdirs: [P2, P2] = strut ? [norm(-0.8, 0.6), norm(0.8, 0.6)] : [norm(-0.28, 0.96), norm(0.28, 0.96)];
  const sh = 62 * u, ww = 40 * u, neckY = chin - 0.08 * HH, hemY = torsoBot + 0.02 * HH;
  const body = torsoShape(tcx, neckY, sh, ww, hemY, HH, u, [{ dir: fdirs[0], len: suit ? 22 * u : 12 * u, w: suit ? 11 * u : 12 * u }, { dir: fdirs[1], len: suit ? 22 * u : 12 * u, w: suit ? 11 * u : 12 * u }], 1, suit ? 10 : 6);
  const S = (side: number): P2 => body.S[side < 0 ? 0 : 1];
  const behind: [P2, P2, P2][] = [], front: [P2, P2, P2][] = [];
  if (strut) for (const side of [-1, 1]) behind.push([S(side), [S(side)[0] + side * 0.42 * HH, S(side)[1] + 0.3 * HH], [S(side)[0] + side * 0.85 * HH, S(side)[1] + 0.52 * HH + (side > 0 ? -10 : 8) * u]]);
  else for (const side of [-1, 1]) {
    const e: P2 = [tcx + side * (sh - 6 * u), chin + 0.6 * HH];
    behind.push([S(side), lerp2(S(side), e, 0.5), e]);
    front.push([e, [tcx, chin + 0.64 * HH + side * 3 * u], [tcx - side * (sh - 20 * u), chin + 0.58 * HH - side * 4 * u]]);
  }
  const armCol = suit ? CHECK : skinD;
  const drawArm = (a: [P2, P2, P2], sleeve: boolean) => {
    const pts = curve(a[0], a[1], a[2], 10);
    rimmed(p, pts, armCol, armW, 1.1 * u);
    if (sleeve && !suit) p.clip([...pts.map(([x, y]) => [x - 9 * u, y] as P2), ...pts.slice().reverse().map(([x, y]) => [x + 9 * u, y] as P2)], () => {
      for (let i = 1; i < 6; i++) { const q = pts[Math.min(pts.length - 1, i * 2 - 1)]; p.ell(q[0], q[1], 5 * u, 3.2 * u, TAT, 0, 0, 360, 25 * i); }
    });
  };
  const fist = (q: P2) => {
    if (suit) { p.dot(q[0], q[1], 7 * u); return; }
    p.ell(q[0], q[1], 9 * u, 8.5 * u, "#f4f2ec", 2.2 * u); p.stroke([[q[0] - 7 * u, q[1] - 2 * u], [q[0] + 7 * u, q[1] + 1 * u]], 1.2 * u, "#b9b4a8"); p.stroke([[q[0] - 6 * u, q[1] + 3 * u], [q[0] + 6 * u, q[1] + 5 * u]], 1.2 * u, "#b9b4a8");
  };
  behind.forEach((a, i) => { drawArm(a, i === 1); if (strut) fist(a[2]); });
  // torso: bare muscled chest with tattoos, or the checked three-piece suit
  if (suit) {
    p.gradFill(body.pts, CHECK, CHECK_D, light);
    p.clip(body.pts, () => {
      for (let x = tcx - 1.4 * sh; x < tcx + 1.4 * sh; x += 9 * u) p.stroke([[x, chin - 0.3 * HH], [x, torsoBot + 0.1 * HH]], 0.9 * u, "#5b6472");
      for (let y = chin - 0.3 * HH; y < torsoBot + 0.1 * HH; y += 9 * u) p.stroke([[tcx - 1.4 * sh, y], [tcx + 1.4 * sh, y]], 0.9 * u, "#5b6472");
      for (let x = tcx - 1.4 * sh + 4 * u; x < tcx + 1.4 * sh; x += 27 * u) p.stroke([[x, chin - 0.3 * HH], [x, torsoBot + 0.1 * HH]], 1.4 * u, "#b8506a");
      // shirt + waistcoat V, lapels, buttons, pocket square
      p.poly([[tcx - 13 * u, chin - 0.1 * HH], [tcx + 13 * u, chin - 0.1 * HH], [tcx, chin + 0.36 * HH]], "#f6f4ee", 1.6 * u);
      for (const s of [-1, 1]) p.poly([[tcx + s * 13 * u, chin - 0.1 * HH], [tcx + s * 0.55 * sh, chin + 0.05 * HH], [tcx + s * 0.28 * sh, chin + 0.28 * HH], [tcx, chin + 0.58 * HH], [tcx + s * 6 * u, chin + 0.2 * HH]], mul(CHECK, [0.78, 0.8, 0.86]), 2 * u);
      for (let i = 0; i < 3; i++) p.dot(tcx + 1 * u, chin + (0.42 + i * 0.13) * HH, 2.6 * u, INK);
      p.poly([[tcx - 0.55 * sh, chin + 0.3 * HH], [tcx - 0.3 * sh, chin + 0.3 * HH], [tcx - 0.4 * sh, chin + 0.22 * HH]], "#c0392b", 1.4 * u);
    });
  } else {
    p.gradFill(body.pts, PALE, mul(PALE, SH_SKIN), light);
    p.clip(body.pts, () => {
      const line = mul(PALE, [0.74, 0.6, 0.56]);
      for (const s of [-1, 1]) p.stroke(curve([tcx + s * 0.08 * T.a, chin + 0.36 * HH], [tcx + s * 0.4 * ww, chin + 0.46 * HH], [tcx + s * 0.85 * T.a, chin + 0.3 * HH], 10), 2 * u, line);
      p.stroke([[tcx, chin + 0.15 * HH], [tcx, torsoBot - 0.08 * HH]], 1.6 * u, line);
      for (let r = 0; r < 3; r++) for (const s of [-1, 1]) p.stroke([[tcx + s * 4 * u, chin + (0.6 + r * 0.14) * HH], [tcx + s * 17 * u, chin + (0.6 + r * 0.14) * HH + 1 * u]], 1.6 * u, line);
      // chest piece: ape silhouette (crown, brow, broad shoulders, arms meeting) cradling a heart left in skin
      const cx = tcx - 2 * u, cy = chin + 0.3 * HH, A = 0.58;
      const ape0: P2[] = [[cx - 40 * u, cy + 20 * u], [cx - 44 * u, cy + 2 * u], [cx - 30 * u, cy - 10 * u], [cx - 14 * u, cy - 12 * u], [cx - 12 * u, cy - 24 * u], [cx, cy - 31 * u], [cx + 12 * u, cy - 24 * u], [cx + 14 * u, cy - 12 * u],
        [cx + 30 * u, cy - 10 * u], [cx + 44 * u, cy + 2 * u], [cx + 40 * u, cy + 20 * u], [cx + 18 * u, cy + 26 * u], [cx, cy + 22 * u], [cx - 18 * u, cy + 26 * u]];
      const ape = ape0.map(([x, y]) => [cx + (x - cx) * A, cy + (y - cy) * A] as P2);
      p.poly(ape, TAT, 0);
      const heart: P2[] = [];
      for (let i = 0; i <= 30; i++) { const t = (i / 30) * Math.PI * 2, hx = 16 * Math.sin(t) ** 3, hy = -(13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t)); heart.push([cx + hx * 0.75 * A * u, cy + 8 * A * u + hy * 0.75 * A * u]); }
      p.poly(heart, mix(PALE, "#c0505a", 0.35), 1.6 * u);
      p.dot(cx - 4 * u, cy - 12 * u, 1.4 * u, mix(PALE, TAT, 0.3)); p.dot(cx + 4 * u, cy - 12 * u, 1.4 * u, mix(PALE, TAT, 0.3));
      // belly stripes (tiger) on the right side
      for (let i = 0; i < 4; i++) p.poly([[tcx + 0.4 * ww, chin + (0.62 + i * 0.1) * HH], [tcx + 0.95 * ww, chin + (0.57 + i * 0.1) * HH], [tcx + 0.78 * ww, chin + (0.64 + i * 0.1) * HH]], TAT, 0);
    });
  }
  p.inkRing(body.pts, ow, thick);
  front.forEach((a) => { drawArm(a, false); fist(a[2]); });
  // ---- head ----
  const hp = blobPts(300, hc, H);
  p.shadedFill(hp, PALE, mul(PALE, SH_SKIN), light, H.a);
  p.inkRing(hp, ow, thick);
  if (suit) { // flat cap: wide checked crown + short brim, sits low
    const cap = hairCap(H, 300, hc, u, { temple: 0.5, line: 0.48, push: 4, quiff: 0.12, qx: 0.15, qw: 0.8 });
    p.shadedFill(cap, CHECK, CHECK_D, light, H.a, 0.35);
    p.clip(cap, () => { for (let x = 150; x < 450; x += 8 * u) p.stroke([[x, hc - 2 * H.b], [x, hc]], 0.9 * u, "#5b6472"); for (let y = hc - 2 * H.b; y < hc; y += 8 * u) p.stroke([[150, y], [450, y]], 0.9 * u, "#5b6472"); });
    p.inkRing(cap, ow * 0.9, thick);
    p.ell(300 + 6 * u, hc - 0.5 * H.b + 2 * u, 34 * u, 6 * u, mul(CHECK, [0.7, 0.72, 0.8]), ow * 0.8, 0, 180);
  } else {
    const hair = hairCap(H, 300, hc, u, { temple: 0.56, line: 0.6, push: 3, quiff: 0.1, qx: 0.2, qw: 0.6 });
    p.shadedFill(hair, HAIR_F, mix(HAIR_F, INK, 0.45), light, H.a, 0.35);
    p.clip(hair, () => {
      for (let i = 0; i < 7; i++) { const x0 = 300 - 0.35 * H.a + i * 0.14 * H.a; p.stroke(curve([x0, hc - 0.6 * H.b], [x0 + 10 * u, hc - 0.95 * H.b], [x0 + 30 * u, hc - 1.1 * H.b], 8), 1.4 * u, "#c26a3a"); }
      p.stroke(curve([300 - 0.42 * H.a, hc - 0.58 * H.b], [300 - 0.4 * H.a, hc - 0.85 * H.b], [300 - 0.3 * H.a, hc - 1.1 * H.b], 8), 2.6 * u, mix(PALE, HAIR_F, 0.3)); // side part
    });
    p.inkRing(hair, ow * 0.9, thick);
  }
  beard(p, 300, hc, H, u, light, thick, seed);
  fighterFace(p, 300, hc, H, u);
  // moustache + smirk on top of the beard
  const mx = 300 + 2 * u, my = hc + 27 * u;
  for (const s of [-1, 1]) taper(p, [mx + s * 1 * u, my - 7 * u], [mx + s * 17 * u, my - 2 * u], 6 * u, 2.5 * u, GINGER_D);
  p.ell(mx + 2 * u, my + 3 * u, 11 * u, 4 * u, mix(GINGER, PALE, 0.25), 0);
  p.stroke(curve([mx - 9 * u, my + 3 * u], [mx + 2 * u, my + 4 * u], [mx + 12 * u, my - 1 * u], 8), 3.2 * u);
  p.rot = null;
  void pathPts;
};

export const drawCeleb = (p: Pen, kind: CelebKind, o: CelebOpts) => (kind === "striker" ? striker(p, o) : fighter(p, o));
