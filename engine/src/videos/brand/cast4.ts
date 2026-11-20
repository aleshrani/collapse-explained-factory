// Round 4 hosts for "Collapse Explained": The Scientist and The Professor, drawn to the measured competitor rules in
// brand/competitor_design_rules.md (R1..R9). Persona-engine Pen language (600 x 1000 design space, soles at y = 975,
// plum thick-thin ink, painted crescents, stick limbs), with the round-4 detail pass:
//   R1 round head, ~3.2 heads tall, torso 0.88 x head width      R2 outline 3.4 % of head width, inner lines ~1.5 %
//   R3 brows carry the expression                                 R4 hair/beard = base + 15..30 strands + highlights
//   R5 2..4 wrinkles / smile lines, teeth when laughing           R6 5..6 flat colours + shade, one warm accent
//   R7 dark oval eyes (~10 % of head width) with one catchlight   R8 modest costume detail (seams, pockets, 1..2 props)
//   R9 no Crayon mascot combo, no tall swept-back hair, no likeness of a real person
import { Pen, INK, mul, mix, blobPts, thickAngle, Blob, curve, rad, mouth, taper, P2, C3, rrect, ellPts, rnd } from "../persona/toon";

const SH_SKIN: C3 = [0.95, 0.85, 0.83];
const SH_CLOTH: C3 = [0.68, 0.7, 0.78];
const WHITE = "#ffffff";

export type Face4 = "neutral" | "shock" | "laugh" | "explain";
export type Arms4 = "hang" | "prop" | "cheeks" | "point";
export type Host4 = {
  key: "scientist" | "professor"; name: string; skin: string;
  hair: string; hairDk: string; hairHi: string; tips?: string;
  top: string; inner: string; accent: string; pants: string; shoes: string; glove?: string;
};
export const SCIENTIST: Host4 = {
  key: "scientist", name: "The Scientist", skin: "#f1c9a5", hair: "#f3f1ec", hairDk: "#b4aea6", hairHi: "#ffffff", tips: "#ff7a2f",
  top: "#f6f4ef", inner: "#13b5a0", accent: "#ff7a2f", pants: "#2f3550", shoes: "#e2453c", glove: "#ff8a3d",
};
export const PROFESSOR: Host4 = {
  key: "professor", name: "The Professor", skin: "#f3c8a2", hair: "#dfe1e6", hairDk: "#8e94a2", hairHi: "#ffffff",
  top: "#6f7d8c", inner: "#c8552d", accent: "#e9b43c", pants: "#3b3f52", shoes: "#5a3b2a",
};

const A = 120, ASPECT = 0.96; // head half-width, height ratio (R1: round)
export const head4Centre = () => { const R = 220, chin = 975 - 2.3 * R; return chin - 0.88 * A * ASPECT; };

/** strand strokes inside a clip: curves from `from(i)` through `mid(i)` to `to(i)` */
const strands = (p: Pen, n: number, f: (i: number, t: number) => [P2, P2, P2], w: number, col: string) => {
  for (let i = 0; i < n; i++) { const [a, m, b] = f(i, i / Math.max(1, n - 1)); p.stroke(curve(a, m, b, 8), w, col); }
};

