// Architect candidate sheet: front + 3/4 full figures, four faces and the avatar crop at 48 / 98 / 176 px.
import React from "react";
import { AbsoluteFill } from "remotion";
import { Pen, INK } from "../persona/toon";
import { drawScientist, PRESETS, Pose } from "./scientist";
import { FONT_TEXT, Canvas, useFonts } from "./Brand";

const HC = 367.6, LOOK = { look: "architect" as const };
const CARDS: { label: string; pose: Pose; k: number; dx: number }[] = [
  { label: "neutral", pose: { ...PRESETS.neutral, armR: { target: [500, 760], hand: "relaxed" } }, k: 2.0, dx: 0 },
  { label: "shocked", pose: PRESETS.shocked, k: 2.0, dx: 0 },
  { label: "laughing", pose: PRESETS.laughing, k: 2.0, dx: 0 },
  { label: "explaining", pose: PRESETS.explaining, k: 1.55, dx: -120 },
];
export const ArchitectSheet: React.FC = () => {
  useFonts();
  const draw = (g: CanvasRenderingContext2D) => {
    g.fillStyle = "#f4efe6"; g.fillRect(0, 0, 3200, 1600);
    const k0 = 1.22;
    g.setTransform(k0, 0, 0, k0, 300 - 300 * k0, 1540 - 975 * k0); drawScientist(new Pen(g), PRESETS.neutral, LOOK);
    g.setTransform(k0, 0, 0, k0, 860 - 300 * k0, 1540 - 975 * k0); drawScientist(new Pen(g), { ...PRESETS.explaining, head: { turn: 1, tilt: 2 } }, LOOK);
    CARDS.forEach((c, i) => {
      const x = 1300 + (i % 2) * 640, y = 60 + Math.floor(i / 2) * 640;
      g.setTransform(1, 0, 0, 1, 0, 0); g.save(); g.beginPath(); g.roundRect(x, y, 600, 560, 30); g.fillStyle = "#fff0b8"; g.fill(); g.clip();
      g.setTransform(c.k, 0, 0, c.k, x + 300 + c.dx - 300 * c.k, y + 300 - HC * c.k); drawScientist(new Pen(g), c.pose, LOOK);
      g.restore(); g.setTransform(1, 0, 0, 1, 0, 0); g.lineWidth = 6; g.strokeStyle = INK; g.beginPath(); g.roundRect(x, y, 600, 560, 30); g.stroke();
    });
    // avatar crop preview: draw the 1080 avatar off-screen, then place it in circles at true sizes
    const av = document.createElement("canvas"); av.width = av.height = 1080; const ag = av.getContext("2d")!;
    ag.fillStyle = "#2456f5"; ag.fillRect(0, 0, 1080, 1080);
    const ka = 2.6; ag.setTransform(ka, 0, 0, ka, 540 - 300 * ka, 600 - HC * ka); drawScientist(new Pen(ag), { ...PRESETS.neutral, armR: { target: [500, 760], hand: "relaxed" } }, LOOK);
    g.setTransform(1, 0, 0, 1, 0, 0);
    for (const [bg, row] of [["#ffffff", 0], ["#0f0f0f", 1]] as const) {
      const y0 = 1330 + row * 0; const x0 = 2600 + row * 300;
      g.fillStyle = bg; g.fillRect(x0 - 20, 60, 280, 1140 - 60 + 140);
      let y = 100;
      for (const s of [48, 98, 176]) { g.save(); g.beginPath(); g.arc(x0 + 120, y + s / 2, s / 2, 0, Math.PI * 2); g.clip(); g.drawImage(av, x0 + 120 - s / 2, y, s, s); g.restore(); y += s + 120; }
      void y0;
    }
  };
  return (
    <AbsoluteFill style={{ background: "#f4efe6" }}>
      <Canvas w={3200} h={1600} draw={draw} />
      <div style={{ position: "absolute", left: 50, top: 30, fontFamily: FONT_TEXT, color: INK, fontSize: 60 }}>The Architect</div>
      <div style={{ position: "absolute", left: 50, top: 106, fontFamily: FONT_TEXT, color: INK, fontSize: 28, opacity: 0.75 }}>front and three-quarter, same rig as the Scientist</div>
      {CARDS.map((c, i) => <div key={c.label} style={{ position: "absolute", left: 1300 + (i % 2) * 640 + 20, top: 60 + Math.floor(i / 2) * 640 + 566, fontFamily: FONT_TEXT, color: INK, fontSize: 34 }}>{c.label}</div>)}
      {[48, 98, 176].map((s, i) => <div key={s} style={{ position: "absolute", left: 2600 + 260, top: [100, 268, 486][i] + s / 2 - 16, fontFamily: FONT_TEXT, color: INK, fontSize: 26 }}>{s}px</div>)}
      <div style={{ position: "absolute", left: 2580, top: 1290, fontFamily: FONT_TEXT, color: INK, fontSize: 28 }}>avatar crop, light / dark</div>
    </AbsoluteFill>
  );
};
