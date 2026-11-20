// Round 5 sheet: the Scientist rig (joints shown), the six expression presets and the lip-sync visemes.
import React from "react";
import { AbsoluteFill } from "remotion";
import { Pen, INK } from "../persona/toon";
import { drawScientist, PRESETS, VISEMES, presetsFor, Look } from "./scientist";
import { FONT_TEXT, Canvas, useFonts } from "./Brand";

const HC = 367.6;
const P_KEYS = Object.keys(PRESETS) as (keyof typeof PRESETS)[];
export const Round5: React.FC<{ look?: Look }> = ({ look = "scientist" }) => {
  useFonts();
  const P = presetsFor(look), O = { look }, tint = look === "architect" ? "#fff0b8" : "#d3ddff";
  const draw = (g: CanvasRenderingContext2D) => {
    g.fillStyle = "#f4efe6"; g.fillRect(0, 0, 3200, 1700);
    const k0 = 1.25; g.setTransform(k0, 0, 0, k0, 230 - 300 * k0, 1620 - 975 * k0); drawScientist(new Pen(g), { ...P.neutral, head: { turn: look === "architect" ? 0 : 0 } }, O);
    g.setTransform(k0, 0, 0, k0, 660 - 300 * k0, 1620 - 975 * k0); drawScientist(new Pen(g), look === "architect" ? { ...P.explaining, head: { turn: 1, tilt: 2 } } : P.explaining, { showJoints: look !== "architect", look });
    P_KEYS.forEach((key, i) => {
      const x = 960 + (i % 3) * 600, y = 50 + Math.floor(i / 3) * 560;
      g.setTransform(1, 0, 0, 1, 0, 0); g.save(); g.beginPath(); g.roundRect(x, y, 560, 490, 30); g.fillStyle = tint; g.fill(); g.clip();
      const k = key === "explaining" ? 1.25 : 1.6, dx = key === "explaining" ? -90 : 0;
      g.setTransform(k, 0, 0, k, x + 280 + dx - 300 * k, y + 250 - HC * k); drawScientist(new Pen(g), P[key], O);
      g.restore(); g.setTransform(1, 0, 0, 1, 0, 0); g.lineWidth = 6; g.strokeStyle = INK; g.beginPath(); g.roundRect(x, y, 560, 490, 30); g.stroke();
    });
    VISEMES.forEach((v, i) => {
      const x = 960 + i * 300, y = 1190;
      g.setTransform(1, 0, 0, 1, 0, 0); g.save(); g.beginPath(); g.roundRect(x, y, 270, 330, 24); g.fillStyle = "#cfeee8"; g.fill(); g.clip();
      const k = 1.9; g.setTransform(k, 0, 0, k, x + 135 - 300 * k, y + 170 - (HC + 20) * k); drawScientist(new Pen(g), { ...P.neutral, mouth: v, armR: { target: [520, 700], hand: "relaxed" } }, O);
      g.restore(); g.setTransform(1, 0, 0, 1, 0, 0); g.lineWidth = 5; g.strokeStyle = INK; g.beginPath(); g.roundRect(x, y, 270, 330, 24); g.stroke();
    });
  };
  const lab = (t: string, l: number, tp: number, fs = 36) => <div style={{ position: "absolute", left: l, top: tp, fontFamily: FONT_TEXT, color: INK, fontSize: fs }}>{t}</div>;
  return (
    <AbsoluteFill style={{ background: "#f4efe6" }}>
      <Canvas w={3200} h={1700} draw={draw} />
      {lab(look === "architect" ? "The Architect, round 6 (rig)" : "The Scientist, round 5 (rig)", 50, 30, 60)}
      {lab("neutral", 160, 1630, 30)}{lab(look === "architect" ? "three-quarter (explaining)" : "joints shown (explaining)", 500, 1630, 30)}
      {P_KEYS.map((k, i) => lab(k, 960 + (i % 3) * 600 + 20, 50 + Math.floor(i / 3) * 560 + 494, 32))}
      {lab("lip-sync visemes", 960, 1140, 34)}
      {VISEMES.map((v, i) => lab(v, 960 + i * 300 + 20, 1526, 30))}
    </AbsoluteFill>
  );
};
