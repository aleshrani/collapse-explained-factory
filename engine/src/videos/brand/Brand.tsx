// "Collapse Explained" brand stills: the five host candidates sheet, avatars, the chosen host's character sheet and the
// YouTube banner. Everything is drawn straight to a 2D canvas with the Pen engine (no 3D world); type is live DOM text
// in the brand fonts (OFL, copied into ./public).
import React, { useLayoutEffect, useRef, useState } from "react";
import { AbsoluteFill, continueRender, delayRender, staticFile } from "remotion";
import { Pen, INK, rad } from "../persona/toon";
import { drawHost, HOSTS, FACES, HostDesign } from "./host";

export const FONT_DISPLAY = "Boldonse";
export const FONT_TEXT = "BeVietnamPro";
export const useFonts = () => {
  const [h] = useState(() => delayRender("brand fonts"));
  useLayoutEffect(() => {
    Promise.all([
      new FontFace(FONT_DISPLAY, `url(${staticFile("Boldonse-Regular.ttf")})`).load(),
      new FontFace(FONT_TEXT, `url(${staticFile("BeVietnamPro-Bold.ttf")})`, { weight: "700" }).load(),
    ]).then((fs) => { fs.forEach((f) => document.fonts.add(f)); continueRender(h); });
  }, [h]);
};

/** head centre of a design in its 600 x 1000 space (mirrors drawHost's frame maths) */
export const headCentre = (d: HostDesign) => { const R = 2 * 116 * 0.95, chin = 975 - 2.3 * R; return chin - 0.88 * d.headA * d.aspect; };

export const Canvas: React.FC<{ w: number; h: number; draw: (g: CanvasRenderingContext2D) => void }> = ({ w, h, draw }) => {
  const ref = useRef<HTMLCanvasElement>(null);
  useLayoutEffect(() => { const g = ref.current!.getContext("2d")!; g.setTransform(1, 0, 0, 1, 0, 0); draw(g); }, [draw]);
  return <canvas ref={ref} width={w} height={h} style={{ position: "absolute", left: 0, top: 0 }} />;
};

// ---------------- 1. five candidates, side by side ----------------
const KEYS = ["crack", "specs", "beanie", "puff", "pony"] as const;
const BLURB: Record<(typeof KEYS)[number], string> = {
  crack: "lightning-crack tuft, teal turtleneck",
  specs: "tall egg head, round glasses, bow tie",
  beanie: "wide head, red beanie, cobalt hoodie",
  puff: "cloud of hair, coral blazer",
  pony: "high ponytail, yellow raincoat",
};
const TINT: Record<(typeof KEYS)[number], string> = { crack: "#cfeee8", specs: "#f7e3b4", beanie: "#d3ddff", puff: "#ffd3db", pony: "#fff0b8" };
export const FiveHosts: React.FC = () => {
  useFonts();
  const draw = (g: CanvasRenderingContext2D) => {
    g.fillStyle = "#f4efe6"; g.fillRect(0, 0, 3000, 1900);
    KEYS.forEach((key, i) => {
      const d = HOSTS[key], cx = 300 + i * 600;
      // full body, own mood
      g.setTransform(0.92, 0, 0, 0.92, cx - 300 * 0.92, 40);
      drawHost(new Pen(g), d, { seed: 5 + i });
      // shocked close-up card
      g.setTransform(1, 0, 0, 1, 0, 0);
      g.save(); g.beginPath(); g.roundRect(cx - 270, 1010, 540, 640, 36); g.fillStyle = TINT[key]; g.fill(); g.clip();
      const k = 1.55, hc = headCentre(d);
      g.setTransform(k, 0, 0, k, cx - 300 * k, 1350 - hc * k);
      drawHost(new Pen(g), d, { seed: 5 + i, face: FACES.shock, arms: "cheeks" });
      g.restore();
      g.setTransform(1, 0, 0, 1, 0, 0);
      g.lineWidth = 8; g.strokeStyle = INK; g.beginPath(); g.roundRect(cx - 270, 1010, 540, 640, 36); g.stroke();
    });
  };
  return (
    <AbsoluteFill style={{ background: "#f4efe6" }}>
      <Canvas w={3000} h={1900} draw={draw} />
      {KEYS.map((key, i) => (
        <div key={key} style={{ position: "absolute", left: 30 + i * 600, width: 540, top: 1680, fontFamily: FONT_TEXT, color: INK, textAlign: "center" }}>
          <div style={{ fontSize: 56, lineHeight: 1.1 }}>{i + 1} {HOSTS[key].name}</div>
          <div style={{ fontSize: 30, lineHeight: 1.3, marginTop: 8, opacity: 0.8 }}>{BLURB[key]}</div>
        </div>
      ))}
    </AbsoluteFill>
  );
};

