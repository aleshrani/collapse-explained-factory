// Our driver: an office worker (navy suit, white shirt, red tie, round glasses, side-parted hair), drawn with the
// engine's Pen API in the 600 x 1000 design space (card origin = y 975). Upper body only: in every shot he is seen
// through a car window or swimming, so the door / the water hides everything below the chest.
// Poses are hand-placed arm curves; hands are small skin mittens (readable at phone size) instead of ink dots.
// Plus the 2D effect cards of the short: "NO SIGNAL" phone screen, "PUSH!" burst, water-pressure arrows.
import { Pen, INK, SKIN, Outfit, Expr, headBlob, blobPts, thickAngle, mul, mix, faceFront, hatOn, rrect } from "./toon";

type P2 = [number, number];
export type DPose = "wheel" | "panic" | "phone" | "push" | "climb" | "relief" | "swim";
export type DriverOpts = { pose: DPose; expr: Expr; lid: number; light: number; look?: number; lean?: number; shove?: number };

const SUIT = "#34477a", SHIRT = "#f4f6fb", TIE = "#d8343a", HAIR = "#3b2a22";
const OUT: Outfit = { jacket: SUIT, pants: "#2a2f45", boots: INK, hat: "hair", hair: HAIR };
const SH_SKIN: [number, number, number] = [0.96, 0.86, 0.84];
const SH_CLOTH: [number, number, number] = [0.64, 0.66, 0.74];
const rad = (d: number) => (d * Math.PI) / 180;
const curve = (a: P2, k: P2, b: P2, n = 10): P2[] => {
  const c: P2 = [2 * k[0] - (a[0] + b[0]) / 2, 2 * k[1] - (a[1] + b[1]) / 2], out: P2[] = [];
  for (let i = 0; i <= n; i++) { const t = i / n, s = 1 - t; out.push([s * s * a[0] + 2 * s * t * c[0] + t * t * b[0], s * s * a[1] + 2 * s * t * c[1] + t * t * b[1]]); }
  return out;
};

export const driver = (p: Pen, o: DriverOpts) => {
  const { pose, expr, lid, light, look = 0, lean = 0 } = o;
  const seed = 4, H = headBlob(seed, 118, 0), W = 2 * H.a, u = W / 100, hc = 400, thick = thickAngle(light), ow = 5 * u;
  p.rot = lean ? [rad(lean), 300, 900] : null;
  const S = (s: number): P2 => [300 + s * 84, 562];
  const armCol = mix(SUIT, INK, 0.3);
  type Arm = { s: number; e: P2; h: P2; front: boolean; palm?: boolean };
  const arms: Arm[] = [];
  const A = (s: number, e: P2, h: P2, front = true, palm = false) => arms.push({ s, e, h, front, palm });
  switch (pose) {
    case "wheel": for (const s of [-1, 1]) A(s, [300 + s * 140, 700], [300 + s * 98, 792]); break;
    case "panic": for (const s of [-1, 1]) A(s, [300 + s * 178, 650], [300 + s * 116, 478]); break;
    case "phone": A(1, [300 + 182, 620], [300 + 120, 436]); A(-1, [300 - 128, 700], [300 - 44, 680]); break;
    case "push": for (const s of [-1, 1]) A(s, [300 + s * 196, 700], [300 + s * 168, 600], true, true); break;
    case "climb": for (const s of [-1, 1]) A(s, [300 + s * 168, 420], [300 + s * 150, 236], true, true); break;
    case "relief": for (const s of [-1, 1]) A(s, [300 + s * 175, 470], [300 + s * 196, 330], true, true); break;
    case "swim": A(1, [300 + 175, 470], [300 + 236, 520], true, true); A(-1, [300 - 170, 590], [300 - 222, 640], true, true); break;
  }
  const drawArm = (a: Arm) => {
    p.stroke(curve(S(a.s), a.e, a.h), 5.6 * u, armCol);
    const r = a.palm ? 9.5 * u : 7 * u;
    if (a.palm) for (const k of [-1, 0, 1]) {
      const f: P2[] = [[a.h[0] + k * 4.2 * u, a.h[1] - r * 0.5], [a.h[0] + k * 5.4 * u, a.h[1] - r * 1.5]];
      p.stroke(f, 8 * u, INK); p.stroke(f, 3.6 * u, SKIN);
    }
    p.ell(a.h[0], a.h[1], r, r * 1.08, SKIN, 2.4 * u);
  };
  // ---- torso: navy jacket, white shirt V, red tie, lapels ----
  const T = { a: 104, b: 255, nTop: 2.4, nBot: 2.6, egg: 0.1, asym: 0, rot: 0, noise: 0.006, seed: seed + 7 };
  const tp = blobPts(300, 520 + 255, T);
  for (const a of arms) if (!a.front) drawArm(a);
  p.gradFill(tp, SUIT, mul(SUIT, SH_CLOTH), light);
  p.clip(tp, () => {
    p.poly([[300 - 46, 505], [300 + 46, 505], [300 + 6, 720], [300 - 6, 720]], SHIRT, 0);
    p.stroke([[300 - 50, 512], [300 - 4, 730]], 2.6 * u); p.stroke([[300 + 50, 512], [300 + 4, 730]], 2.6 * u);
    p.poly([[300 - 13, 530], [300 + 13, 530], [300 + 9, 556], [300 - 9, 556]], TIE, 2 * u); // knot
    p.poly([[300 - 9, 556], [300 + 9, 556], [300 + 17, 690], [300, 712], [300 - 17, 690]], TIE, 2 * u); // blade
    p.stroke([[300 - 4, 600], [300 + 10, 585]], 1.4 * u, "#a8222a"); p.stroke([[300 - 8, 645], [300 + 12, 625]], 1.4 * u, "#a8222a");
    p.poly([[300 - 46, 505], [300 - 6, 525], [300 - 28, 548]], SHIRT, 2 * u); p.poly([[300 + 46, 505], [300 + 6, 525], [300 + 28, 548]], SHIRT, 2 * u); // collar
    p.ell(300 + 66, 640, 18, 4, mix(SUIT, INK, 0.45), 0); // breast pocket
    p.poly([[300 + 54, 626], [300 + 64, 612], [300 + 74, 626]], "#f4f6fb", 1.4 * u); // pocket square
  });
  p.inkRing(tp, ow, thick);
  if (pose === "wheel") { // steering wheel in front of the chest
    p.arc(300, 812, 122, 36, 0, 360, 24, INK); p.arc(300, 812, 122, 36, 0, 360, 13, "#3a3946");
    p.stroke([[300, 812], [300, 846]], 12, INK);
  }
  for (const a of arms) if (a.front && pose !== "panic" && pose !== "phone") drawArm(a);
  if (pose === "phone") drawArm(arms[1]);
  // ---- head ----
  const hp = blobPts(300, hc, H);
  p.shadedFill(hp, SKIN, mul(SKIN, SH_SKIN), light, H.a);
  p.inkRing(hp, ow, thick);
  hatOn(p, OUT, hp, H, 300, hc, light, seed, 0, false);
  faceFront(p, 300, hc, W, expr, 0, look, lid, false, SKIN);
  // round glasses
  for (const s of [-1, 1]) {
    const x = 300 + s * 13 * u, y = hc + 0.5 * u;
    p.ell(x, y, 11.5 * u, 10 * u, null, 3 * u);
    p.arc(x + 3 * u, y - 3 * u, 6 * u, 5 * u, 250, 320, 1.8 * u, "#ffffff");
    p.stroke([[300 + s * 24.5 * u, hc - 1.5 * u], [300 + s * 47 * u, hc - 5 * u]], 2.4 * u);
  }
  p.stroke([[300 - 1.8 * u, hc - 1 * u], [300 + 1.8 * u, hc - 1 * u]], 2.6 * u);
  if (expr === "shock" || expr === "pained" || expr === "nervous") {
    p.ell(300 - 46 * u, hc - 30 * u, 3.4 * u, 5.4 * u, "#9fd4ff", 2 * u);
    p.ell(300 + 52 * u, hc - 12 * u, 2.8 * u, 4.6 * u, "#9fd4ff", 2 * u);
  }
  // ---- hands in front of the face ----
  if (pose === "panic") for (const a of arms) drawArm(a);
  if (pose === "phone") {
    const [hx, hy] = arms[0].h;
    p.rot = [rad(-14 + lean), hx, hy];
    p.poly(rrect(hx - 22, hy - 62, hx + 22, hy + 30, 9), "#22222c", 2.2 * u);
    p.poly(rrect(hx - 15, hy - 52, hx + 15, hy + 18, 4), "#7fd0ff", 0);
    p.rot = lean ? [rad(lean), 300, 900] : null;
    drawArm(arms[0]);
  }
  p.rot = null;
};

