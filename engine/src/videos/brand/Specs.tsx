// Specs, the chosen "Collapse Explained" host: three avatar variants and the character sheet.
import React from "react";
import { AbsoluteFill } from "remotion";
import { Pen, INK } from "../persona/toon";
import { drawHost, FACES, HostOpts, SPECS_V2 } from "./host";
import { headCentre, block, CREAM, FONT_TEXT, Canvas, useFonts } from "./Brand";

/** the host design in use (Specs v2 option picked by Ales; the original Specs was dropped: too close to Crayon Capital) */
export const SPECS = SPECS_V2.box;
type G = CanvasRenderingContext2D;
type Pt = [number, number];
const ORANGE = "#ff5b24", COBALT = "#2456f5", TEAL = "#13b5a0", YELLOW = "#ffc21a", RASP = "#e8336b";
/** saturated backgrounds that do not repeat the host's own top / glasses / stripe colour (so he never melts into it) */
const BGS = [ORANGE, COBALT, TEAL, YELLOW, RASP].filter((c) => ![SPECS.topCol, SPECS.glassCol, SPECS.stripe].includes(c));

/** a line chart that climbs and then falls off a cliff, drawn straight on the background (no panel) */
export const crashChart = (p: Pen, x: number, y: number, w: number, h: number, ink: string, line = CREAM) => {
  p.stroke([[x, y], [x, y + h], [x + w, y + h]], 9, ink);
  for (let i = 1; i <= 3; i++) p.stroke([[x + 10, y + h - (i * h) / 4], [x + w, y + h - (i * h) / 4]], 3, ink);
  const pts: Pt[] = [[x + 0.02 * w, y + 0.82 * h], [x + 0.2 * w, y + 0.66 * h], [x + 0.34 * w, y + 0.7 * h], [x + 0.5 * w, y + 0.38 * h], [x + 0.62 * w, y + 0.44 * h], [x + 0.74 * w, y + 0.1 * h], [x + 0.8 * w, y + 0.98 * h]];
  p.stroke(pts, 30, INK); p.stroke(pts, 18, line);
  const [ex, ey] = pts[pts.length - 1];
  p.poly([[ex - 26, ey - 34], [ex + 26, ey - 34], [ex, ey + 8]], line, 7);
  // the peak snaps: a crack through the line at the top
  const px = x + 0.74 * w, py = y + 0.1 * h;
  p.stroke([[px - 22, py - 30], [px + 4, py + 2], [px - 10, py + 14], [px + 16, py + 44]], 7, INK);
};

type Av = { bg: string; k: number; cx: number; cy: number; motif: (p: Pen) => void; opts: HostOpts };
/** Avatars follow the majority pattern of the strongest animated-explainer channels (README, research table):
 *  one big face, flat single-colour background, no text, at most one small collapse cue. */
export const AVATARS: Av[] = [
  // 1. shocked, hands on cheeks, one chunk falling past
  { bg: BGS[0], k: 2.25, cx: 540, cy: 620, opts: { face: FACES.shock, arms: "cheeks", fs: 1.1 }, motif: (p) => block(p, 860, 210, 84, 62, 18) },
  // 2. a chunk of concrete just bounced off his head: glasses knocked askew, one lens cracked
  { bg: BGS[1], k: 2.25, cx: 540, cy: 630, opts: { face: FACES.yikes, glassTilt: 13, lensCrack: true, fs: 1.1 }, motif: (p) => {
    block(p, 800, 120, 100, 74, 24);
    for (const [x0, y0, x1, y1] of [[720, 215, 690, 250], [775, 225, 770, 268], [830, 215, 855, 250]] as const) p.stroke([[x0, y0], [x1, y1]], 10, INK); } },
  // 3. pointing up at a chart that falls off a cliff
  { bg: BGS[2], k: 1.75, cx: 440, cy: 660, opts: { face: FACES.shock, arms: "pointUp", fs: 1.1 }, motif: (p) => crashChart(p, 620, 160, 360, 290, "rgba(36,23,38,0.55)") },
];
export const SpecsAvatar: React.FC<{ i: number }> = ({ i }) => {
  const a = AVATARS[i];
  const draw = (g: G) => {
    g.fillStyle = a.bg; g.fillRect(0, 0, 1080, 1080);
    a.motif(new Pen(g));
    g.setTransform(a.k, 0, 0, a.k, a.cx - 300 * a.k, a.cy - headCentre(SPECS) * a.k);
    drawHost(new Pen(g), SPECS, { seed: 6, ...a.opts });
  };
  return <AbsoluteFill><Canvas w={1080} h={1080} draw={draw} /></AbsoluteFill>;
};

