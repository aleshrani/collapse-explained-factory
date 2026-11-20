// Square profile picture of a persona: the card drawing (same Pen engine, painted crescents, plum ink) cropped to head
// and shoulders on a plain saturated background. 1080 x 1080, drawn straight to a canvas (no 3D world).
import React, { useLayoutEffect, useRef } from "react";
import { AbsoluteFill } from "remotion";
import { Pen, rad } from "./toon";
import { drawPersona, PersonaKind } from "./persona";
import { drawCeleb } from "./celeb";
import { strikerProfile, fighterProfile } from "./profiles";

export const PersonaAvatar: React.FC<{ kind?: PersonaKind; panic?: boolean; bg?: string; k?: number; top?: number; cx?: number }> = ({
  kind = "dummy", panic = false, bg = "#2b6fd8", k = 2.6, top = 227, cx = 300 }) => {
  const ref = useRef<HTMLCanvasElement>(null);
  useLayoutEffect(() => {
    const g = ref.current!.getContext("2d")!;
    g.setTransform(1, 0, 0, 1, 0, 0);
    const gr = g.createRadialGradient(540, 470, 60, 540, 540, 820);
    gr.addColorStop(0, "#3d85ea"); gr.addColorStop(1, bg);
    g.fillStyle = gr; g.fillRect(0, 0, 1080, 1080);
    g.setTransform(k, 0, 0, k, 540 - cx * k, 75 - top * k);
    drawPersona(new Pen(g), kind, { panic, light: rad(-120), seed: 3 });
  }, [kind, panic, bg, k, top, cx]);
  return <AbsoluteFill><canvas ref={ref} width={1080} height={1080} /></AbsoluteFill>;
};

// ---------------- caricature channel avatars ----------------
/** stamp a drawing's silhouette, dilated by r px, in plum ink (the thick outer outline of the avatar silhouettes) */
const inked = (g: CanvasRenderingContext2D, draw: (p: Pen) => void, r: number) => {
  const mk = () => { const c = document.createElement("canvas"); c.width = c.height = 1080; return c; };
  const art = mk(), ag = art.getContext("2d")!;
  draw(new Pen(ag));
  const sil = mk(), sg = sil.getContext("2d")!;
  sg.drawImage(art, 0, 0); sg.globalCompositeOperation = "source-in"; sg.fillStyle = "#241726"; sg.fillRect(0, 0, 1080, 1080);
  for (let i = 0; i < 48; i++) { const a = (i / 48) * Math.PI * 2; g.drawImage(sil, r * Math.cos(a), r * Math.sin(a)); }
  for (let i = 0; i < 24; i++) { const a = (i / 24) * Math.PI * 2; g.drawImage(sil, 0.5 * r * Math.cos(a), 0.5 * r * Math.sin(a)); }
  g.drawImage(art, 0, 0);
};
export const CelebAvatar: React.FC<{ v: 1 | 2 }> = ({ v }) => {
  const ref = useRef<HTMLCanvasElement>(null);
  useLayoutEffect(() => {
    const g = ref.current!.getContext("2d")!, L = rad(-120);
    g.setTransform(1, 0, 0, 1, 0, 0);
    if (v === 1) {
      g.fillStyle = "#d3eaff"; g.fillRect(0, 0, 1080, 1080);
      g.fillStyle = "#1fa456"; g.beginPath(); g.moveTo(640, 0); g.lineTo(1080, 0); g.lineTo(1080, 1080); g.lineTo(440, 1080); g.closePath(); g.fill();
      const a = 232;
      inked(g, (p) => strikerProfile(p, 262, 430, a, L), 46);
      inked(g, (p) => { p.g.translate(1080, 0); p.g.scale(-1, 1); fighterProfile(p, 1080 - 812, 420, a, rad(-60)); }, 46);
    } else {
      g.fillStyle = "#ffd21f"; g.fillRect(0, 0, 1080, 1080);
      // the striker peeking over the fighter's shoulder (viewer's right), clipped above the shoulder line
      inked(g, (p) => { p.g.beginPath(); p.g.rect(0, 0, 1080, 760); p.g.clip(); p.g.setTransform(1.5, 0, 0, 1.5, 395, 45); drawCeleb(p, "striker", { pose: "a", light: L, shock: true }); }, 22);
      inked(g, (p) => { p.g.setTransform(2.55, 0, 0, 2.55, 540 - 300 * 2.55, 40 - 200 * 2.55); drawCeleb(p, "fighter", { pose: "a", light: L }); }, 30);
      // the striker's fingers gripping the shoulder
      g.setTransform(1, 0, 0, 1, 0, 0);
      for (const [x, y] of [[808, 742], [846, 736], [884, 740]]) { g.beginPath(); g.ellipse(x, y, 17, 23, 0, 0, Math.PI * 2); g.fillStyle = "#d79d6c"; g.fill(); g.lineWidth = 9; g.strokeStyle = "#241726"; g.stroke(); }
    }
  }, [v]);
  return <AbsoluteFill><canvas ref={ref} width={1080} height={1080} /></AbsoluteFill>;
};
