// "Your car just went off a bridge": the car. Its whole trajectory is precomputed once (pure function of the frame):
// drive along the deck toward -z, swerve right (+x), break through the right railing, tip off the deck edge, fall
// nose-down into the river, bob, settle and sink slowly. Geometry is built in code: low-poly boxes + wheels (so the
// world ink pass outlines it), painted canvas details (panel seams, trim, handles, lights, plate), a real see-through
// cabin (glass panes, pillars, seats) so the close-up can look in through the driver's window.
// Car local frame: x = right (passenger side), y = up (0 = tyre bottom), z = forward.
// No imports from story.ts (story.ts imports this file: keep the module graph acyclic).
import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";

import { DECK, DECK_HALF, RAIL_X, GAP, carSamples } from "./collide";
const G = 9.8 / 900; // m per frame^2 at 30 fps
const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
const smooth = (x: number) => { const u = clamp01(x); return u * u * (3 - 2 * u); };

export type CarPose = { x: number; y: number; z: number; yaw: number; pitch: number; roll: number };
export const CAR_FRAMES = 450;

/** frames of the story events, filled in by the simulation below (WATER = first contact with the river = splash) */
export const EV = { HIT: 0, TIP: 0, LAND: 0, WATER: 0, ZHIT: 0, XHIT: 0 };

/** how far the car must rise so no point of it is below the deck top while over the deck (contact, no sinking in) */
const deckLift = (p: CarPose) => {
  let lift = 0;
  for (const [x, y, z] of carSamples(p, 7)) if (Math.abs(x) <= DECK_HALF && Math.abs(z) < 30 && y > DECK - 0.8) lift = Math.max(lift, DECK - y);
  return lift;
};
const minY = (p: CarPose) => carSamples(p, 3).reduce((m, q) => Math.min(m, q[1]), Infinity);
/** first sample on the rail line (inner face of the right rail, rail height) */
const railContact = (p: CarPose) => carSamples(p, 5).find(([x, y]) => x >= RAIL_X - 0.05 && y > DECK + 0.5 && y < DECK + 1.15);