// ---------------- character sheet ----------------
const CARDS: { label: string; opts: HostOpts; k: number; dx: number }[] = [
  { label: "neutral", opts: { face: FACES.calm }, k: 2.0, dx: 0 },
  { label: "shocked", opts: { face: FACES.shock, arms: "cheeks" }, k: 2.0, dx: 0 },
  { label: "explaining", opts: { face: FACES.explain, arms: "pointUp" }, k: 1.5, dx: -110 },
  { label: "smug", opts: { face: FACES.smug }, k: 2.0, dx: 0 },
  { label: "facepalm", opts: { face: FACES.facepalm, arms: "facepalm" }, k: 2.0, dx: 0 },
  { label: "laughing", opts: { face: FACES.laugh, tilt: -5 }, k: 2.0, dx: 0 },
];
const SWATCH: [string, string][] = [[SPECS.topCol, "top"], [SPECS.glassCol ?? SPECS.stripe ?? INK, "glasses"], [SPECS.hairCol, "hair"], [SPECS.skin, "skin"], [SPECS.pants, "trousers"], [INK, "ink"]];
export const SpecsSheet: React.FC = () => {
  useFonts();
  const W = 3200, H = 1800;
  const cardX = (c: number) => 1290 + c * 640, cardY = (r: number) => 70 + r * 840;
  const draw = (g: G) => {
    g.fillStyle = "#f4efe6"; g.fillRect(0, 0, W, H);
    for (const [cx, facing] of [[330, 0], [900, 1]] as const) {
      g.setTransform(1.6, 0, 0, 1.6, cx - 300 * 1.6, -110);
      drawHost(new Pen(g), SPECS, { seed: 6, face: facing ? FACES.explain : FACES.calm, facing });
    }
    CARDS.forEach((c, i) => {
      const x = cardX(i % 3), y = cardY(Math.floor(i / 3));
      g.setTransform(1, 0, 0, 1, 0, 0);
      g.save(); g.beginPath(); g.roundRect(x, y, 600, 700, 34); g.fillStyle = "#f7e3b4"; g.fill(); g.clip();
      g.setTransform(c.k, 0, 0, c.k, x + 300 + c.dx - 300 * c.k, y + 340 - headCentre(SPECS) * c.k);
      drawHost(new Pen(g), SPECS, { seed: 6, ...c.opts });
      g.restore(); g.setTransform(1, 0, 0, 1, 0, 0);
      g.lineWidth = 8; g.strokeStyle = INK; g.beginPath(); g.roundRect(x, y, 600, 700, 34); g.stroke();
    });
    SWATCH.forEach(([col], i) => { g.beginPath(); g.arc(90 + i * 190, 1650, 42, 0, Math.PI * 2); g.fillStyle = col; g.fill(); g.lineWidth = 6; g.strokeStyle = INK; g.stroke(); });
  };
  return (
    <AbsoluteFill style={{ background: "#f4efe6" }}>
      <Canvas w={W} h={H} draw={draw} />
      <div style={{ position: "absolute", left: 60, top: 40, fontFamily: FONT_TEXT, color: INK, fontSize: 64 }}>{SPECS.name}</div>
      <div style={{ position: "absolute", left: 60, top: 118, fontFamily: FONT_TEXT, color: INK, fontSize: 30, opacity: 0.75 }}>Collapse Explained host: front and three-quarter</div>
      {CARDS.map((c, i) => (
        <div key={c.label} style={{ position: "absolute", left: cardX(i % 3), width: 600, top: cardY(Math.floor(i / 3)) + 712, fontFamily: FONT_TEXT, color: INK, fontSize: 40, textAlign: "center" }}>{c.label}</div>
      ))}
      {SWATCH.map(([col, name], i) => (
        <div key={col} style={{ position: "absolute", left: i * 190, width: 180, top: 1700, fontFamily: FONT_TEXT, color: INK, fontSize: 22, textAlign: "center", lineHeight: 1.25 }}>{name}<br />{col}</div>
      ))}
    </AbsoluteFill>
  );
};
