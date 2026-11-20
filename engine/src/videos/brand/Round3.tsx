// Round 3 candidates sheet: each archetype as a full figure (neutral, holding its prop) + shocked and laughing faces.
import React from "react";
import { AbsoluteFill } from "remotion";
import { Pen, INK } from "../persona/toon";
import { CAST3, drawCast3, castHeadCentre } from "./cast3";
import { FONT_TEXT, Canvas, useFonts } from "./Brand";

const CW = 1600, CH = 620, TOP = 30;
const TINTS = ["#f7e3b4", "#d3ddff", "#cfeee8", "#ffd9d4", "#fff0b8", "#e9dcff"];
export const Round3: React.FC = () => {
  useFonts();
  const draw = (g: CanvasRenderingContext2D) => {
    g.fillStyle = "#f4efe6"; g.fillRect(0, 0, 3200, 1920);
    CAST3.forEach((d, i) => {
      const x0 = (i % 2) * CW, y0 = TOP + Math.floor(i / 2) * CH;
      g.setTransform(0.6, 0, 0, 0.6, x0 + 200 - 300 * 0.6, y0 + 600 - 975 * 0.6);
      drawCast3(new Pen(g), d, { face: "neutral" });
      [["shock", "cheeks"], ["laugh", "hang"]].forEach(([face, arms], j) => {
        const cx = x0 + 430 + j * 520, cy = y0 + 80;
        g.setTransform(1, 0, 0, 1, 0, 0);
        g.save(); g.beginPath(); g.roundRect(cx, cy, 480, 470, 30); g.fillStyle = TINTS[i]; g.fill(); g.clip();
        const k = 1.45;
        g.setTransform(k, 0, 0, k, cx + 240 - 300 * k, cy + 260 - castHeadCentre(d) * k);
        drawCast3(new Pen(g), d, { face: face as "shock" | "laugh", arms: arms as "cheeks" | "hang" });
        g.restore(); g.setTransform(1, 0, 0, 1, 0, 0);
        g.lineWidth = 7; g.strokeStyle = INK; g.beginPath(); g.roundRect(cx, cy, 480, 470, 30); g.stroke();
      });
    });
  };
  return (
    <AbsoluteFill style={{ background: "#f4efe6" }}>
      <Canvas w={3200} h={1920} draw={draw} />
      {CAST3.map((d, i) => (
        <div key={d.key} style={{ position: "absolute", left: (i % 2) * CW + 430, top: TOP + Math.floor(i / 2) * CH + 12, fontFamily: FONT_TEXT, color: INK, fontSize: 46 }}>
          {i + 1} {d.name}
        </div>
      ))}
    </AbsoluteFill>
  );
};
