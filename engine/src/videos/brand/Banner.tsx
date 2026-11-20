// YouTube banner 2560 x 1440 for "Collapse Explained". All key content (name, tagline, Specs) sits in the 1546 x 423
// safe area (x 507..2053, y 508..932); the scene around it is decoration that TV / desktop crops reveal:
// spectators on the left, a megatower snapping on the right, a tipping rocket in the sky, rubble on the ground.
import React from "react";
import { AbsoluteFill } from "remotion";
import { Pen, INK, rad } from "../persona/toon";
import { drawHost, HOSTS, FACES, HostDesign, HostOpts } from "./host";
import { block, crack, tower, dust, CREAM, CREAM_SH, FONT_DISPLAY, FONT_TEXT, Canvas, useFonts } from "./Brand";
import { SPECS } from "./Specs";

type G = CanvasRenderingContext2D;
type Pt = [number, number];
const COBALT = "#2456f5", SKY2 = "#2f60fa", SKY3 = "#3b6bff", GROUND = "#ffc21a", GROUND_DK = "#e8a50a", ORANGE = "#ff5b24";
export const BANNER_TAGLINE = "How giant things fall apart"; // DRAFT: goes through SlopMonster before going public
export const GROUND_Y = 930;

const figure = (g: G, d: HostDesign, x: number, k: number, o: HostOpts) => {
  g.save(); g.setTransform(k, 0, 0, k, x - 300 * k, GROUND_Y + 6 - 975 * k);
  drawHost(new Pen(g), d, o);
  g.restore();
};
const cloud = (p: Pen, x: number, y: number, s: number) => {
  for (const [dx, dy, r] of [[-1.3, 0.2, 0.7], [-0.5, -0.25, 1], [0.45, -0.1, 0.85], [1.25, 0.25, 0.6]] as const) p.ell(x + dx * 80 * s, y + dy * 80 * s, r * 90 * s, r * 70 * s, "#e9f0ff", 9);
  p.ell(x, y + 34 * s, 175 * s, 34 * s, "#e9f0ff", 0);
};
const rocket = (p: Pen, x: number, y: number, ang: number) => {
  const R = (pts: Pt[]) => pts.map(([px, py]) => [x + px * Math.cos(rad(ang)) - py * Math.sin(rad(ang)), y + px * Math.sin(rad(ang)) + py * Math.cos(rad(ang))] as Pt);
  // smoke puffs trailing from the engine, sputtering
  for (const [d, r] of [[150, 34], [205, 44], [270, 30]] as const) { const [sx, sy] = R([[0, d]])[0]; p.ell(sx, sy, r, r * 0.85, CREAM, 8); }
  for (const s of [-1, 1]) p.poly(R([[s * 38, 40], [s * 78, 110], [s * 38, 96]]), ORANGE, 9);
  p.poly(R([[-40, 100], [-40, -40], [-30, -90], [0, -150], [30, -90], [40, -40], [40, 100]]), CREAM, 10);
  p.poly(R([[-30, -90], [0, -150], [30, -90]]), ORANGE, 10);
  const [wx, wy] = R([[0, -20]])[0]; p.ell(wx, wy, 20, 20, "#9fd4ff", 8);
  p.stroke(R([[-40, 40], [-10, 30], [-22, 10], [8, -4]]), 6, INK);
};

