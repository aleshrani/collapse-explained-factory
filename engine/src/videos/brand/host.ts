// "Collapse Explained" host candidates: five original recurring protagonists drawn with the persona engine's Pen
// language (toon.ts): superellipse bean heads, plum thick-thin ink (thick side away from the light), painted crescents,
// stick limbs with ink-dot hands. Design space 600 x 1000 units, soles at y = 975, body centred on x = 300.
// Each design differs in silhouette (hair / hat), head shape, outfit colour and default mood, so they read apart at 48 px:
//   crack  - lightning-crack orange tuft, teal turtleneck, orange sneakers         (excitable explainer)
//   specs  - tall egg head, thick round glasses, side-part, mustard cardigan + bow (the nerdy analyst)
//   beanie - wide square head, red beanie with pompom, cobalt hoodie               (deadpan sceptic)
//   puff   - big round cloud of hair, coral blazer                                 (the dramatic storyteller)
//   pony   - high swinging ponytail, yellow raincoat, freckles                     (field reporter)
import {
  Pen, INK, mul, mix, blobPts, thickAngle, Blob, curve, rad, eye, mouth, taper, P2, C3, EyeK, MouthK, rrect, ellPts,
} from "../persona/toon";

const SH_SKIN: C3 = [0.96, 0.86, 0.84];
const SH_CLOTH: C3 = [0.64, 0.66, 0.74];
const SH_HAIR: C3 = [0.8, 0.7, 0.72];
const SWEAT = "#9fd4ff";
const WHITE = "#ffffff";

export type HostFace = { eye: [EyeK, EyeK]; brow: [number, number]; mouth: MouthK; sweat?: boolean; look?: number; browR?: [number, number] };
export type FaceName = "shock" | "yikes" | "explain" | "neutral" | "doubt" | "grin" | "smile" | "smug" | "laugh" | "facepalm" | "calm";
export const FACES: Record<FaceName, HostFace> = {
  shock: { eye: ["shock", "shock"], brow: [-7, -6], mouth: "O" },
  yikes: { eye: ["shock", "shock"], brow: [-3, 3], mouth: "teeth", sweat: true },
  explain: { eye: ["dot", "dot"], brow: [-2, -3], mouth: "smileWide" },
  neutral: { eye: ["lid", "lid"], brow: [0, -1], mouth: "dash" },
  doubt: { eye: ["lid", "dot"], brow: [4, -4], mouth: "frown", look: 0.6 },
  grin: { eye: ["happy", "happy"], brow: [-3, -3], mouth: "grin" },
  smile: { eye: ["dot", "dot"], brow: [0, -1], mouth: "smile" },
  calm: { eye: ["dot", "dot"], brow: [0, -1], mouth: "dash" },
  smug: { eye: ["lid", "lid"], brow: [2, 1], browR: [-5, -8], mouth: "smirk", look: 0.5 },
  laugh: { eye: ["squeeze", "squeeze"], brow: [-4, -4], mouth: "laugh" },
  facepalm: { eye: ["dash", "dash"], brow: [3, -1], mouth: "frown" },
};

export type Hair = "tuft" | "part" | "beanie" | "puff" | "pony" | "bald" | "flattop" | "curls" | "bob";
export type Top = "turtleneck" | "cardigan" | "hoodie" | "blazer" | "raincoat" | "crewneck" | "striped";
export type GlassShape = "round" | "rect" | "hex" | "browline";
export type HostDesign = {
  name: string; hair: Hair; hairCol: string; hatCol?: string; top: Top; topCol: string; inner?: string; pants: string; shoes: string;
  skin: string; headA: number; aspect: number; egg: number; nBot: number; glasses?: boolean; bow?: string; freckles?: boolean;
  glassShape?: GlassShape; glassCol?: string; stripe?: string;
  mood: FaceName;
};

export const HOSTS: Record<"crack" | "specs" | "beanie" | "puff" | "pony", HostDesign> = {
  crack: { name: "Crack", hair: "tuft", hairCol: "#ff5b24", top: "turtleneck", topCol: "#13b5a0", pants: "#2f3550", shoes: "#ff5b24", skin: "#ffe2c2", headA: 124, aspect: 0.93, egg: -0.1, nBot: 2.3, mood: "explain" },
  specs: { name: "Specs", hair: "part", hairCol: "#3a2620", top: "cardigan", topCol: "#e3a92a", inner: "#f6f1e7", pants: "#4a3f5c", shoes: "#6e4427", skin: "#f5c9a0", headA: 106, aspect: 1.16, egg: -0.16, nBot: 2.1, glasses: true, bow: "#e2453c", mood: "calm" },
  beanie: { name: "Beanie", hair: "beanie", hairCol: "#2b2a33", hatCol: "#e8412c", top: "hoodie", topCol: "#2456f5", pants: "#3b3f52", shoes: "#f4f1ea", skin: "#ecd0b6", headA: 134, aspect: 0.82, egg: 0.05, nBot: 2.9, mood: "doubt" },
  puff: { name: "Puff", hair: "puff", hairCol: "#3d2a24", top: "blazer", topCol: "#ff4f6e", inner: "#f6f1e7", pants: "#2b2a33", shoes: "#2b2a33", skin: "#b9814f", headA: 118, aspect: 0.96, egg: -0.08, nBot: 2.3, mood: "grin" },
  pony: { name: "Pony", hair: "pony", hairCol: "#5a3020", top: "raincoat", topCol: "#ffc21a", pants: "#2f5f6a", shoes: "#13b5a0", skin: "#ffe2c2", headA: 116, aspect: 0.97, egg: -0.12, nBot: 2.2, freckles: true, mood: "smile" },
};

