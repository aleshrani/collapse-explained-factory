// Screen-space layer of the short (drawn on a 1080 x 1920 Canvas2D over the 3D picture, after the grade):
// hook caption, "WHAT DO YOU DO?", the three option cards (pop with overshoot, highlight, red X / green check),
// the "NO SIGNAL" phone screen, "PUSH!" bursts and water-pressure arrows. Pure function of the frame.
import { Pen, INK, rrect } from "./toon";
import { fxNoSignal, fxPush, fxArrow } from "./driver";
import { STAMP_A, STAMP_B, CHECK_C, SHOVES } from "./story";

const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
const smooth = (x: number) => { const u = clamp01(x); return u * u * (3 - 2 * u); };
/** back-out ease: overshoots ~10 % then settles */
const popE = (u: number) => { const x = clamp01(u) - 1; return 1 + 2.7 * x * x * x + 1.7 * x * x; };
const FONT = (px: number) => `900 ${px}px "Arial Black", "Arial Bold", Impact, sans-serif`;

const caption = (g: CanvasRenderingContext2D, lines: string[], y0: number, px: number, s: number, a: number) => {
  if (a <= 0 || s <= 0) return;
  g.save(); g.globalAlpha = a; g.translate(540, y0); g.scale(s, s);
  g.font = FONT(px); g.textAlign = "center"; g.textBaseline = "middle"; g.lineJoin = "round";
  lines.forEach((l, i) => {
    const y = i * px * 1.12;
    g.lineWidth = px * 0.3; g.strokeStyle = INK; g.strokeText(l, 0, y);
    g.fillStyle = i === lines.length - 1 ? "#ffd84a" : "#ffffff"; g.fillText(l, 0, y);
  });
  g.restore();
};

type CardDef = { letter: string; lines: string[]; col: string; at: number };
const CARDS: CardDef[] = [
  { letter: "A", lines: ["CALL", "911"], col: "#f2a531", at: 132 },
  { letter: "B", lines: ["OPEN THE", "DOOR"], col: "#3f8fd8", at: 140 },
  { letter: "C", lines: ["OPEN THE", "WINDOW"], col: "#3cae5a", at: 148 },
];
const CW = 318, CH = 290, GAP = 22, CX0 = (1080 - 3 * CW - 2 * GAP) / 2, CY = 1585;
/** which option is being tried at frame f (-1 = none) */
const activeAt = (f: number) => (f >= 165 && f < 255 ? 0 : f >= 255 && f < 345 ? 1 : f >= 345 ? 2 : -1);

const cross = (g: CanvasRenderingContext2D, w: number, h: number, u: number) => {
  const s = 1 + 0.7 * (1 - popE(u));
  g.save(); g.scale(s, s); g.lineCap = "round";
  for (const [a, b] of [[[-w * 0.36, -h * 0.36], [w * 0.36, h * 0.36]], [[w * 0.36, -h * 0.36], [-w * 0.36, h * 0.36]]] as const) {
    g.beginPath(); g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]);
    g.strokeStyle = "#ffffff"; g.lineWidth = 40; g.stroke(); g.strokeStyle = INK; g.lineWidth = 32; g.stroke(); g.strokeStyle = "#e0313a"; g.lineWidth = 20; g.stroke();
  }
  g.restore();
};
const check = (g: CanvasRenderingContext2D, w: number, h: number, u: number) => {
  const s = 1 + 0.7 * (1 - popE(u));
  // round green badge on the top-right corner, so the label stays readable
  g.save(); g.translate(w / 2 - 34, -h / 2 + 30); g.scale(s, s); g.lineCap = "round"; g.lineJoin = "round";
  g.beginPath(); g.arc(0, 0, 62, 0, Math.PI * 2); g.fillStyle = "#2fc25a"; g.fill(); g.lineWidth = 10; g.strokeStyle = INK; g.stroke();
  g.beginPath(); g.moveTo(-28, 2); g.lineTo(-8, 24); g.lineTo(30, -22);
  g.strokeStyle = INK; g.lineWidth = 30; g.stroke(); g.strokeStyle = "#ffffff"; g.lineWidth = 18; g.stroke();
  g.restore();
};