const sim = (): CarPose[] => {
  const out: CarPose[] = [];
  let x = -0.9, z = 16.5, y = DECK, yaw = Math.PI, pitch = 0, roll = 0;
  let vx = 0, vz = 0, vy = 0, falling = false, landed = false, hit = false;
  let landX = 0, landZ = 0, landY = 0, landPitch = 0, landYaw = 0;
  for (let f = 0; f < CAR_FRAMES; f++) {
    if (!falling) {
      yaw = Math.PI - (Math.PI / 2 - 0.32) * smooth((f - 20) / 20); // swerve right: heading -z -> mostly +x
      const v = hit ? 0.24 : 0.38;
      const fx = Math.sin(yaw), fz = Math.cos(yaw);
      x += fx * v; z += fz * v;
      roll = -0.06 * Math.sin(Math.PI * clamp01((f - 20) / 22)); // leans out of the swerve
      y = DECK; pitch = 0;
      y += deckLift({ x, y, z, yaw, pitch, roll }); // the lean lifts one side's wheels instead of sinking the other
      const c = railContact({ x, y, z, yaw, pitch, roll });
      if (!hit && c) { hit = true; EV.HIT = f; EV.XHIT = RAIL_X; EV.ZHIT = c[2]; }
      if (x >= 1.9) { falling = true; EV.TIP = f; vx = fx * v; vz = fz * v; vy = 0.02; }
    } else if (!landed) {
      const k = f - EV.TIP;
      vy -= G; y += vy; x += vx; z += vz;
      pitch = Math.min(0.95, 0.012 * k * k + 0.02 * k); // nose drops over the edge
      roll = -0.06 + 0.004 * k;
      const l = deckLift({ x, y, z, yaw, pitch, roll }); // pivot on the deck edge while the tail is still over it
      if (l > 0) { y += l; vy = Math.max(vy, 0); }
      if (minY({ x, y, z, yaw, pitch, roll }) <= 0) { landed = true; EV.LAND = EV.WATER = f; landX = x; landZ = z; landY = y; landPitch = pitch; landYaw = yaw; }
    } else {
      const k = f - EV.LAND;
      // after the slam (continuous from the contact pose): plunges, bobs back up, nose swings level, drifts, turns broadside
      const sink = -0.35 - 0.22 * smooth((f - 110) / 235) - 0.05 * smooth((f - 345) / 60);
      y = sink + (landY - sink) * Math.exp(-k / 6) * Math.cos(k * 0.3);
      // once the driver is out the car goes nose-down: the trunk tips up out of the water (reads as a car in the wide)
      pitch = landPitch * Math.exp(-k / 5) * Math.cos(k * 0.38) + 0.025 * Math.sin(f * 0.11) + 0.3 * smooth((f - 396) / 30);
      roll = (-0.06 + 0.004 * (EV.LAND - EV.TIP)) * Math.exp(-k / 6) + 0.02 * Math.sin(f * 0.09 + 1) * smooth(k / 10);
      const drift = 1 - Math.exp(-k / 9);
      x = landX + 1.4 * drift; z = landZ + 0.35 * drift;
      yaw = landYaw + (Math.PI / 2 - landYaw) * smooth(k / 18);
    }
    out.push({ x, y, z, yaw, pitch, roll });
  }
  // railing gap = the z range the car sweeps through the right-hand rail / post / hanger line from the hit to the splash
  let z0 = Infinity, z1 = -Infinity;
  for (let f = EV.HIT; f <= EV.LAND; f++) for (const [px, py, pz] of carSamples(out[f], 7))
    if (px > RAIL_X - 0.2 && px < 3.5 && py > DECK - 0.4 && py < DECK + 3) { z0 = Math.min(z0, pz); z1 = Math.max(z1, pz); }
  GAP.z0 = z0; GAP.z1 = z1; GAP.hit = EV.HIT;
  return out;
};
const TRACK = sim();
export const carAt = (f: number): CarPose => {
  const i = Math.max(0, Math.min(CAR_FRAMES - 1, Math.floor(f))), a = TRACK[i], b = TRACK[Math.min(CAR_FRAMES - 1, i + 1)], u = f - Math.floor(f);
  if (!u) return a;
  return { x: a.x + (b.x - a.x) * u, y: a.y + (b.y - a.y) * u, z: a.z + (b.z - a.z) * u, yaw: a.yaw + (b.yaw - a.yaw) * u, pitch: a.pitch + (b.pitch - a.pitch) * u, roll: a.roll + (b.roll - a.roll) * u };
};
/** a car-local point in world space, yaw only (cameras ride with the car but never pitch / roll with it) */
export const carYawPoint = (f: number, p: [number, number, number]): [number, number, number] => {
  const c = carAt(f), cy = Math.cos(c.yaw), sy = Math.sin(c.yaw);
  return [c.x + p[0] * cy + p[2] * sy, c.y + p[1], c.z - p[0] * sy + p[2] * cy];
};
/** water level inside the cabin (car-local y) */
export const cabinWater = (f: number) => 0.8 + 0.12 * smooth((f - 105) / 60) + 0.2 * smooth((f - 165) / 70) + 0.04 * smooth((f - 255) / 90);
/** driver window glass drop (m) */
export const windowDrop = (f: number) => 0.62 * smooth((f - 352) / 20);