/** Specs v2 options: the glasses-wearing analyst, redrawn so nothing overlaps Crayon Capital's mascot
 *  (theirs: round white head, round black glasses, brown side part, red bow tie, brown vest over a white shirt). */
export const SPECS_V2: Record<"box" | "curls" | "bob", HostDesign> = {
  box: { name: "Specs Box", hair: "flattop", hairCol: "#1f1a24", top: "crewneck", topCol: "#2456f5", stripe: "#ff5b24", pants: "#2b2a33", shoes: "#ff5b24", skin: "#8d5a3b", headA: 124, aspect: 0.86, egg: 0.04, nBot: 3.0, glasses: true, glassShape: "browline", glassCol: "#ff5b24", mood: "calm" },
  curls: { name: "Specs Curls", hair: "curls", hairCol: "#d9622b", top: "turtleneck", topCol: "#13b5a0", pants: "#3b3f52", shoes: "#f4f1ea", skin: "#ffe2c2", headA: 112, aspect: 1.02, egg: -0.08, nBot: 2.3, glasses: true, glassShape: "rect", glassCol: INK, freckles: true, mood: "calm" },
  bob: { name: "Specs Bob", hair: "bob", hairCol: "#18161f", top: "striped", topCol: "#23305e", stripe: "#f6ecdc", pants: "#ffc21a", shoes: "#e2453c", skin: "#ecd0b6", headA: 114, aspect: 0.98, egg: -0.06, nBot: 2.4, glasses: true, glassShape: "hex", glassCol: "#e2453c", mood: "calm" },
};

export type HostOpts = {
  face?: HostFace; light?: number; seed?: number;
  glasses?: boolean; plaster?: boolean;
  /** arms: hang, both hands on the cheeks, one arm pointing out, both flung up */
  arms?: "hang" | "cheeks" | "point" | "pointL" | "up" | "pointUp" | "facepalm";
  /** 0 = front, 1 = three-quarter view turned to the viewer's right */
  facing?: number;
  /** glasses knocked askew (degrees) and the viewer's-right lens cracked */
  glassTilt?: number; lensCrack?: boolean;
  /** face feature scale (avatars push it up so eyes survive 48 px) */
  fs?: number; tilt?: number;
  /** recolour overrides for avatar variants */
  over?: Partial<HostDesign>;
};

/** the lightning-crack tuft, in head units (a = head half-width), relative to the crown point */
const TUFT: P2[] = [[-0.3, 0.26], [-0.42, -0.2], [-0.12, -0.27], [-0.25, -0.78], [0.33, -0.16], [0.06, -0.12], [0.24, 0.26]];

