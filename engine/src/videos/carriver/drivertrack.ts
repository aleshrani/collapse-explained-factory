// The driver's timeline (pose, expression, car-local or world placement per frame) and the drawn silhouette extents
// per pose. Pure (no DOM): cast.ts draws from it, scripts/carriver-collide.mjs checks the card stays inside the car.
import type { DPose } from "./driver";
import type { Expr } from "./toon";
import { EV, STAMP_A, STAMP_B, CHECK_C, SHOVES, smooth, clamp01, V3 } from "./story";
import { carAt } from "./car";

export const SU = 0.00216; // metres per design unit (cast.ts)
export const SCD = 0.5; // driver card scale (head ~0.26 m wide)
export const CARD_Y = 1.3 - (975 - 400) * SU * SCD; // card origin so the head centre sits at car-local y 1.3
/** drawn silhouette of each pose in design units: x range about the card centre (300) and the top y (soles = 975) */
export const POSE_EXT: Record<DPose, { x0: number; x1: number; top: number }> = {
  wheel: { x0: -155, x1: 155, top: 280 }, panic: { x0: -190, x1: 190, top: 280 }, phone: { x0: -138, x1: 192, top: 280 },
  push: { x0: -208, x1: 208, top: 280 }, climb: { x0: -178, x1: 178, top: 222 }, relief: { x0: -222, x1: 222, top: 280 },
  swim: { x0: -262, x1: 262, top: 280 },
};
const shoveAt = (f: number) => SHOVES.reduce((a, s) => a + (f >= s && f < s + 8 ? Math.exp(-(f - s) / 2.5) : 0), 0);
export type DState = { pose: DPose; expr: Expr; local?: V3; world?: V3; lean?: number; mirror?: boolean };
export const driverAt = (f: number): DState | null => {
  if (f >= EV.TIP + 2 && f < 96) return null; // tumbling: a flat card cannot pitch with the car
  if (f < EV.TIP + 2) return { pose: "wheel", expr: f < 18 ? "smile" : "shock" };
  if (f < 165) return { pose: "panic", expr: "shock" };
  if (f < STAMP_A) return { pose: "phone", expr: f < 214 ? "nervous" : "shock" };
  if (f < 255) return { pose: "panic", expr: "shock" };
  if (f < STAMP_B) { const k = shoveAt(f); return { pose: "push", expr: "pained", local: [-0.4 - 0.07 * k, CARD_Y, 0.0], lean: -4 * k }; }
  if (f < 345) return { pose: "panic", expr: "shock" };
  if (f < CHECK_C) return { pose: "panic", expr: "nervous" };
  if (f < 386) return { pose: "relief", expr: "relief_open" };
  if (f < 400) { const u = smooth((f - 386) / 14); return { pose: "climb", expr: "grin", local: [-0.4 - 0.3 * u, CARD_Y, 0.06 + 0.06 * u] }; }
  // swim round the car's nose to the landing stage (car.ts DOCK), front view, strokes faked by mirroring
  const c = carAt(400), s = clamp01((f - 400) / 50), bob = 0.04 * Math.sin(f * 0.35);
  return { pose: "swim", expr: f - 400 > 8 ? "relief" : "relief_open", world: [c.x + 0.6 + 2.4 * Math.sqrt(s), 0.3 - (975 - 400) * SU * SCD + bob, c.z + 1.7 - 4.1 * s ** 2.5], mirror: Math.floor((f - 400) / 10) % 2 === 1 };
};