// ---------------- painted textures ----------------
const PAINT = "#e8452c", PAINT_LT = "#ff6a46", PAINT_DK = "#b52f1f", TRIM = "#f3efe4", RUBBER = "#2a2530", INTERIOR = "#b9a58f", SEAT = "#c48a5a";
const tex = (w: number, h: number, draw: (g: CanvasRenderingContext2D) => void) => {
  const cv = document.createElement("canvas"); cv.width = w; cv.height = h;
  draw(cv.getContext("2d")!);
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t;
};
const rr = (g: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) => {
  g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath();
};
const INKC = "#2a1a26";
/** body side, u = z from -2 (rear, u 0) to +2 (front, u 1), v = y from 0.3 (bottom) to 0.85 (top): 1024 x 160 */
const sideTex = () => tex(1024, 160, (g) => {
  const Z = (z: number) => ((z + 2) / 4) * 1024, Y = (y: number) => 160 - ((y - 0.3) / 0.55) * 160;
  const gr = g.createLinearGradient(0, 0, 0, 160); gr.addColorStop(0, PAINT_LT); gr.addColorStop(0.45, PAINT); gr.addColorStop(1, PAINT_DK);
  g.fillStyle = gr; g.fillRect(0, 0, 1024, 160);
  // shoulder highlight + body crease
  g.fillStyle = "rgba(255,230,210,0.45)"; g.fillRect(0, Y(0.83), 1024, 5);
  g.fillStyle = "rgba(90,20,15,0.35)"; g.fillRect(0, Y(0.62), 1024, 3);
  // cream trim stripe + dark sill
  g.fillStyle = TRIM; g.fillRect(0, Y(0.56), 1024, 12);
  g.fillStyle = INKC; g.fillRect(0, Y(0.56) - 2, 1024, 2); g.fillRect(0, Y(0.56) + 12, 1024, 2);
  g.fillStyle = "#3a2a33"; g.fillRect(0, Y(0.36), 1024, 160 - Y(0.36));
  // wheel arches
  for (const zc of [-1.35, 1.35]) { g.fillStyle = "#1c1620"; g.beginPath(); g.arc(Z(zc), Y(0.33), 0.42 / 4 * 1024, Math.PI, 2 * Math.PI); g.fill(); g.strokeStyle = INKC; g.lineWidth = 5; g.stroke(); }
  // door seams, handles, mirror base, fuel cap
  g.strokeStyle = INKC; g.lineWidth = 4;
  for (const z of [0.78, -0.45, -1.18]) { g.beginPath(); g.moveTo(Z(z), Y(0.85)); g.lineTo(Z(z) + (z > 0 ? 8 : -6), Y(0.4)); g.stroke(); }
  for (const z of [0.42, -0.85]) { rr(g, Z(z) - 30, Y(0.78), 60, 12, 6); g.fillStyle = TRIM; g.fill(); g.lineWidth = 3; g.stroke(); }
  g.beginPath(); g.arc(Z(-1.6), Y(0.7), 12, 0, 2 * Math.PI); g.fillStyle = PAINT_DK; g.fill(); g.lineWidth = 3; g.stroke();
  // side marker light
  rr(g, Z(1.75), Y(0.72), 28, 12, 5); g.fillStyle = "#ffb43a"; g.fill(); g.stroke();
});
/** front face x -0.9..0.9 (u), y 0.3..0.85 (v): 512 x 160 */
const frontTex = () => tex(512, 160, (g) => {
  const gr = g.createLinearGradient(0, 0, 0, 160); gr.addColorStop(0, PAINT_LT); gr.addColorStop(1, PAINT_DK);
  g.fillStyle = gr; g.fillRect(0, 0, 512, 160);
  g.fillStyle = "#3a2a33"; g.fillRect(0, 118, 512, 42); // bumper
  g.fillStyle = TRIM; g.fillRect(0, 112, 512, 8);
  rr(g, 160, 50, 192, 50, 14); g.fillStyle = "#1e1a26"; g.fill(); g.strokeStyle = INKC; g.lineWidth = 5; g.stroke(); // grille
  g.strokeStyle = "#5b5566"; g.lineWidth = 4; for (let i = 0; i < 4; i++) { g.beginPath(); g.moveTo(170, 62 + i * 11); g.lineTo(342, 62 + i * 11); g.stroke(); }
  for (const x of [80, 432]) { g.beginPath(); g.arc(x, 72, 34, 0, 2 * Math.PI); g.fillStyle = "#fff6c8"; g.fill(); g.strokeStyle = INKC; g.lineWidth = 6; g.stroke(); g.beginPath(); g.arc(x - 8, 64, 12, 0, 2 * Math.PI); g.fillStyle = "#ffffff"; g.fill(); }
  rr(g, 196, 122, 120, 32, 5); g.fillStyle = "#f7f3e6"; g.fill(); g.strokeStyle = INKC; g.lineWidth = 4; g.stroke(); // plate
  g.fillStyle = "#1f2a44"; g.font = "900 22px Arial Black, Arial, sans-serif"; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText("OOPS 1", 256, 139);
});
const rearTex = () => tex(512, 160, (g) => {
  const gr = g.createLinearGradient(0, 0, 0, 160); gr.addColorStop(0, PAINT_LT); gr.addColorStop(1, PAINT_DK);
  g.fillStyle = gr; g.fillRect(0, 0, 512, 160);
  g.fillStyle = "#3a2a33"; g.fillRect(0, 118, 512, 42);
  g.fillStyle = TRIM; g.fillRect(0, 112, 512, 8);
  for (const x of [30, 392]) { rr(g, x, 40, 90, 44, 10); g.fillStyle = "#d42a2a"; g.fill(); g.strokeStyle = INKC; g.lineWidth = 5; g.stroke(); g.fillStyle = "#ffb43a"; g.fillRect(x + 8, 70, 74, 8); }
  rr(g, 196, 122, 120, 32, 5); g.fillStyle = "#f7f3e6"; g.fill(); g.strokeStyle = INKC; g.lineWidth = 4; g.stroke();
  g.fillStyle = "#1f2a44"; g.font = "900 22px Arial Black, Arial, sans-serif"; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText("OOPS 1", 256, 139);
});
/** hood / trunk / roof top: paint with two soft crease lines and a sheen band */
const topTex = () => tex(256, 256, (g) => {
  g.fillStyle = PAINT; g.fillRect(0, 0, 256, 256);
  const gr = g.createLinearGradient(0, 0, 256, 0); gr.addColorStop(0, "rgba(255,255,255,0)"); gr.addColorStop(0.5, "rgba(255,225,205,0.35)"); gr.addColorStop(1, "rgba(255,255,255,0)");
  g.fillStyle = gr; g.fillRect(0, 0, 256, 256);
  g.fillStyle = "rgba(120,25,15,0.45)"; g.fillRect(70, 0, 3, 256); g.fillRect(183, 0, 3, 256);
});
const seatTex = () => tex(128, 128, (g) => {
  g.fillStyle = SEAT; g.fillRect(0, 0, 128, 128);
  g.strokeStyle = "rgba(90,50,30,0.55)"; g.lineWidth = 3; for (let i = 1; i < 4; i++) { g.beginPath(); g.moveTo(i * 32, 0); g.lineTo(i * 32, 128); g.stroke(); }
});
const glassTex = () => tex(256, 256, (g) => {
  g.fillStyle = "rgba(190,225,255,1)"; g.fillRect(0, 0, 256, 256);
  g.fillStyle = "rgba(255,255,255,1)";
  for (const [x, w] of [[40, 34], [96, 12], [170, 22]]) { g.beginPath(); g.moveTo(x, 256); g.lineTo(x + w, 256); g.lineTo(x + w + 90, 0); g.lineTo(x + 90, 0); g.closePath(); g.fill(); }
});
/** alpha map for the glass: mostly clear, opaque streaks */
const glassAlpha = () => tex(256, 256, (g) => {
  g.fillStyle = "#1e1e1e"; g.fillRect(0, 0, 256, 256);
  g.fillStyle = "#6a6a6a";
  for (const [x, w] of [[40, 22], [170, 10]]) { g.beginPath(); g.moveTo(x, 256); g.lineTo(x + w, 256); g.lineTo(x + w + 90, 0); g.lineTo(x + 90, 0); g.closePath(); g.fill(); }
});
/** water inside the cabin seen through the window: tinted body + a bright wavy surface line at the top */
export const cabinWaterTex = () => {
  const t = tex(512, 256, (g) => {
    const gr = g.createLinearGradient(0, 0, 0, 256); gr.addColorStop(0, "rgba(90,170,225,0.62)"); gr.addColorStop(1, "rgba(30,90,150,0.8)");
    g.fillStyle = gr; g.fillRect(0, 10, 512, 246);
    g.beginPath(); g.moveTo(0, 12);
    for (let x = 0; x <= 512; x += 8) g.lineTo(x, 12 + 5 * Math.sin((x / 512) * Math.PI * 6));
    g.lineTo(512, 0); g.lineTo(0, 0); g.closePath(); g.fillStyle = "rgba(0,0,0,0)"; g.fill();
    g.beginPath();
    for (let x = 0; x <= 512; x += 8) { const y = 12 + 5 * Math.sin((x / 512) * Math.PI * 6); if (x) g.lineTo(x, y); else g.moveTo(x, y); }
    g.strokeStyle = "rgba(235,250,255,1)"; g.lineWidth = 9; g.stroke();
    g.fillStyle = "rgba(235,250,255,0.55)"; for (let i = 0; i < 9; i++) { g.beginPath(); g.ellipse(30 + i * 57, 40 + (i % 3) * 30, 6, 6, 0, 0, 7); g.fill(); }
  });
  t.wrapS = THREE.RepeatWrapping; return t;
};