/** our face: eyes ~14u off the centre line, brows 20u up, mouth 22u down, u = 1 % of the head width x fs */
const hostFace = (p: Pen, cx0: number, cy: number, W: number, F: HostFace, fs: number, skin: string, glasses: boolean, freckles: boolean,
  facing = 0, glassTilt = 0, lensCrack = false, shape: GlassShape = "round", gcol: string = INK) => {
  const u = (W / 100) * fs, look = F.look ?? 0, cx = cx0 + 8 * u * facing;
  const ex = (glasses ? 17.5 : F.eye[0] === "shock" ? 15 : 14) * u * (1 - 0.1 * facing), ey = cy, LR = 15.5 * u, LRy = 14.5 * u;
  // glasses: lens centres rotated about the bridge by glassTilt (eyes stay put, so the frame reads as knocked askew)
  const gt = rad(glassTilt), lens = (side: number): P2 => [cx + side * ex * Math.cos(gt), ey - 2 * u * Math.abs(glassTilt) / 10 + side * ex * Math.sin(gt)];
  const rotL = (pts: P2[], lx: number, ly: number) => pts.map(([x, y]) => [lx + (x - lx) * Math.cos(gt) - (y - ly) * Math.sin(gt), ly + (x - lx) * Math.sin(gt) + (y - ly) * Math.cos(gt)] as P2);
  const HW = shape === "round" ? LR : 1.08 * LR; // half width of a lens (bridge anchors)
  const lensPts = (lx: number, ly: number): P2[] => {
    if (shape === "round") return ellPts(lx, ly, LR, LRy, 0, 360, glassTilt);
    if (shape === "hex") return rotL(Array.from({ length: 7 }, (_, i) => [lx + HW * Math.cos(rad(60 * i)), ly + 0.98 * LRy * Math.sin(rad(60 * i))] as P2), lx, ly);
    const r = shape === "browline" ? 7 * u : 3.5 * u;
    return rotL(rrect(lx - HW, ly - 0.8 * LRy, lx + HW, ly + 0.86 * LRy, r), lx, ly);
  };
  const frame = (pts: P2[]) => {
    const c = [...pts, pts[0]];
    if (shape === "browline") {
      p.stroke(c, 2.6 * u);
      const top = pts.filter(([, y], i) => i < pts.length && y <= (pts.reduce((m, q) => m + q[1], 0) / pts.length));
      top.sort((a, b) => a[0] - b[0]);
      p.stroke(top, 8.4 * u); p.stroke(top, 5.2 * u, gcol);
    } else if (gcol !== INK) { p.stroke(c, 7.6 * u); p.stroke(c, 4.4 * u, gcol); }
    else p.stroke(c, 4.6 * u);
  };
  if (glasses) for (const side of [-1, 1]) { const [lx, ly] = lens(side); p.poly(lensPts(lx, ly), "rgba(214,236,255,0.85)", 0); }
  if (freckles) for (const side of [-1, 1]) for (const [dx, dy] of [[0, 0], [6, 3], [-5, 4], [2, 7]]) p.dot(cx + side * (ex + 3 * u + dx * u * side), ey + 13 * u + dy * u, 1.4 * u, "#c9774f");
  for (const side of [-1, 1]) {
    const x = cx + side * ex, kind = F.eye[side > 0 ? 1 : 0];
    eye(p, kind, x, ey, u, side, look, skin);
    const by = ey - (glasses ? 19 : 20) * u, [dI, dO] = side > 0 && F.browR ? F.browR : F.brow;
    if (kind === "shock") p.arc(x, by - 6 * u, 9 * u, 3 * u, 200, 340, 4 * u);
    else taper(p, [x - side * 8.5 * u, by + dI * u], [x + side * 8.5 * u, by + dO * u], 5 * u, 2.5 * u);
  }
  if (glasses) {
    for (const side of [-1, 1]) { const [lx, ly] = lens(side); frame(lensPts(lx, ly)); }
    const [ax, ay] = lens(-1), [bx, by] = lens(1), byo = shape === "browline" || shape === "rect" ? -0.55 * LRy : 0;
    const br = curve([ax + HW * Math.cos(gt), ay + byo + HW * Math.sin(gt)], [(ax + bx) / 2, (ay + by) / 2 + byo - 3 * u], [bx - HW * Math.cos(gt), by + byo - HW * Math.sin(gt)], 6);
    p.stroke(br, gcol !== INK ? 7 * u : 4 * u); if (gcol !== INK) p.stroke(br, 3.8 * u, gcol);
    if (lensCrack) {
      const [lx, ly] = lens(1), o: P2 = [lx + 4 * u, ly - 5 * u];
      for (const arm of [[[7, -4], [10, -1]], [[-3, 5], [-9, 9]], [[-6, -3], [-11, -5]], [[3, 6], [4, 10]]] as [number, number][][])
        p.stroke([o, [o[0] + arm[0][0] * u, o[1] + arm[0][1] * u], [o[0] + arm[1][0] * u, o[1] + arm[1][1] * u]], 1.8 * u);
    }
  }
  if (facing) p.stroke([[cx + 4 * u, cy + 6 * u], [cx + 9 * u, cy + 12 * u], [cx + 3 * u, cy + 13 * u]], 3 * u);
  mouth(p, F.mouth, cx, cy + 22 * u, u, 1);
  if (F.sweat) {
    const x = cx + 46 * u, y = cy - 26 * u, r = 4.5 * u, pts: P2[] = [];
    for (let i = 0; i <= 20; i++) { const a = rad(-90 + (360 * i) / 20); pts.push([x + r * Math.cos(a), y + r * 1.15 * Math.sin(a)]); }
    pts.splice(5, 0, [x - r * 0.3, y - r * 2.6]);
    p.poly(pts, SWEAT, 2 * u);
  }
};