// ---------------- 2. avatars: host in shock, a structure failing behind, saturated ground ----------------
export const CREAM = "#f6ecdc", CREAM_SH = "#d9c8b0";
type G = CanvasRenderingContext2D;
type Pt = [number, number];
/** radial burst of alternating wedges (texture so the background is never one flat colour) */
export const rays = (g: G, cx: number, cy: number, a: string, b: string, n = 18, R = 4000) => {
  g.fillStyle = a; g.fillRect(0, 0, 6000, 6000);
  for (let i = 0; i < n; i++) {
    const t0 = (i / n) * Math.PI * 2, t1 = t0 + Math.PI / n;
    g.beginPath(); g.moveTo(cx, cy); g.lineTo(cx + R * Math.cos(t0), cy + R * Math.sin(t0)); g.lineTo(cx + R * Math.cos(t1), cy + R * Math.sin(t1)); g.closePath();
    g.fillStyle = b; g.fill();
  }
};
const rotP = (pts: Pt[], a: number, cx: number, cy: number) => pts.map(([x, y]) => [cx + (x - cx) * Math.cos(a) - (y - cy) * Math.sin(a), cy + (x - cx) * Math.sin(a) + (y - cy) * Math.cos(a)] as Pt);
/** concrete block (falling debris), w x h, rotated, shaded right face */
export const block = (p: Pen, x: number, y: number, w: number, h: number, ang: number, ol = 9) => {
  const pts = rotP([[x - w / 2, y - h / 2], [x + w / 2, y - h / 2], [x + w / 2, y + h / 2], [x - w / 2, y + h / 2]], rad(ang), x, y);
  p.poly(pts, CREAM, 0);
  p.poly(rotP([[x + w / 2 - 0.28 * w, y - h / 2], [x + w / 2, y - h / 2], [x + w / 2, y + h / 2], [x + w / 2 - 0.28 * w, y + h / 2]], rad(ang), x, y), CREAM_SH, 0);
  p.poly(pts, null, ol);
};
export const crack = (p: Pen, pts: Pt[], w: number, col: string) => p.stroke(pts, w, col);
/** a tower split in two: the lower part stands, the top part tips away around the break (tilt > 0 = to the right) */
export const tower = (p: Pen, x: number, base: number, w: number, h: number, brk: number, tilt: number, win: string, ol = 11) => {
  const yb = base - h * brk, cw = (w - 20) / 3;
  const jag = (y: number, s: number): Pt[] => [[x + w, y], [x + 0.75 * w, y - 14 * s], [x + 0.5 * w, y + 10 * s], [x + 0.25 * w, y - 18 * s], [x, y]];
  const windows = (y0: number, y1: number): Pt[][] => {
    const out: Pt[][] = [];
    for (let r = y0; r > y1; r -= 58) for (let c = 0; c < 3; c++) out.push([[x + 14 + c * cw, r - 30], [x + (c + 1) * cw, r - 30], [x + (c + 1) * cw, r], [x + 14 + c * cw, r]]);
    return out;
  };
  const low: Pt[] = [[x, base], [x + w, base], ...jag(yb, 1)];
  p.poly(low, CREAM, 0);
  p.clip(low, () => { windows(base - 50, yb + 10).forEach((q) => p.poly(q, win, 0)); p.poly([[x + 0.78 * w, base], [x + w, base], [x + w, yb - 40], [x + 0.78 * w, yb - 40]], "rgba(36,23,38,0.14)", 0); });
  p.poly(low, null, ol);
  const yt = yb - 26, top: Pt[] = [...jag(yt, -1).reverse(), [x + w, yt - h * (1 - brk)], [x, yt - h * (1 - brk)]];
  const pv: Pt = tilt > 0 ? [x + w, yt] : [x, yt], a = rad(tilt);
  const tp = rotP(top, a, pv[0], pv[1]);
  p.poly(tp, CREAM, 0);
  p.clip(tp, () => { windows(yt - 40, yt - h * (1 - brk) + 20).forEach((q) => p.poly(rotP(q, a, pv[0], pv[1]), win, 0));
    p.poly(rotP([[x + 0.78 * w, yt + 40], [x + w, yt + 40], [x + w, yt - h], [x + 0.78 * w, yt - h]], a, pv[0], pv[1]), "rgba(36,23,38,0.14)", 0); });
  p.poly(tp, null, ol);
};
export const dust = (p: Pen, x: number, y: number, s: number, col = CREAM) => {
  for (const [dx, dy, r] of [[-1, 0.1, 0.8], [-0.35, -0.35, 1], [0.4, -0.2, 0.9], [1, 0.15, 0.7], [0, 0.25, 1.05]] as const) p.ell(x + dx * 70 * s, y + dy * 70 * s, r * 62 * s, r * 50 * s, col, 9);
};
/** an arch-less beam bridge on piers, deck snapped, the right half dropping */
const bridge = (p: Pen, y: number, ol = 11) => {
  for (const x of [150, 330]) p.poly([[x - 26, y + 44], [x + 26, y + 44], [x + 34, 1100], [x - 34, 1100]], CREAM_SH, ol);
  p.poly([[860, y + 150], [920, y + 150], [930, 1100], [850, 1100]], CREAM_SH, ol);
  p.poly([[-20, y], [470, y], [492, y + 22], [450, y + 44], [-20, y + 44]], CREAM, ol);
  p.poly(rotP([[600, y], [1100, y], [1100, y + 44], [620, y + 44], [580, y + 20]], rad(16), 1100, y), CREAM, ol);
};
/** classical columns, one snapped with its top toppling */
const columns = (p: Pen, x: number, base: number, ol = 11) => {
  p.poly([[x - 40, base], [x + 40, base], [x + 34, base - 520], [x - 34, base - 520]], CREAM, ol);
  for (const k of [-16, 0, 16]) p.stroke([[x + k, base - 8], [x + k * 0.9, base - 512]], 4, CREAM_SH);
  p.poly([[x - 52, base - 546], [x + 52, base - 546], [x + 52, base - 520], [x - 52, base - 520]], CREAM, ol);
  const c2 = x + 230;
  p.poly([[c2 - 40, base], [c2 + 40, base], [c2 + 36, base - 280], [c2 + 16, base - 300], [c2, base - 282], [c2 - 18, base - 304], [c2 - 36, base - 280]], CREAM, ol);
  p.poly(rotP([[c2 - 34, base - 330], [c2 + 34, base - 330], [c2 + 30, base - 600], [c2 - 30, base - 600]], rad(-30), c2 - 34, base - 330), CREAM, ol);
};

