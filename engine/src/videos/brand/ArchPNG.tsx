// Transparent PNGs of the architect for the banner composite (character ~1300 px tall).
import React from "react";
import { AbsoluteFill } from "remotion";
import { Pen } from "../persona/toon";
import { drawScientist, ARCH_PRESETS, Pose } from "./scientist";
import { Canvas } from "./Brand";

const BANNER: Pose = {
  ...ARCH_PRESETS.neutral, head: { turn: -1, tilt: -3 }, lean: -2,
  brows: { raise: [5, 1], tilt: [-2, 0] }, eyes: { shape: "open", look: [-0.4, 0] }, mouth: "smile",
  armL: { target: [72, 486], bend: 1, hand: "open" },
};
export const ArchPNG: React.FC<{ which: "banner" | "front" }> = ({ which }) => {
  const draw = (g: CanvasRenderingContext2D) => {
    g.clearRect(0, 0, 1200, 1400);
    const k = 1.71; g.setTransform(k, 0, 0, k, 640 - 300 * k, 1370 - 975 * k);
    drawScientist(new Pen(g), which === "banner" ? BANNER : ARCH_PRESETS.neutral, { look: "architect", glasses: true });
  };
  return <AbsoluteFill><Canvas w={1200} h={1400} draw={draw} /></AbsoluteFill>;
};