export const drawHost = (p: Pen, d0: HostDesign, o: HostOpts = {}) => {
  const d: HostDesign = { ...d0, ...(o.over ?? {}) };
  const light = o.light ?? rad(-120), thick = thickAngle(light), F = o.face ?? FACES[d.mood], fs = o.fs ?? 1;
  const { hair, hairCol, topCol, pants, shoes, skin } = d, arms = o.arms ?? "hang";
  const H: Blob = { a: d.headA, b: d.headA * d.aspect, nTop: 1.8, nBot: d.nBot, egg: d.egg, asym: 0.07 * (o.facing ?? 0), rot: rad(o.tilt ?? 0), noise: 0.008, seed: o.seed ?? 5 };
  const W = 2 * H.a, HH = 2 * H.b, u = W / 100, ow = 5 * u, sole = 975;
  // body proportions are set from a fixed reference head (116) so tall/wide heads do not stretch the body
  const R = 2 * 116 * 0.95, legs = 1.3 * R, torso = 1.0 * R, tw = 0.82 * 2 * 120;
  const torsoBot = sole - legs, chin = torsoBot - torso, hc = chin - H.b + 0.12 * H.b, hipY = torsoBot - 0.12 * R;
  const T: Blob = { a: tw / 2 / 1.06, b: 0.5 * (torsoBot - (chin - 0.25 * R)), nTop: 2.2, nBot: 2.6, egg: 0.1, asym: 0, rot: 0, noise: 0.006, seed: H.seed + 7 };
  const tcx = 300, tcy = torsoBot - T.b, tp = blobPts(tcx, tcy, T);
  const U = (2 * 120) / 100; // body unit (independent of the head)
  const legCol = mix(pants, INK, 0.45), armCol = mix(topCol, INK, 0.45);
  const crown = hc - H.b;
  const hairSh = mul(hairCol, SH_HAIR);

  // ---- legs + shoes ----
  for (const side of [-1, 1]) {
    const hx = 300 + side * 15 * U, fx = 300 + side * 24 * U;
    p.stroke(curve([hx, hipY], [(hx + fx) / 2 + side * 1.5 * U, (hipY + sole) / 2], [fx, sole - 5 * U]), 6.2 * U, legCol);
    const a: P2 = [fx - side * 4 * U, sole - 6 * U], b: P2 = [fx + side * 15 * U, sole - 5 * U];
    p.stroke([a, b], 11 * U + 3.4, INK); p.stroke([a, b], 11 * U, shoes);
    if (d.top !== "raincoat") p.stroke([[a[0], a[1] + 3.2 * U], [b[0], b[1] + 3.2 * U]], 2.6 * U, "#fff3e6");
  }
  // ---- arms ----
  const S = (side: number): P2 => [tcx + side * 0.82 * T.a, chin + 0.14 * R];
  const armPath = (side: number): P2[] => {
    const s = S(side);
    if (arms === "cheeks") return curve(s, [tcx + side * (1.32 * T.a + 6 * U), chin + 0.18 * R], [300 + side * (H.a - 12 * u), hc + 0.5 * H.b]);
    if (arms === "pointUp" && side > 0) return curve(s, [tcx + 1.3 * T.a + 24 * U, s[1] - 0.18 * R], [tcx + 1.42 * T.a + 50 * U, s[1] - 0.62 * R]);
    if (arms === "facepalm" && side > 0) return curve(s, [tcx + 1.25 * T.a + 8 * U, chin + 0.2 * R], [300 + 16 * u + 11 * u * (o.facing ?? 0), hc + 0.08 * H.b]);
    if (arms === "up") return curve(s, [tcx + side * (1.2 * T.a + 16 * U), s[1] - 0.2 * R], [tcx + side * (1.36 * T.a + 28 * U), s[1] - 0.66 * R]);
    if ((arms === "point" && side > 0) || (arms === "pointL" && side < 0))
      return curve(s, [tcx + side * (1.2 * T.a + 18 * U), s[1] - 0.02 * R], [tcx + side * (1.25 * T.a + 62 * U), s[1] - 0.14 * R]);
    const ex = tcx + side * (1.1 * T.a + 4 * U);
    return curve(s, [ex, s[1] + 0.46 * R], [ex + side * 2 * U, s[1] + 0.86 * R]);
  };
  // ---- hair / hats behind the head ----
  if (hair === "tuft") { const t2 = TUFT.map(([x, y]) => [300 + x * H.a, crown + y * H.a] as P2); p.shadedFill(t2, hairCol, hairSh, light, 0.4 * H.a, 0.3); p.inkRing(t2, ow * 0.9, thick); }
  if (hair === "puff") {
    const pp = blobPts(300, hc - 0.32 * H.b, { a: 1.5 * H.a, b: 1.22 * H.b, nTop: 2.1, nBot: 2.4, egg: 0.08, asym: 0, rot: 0, noise: 0.028, seed: 11 });
    p.shadedFill(pp, hairCol, mul(hairCol, [0.72, 0.68, 0.74]), light, 1.4 * H.a, 0.4);
    p.clip(pp, () => { for (const [dx, dy] of [[-0.9, -0.7], [-0.3, -1.05], [0.5, -0.95], [1.05, -0.4], [-1.15, 0.0]]) p.arc(300 + dx * H.a, hc - 0.32 * H.b + dy * H.b, 0.28 * H.a, 0.2 * H.a, 200, 330, 2.2 * u, mix(hairCol, "#ffffff", 0.22)); });
    p.inkRing(pp, ow, thick);
  }
  if (hair === "pony") {
    // high ponytail swinging out to the viewer's right, tied with a yellow scrunchie
    const root: P2 = [300 + 0.5 * H.a, crown + 0.1 * H.b];
    const pt: P2[] = [];
    const spine = curve(root, [300 + 1.25 * H.a, crown - 0.15 * H.b], [300 + 1.45 * H.a, hc + 0.55 * H.b], 16);
    const wv = (i: number) => (0.22 * H.a) * Math.sin(Math.PI * Math.min(1, (i / 16) * 1.15 + 0.08));
    spine.forEach((q, i) => pt.push([q[0] + wv(i) * 0.7, q[1] - wv(i) * 0.7]));
    for (let i = 16; i >= 0; i--) pt.push([spine[i][0] - wv(i) * 0.7, spine[i][1] + wv(i) * 0.7]);
    p.shadedFill(pt, hairCol, hairSh, light, 0.6 * H.a, 0.3); p.inkRing(pt, ow * 0.85, thick);
    p.ell(root[0] + 0.12 * H.a, root[1] - 0.06 * H.a, 0.14 * H.a, 0.1 * H.a, "#ffc21a", 2.6 * u, 0, 360, -30);
  }
  if (hair === "bob") {
    // chin-length bob: a rounded helmet behind the head, blunt ends just above the jaw
    const bp = blobPts(300, hc - 0.08 * H.b, { a: 1.2 * H.a, b: 1.12 * H.b, nTop: 2.1, nBot: 4, egg: 0.04, asym: 0, rot: 0, noise: 0.006, seed: 9 });
    p.shadedFill(bp, hairCol, hairSh, light, 1.2 * H.a, 0.35); p.inkRing(bp, ow, thick);
  }
  // hood ring behind the neck (hoodie)
  if (d.top === "hoodie") p.ell(300, chin + 0.06 * R, 0.5 * 240, 0.16 * R, mul(topCol, [0.78, 0.8, 0.88]), ow * 0.8);
  // ---- torso ----
  p.gradFill(tp, topCol, mul(topCol, SH_CLOTH), light);
  p.clip(tp, () => {
    if (d.top === "crewneck" && d.stripe) p.band([[tcx - 1.4 * T.a, chin + 0.42 * R], [tcx + 1.4 * T.a, chin + 0.42 * R]], d.stripe, 0.1 * R, 1.6 * U);
    if (d.top === "striped") for (let k = 0; k < 6; k++) p.band([[tcx - 1.4 * T.a, chin + (0.2 + 0.16 * k) * R], [tcx + 1.4 * T.a, chin + (0.2 + 0.16 * k) * R]], d.stripe ?? "#f6ecdc", 0.06 * R, 0);
    if (d.top === "turtleneck" || d.top === "hoodie") {
      p.band([[tcx - 1.4 * T.a, torsoBot - 0.05 * R], [tcx + 1.4 * T.a, torsoBot - 0.05 * R]], mul(topCol, [0.82, 0.84, 0.9]), 0.12 * R, 0);
      for (let i = -4; i <= 4; i++) p.stroke([[tcx + i * 7 * U, torsoBot - 0.1 * R], [tcx + i * 7 * U, torsoBot]], 1.4 * U, mul(topCol, [0.62, 0.64, 0.72]));
    }
    if (d.top === "hoodie") {
      p.poly(rrect(tcx - 0.55 * T.a, chin + 0.5 * R, tcx + 0.55 * T.a, chin + 0.72 * R, 6 * U), mul(topCol, [0.88, 0.9, 0.94]), 2.2 * U);
      for (const s of [-1, 1]) { p.stroke([[tcx + s * 9 * U, chin + 0.12 * R], [tcx + s * 10 * U, chin + 0.36 * R]], 2 * U, "#f4f1ea"); p.dot(tcx + s * 10 * U, chin + 0.37 * R, 2.4 * U, "#f4f1ea"); }
    }
    if (d.top === "cardigan" || d.top === "blazer") {
      // inner shirt V, lapels / button band
      const v: P2[] = [[tcx - 0.36 * T.a, chin - 0.05 * R], [tcx + 0.36 * T.a, chin - 0.05 * R], [tcx, chin + (d.top === "blazer" ? 0.55 : 0.42) * R]];
      p.poly(v, d.inner ?? WHITE, 2.4 * U);
      if (d.top === "blazer") for (const s of [-1, 1]) p.poly([[tcx + s * 0.36 * T.a, chin - 0.05 * R], [tcx + s * 0.62 * T.a, chin + 0.2 * R], [tcx + s * 0.3 * T.a, chin + 0.22 * R], [tcx, chin + 0.55 * R]], mul(topCol, [0.86, 0.84, 0.86]), 2.4 * U);
      else for (let k = 0; k < 3; k++) p.ell(tcx + 2 * U, chin + (0.5 + 0.16 * k) * R, 3 * U, 3 * U, "#7a4b1c", 1.4 * U);
      if (d.top === "cardigan") for (let i = -5; i <= 5; i++) p.stroke([[tcx + i * 8 * U, torsoBot - 0.08 * R], [tcx + i * 8 * U, torsoBot]], 1.4 * U, mul(topCol, SH_CLOTH));
    }
    if (d.top === "raincoat") {
      p.stroke([[tcx, chin], [tcx, torsoBot + 10]], 2.4 * U);
      for (let k = 0; k < 3; k++) { const y = chin + (0.32 + 0.2 * k) * R; p.poly(rrect(tcx - 7 * U, y - 2 * U, tcx + 7 * U, y + 2 * U, 2 * U), "#6e4427", 1.4 * U); }
      for (const s of [-1, 1]) p.stroke([[tcx + s * 0.55 * T.a, chin + 0.78 * R], [tcx + s * 0.25 * T.a, chin + 0.78 * R]], 2 * U);
    }
  });
  p.inkRing(tp, ow, thick);
  // collars
  if (d.top === "crewneck" || d.top === "striped") p.arc(300, chin + 0.02 * R, 0.3 * 240, 0.07 * R, 10, 170, 4 * U, mul(topCol, [0.8, 0.82, 0.88]));
  if (d.top === "turtleneck") {
    p.ell(300, chin + 0.03 * R, 0.36 * 240, 0.075 * R, mul(topCol, [0.86, 0.88, 0.92]), ow * 0.7);
    for (const k of [-0.2, 0, 0.2]) p.arc(300 + k * 240, chin + 0.03 * R, 0.06 * 240, 0.05 * R, 30, 150, 1.4 * U, mul(topCol, SH_CLOTH));
  }
  if (d.top === "raincoat") for (const s of [-1, 1]) p.poly([[300, chin + 0.02 * R], [300 + s * 0.42 * T.a, chin - 0.06 * R], [300 + s * 0.5 * T.a, chin + 0.16 * R]], mul(topCol, [0.9, 0.88, 0.85]), 2.6 * U);
  if (d.bow) {
    const y = chin + 0.04 * R;
    for (const s of [-1, 1]) p.poly([[300, y], [300 + s * 15 * U, y - 7 * U], [300 + s * 15 * U, y + 7 * U]], d.bow, 2.2 * U);
    p.ell(300, y, 3.6 * U, 3.6 * U, mul(d.bow, [0.8, 0.8, 0.8]), 2 * U);
  }
  const armsBeforeHead = arms !== "cheeks" && arms !== "facepalm";
  const drawArms = () => {
    for (const side of [-1, 1]) {
      const ap = armPath(side), hnd = ap[ap.length - 1];
      p.stroke(ap, 5.6 * U, armCol);
      if (arms === "cheeks") p.ell(hnd[0], hnd[1], 9 * u, 12.5 * u, d.skin, 3.4 * u, 0, 360, side * 18);
      else if (arms === "facepalm" && side > 0) {
        // palm over the eyes, fingers splayed up across the glasses
        p.ell(hnd[0], hnd[1], 20 * u, 17 * u, d.skin, 3.4 * u, 0, 360, -10);
        for (const k of [-1.5, -0.5, 0.5, 1.5]) { const fx = hnd[0] + k * 9 * u - 4 * u, fy = hnd[1] - 15 * u; p.ell(fx, fy - 8 * u, 4.2 * u, 11 * u, d.skin, 3 * u, 0, 360, k * 6 - 8); }
        p.ell(hnd[0], hnd[1], 20 * u, 15 * u, d.skin, 0, 0, 360, -10);
      } else p.dot(hnd[0], hnd[1], 6 * U);
      if ((arms === "point" && side > 0) || (arms === "pointL" && side < 0)) p.stroke([hnd, [hnd[0] + side * 12 * U, hnd[1] - 2 * U]], 3.4 * U);
      if (arms === "pointUp" && side > 0) p.stroke([hnd, [hnd[0] + 6 * U, hnd[1] - 11 * U]], 3.4 * U);
    }
  };
  if (armsBeforeHead) drawArms();
  // ---- head ----
  const hp = blobPts(300, hc, H);
  // ears
  const fc = o.facing ?? 0;
  for (const side of hair === "bob" ? [] : fc ? [-1] : [-1, 1]) {
    const ex = 300 + side * (H.a + 1 * u) + (fc ? 14 * u * fc : 0), ey = hc + 0.06 * H.b;
    p.ell(ex, ey, 7 * u, 10 * u, side < 0 ? skin : mul(skin, SH_SKIN), 3.2 * u);
  }
  p.shadedFill(hp, skin, mul(skin, SH_SKIN), light, H.a);
  if (hair === "tuft" || hair === "puff" || hair === "pony") p.clip(hp, () => {
    // short cap with a jagged fringe (tuft) / soft scalloped hairline (puff, pony)
    const fr: P2[] = [], n = hair === "tuft" ? 7 : 6;
    for (let i = 0; i <= n; i++) {
      const edge = i === 0 || i === n ? 0.25 * H.b : 0;
      const y = hair === "tuft" ? hc - (i % 2 ? 0.6 : 0.74) * H.b + edge : hc - (0.6 - 0.05 * Math.sin(i * 1.4)) * H.b + edge;
      fr.push([300 - 1.1 * H.a + (2.2 * H.a * i) / n, y]);
    }
    p.shadedFill([...fr, [300 + 1.2 * H.a, crown - 20], [300 - 1.2 * H.a, crown - 20]], hairCol, hairSh, light, H.a, 0.3);
    p.stroke(fr, 3 * u);
  });
  if (hair === "part") p.clip(hp, () => {
    // side part: hair mass sweeping from a high parting on the viewer's left down to the right temple
    const cap: P2[] = [[300 - 1.2 * H.a, hc - 0.2 * H.b], [300 - 0.95 * H.a, hc - 0.36 * H.b], [300 - 0.45 * H.a, hc - 0.5 * H.b],
      [300 + 0.2 * H.a, hc - 0.46 * H.b], [300 + 0.75 * H.a, hc - 0.32 * H.b], [300 + 1.2 * H.a, hc - 0.1 * H.b], [300 + 1.2 * H.a, crown - 20], [300 - 1.2 * H.a, crown - 20]];
    p.shadedFill(cap, hairCol, hairSh, light, H.a, 0.3);
    p.stroke(cap.slice(0, 6), 3 * u);
    p.stroke(curve([300 - 0.42 * H.a, crown + 0.02 * H.b], [300 - 0.48 * H.a, hc - 0.7 * H.b], [300 - 0.44 * H.a, hc - 0.5 * H.b]), 2.4 * u, mix(hairCol, "#ffffff", 0.25));
  });
  if (hair === "bob") p.clip(hp, () => {
    // blunt fringe cut straight across the brow
    const y = hc - 0.36 * H.b;
    p.shadedFill([[300 - 1.2 * H.a, y], [300 + 1.2 * H.a, y], [300 + 1.2 * H.a, crown - 20], [300 - 1.2 * H.a, crown - 20]], hairCol, hairSh, light, H.a, 0.3);
    p.stroke([[300 - 1.2 * H.a, y], [300 + 1.2 * H.a, y]], 3 * u);
    for (const k of [-0.5, -0.1, 0.3, 0.65]) p.stroke([[300 + k * H.a, y - 0.04 * H.b], [300 + (k - 0.04) * H.a, y - 0.3 * H.b]], 1.8 * u, mix(hairCol, "#ffffff", 0.2));
  });
  if (hair === "flattop" || hair === "curls") p.clip(hp, () => {
    const y = hc - (hair === "flattop" ? 0.46 : 0.42) * H.b;
    p.shadedFill([[300 - 1.2 * H.a, y + 0.12 * H.b], [300 - 0.8 * H.a, y], [300 + 0.8 * H.a, y], [300 + 1.2 * H.a, y + 0.12 * H.b], [300 + 1.2 * H.a, crown - 20], [300 - 1.2 * H.a, crown - 20]], hairCol, hairSh, light, H.a, 0.3);
  });
  p.inkRing(hp, ow, thick);
  if (hair === "flattop") {
    // box-cut flat top: a squared block standing on the crown, wider than the skull
    const blk = rrect(300 - 0.86 * H.a, crown - 0.42 * H.a, 300 + 0.86 * H.a, hc - 0.46 * H.b, 0.16 * H.a);
    p.shadedFill(blk, hairCol, hairSh, light, H.a, 0.3); p.inkRing(blk, ow, thick);
    for (let i = -5; i <= 5; i++) p.stroke([[300 + i * 0.14 * H.a, crown - 0.36 * H.a], [300 + i * 0.14 * H.a, crown - 0.22 * H.a]], 1.6 * u, mix(hairCol, "#ffffff", 0.18));
  }
  if (hair === "curls") {
    // a mop of round curls along the top of the head: outlined pass, then fill pass so only the outer edge keeps ink
    const cs: [number, number, number][] = [];
    for (let i = 0; i <= 10; i++) { const a = rad(180 + i * 18); cs.push([300 + 1.02 * H.a * Math.cos(a), hc - 0.12 * H.b + 1.02 * H.b * Math.sin(a), (0.3 + 0.05 * (i % 2)) * H.a]); }
    for (const [x, y, r] of [[-0.45, -0.75, 0.32], [0.05, -0.85, 0.34], [0.5, -0.72, 0.3]] as const) cs.push([300 + x * H.a, hc + y * H.b, r * H.a]);
    for (const [x, y, r] of cs) p.ell(x, y, r, r, hairCol, ow * 1.6);
    for (const [x, y, r] of cs) p.ell(x, y, r - 0.5 * u, r - 0.5 * u, hairCol, 0);
    for (const [x, y, r] of cs) p.arc(x - 0.2 * r, y - 0.15 * r, 0.5 * r, 0.4 * r, 200, 300, 2 * u, mix(hairCol, "#ffffff", 0.3));
  }
  if (hair === "part") {
    // forelock swoop sitting proud of the crown
    const sw = blobPts(300 + (0.1 + 0.18 * fc) * H.a, crown + 0.08 * H.b, { a: 0.62 * H.a, b: 0.2 * H.b, nTop: 2, nBot: 2, egg: 0, asym: 0.12, rot: rad(-8), noise: 0.004, seed: 2 });
    p.shadedFill(sw, hairCol, hairSh, light, 0.6 * H.a, 0.3); p.inkRing(sw, ow * 0.8, thick);
  }
  if (hair === "beanie") {
    // slouchy knit beanie covering the top of the head, fold band, pompom
    const bb = hc - 0.3 * H.b, domeH = 0.95 * H.b, dw = 1.08 * H.a, dome: P2[] = [];
    for (let i = 0; i <= 40; i++) { const t = Math.PI + (Math.PI * i) / 40, c = Math.cos(t), s = Math.sin(t); dome.push([300 + dw * Math.sign(c) * Math.abs(c) ** 0.7 + (s < -0.6 ? 0.08 * H.a * (-s - 0.6) * 5 : 0), bb + domeH * Math.sign(s) * Math.abs(s) ** 0.9]); }
    dome.push([300 + dw, bb + 0.02 * H.b]);
    p.ell(300 + 0.38 * H.a, bb - domeH - 0.02 * H.b, 0.25 * H.a, 0.23 * H.a, mix(d.hatCol!, "#ffffff", 0.15), ow * 0.8);
    p.shadedFill(dome, d.hatCol!, mul(d.hatCol!, [0.72, 0.68, 0.72]), light, dw, 0.4);
    p.clip(dome, () => { for (let i = -6; i <= 6; i++) p.stroke([[300 + i * 0.16 * H.a, bb], [300 + i * 0.13 * H.a, bb - domeH]], 1.6 * u, mul(d.hatCol!, [0.82, 0.8, 0.84])); });
    p.inkRing(dome, ow, thick);
    const band = rrect(300 - dw - 4 * u, bb - 0.2 * H.b, 300 + dw + 4 * u, bb + 0.06 * H.b, 7 * u);
    p.shadedFill(band, mul(d.hatCol!, [0.9, 0.88, 0.9]), mul(d.hatCol!, [0.68, 0.64, 0.7]), light, dw);
    p.clip(band, () => { for (let i = -14; i <= 14; i++) p.stroke([[300 + i * 0.075 * H.a, bb - 0.2 * H.b], [300 + i * 0.075 * H.a, bb + 0.06 * H.b]], 1.4 * u, mul(d.hatCol!, [0.7, 0.66, 0.72])); });
    p.poly(band, null, ow * 0.8);
  }
  if (o.plaster) {
    const cx = 300 - 0.42 * H.a, cy = hc - 0.3 * H.b, r = rad(-24), rot = (pts: P2[]) => pts.map(([x, y]) => [cx + x * Math.cos(r) - y * Math.sin(r), cy + x * Math.sin(r) + y * Math.cos(r)] as P2);
    p.poly(rot(rrect(-16 * u, -6 * u, 16 * u, 6 * u, 5 * u)), "#f6c38f", 2.4 * u);
    p.poly(rot(rrect(-6 * u, -4 * u, 6 * u, 4 * u, 2 * u)), "#fbe3c6", 1.4 * u);
  }
  hostFace(p, 300, hc + 0.12 * H.b, W, F, fs, skin, !!(o.glasses ?? d.glasses), !!d.freckles, fc, o.glassTilt ?? 0, !!o.lensCrack, d.glassShape ?? "round", d.glassCol ?? INK);
  if (!armsBeforeHead) drawArms();
  return { hc, crown, chin, H, u, torsoBot };
};
