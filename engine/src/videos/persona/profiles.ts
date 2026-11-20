// Profile (side-view) caricature heads for the face-off avatar, in the same Pen language as toon.ts: explicit profile
// contours (skull, brow, nose, lips, chin, neck) smoothed by corner cutting, painted crescent, thick-thin plum ink,
// engine eye / brow / mouth marks. Both are drawn facing screen-right; the avatar mirrors the fighter.
import { Pen, INK, mul, mix, thickAngle, curve, rnd, eye, taper, P2, lerp2 } from "./toon";

const chaikin = (pts: P2[], n = 2, keep: number[] = []): P2[] => {
  let a = pts.map((p, i) => ({ p, k: keep.includes(i) }));
  for (let r = 0; r < n; r++) {
    const b: { p: P2; k: boolean }[] = [];
    for (let i = 0; i < a.length; i++) {
      const p0 = a[i], p1 = a[(i + 1) % a.length];
      if (p0.k) b.push(p0); else b.push({ p: lerp2(p0.p, p1.p, 0.25), k: false });
      if (!p1.k) b.push({ p: lerp2(p0.p, p1.p, 0.75), k: false });
    }
    a = b;
  }
  return a.map((x) => x.p);
};
const S = (cx: number, cy: number, a: number, pts: [number, number][]): P2[] => pts.map(([x, y]) => [cx + x * a, cy + y * a]);
const SH: [number, number, number] = [0.94, 0.84, 0.82];

export const TAN = "#d79d6c", HAIR_S = "#2a1c16", PALE = "#f2c6a4", GINGER = "#c2582a", GINGER_D = "#8f3c1c", HAIR_F = "#9a4d2a", TAT = "#2c3446";