type AvatarSpec = { key: (typeof KEYS)[number]; bg: [string, string]; motif: (p: Pen) => void; k: number; y: number };
const SPECS: AvatarSpec[] = [
  { key: "crack", bg: ["#2456f5", "#2d5ffb"], k: 2.05, y: 600, motif: (p) => {
    tower(p, 812, 1100, 190, 860, 0.5, 17, "#1c44c9"); crack(p, [[60, 700], [130, 660], [110, 600], [190, 540]], 10, "#183fb8");
    block(p, 930, 160, 70, 56, 20); block(p, 1010, 300, 46, 40, -15); block(p, 150, 300, 54, 44, 30); dust(p, 960, 1040, 1.1); } },
  { key: "specs", bg: ["#ff5b24", "#ff6a35"], k: 2.3, y: 610, motif: (p) => {
    for (const c of [[[1080, 140], [900, 250], [930, 330], [800, 420]], [[0, 820], [140, 760], [120, 690], [250, 640]], [[900, 250], [1000, 380], [1080, 400]]] as Pt[][]) crack(p, c, 16, "#b93a10");
    block(p, 180, 210, 120, 70, -22); block(p, 900, 120, 90, 60, 14); block(p, 960, 470, 60, 46, 35); block(p, 110, 470, 50, 40, 10); } },
  { key: "beanie", bg: ["#ffc21a", "#ffcb36"], k: 1.95, y: 620, motif: (p) => { bridge(p, 610); block(p, 640, 780, 70, 40, 38); block(p, 720, 900, 50, 34, -20); dust(p, 140, 1040, 1); } },
  { key: "puff", bg: ["#13b5a0", "#1cbfa9"], k: 1.7, y: 640, motif: (p) => { columns(p, 120, 1100); block(p, 940, 200, 64, 50, -25); block(p, 1000, 360, 44, 36, 12); dust(p, 860, 1060, 1); } },
  { key: "pony", bg: ["#e8336b", "#ee4277"], k: 2.0, y: 610, motif: (p) => {
    tower(p, 70, 1100, 180, 820, 0.55, -18, "#b01f4f"); crack(p, [[1080, 620], [960, 680], [990, 760], [880, 820]], 12, "#b01f4f");
    block(p, 140, 160, 64, 52, -18); block(p, 60, 330, 44, 38, 24); block(p, 960, 220, 58, 46, 30); dust(p, 120, 1050, 1.1); } },
];
export const HostAvatar: React.FC<{ i: number }> = ({ i }) => {
  const s = SPECS[i], d = HOSTS[s.key];
  const draw = (g: G) => {
    rays(g, 540, s.y, s.bg[0], s.bg[1]);
    s.motif(new Pen(g));
    const hc = headCentre(d);
    g.setTransform(s.k, 0, 0, s.k, 540 - 300 * s.k, s.y - hc * s.k);
    drawHost(new Pen(g), d, { seed: 5 + KEYS.indexOf(s.key), face: FACES.shock, arms: "cheeks", fs: 1.12 });
  };
  return <AbsoluteFill><Canvas w={1080} h={1080} draw={draw} /></AbsoluteFill>;
};
