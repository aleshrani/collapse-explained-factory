// Final channel art with the round-5 Scientist rig (scientist.ts), following the competitor table in brand/README.md:
//   avatar: one big face, flat saturated background, no text (at most one small collapse cue)
//   banner: one background colour with subtle detail, the name in the centre of the safe area, the host next to it
import React from "react";
import { AbsoluteFill } from "remotion";
import { Pen, INK, rad } from "../persona/toon";
import { drawScientist, PRESETS, Pose } from "./scientist";
import { block, Canvas, CREAM, CREAM_SH, FONT_DISPLAY, FONT_TEXT, useFonts } from "./Brand";
import { BANNER_TAGLINE } from "./Banner";

type G = CanvasRenderingContext2D;
type Pt = [number, number];
const HC = 367.6; // head centre in the rig's design space

type Av = { name: string; bg: string; k: number; cx: number; cy: number; pose: Pose; cue?: (p: Pen) => void };
export const FINAL_AVATARS: Av[] = [
  { name: "main", bg: "#2456f5", k: 2.9, cx: 540, cy: 590, pose: { ...PRESETS.neutral, armR: { target: [500, 760], hand: "relaxed" } } },
  { name: "shock", bg: "#ff5b24", k: 2.6, cx: 540, cy: 590, pose: PRESETS.shocked, cue: (p) => block(p, 880, 170, 80, 60, 18) },
];
export const FinalAvatar: React.FC<{ i: number }> = ({ i }) => {
  const a = FINAL_AVATARS[i];
  const draw = (g: G) => {
    g.fillStyle = a.bg; g.fillRect(0, 0, 1080, 1080);
    a.cue?.(new Pen(g));
    g.setTransform(a.k, 0, 0, a.k, a.cx - 300 * a.k, a.cy - HC * a.k);
    drawScientist(new Pen(g), a.pose);
  };
  return <AbsoluteFill><Canvas w={1080} h={1080} draw={draw} /></AbsoluteFill>;
};

const COBALT = "#2456f5", COBALT_DK = "#1d49d6", COBALT_LT = "#3164ff";
/** pointing at the title on his right (viewer's left), chart tablet in the other hand, eyes on the viewer */
const BANNER_POSE: Pose = {
  ...PRESETS.explaining, head: { tilt: -3 }, brows: { raise: [8, 3] }, eyes: { shape: "open", look: [-0.3, 0] }, mouth: "grin",
  armL: { target: [118, 380], hand: "point" }, armR: { target: [452, 600], hand: "chart" },
};
export const FinalBanner: React.FC = () => {
  useFonts();
  const draw = (g: G) => {
    const p = new Pen(g);
    // one colour + subtle detail: halftone dots, a faint skyline with one tower snapping, hairline cracks
    g.fillStyle = COBALT; g.fillRect(0, 0, 2560, 1440);
    g.fillStyle = "rgba(255,255,255,0.06)";
    for (let y = 20; y < 1440; y += 36) for (let x = (y / 36) % 2 ? 18 : 0; x < 2560; x += 36) { g.beginPath(); g.arc(x, y, 3.4, 0, Math.PI * 2); g.fill(); }
    g.fillStyle = COBALT_DK;
    const sky: [number, number][] = [[0, 160], [120, 260], [230, 200], [330, 330], [450, 240], [560, 180], [2000, 210], [2110, 300], [2230, 250], [2340, 360], [2450, 220]];
    for (const [x, h] of sky) g.fillRect(x, 1440 - h - 220, 100, h + 220);
    g.save(); g.translate(2490, 1440 - 560); g.rotate(rad(14)); g.fillRect(-50, -200, 100, 200); g.restore();
    g.strokeStyle = COBALT_LT; g.lineWidth = 6; g.lineCap = "round";
    for (const c of [[[0, 300], [120, 340], [100, 420], [230, 470]], [[2560, 120], [2440, 180], [2470, 260], [2350, 320]]] as Pt[][]) { g.beginPath(); c.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); g.stroke(); }
    // title slab: cracked concrete block with a chipped corner (centre of the safe area, left of the host)
    g.save(); g.translate(1150, 692); g.rotate(rad(-2));
    const slab: Pt[] = [[-400, -160], [395, -160], [400, 90], [340, 122], [360, 160], [-395, 160]];
    p.poly(slab.map(([x, y]) => [x + 14, y + 16] as Pt), "rgba(10,20,80,0.35)", 0);
    p.poly(slab, CREAM, 12);
    p.clip(slab, () => p.poly([[290, -160], [400, -160], [400, 160], [340, 160]], CREAM_SH, 0));
    p.poly(slab, null, 12);
    p.stroke([[250, -160], [272, -120], [242, -80], [274, -30], [250, 20]], 6, INK);
    g.restore();
    block(p, 1585, 880, 52, 40, 28, 9); block(p, 1550, 922, 30, 24, -10, 7);
    // the host next to the name, waist up inside the safe area, full figure on TV (with a floor shadow)
    g.fillStyle = "rgba(8,16,70,0.3)"; g.beginPath(); g.ellipse(1800, 1122, 110, 16, 0, 0, Math.PI * 2); g.fill();
    const k = 0.78; g.setTransform(k, 0, 0, k, 1800 - 300 * k, 640 - HC * k);
    drawScientist(new Pen(g), BANNER_POSE);
    g.setTransform(1, 0, 0, 1, 0, 0);
  };
  return (
    <AbsoluteFill style={{ background: COBALT }}>
      <Canvas w={2560} h={1440} draw={draw} />
      <div style={{ position: "absolute", left: 820, top: 556, width: 700, transform: "rotate(-2deg)", transformOrigin: "330px 136px", fontFamily: FONT_DISPLAY, color: INK, fontSize: 94, lineHeight: 1.42 }}>
        <div>Collapse</div>
        <div>Explained</div>
      </div>
      <div style={{ position: "absolute", left: 790, top: 866, fontFamily: FONT_TEXT, color: "#fffaf0", fontSize: 50, lineHeight: 1.1 }}>{BANNER_TAGLINE}</div>
    </AbsoluteFill>
  );
};