// ---------------- geometry ----------------
type V3 = [number, number, number];
const quad = (a: V3, b: V3, c: V3, d: V3, uv: [number, number][] = [[0, 0], [1, 0], [1, 1], [0, 1]]) => {
  const g = new THREE.BufferGeometry();
  const A = new THREE.Vector3(...a), B = new THREE.Vector3(...b), D = new THREE.Vector3(...d);
  const n = B.clone().sub(A).cross(D.clone().sub(A)).normalize();
  g.setAttribute("position", new THREE.Float32BufferAttribute([a, b, c, a, c, d].flat(), 3));
  g.setAttribute("normal", new THREE.Float32BufferAttribute(Array(6).fill([n.x, n.y, n.z]).flat(), 3));
  g.setAttribute("uv", new THREE.Float32BufferAttribute([uv[0], uv[1], uv[2], uv[0], uv[2], uv[3]].flat(), 2));
  return g;
};
/** box from (x0,y0,z0) to (x1,y1,z1); faces: +x, -x, +y, -y, +z, -z -> material keys (null = skip). Side faces map u to
 *  car z (-2..2) and v to y (0.3..0.85) so one painted side texture runs continuously over hood, doors and trunk. */
type Faces = Partial<Record<"px" | "nx" | "py" | "ny" | "pz" | "nz", string | null>>;
const sideUV = (z0: number, z1: number, y0: number, y1: number, flip: boolean): [number, number][] => {
  const U = (z: number) => (z + 2) / 4, Vv = (y: number) => (y - 0.3) / 0.55;
  return flip ? [[U(z1), Vv(y0)], [U(z0), Vv(y0)], [U(z0), Vv(y1)], [U(z1), Vv(y1)]] : [[U(z0), Vv(y0)], [U(z1), Vv(y0)], [U(z1), Vv(y1)], [U(z0), Vv(y1)]];
};
const frontUV = (x0: number, x1: number, y0: number, y1: number, flip: boolean): [number, number][] => {
  const U = (x: number) => (x + 0.9) / 1.8, Vv = (y: number) => (y - 0.3) / 0.55;
  return flip ? [[U(x1), Vv(y0)], [U(x0), Vv(y0)], [U(x0), Vv(y1)], [U(x1), Vv(y1)]] : [[U(x0), Vv(y0)], [U(x1), Vv(y0)], [U(x1), Vv(y1)], [U(x0), Vv(y1)]];
};

