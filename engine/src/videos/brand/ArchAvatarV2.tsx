// Architect avatar v2: head larger and higher (head incl. hat ~58 % of the frame), architect cues (modern glasses,
// pencil, crisp collar + tie knot), depth (amber gradient, rim light, low-contrast blueprint grid / building section,
// a cracked tower silhouette behind the shoulder). Four variants: yellow or white hard hat, pencil behind the ear or
// on the brim. No text.
import React from "react";
import { AbsoluteFill } from "remotion";
import { Pen, rad } from "../persona/toon";
import { drawScientist, ARCH_PRESETS, Pose } from "./scientist";
import { Canvas } from "./Brand";

type G = CanvasRenderingContext2D;
const HC = 367.6, B = 115.2;
type V = { hat: string; pencil?: "ear" | "brim"; tower: boolean; section: boolean; deep?: boolean };
export const AV2: V[] = [
  { hat: "#ffc21a", pencil: "ear", tower: true, section: false },
  { hat: "#f7f6f2", pencil: "ear", tower: true, section: false },
  { hat: "#ffc21a", pencil: "brim", tower: false, section: true },
  { hat: "#f7f6f2", pencil: "brim", tower: true, section: true, deep: true },
  { hat: "white", tower: true, section: false }, // final: variant 2 without the pencil
];
const POSE: Pose = { ...ARCH_PRESETS.neutral, head: { tilt: 3 }, brows: { raise: [0, 5], tilt: [0, -2] }, eyes: { shape: "open", look: [0.1, 0] }, mouth: "smile" };

const backdrop = (g: G, v: V) => {
  const gr = g.createRadialGradient(470, 430, 60, 540, 540, 800);
  gr.addColorStop(0, v.deep ? "#f4ab1c" : "#f9bd3a"); gr.addColorStop(1, v.deep ? "#cf7f00" : "#e39200");
  g.fillStyle = gr; g.fillRect(0, 0, 1080, 1080);
  g.strokeStyle = "rgba(255,255,255,0.12)"; g.lineWidth = 2;
  for (let x = 0; x <= 1080; x += 40) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, 1080); g.stroke(); }
  for (let y = 0; y <= 1080; y += 40) { g.beginPath(); g.moveTo(0, y); g.lineTo(1080, y); g.stroke(); }
  g.strokeStyle = "rgba(255,255,255,0.22)"; g.lineWidth = 3;
  for (let x = 0; x <= 1080; x += 200) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, 1080); g.stroke(); }
  if (v.section) { // a building section drawn in white line, low contrast, upper left
    g.strokeStyle = "rgba(255,255,255,0.28)"; g.lineWidth = 4;
    g.strokeRect(70, 150, 190, 420);
    for (let y = 210; y < 570; y += 60) { g.beginPath(); g.moveTo(70, y); g.lineTo(260, y); g.stroke(); }
    g.beginPath(); g.moveTo(165, 150); g.lineTo(165, 570); g.stroke();
    g.beginPath(); g.moveTo(40, 570); g.lineTo(300, 570); g.stroke();
    g.setLineDash([12, 10]); g.beginPath(); g.moveTo(70, 120); g.lineTo(260, 120); g.stroke(); g.setLineDash([]);
  }
  if (v.tower) { // cracked skyscraper silhouette behind the right shoulder, top section tipping
    g.fillStyle = "rgba(120,60,0,0.22)";
    g.fillRect(800, 470, 170, 610);
    g.save(); g.translate(970, 470); g.rotate(rad(12)); g.fillRect(-170, -300, 170, 292); g.restore();
    g.strokeStyle = "rgba(255,240,210,0.35)"; g.lineWidth = 5; g.lineJoin = "round";
    g.beginPath(); g.moveTo(800, 474); g.lineTo(850, 456); g.lineTo(890, 482); g.lineTo(935, 458); g.lineTo(970, 470); g.stroke();
    g.fillStyle = "rgba(255,240,210,0.16)";
    for (let y = 520; y < 1080; y += 56) for (let x = 820; x < 960; x += 48) g.fillRect(x, y, 28, 30);
  }
};
export const ArchAvatarV2: React.FC<{ i: number }> = ({ i }) => {
  const v = AV2[i];
  const draw = (g: G) => {
    backdrop(g, v);
    const k = 2.45; g.setTransform(k, 0, 0, k, 540 - 300 * k, 515 - (HC - 0.11 * B) * k);
    drawScientist(new Pen(g), POSE, { look: "architect", glasses: true, hat: v.hat, pencil: v.pencil, rim: "rgba(255,236,190,0.45)" });
  };
  return <AbsoluteFill><Canvas w={1080} h={1080} draw={draw} /></AbsoluteFill>;
};