/** host: draws the channel host standing on the ground at x (scene coords); defaults to Specs */
export const Banner: React.FC<{ host?: (g: G, x: number) => void; extras?: (g: G) => void }> = ({ host, extras }) => {
  useFonts();
  const draw = (g: G) => {
    const p = new Pen(g);
    // sky: flat cobalt bands brightening toward the horizon, clouds, halftone dots high up
    g.fillStyle = COBALT; g.fillRect(0, 0, 2560, 1440);
    g.fillStyle = SKY2; g.fillRect(0, 520, 2560, 420);
    g.fillStyle = SKY3; g.fillRect(0, 760, 2560, 180);
    g.fillStyle = "rgba(255,255,255,0.07)";
    for (let y = 30; y < 500; y += 34) for (let x = (y / 34) % 2 ? 17 : 0; x < 2560; x += 34) { g.beginPath(); g.arc(x, y, 4 + 3 * (1 - y / 500), 0, Math.PI * 2); g.fill(); }
    cloud(p, 1150, 300, 1.1); cloud(p, 1880, 210, 0.8); cloud(p, 640, 140, 0.7);
    rocket(p, 330, 250, 38);
    // ground: sand band with seams, cracks and rubble
    g.fillStyle = GROUND; g.fillRect(0, GROUND_Y, 2560, 510);
    for (const y of [1010, 1120, 1260]) p.stroke([[0, y], [2560, y + 14]], 5, GROUND_DK);
    p.stroke([[0, GROUND_Y], [2560, GROUND_Y]], 10, INK);
    for (const c of [[[2280, GROUND_Y], [2180, 1040], [2230, 1110], [2060, 1230], [2110, 1300], [1980, 1440]], [[2180, 1040], [2010, 1070], [1900, 1160]],
      [[1320, 1440], [1380, 1330], [1340, 1250], [1460, 1160]], [[420, 1440], [520, 1350], [470, 1280]]] as Pt[][]) crack(p, c, 12, "#a86f00");
    for (let i = 0; i < 90; i++) { const x = (i * 977) % 2560, y = GROUND_Y + 40 + ((i * 613) % 480); g.beginPath(); g.ellipse(x, y, 9 + (i % 4) * 4, 6 + (i % 3) * 3, 0, 0, Math.PI * 2); g.fillStyle = i % 3 ? GROUND_DK : "#fff0c2"; g.fill(); }
    for (const [x, y] of [[760, 1330], [1150, 1200], [1620, 1390]] as const) for (const [dx, row, ang] of [[-1, 0, -6], [0, 0, 4], [1, 0, -3], [-0.5, 1, 8], [0.5, 1, -10], [0, 2, 3]] as const) block(p, x + dx * 58, y - row * 34, 60, 38, ang, 8);
    // megatower on the right, top half snapping off to the right
    tower(p, 2140, GROUND_Y + 8, 300, 1000, 0.55, 15, "#1c44c9", 12);
    for (const [x, y, w, h, a] of [[2050, 140, 80, 60, 22], [2300, 60, 60, 48, -18], [1990, 360, 54, 44, 35], [2500, 420, 70, 50, 10], [2440, 820, 64, 46, -25], [1960, 1080, 120, 70, -8], [2350, 1200, 150, 90, 12], [1700, 1330, 90, 60, 30]] as const) block(p, x, y, w, h, a, 9);
    dust(p, 2150, GROUND_Y + 10, 1.5); dust(p, 2480, GROUND_Y + 30, 1.2);
    // spectators on the left (three of the other cast designs as extras), turned toward the tower
    if (extras) extras(g); else {
    figure(g, HOSTS.beanie, 120, 0.54, { seed: 2, face: FACES.yikes, facing: 1 });
    figure(g, HOSTS.pony, 300, 0.52, { seed: 4, face: FACES.shock, facing: 1, arms: "cheeks" });
    figure(g, HOSTS.puff, 455, 0.55, { seed: 3, face: FACES.shock, facing: 1, arms: "up" });
    }
    for (const [x, y, w, h, a] of [[160, 1180, 110, 70, -12], [620, 1260, 80, 56, 20], [900, 1100, 60, 44, -30]] as const) block(p, x, y, w, h, a, 9);
    // title slab: a cracked concrete block, the corner chipping off
    g.save(); g.translate(1080, 692); g.rotate(rad(-2));
    const slab: Pt[] = [[-400, -160], [395, -160], [400, 90], [340, 122], [360, 160], [-395, 160]];
    p.poly(slab.map(([x, y]) => [x + 14, y + 16] as Pt), "rgba(20,30,90,0.35)", 0);
    p.poly(slab, CREAM, 12);
    p.clip(slab, () => { p.poly([[290, -160], [400, -160], [400, 160], [340, 160]], CREAM_SH, 0); });
    p.poly(slab, null, 12);
    p.stroke([[250, -160], [272, -120], [242, -80], [274, -30], [250, 20]], 6, INK);
    g.restore();
    block(p, 1515, 880, 52, 40, 28, 9); block(p, 1480, 922, 30, 24, -10, 7);
    // the host, right of the slab, pointing at the tower
    if (host) host(g, 1790); else figure(g, SPECS, 1790, 0.55, { seed: 6, face: FACES.shock, arms: "point" });
  };
  return (
    <AbsoluteFill style={{ background: COBALT }}>
      <Canvas w={2560} h={1440} draw={draw} />
      <div style={{ position: "absolute", left: 750, top: 556, width: 700, transform: "rotate(-2deg)", transformOrigin: "394px 142px", fontFamily: FONT_DISPLAY, color: INK, fontSize: 94, lineHeight: 1.42 }}>
        <div>Collapse</div>
        <div>Explained</div>
      </div>
      <div style={{ position: "absolute", left: 720, top: 866, fontFamily: FONT_TEXT, color: "#fffaf0", fontSize: 50, lineHeight: 1.1 }}>{BANNER_TAGLINE}</div>
    </AbsoluteFill>
  );
};