/** striker profile: sharp square chin, clenched jaw, raised brow, faded sides, quiff jutting forward */
export const strikerProfile = (p: Pen, cx: number, cy: number, a: number, light: number) => {
  const u = a / 50, thick = thickAngle(light), ow = 5 * u;
  const head = chaikin(S(cx, cy, a, [[0.1, -0.95], [0.55, -0.74], [0.8, -0.34], [0.88, -0.12], [0.84, 0.0], [1.16, 0.3], [0.96, 0.41], [0.95, 0.53], [0.9, 0.6], [0.93, 0.67],
    [0.86, 0.76], [0.97, 0.93], [0.84, 1.06], [0.45, 1.0], [0.3, 1.12], [0.34, 2.4], [-0.34, 2.4], [-0.38, 0.85], [-0.8, 0.45], [-0.97, 0.0], [-0.84, -0.56], [-0.42, -0.88]]), 2, [5]);
  p.shadedFill(head, TAN, mul(TAN, SH), light, a);
  p.clip(head, () => {
    // kit collar at the bottom of the neck
    p.poly(S(cx, cy, a, [[-1, 1.95], [1, 1.75], [1, 2.6], [-1, 2.6]]), "#f7f6f1", 0);
    p.stroke(S(cx, cy, a, [[-1, 1.95], [1, 1.75]]), 9 * u, "#55438c"); p.stroke(S(cx, cy, a, [[-1, 1.95], [1, 1.75]]), 4 * u, "#d2a743");
    // faded side + jaw muscle + cheekbone
    p.poly(S(cx, cy, a, [[-1.1, -0.45], [-0.25, -0.45], [-0.18, 0.02], [-1.1, 0.12]]), mix(TAN, HAIR_S, 0.4), 0);
    p.stroke(curve(S(cx, cy, a, [[0.05, 0.6]])[0], S(cx, cy, a, [[0.2, 0.78]])[0], S(cx, cy, a, [[0.45, 0.95]])[0]), 2 * u, mul(TAN, [0.76, 0.64, 0.6]));
    p.stroke(curve(S(cx, cy, a, [[0.32, 0.5]])[0], S(cx, cy, a, [[0.36, 0.62]])[0], S(cx, cy, a, [[0.3, 0.74]])[0]), 2.4 * u, mul(TAN, [0.76, 0.64, 0.6]));
    p.stroke(curve(S(cx, cy, a, [[0.4, 0.22]])[0], S(cx, cy, a, [[0.55, 0.3]])[0], S(cx, cy, a, [[0.72, 0.3]])[0]), 1.8 * u, mul(TAN, [0.8, 0.7, 0.66]));
  });
  p.inkRing(head, ow, thick);
  // ear
  const [ex, ey] = S(cx, cy, a, [[-0.18, 0.12]])[0];
  p.ell(ex, ey, 0.13 * a, 0.2 * a, TAN, 3.4 * u);
  p.arc(ex + 0.02 * a, ey, 0.06 * a, 0.11 * a, 120, 300, 2 * u);
  // hair: short quiff jutting forward, crisp edge above the fade
  const hair = chaikin(S(cx, cy, a, [[0.6, -0.62], [0.82, -0.86], [0.66, -1.16], [0.4, -1.08], [0.3, -1.2], [0.05, -1.1], [-0.15, -1.16], [-0.42, -1.0], [-0.78, -0.78], [-0.98, -0.4],
    [-0.9, -0.42], [-0.3, -0.48], [0.3, -0.56]]), 1);
  p.shadedFill(hair, HAIR_S, mix(HAIR_S, INK, 0.5), light, a);
  p.clip(hair, () => { for (let i = 0; i < 8; i++) { const [x0, y0] = S(cx, cy, a, [[0.55 - i * 0.18, -0.55]])[0]; p.stroke(curve([x0, y0], [x0 + 0.05 * a, y0 - 0.25 * a], [x0 + 0.2 * a, y0 - 0.5 * a], 8), 1.6 * u, "#6a5242"); } });
  p.inkRing(hair, ow * 0.9, thick);
  // eye, raised brow, clenched mouth
  const [qx, qy] = S(cx, cy, a, [[0.6, -0.04]])[0];
  eye(p, "dot", qx, qy, u, 1, 0.6, TAN);
  taper(p, [qx - 0.12 * a, qy - 0.2 * a], [qx + 0.05 * a, qy - 0.3 * a], 5.4 * u, 4 * u); taper(p, [qx + 0.05 * a, qy - 0.3 * a], [qx + 0.2 * a, qy - 0.24 * a], 4 * u, 1.6 * u);
  const [m0x, m0y] = S(cx, cy, a, [[0.93, 0.6]])[0];
  p.poly([[m0x, m0y - 0.025 * a], [m0x - 0.2 * a, m0y - 0.02 * a], [m0x - 0.2 * a, m0y + 0.025 * a], [m0x, m0y + 0.03 * a]], "#ffffff", 2.4 * u);
  p.stroke([[m0x - 0.2 * a, m0y + 0.004 * a], [m0x, m0y + 0.004 * a]], 1.2 * u);
  p.stroke(curve(S(cx, cy, a, [[0.98, 0.36]])[0], S(cx, cy, a, [[0.9, 0.38]])[0], S(cx, cy, a, [[0.86, 0.33]])[0]), 2.4 * u); // nostril
};

