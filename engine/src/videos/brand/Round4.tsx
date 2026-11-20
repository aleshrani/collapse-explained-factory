// Round 4 sheet for one host: front + 3/4 full figures and four faces (neutral, shocked, laughing, explaining).
import React from "react";
import { AbsoluteFill } from "remotion";
import { Pen, INK } from "../persona/toon";
import { drawHost4, head4Centre, SCIENTIST, PROFESSOR, Face4, Arms4 } from "./cast4";
import { FONT_TEXT, Canvas, useFonts } from "./Brand";

const CARDS: { label: string; face: Face4; arms: Arms4; k: number; dx: number }[] = [
  { label: "neutral", face: "neutral", arms: "hang", k: 2.3, dx: 0 },
  { label: "shocked", face: "shock", arms: "cheeks", k: 2.3, dx: 0 },
  { label: "laughing", face: "laugh", arms: "hang", k: 2.3, dx: 0 },
  { label: "explaining", face: "explain", arms: "point", k: 1.75, dx: -150 },
];
export const Round4: React.FC<{ who: "scientist" | "professor" }> = ({ who }) => {
  useFonts();
  const d = who === "scientist" ? SCIENTIST : PROFESSOR, tint = who === "scientist" ? "#d3ddff" : "#f7e3b4";
  const draw = (g: CanvasRenderingContext2D) => {
    g.fillStyle = "#f4efe6"; g.fillRect(0, 0, 3200, 1560);
    for (const [cx, facing] of [[380, 0], [1000, 1]] as const) { const k = 1.22; g.setTransform(k, 0, 0, k, cx - 300 * k, 1500 - 975 * k); drawHost4(new Pen(g), d, { face: facing ? "explain" : "neutral", arms: "prop", facing }); }
    CARDS.forEach((c, i) => {
      const x = 1420 + (i % 2) * 880, y = 60 + Math.floor(i / 2) * 740;
      g.setTransform(1, 0, 0, 1, 0, 0);
      g.save(); g.beginPath(); g.roundRect(x, y, 840, 660, 34); g.fillStyle = tint; g.fill(); g.clip();
      g.setTransform(c.k, 0, 0, c.k, x + 420 + c.dx - 300 * c.k, y + 350 - head4Centre() * c.k);
      drawHost4(new Pen(g), d, { face: c.face, arms: c.arms });
      g.restore(); g.setTransform(1, 0, 0, 1, 0, 0);
      g.lineWidth = 7; g.strokeStyle = INK; g.beginPath(); g.roundRect(x, y, 840, 660, 34); g.stroke();
    });
  };
  return (
    <AbsoluteFill style={{ background: "#f4efe6" }}>
      <Canvas w={3200} h={1560} draw={draw} />
      <div style={{ position: "absolute", left: 60, top: 36, fontFamily: FONT_TEXT, color: INK, fontSize: 64 }}>{d.name}</div>
      <div style={{ position: "absolute", left: 60, top: 116, fontFamily: FONT_TEXT, color: INK, fontSize: 30, opacity: 0.75 }}>front and three-quarter, round 4</div>
      {CARDS.map((c, i) => (
        <div key={c.label} style={{ position: "absolute", left: 1420 + (i % 2) * 880 + 30, top: 60 + Math.floor(i / 2) * 740 + 666, fontFamily: FONT_TEXT, color: INK, fontSize: 38 }}>{c.label}</div>
      ))}
    </AbsoluteFill>
  );
};