// ---------------- effect cards ----------------
const BOLD = (px: number) => `900 ${px}px "Arial Black", "Arial Bold", Impact, sans-serif`;
/** phone screen popping out of the call: "NO SIGNAL", crossed-out bars. 600 x 380 */
export const fxNoSignal = (p: Pen) => {
  const g = p.g;
  p.poly(rrect(14, 14, 586, 366, 44), "#1f2030", 12);
  p.poly(rrect(40, 40, 560, 340, 26), "#eaf6ff", 0);
  for (let i = 0; i < 4; i++) p.poly(rrect(80 + i * 46, 210 - i * 34, 112 + i * 46, 250, 6), "#9aa6b8", 6);
  p.stroke([[66, 120], [290, 270]], 22, "#ffffff"); p.stroke([[66, 120], [290, 270]], 14, "#e0313a");
  g.font = BOLD(64); g.textAlign = "center"; g.textBaseline = "middle";
  g.lineWidth = 10; g.strokeStyle = "#ffffff"; g.lineJoin = "round";
  g.strokeText("NO", 430, 150); g.fillStyle = "#e0313a"; g.fillText("NO", 430, 150);
  g.font = BOLD(54); g.strokeText("SIGNAL", 400, 250); g.fillText("SIGNAL", 400, 250);
};
/** comic "PUSH!" burst. 520 x 320 */
export const fxPush = (p: Pen) => {
  const g = p.g, pts: P2[] = [];
  for (let i = 0; i < 22; i++) { const a = (i / 22) * Math.PI * 2, r = i % 2 ? 1 : 0.78; pts.push([260 + 236 * r * Math.cos(a), 160 + 142 * r * Math.sin(a)]); }
  p.poly(pts, "#ffe14a", 12);
  g.font = BOLD(108); g.textAlign = "center"; g.textBaseline = "middle"; g.lineJoin = "round";
  g.lineWidth = 16; g.strokeStyle = INK; g.strokeText("PUSH!", 260, 166); g.fillStyle = "#ffffff"; g.fillText("PUSH!", 260, 166);
};
/** fat arrow pointing right (rotate the card to aim it). 400 x 220, col = fill */
export const fxArrow = (p: Pen, col: string) => {
  p.poly([[20, 70], [240, 70], [240, 16], [384, 110], [240, 204], [240, 150], [20, 150]], col, 12);
};