const card = (g: CanvasRenderingContext2D, p: Pen, d: CardDef, i: number, f: number) => {
  const u = (f - d.at) / 10;
  if (u <= 0) return;
  const act = activeAt(f), out = smooth((f - 402) / 14);
  if (out >= 1) return;
  const failed = (i === 0 && f >= STAMP_A) || (i === 1 && f >= STAMP_B);
  const won = i === 2 && f >= CHECK_C;
  const hi = act === i ? smooth((f - [165, 255, 345][i]) / 8) : 0;
  const s = popE(u) * (1 + 0.1 * hi) * (act >= 0 && act !== i ? 0.92 : 1);
  const cx = CX0 + i * (CW + GAP) + CW / 2, cy = CY + CH / 2 - 26 * hi + 520 * out * out;
  g.save(); g.translate(cx, cy); g.scale(s, s); g.rotate((i - 1) * 0.025);
  g.globalAlpha = act >= 0 && act !== i && !won ? 0.78 : 1;
  // drop shadow, body, ink rim
  p.poly(rrect(-CW / 2 + 8, -CH / 2 + 14, CW / 2 + 8, CH / 2 + 14, 34), "rgba(20,10,30,0.35)", 0);
  p.poly(rrect(-CW / 2, -CH / 2, CW / 2, CH / 2, 34), failed ? "#e9dfd2" : won ? "#eaffe8" : "#fff7e2", 10);
  if (hi > 0) { g.lineWidth = 12; g.strokeStyle = d.col; g.globalAlpha = hi; p.path(rrect(-CW / 2 - 14, -CH / 2 - 14, CW / 2 + 14, CH / 2 + 14, 44), true); g.stroke(); g.globalAlpha = 1; }
  // letter badge
  p.ell(-CW / 2 + 54, -CH / 2 + 50, 50, 50, d.col, 9);
  g.font = FONT(62); g.textAlign = "center"; g.textBaseline = "middle"; g.lineJoin = "round";
  g.lineWidth = 12; g.strokeStyle = INK; g.strokeText(d.letter, -CW / 2 + 54, -CH / 2 + 54); g.fillStyle = "#ffffff"; g.fillText(d.letter, -CW / 2 + 54, -CH / 2 + 54);
  // label, shrunk to fit
  d.lines.forEach((l, k) => {
    let px = 62;
    g.font = FONT(px);
    while (g.measureText(l).width > CW - 44 && px > 30) { px -= 2; g.font = FONT(px); }
    g.fillStyle = INK; g.fillText(l, 0, 34 + (k - (d.lines.length - 1) / 2) * 74);
  });
  if (failed) cross(g, CW, CH, (f - (i === 0 ? STAMP_A : STAMP_B)) / 7);
  if (won) check(g, CW, CH, (f - CHECK_C) / 7);
  g.restore();
};

const sprite = (g: CanvasRenderingContext2D, w: number, h: number, draw: (p: Pen) => void, x: number, y: number, s: number, rot = 0, a = 1) => {
  if (s <= 0.01 || a <= 0) return;
  g.save(); g.globalAlpha = a; g.translate(x, y); g.rotate(rot); g.scale(s, s); g.translate(-w / 2, -h / 2);
  draw(new Pen(g)); g.restore();
};

export const drawOverlay = (g: CanvasRenderingContext2D, f: number) => {
  g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, 1080, 1920);
  const p = new Pen(g);
  // hook
  caption(g, ["YOUR CAR JUST", "WENT OFF A BRIDGE!"], 250, 84, popE(f / 8 + 0.35), 1 - smooth((f - 92) / 10));
  caption(g, ["WHAT DO YOU DO?"], 240, 92, popE((f - 110) / 9), f < 110 ? 0 : 1 - smooth((f - 160) / 10));
  // option cards
  CARDS.forEach((d, i) => card(g, p, d, i, f));
  // A: the phone screen
  if (f >= 180 && f < STAMP_A + 6) {
    const s = popE((f - 180) / 9) * (1 - smooth((f - STAMP_A) / 6)), wob = 0.04 * Math.sin(f * 0.5);
    sprite(g, 600, 380, fxNoSignal, 800, 420, 0.68 * s, wob - 0.06);
  }
  // B: PUSH! on every shove, water-pressure arrows pushing the door shut
  SHOVES.forEach((s0, k) => {
    const u = (f - s0) / 14;
    if (u >= 0 && u < 1) sprite(g, 520, 320, fxPush, 540 + [-150, 140, 0][k], 330 - 20 * k, 0.95 * popE(u * 2.2) * (1 - smooth((u - 0.7) / 0.3)), [-0.12, 0.1, -0.04][k]);
  });
  if (f >= 262 && f < STAMP_B + 4) {
    const a = smooth((f - 262) / 6) * (1 - smooth((f - STAMP_B) / 4)), pulse = 18 * Math.sin(f * 0.45);
    sprite(g, 400, 220, (q) => fxArrow(q, "#4fb3ff"), 150 + pulse, 1330, 0.55, -0.35, a);
    sprite(g, 400, 220, (q) => fxArrow(q, "#4fb3ff"), 930 - pulse, 1330, 0.55, Math.PI + 0.35, a);
    sprite(g, 400, 220, (q) => fxArrow(q, "#4fb3ff"), 540, 1450 - pulse, 0.5, -Math.PI / 2, a);
  }
};