export const drawHost4 = (p: Pen, d: Host4, o: { face?: Face4; arms?: Arms4; facing?: number; light?: number } = {}) => {
  const light = o.light ?? rad(-120), thick = thickAngle(light), f = o.face ?? "neutral", arms = o.arms ?? "prop", fc = o.facing ?? 0;
  const H: Blob = { a: A, b: A * ASPECT, nTop: 2.0, nBot: 2.25, egg: -0.04, asym: 0.06 * fc, rot: 0, noise: 0.004, seed: 7 };
  const W = 2 * A, u = W / 100, ow = 3.4 * u, iw = 1.6 * u, sole = 975; // R2
  const R = 220, torsoBot = sole - 1.3 * R, chin = torsoBot - R, hc = chin - 0.88 * H.b, hipY = torsoBot - 0.12 * R, crown = hc - H.b;
  const tw = 0.88 * W; // R1
  const T: Blob = { a: tw / 2, b: 0.5 * (torsoBot - (chin - 0.22 * R)), nTop: 2.2, nBot: 2.7, egg: 0.08, asym: 0, rot: 0, noise: 0.004, seed: 12 };
  const tcx = 300, coat = d.key === "scientist";
  const tp = blobPts(tcx, torsoBot - T.b + (coat ? 0.1 * R : 0), coat ? { ...T, b: T.b + 0.1 * R, nBot: 3.4 } : T);
  const lw = 2.6 * u; // limb width (R1 stick limbs, ~2.6 % of head width)
  const armCol = mix(d.top, INK, coat ? 0.35 : 0.45), legCol = mix(d.pants, INK, 0.35);
  const S = (s: number): P2 => [tcx + s * 0.84 * T.a, chin + 0.14 * R];
  const fx = 300 + 9 * u * fc; // face centre x (3/4 view slides features toward the facing side)
  const fy = hc + 0.1 * H.b;

  // ---- legs + shoes ----
  for (const s of [-1, 1]) {
    const hx = 300 + s * 13 * u, kx = 300 + s * 21 * u;
    p.stroke(curve([hx, hipY], [(hx + kx) / 2 + s * 1.5 * u, (hipY + sole) / 2], [kx, sole - 5 * u]), lw * 1.15, legCol);
    const a: P2 = [kx - s * 3 * u, sole - 5 * u], b: P2 = [kx + s * 13 * u, sole - 4 * u];
    p.stroke([a, b], 9 * u + 2 * ow * 0.6, INK); p.stroke([a, b], 9 * u, d.shoes);
    p.stroke([[a[0], a[1] + 2.6 * u], [b[0], b[1] + 2.6 * u]], 1.6 * u, mix(d.shoes, WHITE, 0.5));
  }

  // ---- hair behind the head (scientist side clouds, professor neat sides) ----
  const tuft = (cx: number, cy: number, dir: number, len: number, wid: number, tilt: number, seed: number): P2[] => {
    // a flame-free, wind-blown tuft: a rounded base with 3 soft points pointing along dir (radians)
    const pts: P2[] = [];
    for (let i = 0; i <= 36; i++) {
      const t = (i / 36) * Math.PI * 2, base = 1 + 0.18 * Math.cos(3 * t + seed) + 0.08 * Math.cos(5 * t + 2 * seed);
      const along = Math.cos(t) > 0 ? len * Math.pow(Math.cos(t), 0.8) * base : wid * 0.55 * Math.cos(t);
      const across = wid * 0.5 * Math.sin(t) * (Math.cos(t) > 0 ? 1 - 0.35 * Math.cos(t) : 1);
      const ax = Math.cos(dir + tilt), ay = Math.sin(dir + tilt);
      pts.push([cx + along * ax - across * ay, cy + along * ay + across * ax]);
    }
    return pts;
  };
  const sciTufts: { c: P2; dir: number; len: number; wid: number }[] = [
    { c: [300 - 0.86 * A, hc - 0.22 * H.b], dir: rad(195), len: 0.62 * A, wid: 0.62 * A },
    { c: [300 - 0.8 * A, hc + 0.12 * H.b], dir: rad(165), len: 0.55 * A, wid: 0.5 * A },
    { c: [300 + 0.86 * A, hc - 0.22 * H.b], dir: rad(-15), len: 0.62 * A, wid: 0.62 * A },
    { c: [300 + 0.8 * A, hc + 0.12 * H.b], dir: rad(15), len: 0.55 * A, wid: 0.5 * A },
    { c: [300 - 0.45 * A, crown + 0.1 * H.b], dir: rad(-140), len: 0.42 * A, wid: 0.5 * A },
    { c: [300 + 0.45 * A, crown + 0.1 * H.b], dir: rad(-40), len: 0.42 * A, wid: 0.5 * A },
    { c: [300 + 0.02 * A, crown + 0.02 * H.b], dir: rad(-80), len: 0.3 * A, wid: 0.55 * A },
  ];
  const drawCloud = (group: (typeof sciTufts), i0: number) => {
    // one silhouette: ink every tuft at double width, then fill them all, then strands per tuft (R4)
    const shapes = group.map((t, i) => tuft(t.c[0], t.c[1], t.dir, t.len, t.wid, 0, (i0 + i) * 1.7));
    for (const pts of shapes) p.stroke([...pts, pts[0]], 2 * ow, INK);
    shapes.forEach((pts, i) => p.shadedFill(pts, d.hair, mul(d.hair, [0.88, 0.88, 0.92]), light, group[i].len, 0.35));
    shapes.forEach((pts, i) => {
      const t = group[i], ax = Math.cos(t.dir), ay = Math.sin(t.dir), nx = -ay, ny = ax;
      p.clip(pts, () => {
        strands(p, 4, (k, q) => { const o = (q - 0.5) * t.wid * 0.7; const a0: P2 = [t.c[0] + nx * o - ax * 0.2 * t.len, t.c[1] + ny * o - ay * 0.2 * t.len];
          const b0: P2 = [t.c[0] + nx * o * 0.5 + ax * 0.9 * t.len, t.c[1] + ny * o * 0.5 + ay * 0.9 * t.len]; return [a0, [(a0[0] + b0[0]) / 2 + nx * 3 * u, (a0[1] + b0[1]) / 2 + ny * 3 * u], b0]; }, 0.9 * u, mix(d.hairDk, d.hair, 0.25));
        strands(p, 2, (k, q) => { const o = (q - 0.4) * t.wid * 0.4; const a0: P2 = [t.c[0] + nx * o, t.c[1] + ny * o];
          const b0: P2 = [t.c[0] + nx * o + ax * 0.55 * t.len, t.c[1] + ny * o + ay * 0.55 * t.len]; return [a0, [(a0[0] + b0[0]) / 2 - nx * 2 * u, (a0[1] + b0[1]) / 2 - ny * 2 * u], b0]; }, 1.3 * u, d.hairHi);
        if (d.tips) { const tip: P2 = [t.c[0] + ax * 1.0 * t.len, t.c[1] + ay * 1.0 * t.len]; p.ell(tip[0], tip[1], 0.24 * t.wid, 0.2 * t.wid, d.tips, 0, 0, 360, (t.dir * 180) / Math.PI); }
      });
    });
  };
  if (d.key === "scientist") drawCloud(sciTufts.slice(0, 4), 0);
  if (d.key === "professor") for (const s of [-1, 1]) { // neat short sides above the ears
    const sp = blobPts(300 + s * 0.9 * A, hc - 0.12 * H.b, { a: 0.2 * A, b: 0.36 * H.b, nTop: 2, nBot: 2, egg: 0, asym: 0, rot: rad(s * 8), noise: 0.004, seed: 3 });
    p.shadedFill(sp, d.hair, mul(d.hair, [0.85, 0.85, 0.9]), light, 0.3 * A); p.inkRing(sp, ow * 0.8, thick);
  }

  // ---- torso ----
  p.gradFill(tp, d.top, mul(d.top, SH_CLOTH), light);
  p.clip(tp, () => {
    const v: P2[] = [[tcx - 0.32 * T.a, chin - 0.05 * R], [tcx + 0.32 * T.a, chin - 0.05 * R], [tcx, chin + 0.42 * R]];
    if (coat) {
      p.poly(v, d.inner, iw);
      p.stroke([[tcx, chin + 0.42 * R], [tcx, torsoBot + 0.2 * R]], iw);
      for (const s of [-1, 1]) p.poly([[tcx + s * 0.32 * T.a, chin - 0.05 * R], [tcx + s * 0.7 * T.a, chin + 0.26 * R], [tcx + s * 0.18 * T.a, chin + 0.38 * R], [tcx, chin + 0.42 * R]], "#e9e6df", iw);
      // breast pocket with three pens (R8)
      const bx = tcx - 0.62 * T.a, by = chin + 0.46 * R;
      for (const [k, c] of [[0, "#e2453c"], [1, "#2456f5"], [2, INK]] as const) { p.stroke([[bx + (4 + k * 6) * u, by - 6 * u], [bx + (4 + k * 6) * u, by + 4 * u]], 2.6 * u, c); p.dot(bx + (4 + k * 6) * u, by - 6 * u, 1.6 * u, mix(c, WHITE, 0.4)); }
      p.poly(rrect(bx, by, bx + 0.34 * T.a, by + 0.15 * R, 1.5 * u), "#ece9e2", iw);
      // hip pockets
      for (const s of [-1, 1]) p.poly(rrect(tcx + s * 0.25 * T.a - (s < 0 ? 0.42 * T.a : 0), chin + 0.86 * R, tcx + s * 0.25 * T.a + (s > 0 ? 0.42 * T.a : 0), chin + 1.02 * R, 1.5 * u), "#ece9e2", iw);
      for (const k of [0.56, 0.74]) p.ell(tcx + 3 * u, chin + k * R, 2.2 * u, 2.2 * u, "#d9d4cc", 1 * u);
      // scorch marks and a green splash (it has been a long week in the lab)
      for (const [x, y, r] of [[0.48, 0.66, 9], [-0.3, 1.08, 7]] as const) {
        const bp = blobPts(tcx + x * T.a, chin + y * R, { a: r * u, b: r * 0.8 * u, nTop: 2, nBot: 2, egg: 0, asym: 0, rot: 0, noise: 0.12, seed: x * 10 });
        p.poly(bp, "rgba(255,122,47,0.45)", 0); p.poly(blobPts(tcx + x * T.a, chin + y * R, { a: r * 0.6 * u, b: r * 0.5 * u, nTop: 2, nBot: 2, egg: 0, asym: 0, rot: 0, noise: 0.15, seed: x * 7 }), "rgba(60,40,40,0.55)", 0);
      }
      for (const [dx, dy, r] of [[0, 0, 4], [5, 3, 2.2], [-4, 5, 1.6], [3, -5, 1.4]] as const) p.ell(tcx + 0.55 * T.a + dx * u, chin + 0.95 * R + dy * u, r * u, r * u, "rgba(126,224,138,0.8)", 0);
    } else {
      // professor: rust turtleneck under a herringbone tweed jacket (R6 accent = rust + mustard pocket square)
      p.poly([[tcx - 0.3 * T.a, chin - 0.05 * R], [tcx + 0.3 * T.a, chin - 0.05 * R], [tcx + 0.22 * T.a, chin + 0.5 * R], [tcx - 0.22 * T.a, chin + 0.5 * R]], d.inner, iw);
      for (let i = -6; i <= 6; i++) for (let j = 0; j < 7; j++) { // herringbone: alternating short slants in columns
        const x = tcx + i * 6.5 * u, y = chin + 0.12 * R + j * 0.13 * R, s = i % 2 ? 1 : -1;
        p.stroke([[x - s * 1.6 * u, y], [x + s * 1.6 * u, y + 3.6 * u]], 0.9 * u, mul(d.top, [0.8, 0.8, 0.82]));
      }
      for (const s of [-1, 1]) p.poly([[tcx + s * 0.3 * T.a, chin - 0.05 * R], [tcx + s * 0.66 * T.a, chin + 0.2 * R], [tcx + s * 0.26 * T.a, chin + 0.26 * R], [tcx + s * 0.08 * T.a, chin + 0.62 * R]], mul(d.top, [0.9, 0.9, 0.92]), iw);
      p.stroke([[tcx + 0.06 * T.a, chin + 0.62 * R], [tcx + 0.04 * T.a, torsoBot]], iw);
      for (const k of [0.7, 0.86]) p.ell(tcx + 0.14 * T.a, chin + k * R, 2.6 * u, 2.6 * u, "#3e2a20", 1 * u);
      const bx = tcx - 0.66 * T.a, by = chin + 0.44 * R;
      p.poly([[bx + 2 * u, by], [bx + 7 * u, by - 5 * u], [bx + 11 * u, by], [bx + 15 * u, by - 4 * u], [bx + 18 * u, by]], d.accent, 1 * u);
      p.stroke([[bx, by], [bx + 0.34 * T.a, by]], iw);
      for (const s of [-1, 1]) p.stroke([[tcx + s * 0.2 * T.a, chin + 0.92 * R], [tcx + s * 0.62 * T.a, chin + 0.92 * R]], iw);
    }
  });
  p.inkRing(tp, ow, thick);
  // collars
  if (coat) p.ell(300, chin + 0.02 * R, 0.24 * W, 0.045 * R, d.inner, iw);
  else { p.ell(300, chin + 0.01 * R, 0.26 * W, 0.07 * R, d.inner, iw); for (const k of [-0.12, 0, 0.12]) p.arc(300 + k * W, chin + 0.01 * R, 0.04 * W, 0.05 * R, 30, 150, 1 * u, mul(d.inner, [0.75, 0.72, 0.72])); }

  // ---- arms ----
  const armPath = (s: number): P2[] => {
    const a = S(s);
    if (arms === "cheeks") return curve(a, [tcx + s * (1.3 * T.a + 6 * u), chin + 0.18 * R], [fx + s * (A - 14 * u), hc + 0.48 * H.b]);
    if (arms === "point" && s > 0) return curve(a, [tcx + 1.3 * T.a + 20 * u, a[1] - 0.18 * R], [tcx + 1.4 * T.a + 38 * u, a[1] - 0.66 * R]);
    if (arms === "prop" && s > 0) return curve(a, [tcx + 1.2 * T.a + 12 * u, a[1] + 0.28 * R], [tcx + 1.3 * T.a + 22 * u, a[1] + 0.16 * R]);
    const ex = tcx + s * (1.08 * T.a + 3 * u); return curve(a, [ex, a[1] + 0.46 * R], [ex + s * 2 * u, a[1] + 0.86 * R]);
  };
  const hand = (h: P2, s: number, pointing: boolean) => {
    if (d.glove) { // orange rubber gloves: mitten + thumb (the scientist's signature accessory)
      p.ell(h[0], h[1], 7 * u, 8 * u, d.glove, iw * 1.2);
      p.ell(h[0] - s * 5.5 * u, h[1] - 3 * u, 2.8 * u, 4.6 * u, d.glove, iw, 0, 360, s * 30);
      p.stroke([[h[0] - 4 * u, h[1] + 7 * u], [h[0] + 4 * u, h[1] + 7 * u]], 1.2 * u, mul(d.glove, [0.75, 0.6, 0.55]));
      if (pointing) { p.ell(h[0] + 1 * u, h[1] - 10 * u, 2.6 * u, 5.5 * u, d.glove, iw, 0, 360, 15); }
    } else if (arms === "cheeks") p.ell(h[0], h[1], 7.5 * u, 10 * u, d.skin, iw * 1.3, 0, 360, s * 15);
    else { p.dot(h[0], h[1], 5.2 * u); if (pointing) p.stroke([h, [h[0] + 2 * u, h[1] - 11 * u]], 3 * u); }
  };
  const late = arms === "cheeks";
  const drawArms = () => {
    for (const s of [-1, 1]) {
      const ap = armPath(s), h = ap[ap.length - 1];
      if (arms === "prop" && s > 0 && d.key === "professor") { // wooden pointer resting on the shoulder line
        p.stroke([[h[0] - 6 * u, h[1] + 4 * u], [h[0] + 46 * u, h[1] - 88 * u]], 2.8 * u, "#8a5a2b");
        p.stroke([[h[0] + 43 * u, h[1] - 83 * u], [h[0] + 46 * u, h[1] - 88 * u]], 3.2 * u, "#f6ecdc");
      }
      if (arms === "point" && s > 0 && d.key === "professor") p.stroke([[h[0] - 4 * u, h[1] + 8 * u], [h[0] + 30 * u, h[1] - 70 * u]], 2.8 * u, "#8a5a2b");
      p.stroke(ap, lw, armCol);
      if (!coat && arms !== "cheeks") { const e = ap[Math.floor(ap.length / 2)]; p.ell(e[0], e[1], 4 * u, 5.5 * u, "#8a5a3c", 1 * u); } // elbow patches
      hand(h, s, arms === "point" && s > 0 && d.key === "scientist");
      if (arms === "prop" && s > 0 && d.key === "scientist") { // flask
        const x = h[0] + 2 * u, y = h[1] - 16 * u;
        p.stroke([[x, y - 8 * u], [x, y - 20 * u]], 7 * u, INK); p.stroke([[x, y - 8 * u], [x, y - 19.5 * u]], 4.4 * u, "#dff3ff");
        p.ell(x, y, 12 * u, 11 * u, "#dff3ff", 0);
        p.clip(ellPts(x, y, 12 * u, 11 * u), () => { p.poly(rrect(x - 13 * u, y - 1 * u, x + 13 * u, y + 13 * u, 0), "#7ee08a", 0); p.stroke([[x - 13 * u, y - 1 * u], [x + 13 * u, y - 1 * u]], 1 * u, "#4fb85e"); });
        p.ell(x, y, 12 * u, 11 * u, null, iw * 1.2);
        p.arc(x - 4 * u, y - 4 * u, 4 * u, 3 * u, 200, 280, 1.4 * u, WHITE);
        for (const [dx, dy, r] of [[-3, -26, 2.6], [2, -33, 2], [-1, -39, 1.5]] as const) p.ell(x + dx * u, y + dy * u, r * u, r * u, "#a8f0b2", 1 * u);
        hand(h, s, false);
      }
    }
  };
  if (!late) drawArms();

  // ---- head ----
  for (const s of fc ? [-1] : [-1, 1]) {
    const ex = 300 + s * (A + 1 * u) + 10 * u * fc, ey = hc + 0.08 * H.b;
    p.ell(ex, ey, 6.5 * u, 9 * u, s < 0 ? d.skin : mul(d.skin, SH_SKIN), iw * 1.3);
    p.arc(ex, ey, 3 * u, 4.5 * u, s < 0 ? 100 : -80, s < 0 ? 260 : 80, 1.2 * u, mul(d.skin, [0.8, 0.66, 0.62]));
  }
  const hp = blobPts(300, hc, H);
  p.shadedFill(hp, d.skin, mul(d.skin, SH_SKIN), light, A);
  if (d.key === "professor") p.clip(hp, () => {
    // R4: neat silver hair swept from a parting on the viewer's left across to the right, with combed strands
    const part = 300 - 0.42 * A + 8 * u * fc, top: P2[] = [[300 - 1.2 * A, hc - 0.05 * H.b], [300 - 1.0 * A, hc - 0.4 * H.b], [part, hc - 0.6 * H.b],
      [300 + 0.1 * A, hc - 0.5 * H.b], [300 + 0.62 * A, hc - 0.42 * H.b], [300 + 1.0 * A, hc - 0.25 * H.b], [300 + 1.2 * A, hc - 0.05 * H.b], [300 + 1.2 * A, crown - 30], [300 - 1.2 * A, crown - 30]];
    p.shadedFill(top, d.hair, mul(d.hair, [0.84, 0.84, 0.9]), light, A, 0.3);
    strands(p, 16, (i, t) => { const x0 = part + (t - 0.2) * 0.3 * A; return [[x0, crown + 0.02 * H.b], [x0 + 0.5 * A, hc - 0.7 * H.b + t * 0.12 * H.b], [300 + (0.55 + t * 0.6) * A, hc - (0.45 - t * 0.25) * H.b]]; }, 1.1 * u, d.hairDk);
    strands(p, 8, (i, t) => { const x0 = part - (0.1 + t * 0.55) * A; return [[part, crown + 0.05 * H.b], [x0, hc - 0.6 * H.b], [300 - (0.75 + t * 0.35) * A, hc - (0.38 - t * 0.2) * H.b]]; }, 1.1 * u, d.hairDk);
    strands(p, 4, (i, t) => { const x0 = part + (0.1 + t * 0.3) * A; return [[x0, crown + 0.1 * H.b], [x0 + 0.35 * A, hc - 0.72 * H.b], [x0 + 0.65 * A, hc - 0.58 * H.b]]; }, 1.4 * u, d.hairHi);
    p.stroke(top.slice(0, 7), iw);
  });
  if (d.key === "scientist") p.clip(hp, () => { // a low, messy white fringe across the top
    const fr: P2[] = [];
    for (let i = 0; i <= 10; i++) fr.push([300 - 1.15 * A + (2.3 * A * i) / 10, hc - (0.56 + 0.07 * Math.sin(i * 2.1)) * H.b + (i === 0 || i === 10 ? 0.3 * H.b : 0)]);
    p.shadedFill([...fr, [300 + 1.2 * A, crown - 30], [300 - 1.2 * A, crown - 30]], d.hair, mul(d.hair, [0.86, 0.86, 0.9]), light, A, 0.3);
    strands(p, 14, (i, t) => { const x = 300 + (t - 0.5) * 1.9 * A; return [[x - 0.1 * A, crown], [x + 0.05 * A, hc - 0.72 * H.b], [x + 0.12 * A * Math.sin(i), hc - 0.58 * H.b]]; }, 1.1 * u, d.hairDk);
    p.stroke(fr, iw);
  });
  p.inkRing(hp, ow, thick);
  if (d.key === "scientist") drawCloud(sciTufts.slice(4), 4); // low top tufts over the outline
  if (d.key === "professor") { // groomed side-swept wave standing proud of the crown
    const swc: P2 = [300 + 0.1 * A + 8 * u * fc, crown + 0.26 * H.b], sw = blobPts(swc[0], swc[1], { a: 0.98 * A, b: 0.32 * H.b, nTop: 2.2, nBot: 2.6, egg: 0, asym: 0.16, rot: rad(-6), noise: 0.004, seed: 2 });
    p.shadedFill(sw, d.hair, mul(d.hair, [0.84, 0.84, 0.9]), light, 0.8 * A, 0.35);
    p.clip(sw, () => {
      strands(p, 9, (i, t) => { const x0 = 300 - 0.55 * A + t * 0.9 * A; return [[x0 - 0.1 * A, crown + 0.32 * H.b], [x0 + 0.15 * A, crown + 0.02 * H.b], [x0 + 0.5 * A, crown + 0.08 * H.b]]; }, 1.1 * u, d.hairDk);
      strands(p, 3, (i, t) => { const x0 = 300 - 0.3 * A + t * 0.6 * A; return [[x0, crown + 0.18 * H.b], [x0 + 0.2 * A, crown + 0.02 * H.b], [x0 + 0.45 * A, crown + 0.1 * H.b]]; }, 1.6 * u, d.hairHi);
    });
    const topArc = sw.filter(([, y]) => y < swc[1] - 0.08 * H.b).sort((a, b) => a[0] - b[0]);
    p.stroke(topArc, ow, INK);
  }

  // ---- beard (professor): short boxed beard with strand texture ----
  if (d.key === "professor") {
    const bot: P2[] = [];
    for (let i = 0; i <= 26; i++) { const t = rad(8 + (164 * i) / 26); bot.push([300 + 0.97 * A * Math.cos(t), hc + 0.04 * H.b + 1.02 * H.b * Math.sin(t)]); }
    const topEdge: P2[] = [[300 - 0.97 * A, hc + 0.18 * H.b], [fx - 0.62 * A, fy + 0.34 * H.b], [fx - 0.28 * A, fy + 0.42 * H.b], [fx, fy + 0.36 * H.b], [fx + 0.28 * A, fy + 0.42 * H.b], [fx + 0.62 * A, fy + 0.34 * H.b], [300 + 0.97 * A, hc + 0.18 * H.b]];
    const bpc = [...bot, ...topEdge];
    p.shadedFill(bpc, d.hair, mul(d.hair, [0.82, 0.82, 0.88]), light, A, 0.3);
    p.clip(bpc, () => {
      for (let r = 0; r < 4; r++) for (let i = 0; i < 11; i++) { // rows of short downward strokes, offset per row
        const x = 300 + (i - 5 + (r % 2) * 0.5) * 0.17 * A, y = fy + (0.5 + r * 0.17) * H.b;
        p.stroke([[x, y], [x + (x - 300) * 0.04, y + 0.1 * H.b]], 1.1 * u, mix(d.hairDk, d.hair, 0.2));
      }
      for (let i = 0; i < 6; i++) { const x = 300 + (i - 2.5) * 0.26 * A, y = fy + 0.62 * H.b; p.stroke([[x, y], [x + 1 * u, y + 0.08 * H.b]], 1.4 * u, d.hairHi); }
    });
    p.stroke(bot, ow * 0.9, INK);
    p.stroke(topEdge, iw, mul(d.hair, [0.6, 0.6, 0.66]));
  }
  // ---- face ----
  const ex = 15 * u, ey = fy - 2 * u, browCol = d.key === "scientist" ? "#d3ccc2" : mul(d.hair, [0.78, 0.78, 0.84]);
  for (const s of [-1, 1]) p.ell(fx + s * 27 * u, fy + 12 * u, 7 * u, 4 * u, "rgba(255,110,110,0.28)", 0);
  // R5: forehead lines + crow's feet + smile lines
  if (d.key === "scientist") for (const k of [0, 1]) p.arc(fx, hc - 0.36 * H.b + k * 5 * u, 14 * u - k * 3 * u, 2.4 * u, 200, 340, iw * 0.7, mul(d.skin, [0.78, 0.62, 0.56]));
  for (const s of [-1, 1]) for (const k of [-1, 1]) p.stroke([[fx + s * 26 * u, ey + k * 2 * u], [fx + s * 31 * u, ey + k * 4.5 * u]], iw * 0.6, mul(d.skin, [0.78, 0.62, 0.56]));
  for (const s of [-1, 1]) {
    const x = fx + s * ex * (1 - 0.08 * fc);
    // R3 brows: bushy, the main expression carrier
    const [dI, dO] = f === "shock" ? [-9, -7] : f === "laugh" ? [-4, -4] : f === "explain" ? (s > 0 ? [-7, -9] : [-2, -3]) : [-1, -3];
    const by = ey - 17 * u;
    taper(p, [x - s * 9 * u, by + dI * u], [x + s * 9 * u, by + dO * u], 6.5 * u, 4 * u, browCol);
    p.stroke([[x - s * 9 * u, by + dI * u + 2.4 * u], [x + s * 9 * u, by + dO * u + 1.6 * u]], 1.4 * u, mul(browCol, [0.62, 0.62, 0.66]));
    // R7 eyes: dark ovals with a catchlight; shock = white rings with small pupils; laugh = closed arcs
    if (f === "laugh") p.arc(x, ey + 2 * u, 7 * u, 5 * u, 200, 340, 3.2 * u);
    else if (f === "shock") { p.ell(x, ey, 9.5 * u, 10.5 * u, WHITE, iw * 1.3); p.dot(x, ey + 1 * u, 3 * u); }
    else { p.ell(x + 1 * u * fc, ey, 4.6 * u, 6 * u, INK, 0); p.dot(x + 1 * u * fc + 1.6 * u, ey - 2.2 * u, 1.5 * u, WHITE); }
  }
  // nose: a soft hook (adds age and warmth)
  p.stroke(curve([fx + 2 * u + 4 * u * fc, ey + 7 * u], [fx + 6 * u + 4 * u * fc, ey + 11 * u], [fx + 4 * u * fc, ey + 13 * u]), iw * 1.1, mul(d.skin, [0.62, 0.45, 0.4]));
  for (const s of [-1, 1]) p.arc(fx + s * 17 * u, ey + 19 * u, 4 * u, 6 * u, s < 0 ? 100 : -10, s < 0 ? 190 : 80, iw * 0.7, mul(d.skin, [0.78, 0.62, 0.56]));
  const my = ey + 23 * u;
  if (f === "shock") mouth(p, "O", fx, my, u, 0.9);
  else if (f === "laugh") mouth(p, "laugh", fx, my - 1 * u, u, 0.95);
  else if (f === "explain") mouth(p, "grin", fx, my - 1 * u, u, 0.9);
  else mouth(p, "smileWide", fx, my - 1 * u, u, 0.85);
  if (d.key === "scientist") for (const s of [-1, 1]) { // small trimmed moustache (not bushy)
    const mp = blobPts(fx + s * 6.5 * u, my - 8.5 * u, { a: 7.5 * u, b: 3.2 * u, nTop: 2, nBot: 2, egg: 0, asym: 0, rot: rad(s * 12), noise: 0.01, seed: 4 + s });
    p.poly(mp, "#d8d2ca", iw * 0.8);
    for (let k = 0; k < 3; k++) p.stroke([[fx + s * (3 + k * 3) * u, my - 10 * u], [fx + s * (4 + k * 3) * u, my - 7 * u]], 0.8 * u, "#a9a299");
  }
  if (d.key === "professor") { // moustache joining the beard
    const mp: P2[] = [[fx - 15 * u, my - 4 * u], [fx - 6 * u, my - 10 * u], [fx, my - 8 * u], [fx + 6 * u, my - 10 * u], [fx + 15 * u, my - 4 * u], [fx + 6 * u, my - 6 * u], [fx, my - 5 * u], [fx - 6 * u, my - 6 * u]];
    p.poly(mp, d.hair, iw * 0.9);
    for (let k = -2; k <= 2; k++) p.stroke([[fx + k * 3.5 * u, my - 9 * u], [fx + k * 4 * u, my - 6 * u]], 0.8 * u, d.hairDk);
  }

  // ---- scientist goggles pushed up onto the forehead (orange frames, blue lenses) ----
  if (d.key === "scientist") {
    const gy = hc - 0.7 * H.b;
    p.band([[300 - 1.02 * A, gy + 3 * u], [300 + 1.02 * A, gy + 3 * u]], "#3b3f52", 4.5 * u, 1 * u);
    for (const s of [-1, 1]) { const x = fx + s * 15 * u; p.ell(x, gy, 12 * u, 9.5 * u, d.accent, iw * 1.2); p.ell(x, gy, 8 * u, 6 * u, "#9fd4ff", iw); p.ell(x - 2.5 * u, gy - 2 * u, 2.2 * u, 1.6 * u, WHITE, 0); }
    p.stroke([[fx - 3 * u, gy], [fx + 3 * u, gy]], 3 * u, d.accent);
  }
  if (late) drawArms();
  return { hc, crown, chin };
};