export class Car {
  root = new THREE.Group();
  body = new THREE.Group();
  driverGlass: THREE.Mesh;
  water: THREE.Mesh;
  waterTex: THREE.Texture;
  constructor(twoTone: <T extends THREE.MeshLambertMaterial | THREE.MeshPhongMaterial>(m: T, k?: number) => T, noink: number) {
    this.root.rotation.order = "YXZ";
    this.root.add(this.body);
    const M: Record<string, THREE.Material> = {
      side: twoTone(new THREE.MeshLambertMaterial({ map: sideTex() })),
      front: twoTone(new THREE.MeshLambertMaterial({ map: frontTex() })),
      rear: twoTone(new THREE.MeshLambertMaterial({ map: rearTex() })),
      top: twoTone(new THREE.MeshLambertMaterial({ map: topTex() })),
      paint: twoTone(new THREE.MeshLambertMaterial({ color: PAINT })),
      paintDk: twoTone(new THREE.MeshLambertMaterial({ color: PAINT_DK })),
      trim: twoTone(new THREE.MeshLambertMaterial({ color: TRIM })),
      rubber: twoTone(new THREE.MeshLambertMaterial({ color: RUBBER })),
      hub: twoTone(new THREE.MeshPhongMaterial({ color: "#d9dbe2", specular: "#ffffff", shininess: 40 })),
      seat: twoTone(new THREE.MeshLambertMaterial({ map: seatTex() })),
      interior: twoTone(new THREE.MeshLambertMaterial({ color: INTERIOR })),
      dash: twoTone(new THREE.MeshLambertMaterial({ color: "#2c2b38" })),
    };
    const parts = new Map<string, THREE.BufferGeometry[]>();
    const add = (k: string, g: THREE.BufferGeometry) => { const l = parts.get(k); if (l) l.push(g); else parts.set(k, [g]); };
    const box = (x0: number, y0: number, z0: number, x1: number, y1: number, z1: number, f: Faces) => {
      if (f.px) add(f.px, quad([x1, y0, z1], [x1, y0, z0], [x1, y1, z0], [x1, y1, z1], f.px === "side" ? sideUV(z0, z1, y0, y1, true) : undefined));
      if (f.nx) add(f.nx, quad([x0, y0, z0], [x0, y0, z1], [x0, y1, z1], [x0, y1, z0], f.nx === "side" ? sideUV(z0, z1, y0, y1, false) : undefined));
      if (f.py) add(f.py, quad([x0, y1, z1], [x1, y1, z1], [x1, y1, z0], [x0, y1, z0]));
      if (f.ny) add(f.ny, quad([x0, y0, z0], [x1, y0, z0], [x1, y0, z1], [x0, y0, z1]));
      if (f.pz) add(f.pz, quad([x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1], f.pz === "front" ? frontUV(x0, x1, y0, y1, false) : undefined));
      if (f.nz) add(f.nz, quad([x1, y0, z0], [x0, y0, z0], [x0, y1, z0], [x1, y1, z0], f.nz === "rear" ? frontUV(x0, x1, y0, y1, true) : undefined));
    };
    const W = 0.9, BELT = 0.85, ROOF = 1.52;
    // lower body: hood, trunk, two door panels (outer paint skin + inner trim), cabin floor (tub) and bulkheads
    box(-W, 0.3, 0.75, W, 0.82, 2.0, { px: "side", nx: "side", py: "top", ny: "rubber", pz: "front" });
    box(-W, 0.3, -2.0, W, 0.85, -1.2, { px: "side", nx: "side", py: "top", ny: "rubber", nz: "rear" });
    for (const s of [-1, 1]) box(s < 0 ? -W : W - 0.07, 0.3, -1.2, s < 0 ? -W + 0.07 : W, BELT, 0.75, { px: s > 0 ? "side" : "interior", nx: s < 0 ? "side" : "interior", py: "trim", ny: "rubber" });
    box(-W + 0.07, 0.3, -1.2, W - 0.07, 0.42, 0.75, { py: "interior", ny: "rubber" });
    // dashboard + steering column, seats (driver on the left), parcel shelf
    box(-W + 0.07, 0.42, 0.55, W - 0.07, 1.02, 0.78, { py: "dash", nz: "dash" });
    for (const xc of [-0.4, 0.4]) {
      box(xc - 0.27, 0.42, -0.25, xc + 0.27, 0.62, 0.25, { py: "seat", px: "seat", nx: "seat", pz: "seat" }); // cushion
      box(xc - 0.27, 0.62, -0.42, xc + 0.27, 1.25, -0.25, { py: "seat", px: "seat", nx: "seat", pz: "seat", nz: "seat" }); // back
      box(xc - 0.13, 1.28, -0.4, xc + 0.13, 1.42, -0.28, { py: "seat", px: "seat", nx: "seat", pz: "seat", nz: "seat" }); // headrest
    }
    box(-W + 0.07, 0.42, -1.2, W - 0.07, 0.85, -0.6, { py: "seat", pz: "seat" }); // rear bench
    // cabin: roof, pillars (A sloped, B upright, C sloped)
    box(-0.82, ROOF, -1.02, 0.82, ROOF + 0.08, 0.58, { px: "paint", nx: "paint", py: "top", ny: "interior", pz: "paint", nz: "paint" });
    const beam = (k: string, a: V3, b: V3, t: number) => {
      const A = new THREE.Vector3(...a), B = new THREE.Vector3(...b);
      const g = new THREE.BoxGeometry(t, A.distanceTo(B), t).toNonIndexed();
      g.applyMatrix4(new THREE.Matrix4().compose(A.clone().add(B).multiplyScalar(0.5), new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), B.clone().sub(A).normalize()), new THREE.Vector3(1, 1, 1)));
      add(k, g);
    };
    for (const s of [-1, 1]) {
      beam("paint", [s * 0.84, BELT, 1.0], [s * 0.8, ROOF + 0.02, 0.56], 0.1);
      beam("paint", [s * 0.84, BELT, -0.47], [s * 0.82, ROOF + 0.02, -0.47], 0.1);
      beam("paint", [s * 0.84, BELT, -1.42], [s * 0.8, ROOF + 0.02, -1.0], 0.12);
    }
    // bumpers, mirrors, wheels
    box(-0.95, 0.3, 1.98, 0.95, 0.44, 2.1, { px: "rubber", nx: "rubber", py: "rubber", pz: "rubber" });
    box(-0.95, 0.3, -2.1, 0.95, 0.44, -1.98, { px: "rubber", nx: "rubber", py: "rubber", nz: "rubber" });
    for (const s of [-1, 1]) box(s < 0 ? -1.08 : 0.9, 0.98, 0.62, s < 0 ? -0.9 : 1.08, 1.12, 0.78, { px: "paint", nx: "paint", py: "paint", ny: "paint", pz: "paintDk", nz: "trim" });
    for (const zc of [-1.35, 1.35]) for (const s of [-1, 1]) {
      const tyre = new THREE.CylinderGeometry(0.33, 0.33, 0.24, 14).toNonIndexed(); tyre.rotateZ(Math.PI / 2); tyre.translate(s * 0.8, 0.33, zc); add("rubber", tyre);
      const hub = new THREE.CylinderGeometry(0.16, 0.16, 0.03, 12).toNonIndexed(); hub.rotateZ(Math.PI / 2); hub.translate(s * 0.93, 0.33, zc); add("hub", hub);
    }
    for (const [k, list] of parts) {
      const clean = list.map((g) => { const n = g.index ? g.toNonIndexed() : g; for (const a of Object.keys(n.attributes)) if (!["position", "normal", "uv"].includes(a)) n.deleteAttribute(a); return n; });
      const m = new THREE.Mesh(mergeGeometries(clean, false), M[k]);
      m.castShadow = true; m.receiveShadow = true;
      this.body.add(m);
    }
    // glass: unlit, mostly clear with painted streaks; no ink, no depth write
    // fixed panes: blue tint so the glasshouse reads as windows in the wides; the driver window stays clear for the close-up
    const gmat = (clear: boolean) => new THREE.MeshBasicMaterial({ map: glassTex(), alphaMap: clear ? glassAlpha() : null, transparent: true, opacity: clear ? 0.5 : 0.42, depthWrite: false, side: THREE.DoubleSide, color: clear ? new THREE.Color(0.9, 0.97, 1.05) : new THREE.Color(0.42, 0.66, 0.9) });
    const glass = (a: V3, b: V3, c: V3, d: V3, clear = false) => { const m = new THREE.Mesh(quad(a, b, c, d), gmat(clear)); m.layers.set(noink); m.renderOrder = 3; this.body.add(m); return m; };
    glass([-1, BELT, 1.0], [1, BELT, 1.0], [1, ROOF, 0.56], [-1, ROOF, 0.56]).scale.set(0.82, 1, 1); // windscreen
    glass([1, BELT, -1.42], [-1, BELT, -1.42], [-1, ROOF, -1.0], [1, ROOF, -1.0]).scale.set(0.82, 1, 1); // rear screen
    glass([0.85, BELT, 0.98], [0.85, BELT, -0.47], [0.85, ROOF, -0.47], [0.85, ROOF, 0.58]); // passenger front
    glass([0.85, BELT, -0.47], [0.85, BELT, -1.4], [0.85, ROOF, -1.0], [0.85, ROOF, -0.47]);
    glass([-0.85, BELT, -1.4], [-0.85, BELT, -0.47], [-0.85, ROOF, -0.47], [-0.85, ROOF, -1.0]);
    this.driverGlass = glass([-0.86, BELT, -0.47], [-0.86, BELT, 0.98], [-0.86, ROOF, 0.58], [-0.86, ROOF, -0.47], true);
    // water inside the cabin: a tinted plane between the driver window and the driver, top edge at the level
    this.waterTex = cabinWaterTex();
    const wm = new THREE.MeshBasicMaterial({ map: this.waterTex, transparent: true, depthWrite: false, side: THREE.DoubleSide });
    this.water = new THREE.Mesh(new THREE.PlaneGeometry(1.45, 1.0), wm);
    this.water.rotation.y = -Math.PI / 2; this.water.position.set(-0.6, 0.5, 0.15); this.water.layers.set(noink); this.water.renderOrder = 2;
    this.body.add(this.water);
  }
  pose(f: number) {
    const c = carAt(f);
    this.root.position.set(c.x, c.y, c.z);
    this.root.rotation.set(c.pitch, c.yaw, c.roll);
    this.driverGlass.position.y = -windowDrop(f);
    const L = cabinWater(f);
    this.water.position.y = L - 0.5;
    this.water.visible = f >= 100;
    this.waterTex.offset.x = (f * 0.004) % 1;
    return c;
  }
}
