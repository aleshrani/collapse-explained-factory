// Architect avatar on yellow: one big friendly face, flat yellow background, no text (two yellow options).
import React from "react";
import { AbsoluteFill } from "remotion";
import { Pen } from "../persona/toon";
import { drawScientist, ARCH_PRESETS } from "./scientist";
import { Canvas } from "./Brand";

export const ARCH_YELLOWS = ["#fff1b8", "#f0a500"]; // pale warm yellow (helmet reads by saturation) / deep amber (helmet reads lighter)
export const ArchAvatar: React.FC<{ i: number }> = ({ i }) => {
  const draw = (g: CanvasRenderingContext2D) => {
    g.fillStyle = ARCH_YELLOWS[i]; g.fillRect(0, 0, 1080, 1080);
    const k = 2.55; g.setTransform(k, 0, 0, k, 540 - 300 * k, 620 - 367.6 * k);
    drawScientist(new Pen(g), ARCH_PRESETS.neutral, { look: "architect" });
  };
  return <AbsoluteFill><Canvas w={1080} h={1080} draw={draw} /></AbsoluteFill>;
};