/** fighter profile: big forward beard, slicked-back hair, cocked brow, smug smirk, chin pushed forward, neck tattoo */
export const fighterProfile = (p: Pen, cx: number, cy: number, a: number, light: number, seed = 9) => {
  const u = a / 50, thick = thickAngle(light), ow = 5 * u;
  const head = chaikin(S(cx, cy, a, [[0.1, -0.95], [0.55, -0.74], [0.8, -0.36], [0.88, -0.14], [0.84, 0.0], [1.14, 0.32], [0.96, 0.42], [0.96, 0.62], [0.9, 0.85], [0.5, 1.0],
    [0.32, 1.14], [0.36, 2.4], [-0.38, 2.4], [-0.4, 0.85], [-0.82, 0.45], [-0.98, 0.0], [-0.84, -0.56], [-0.42, -0.88]]), 2, [5]);
  p.shadedFill(head, PALE, mul(PALE, SH), light, a);
  p.clip(head, () => {
    p.poly(S(cx, cy, a, [[-0.35, 1.45], [0.05, 1.35], [0.2, 1.62], [0.0, 1.9], [-0.3, 1.82], [-0.22, 1.62]]), TAT, 0); // neck tattoo hint
    p.ell(...S(cx, cy, a, [[-0.06, 1.62]])[0], 0.08 * a, 0.07 * a, mix(PALE, "#c0505a", 0.3), 0);
  });
  p.inkRing(head, ow, thick);
  const [ex, ey] = S(cx, cy, a, [[-0.2, 0.12]])[0];
  p.ell(ex, ey, 0.13 * a, 0.2 * a, PALE, 3.4 * u);
  p.arc(ex + 0.02 * a, ey, 0.06 * a, 0.11 * a, 120, 300, 2 * u);
  // beard: from the sideburn in front of the ear, over the cheek, thrust forward past the chin
  const bd = chaikin(S(cx, cy, a, [[-0.02, -0.08], [0.25, 0.12], [0.62, 0.3], [0.86, 0.46], [1.04, 0.5], [1.12, 0.72], [1.1, 1.0], [0.98, 1.24], [0.7, 1.32], [0.42, 1.24], [0.2, 1.1],
    [-0.02, 0.8], [-0.1, 0.45]]), 2);
  const jag = bd.map(([x, y], i) => [x + (i % 2 ? 1 : -1) * 1.6 * u, y + (i % 2 ? 1.6 : -1) * u] as P2);
  p.shadedFill(jag, GINGER, mul(GINGER, [0.78, 0.7, 0.72]), light, a, 0.35);
  p.clip(jag, () => { for (let i = 0; i < 90; i++) { const [x, y] = S(cx, cy, a, [[-0.1 + 1.2 * rnd(seed, 400 + i), 0.0 + 1.3 * rnd(seed, 500 + i)]])[0]; p.stroke([[x, y], [x + 1.6 * u, y + 7 * u]], 1.8 * u, i % 3 ? GINGER_D : "#e07a42"); } });
  p.inkRing(jag, ow * 0.9, thick);
  // moustache + smug smirk at the front of the beard
  const [mx, my] = S(cx, cy, a, [[0.98, 0.6]])[0];
  taper(p, [mx + 0.02 * a, my - 0.08 * a], [mx - 0.24 * a, my - 0.03 * a], 7 * u, 3 * u, GINGER_D);
  p.ell(mx - 0.06 * a, my + 0.04 * a, 0.09 * a, 0.035 * a, mix(GINGER, PALE, 0.3), 0);
  p.stroke(curve([mx - 0.15 * a, my + 0.03 * a], [mx - 0.05 * a, my + 0.06 * a], [mx + 0.03 * a, my + 0.0 * a], 8), 3 * u);
  // slicked-back hair with comb lines
  const hair = chaikin(S(cx, cy, a, [[0.56, -0.66], [0.66, -0.86], [0.4, -1.04], [-0.1, -1.08], [-0.55, -0.96], [-0.88, -0.68], [-1.0, -0.3], [-0.9, -0.28], [-0.5, -0.42], [0.1, -0.56]]), 1);
  p.shadedFill(hair, HAIR_F, mix(HAIR_F, INK, 0.45), light, a);
  p.clip(hair, () => { for (let i = 0; i < 7; i++) { const [x0, y0] = S(cx, cy, a, [[0.55 - i * 0.04, -0.7 + i * 0.05]])[0]; p.stroke(curve([x0, y0], [x0 - 0.5 * a, y0 - 0.25 * a + i * 0.02 * a], [x0 - 1.2 * a, y0 + 0.15 * a], 10), 1.6 * u, "#c26a3a"); } });
  p.inkRing(hair, ow * 0.9, thick);
  // half-lidded eye, cocked brow, nostril
  const [qx, qy] = S(cx, cy, a, [[0.6, -0.04]])[0];
  eye(p, "lid", qx, qy, u, 1, 0.6, PALE);
  p.stroke(curve([qx - 0.14 * a, qy - 0.2 * a], [qx + 0.02 * a, qy - 0.36 * a], [qx + 0.2 * a, qy - 0.26 * a], 10), 6 * u, GINGER_D);
  p.stroke(curve(S(cx, cy, a, [[0.98, 0.37]])[0], S(cx, cy, a, [[0.9, 0.4]])[0], S(cx, cy, a, [[0.86, 0.35]])[0]), 2.4 * u);
};
