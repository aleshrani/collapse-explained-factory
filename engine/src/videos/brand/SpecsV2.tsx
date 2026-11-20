// Specs v2 options sheet: three redesigns of the glasses-wearing analyst host, each as a full figure + shocked close-up.
import React from "react";
import { AbsoluteFill } from "remotion";
import { Pen, INK } from "../persona/toon";
import { drawHost, FACES, SPECS_V2 } from "./host";
import { headCentre, FONT_TEXT, Canvas, useFonts } from "./Brand";

const KEYS = ["box", "curls", "bob"] as const;
const TINT = { box: "#d3ddff", curls: "#cfeee8", bob: "#ffd9d4" };
const BLURB = {
  box: "flat-top, orange browline frames, cobalt crewneck",
  curls: "ginger curls, black rectangular frames, teal turtleneck",
  bob: "black bob with fringe, red hexagonal frames, striped top",
};
export const SpecsV2Options: React.FC = () => {
  useFonts();
  const draw = (g: CanvasRenderingContext2D) => {
    g.fillStyle = "#f4efe6"; g.fillRect(0, 0, 1800, 1900);
    KEYS.forEach((key, i) => {
      const d = SPECS_V2[key], cx = 300 + i * 600;
      g.setTransform(0.92, 0, 0, 0.92, cx - 300 * 0.92, 40);
      drawHost(new Pen(g), d, { seed: 6 });
      g.setTransform(1, 0, 0, 1, 0, 0);
      g.save(); g.beginPath(); g.roundRect(cx - 270, 1010, 540, 640, 36); g.fillStyle = TINT[key]; g.fill(); g.clip();
      const k = 1.6;
      g.setTransform(k, 0, 0, k, cx - 300 * k, 1350 - headCentre(d) * k);
      drawHost(new Pen(g), d, { seed: 6, face: FACES.shock, arms: "cheeks" });
      g.restore(); g.setTransform(1, 0, 0, 1, 0, 0);
      g.lineWidth = 8; g.strokeStyle = INK; g.beginPath(); g.roundRect(cx - 270, 1010, 540, 640, 36); g.stroke();
    });
  };
  return (
    <AbsoluteFill style={{ background: "#f4efe6" }}>
      <Canvas w={1800} h={1900} draw={draw} />
      {KEYS.map((key, i) => (
        <div key={key} style={{ position: "absolute", left: 30 + i * 600, width: 540, top: 1680, fontFamily: FONT_TEXT, color: INK, textAlign: "center" }}>
          <div style={{ fontSize: 52, lineHeight: 1.1 }}>{String.fromCharCode(65 + i)} {SPECS_V2[key].name}</div>
          <div style={{ fontSize: 28, lineHeight: 1.3, marginTop: 8, opacity: 0.8 }}>{BLURB[key]}</div>
        </div>
      ))}
    </AbsoluteFill>
  );
};
