// Light presets for the World short: the bridge engine's golden preset (backlit low sun, peach horizon, violet-blue
// shade) plus a dusk preset for "the money ran out" onward, blended per frame by story.duskAt (0 golden, 1 dusk,
// 1.35 lights out). The sun is camera-relative and frozen per shot (story SHOTS sunAz/sunEl).
// lit/shade/lift are LINEAR multipliers for shade.ts; sky/sea colours are on-screen targets (world.ts untones them).
import * as THREE from "three";
type C3 = [number, number, number];
export type LightPreset = {
  lit: C3; shade: C3; lift: C3; lambert: number; sideK: number; term: number;
  charTint: C3; charShade: number; charGrad: number; bodyGrad: number; sideTint: C3;
  sunCol: string; sunI: number; sunDisc: string; fog: string;
  bias: number; normalBias: number;
};
export const GOLDEN: LightPreset = {
  lit: [1.43, 0.99, 0.72], shade: [0.19, 0.19, 0.34], lift: [0.04, 0.06, 0.17], lambert: 0.35, sideK: 0.82, term: 0.07,
  charTint: [1.0, 0.8, 0.6], charShade: 0.88, charGrad: 0.1, bodyGrad: 0.25, sideTint: [0.85, 0.8, 0.95],
  sunCol: "#ffab5e", sunI: 5.5, sunDisc: "#ffcf9e", fog: "#efb489",
  bias: -0.0006, normalBias: 0.03,
};
export const DUSK: LightPreset = {
  lit: [1.25, 0.62, 0.42], shade: [0.2, 0.17, 0.3], lift: [0.05, 0.04, 0.12], lambert: 0.35, sideK: 0.82, term: 0.07,
  charTint: [0.86, 0.72, 0.8], charShade: 0.84, charGrad: 0.12, bodyGrad: 0.28, sideTint: [0.78, 0.76, 0.98],
  sunCol: "#ff7a4e", sunI: 3.5, sunDisc: "#ff9a74", fog: "#b0708a",
  bias: -0.0006, normalBias: 0.03,
};
export const DARK: LightPreset = {
  lit: [0.46, 0.3, 0.38], shade: [0.09, 0.09, 0.2], lift: [0.03, 0.03, 0.1], lambert: 0.35, sideK: 0.82, term: 0.07,
  charTint: [0.62, 0.6, 0.82], charShade: 0.82, charGrad: 0.14, bodyGrad: 0.3, sideTint: [0.72, 0.72, 0.98],
  sunCol: "#c0605a", sunI: 2.0, sunDisc: "#e07a6a", fog: "#5a4a72",
  bias: -0.0006, normalBias: 0.03,
};

export type WorldLook = {
  sky: { c: string[]; e: number[] };
  sea: { near: string; mid: string; far: string; shallow: string; lagoon: string; foam: string; crest: string; trough: string; glint: string; path: string };
  cloud: { lit: string; mid: string; shade: string };
  bounce: C3; sat: number;
};
export const LOOK_GOLDEN: WorldLook = {
  sky: { c: ["#f6d2a0", "#efba98", "#d79791", "#a78ba7", "#6379b2"], e: [0, 3, 8, 16, 34] },
  sea: { near: "#1d5b8c", mid: "#2f6fa0", far: "#e0a68a", shallow: "#2bb8b4", lagoon: "#7fe0c8", foam: "#fff4dc", crest: "#8fc4d8", trough: "#163f6e", glint: "#ffe6b8", path: "#ffd59a" },
  cloud: { lit: "#ffd2a8", mid: "#f2a08f", shade: "#a98fc4" },
  bounce: [0.04, 0.02, 0.0], sat: 1.1,
};
export const LOOK_DUSK: WorldLook = {
  sky: { c: ["#f2855c", "#d86e6c", "#a45a7c", "#5e4a80", "#2c2f62"], e: [0, 4, 10, 20, 40] },
  sea: { near: "#13304f", mid: "#20446e", far: "#b56a72", shallow: "#1f7d8a", lagoon: "#4fa6a0", foam: "#e8d8d8", crest: "#5e7ea6", trough: "#0e2240", glint: "#ffb090", path: "#f08a6a" },
  cloud: { lit: "#f59a80", mid: "#b8708a", shade: "#5c4f86" },
  bounce: [0.03, 0.01, 0.02], sat: 1.05,
};
export const LOOK_DARK: WorldLook = {
  sky: { c: ["#a85a62", "#7a4a6c", "#4e3c6c", "#2c2c58", "#151a3e"], e: [0, 4, 10, 20, 40] },
  sea: { near: "#0b1c34", mid: "#142c4e", far: "#6c4a62", shallow: "#155a66", lagoon: "#2f6e72", foam: "#a8a0b8", crest: "#3a527a", trough: "#08142a", glint: "#c88080", path: "#a86070" },
  cloud: { lit: "#a86c78", mid: "#6e507a", shade: "#33305c" },
  bounce: [0.02, 0.01, 0.02], sat: 1.0,
};

const lerpN = (a: number, b: number, k: number) => a + (b - a) * k;
const lerp3 = (a: C3, b: C3, k: number): C3 => [lerpN(a[0], b[0], k), lerpN(a[1], b[1], k), lerpN(a[2], b[2], k)];
const _a = new THREE.Color(), _b = new THREE.Color();
const lerpHex = (a: string, b: string, k: number) => "#" + _a.set(a).lerp(_b.set(b), k).getHexString(); // sRGB-ish blend of targets
const pair = (d: number): [number, number] => (d <= 1 ? [0, d] : [1, (d - 1) / 0.35]);

/** blended light preset for dusk amount d (0 golden, 1 dusk, 1.35 dark) */
export const lightAt = (d: number): LightPreset => {
  const [seg, k] = pair(d), A = seg ? DUSK : GOLDEN, B = seg ? DARK : DUSK;
  return {
    lit: lerp3(A.lit, B.lit, k), shade: lerp3(A.shade, B.shade, k), lift: lerp3(A.lift, B.lift, k), lambert: A.lambert, sideK: A.sideK, term: A.term,
    charTint: lerp3(A.charTint, B.charTint, k), charShade: lerpN(A.charShade, B.charShade, k), charGrad: lerpN(A.charGrad, B.charGrad, k),
    bodyGrad: lerpN(A.bodyGrad, B.bodyGrad, k), sideTint: lerp3(A.sideTint, B.sideTint, k),
    sunCol: lerpHex(A.sunCol, B.sunCol, k), sunI: lerpN(A.sunI, B.sunI, k), sunDisc: lerpHex(A.sunDisc, B.sunDisc, k), fog: lerpHex(A.fog, B.fog, k),
    bias: A.bias, normalBias: A.normalBias,
  };
};
export const lookAt = (d: number): WorldLook => {
  const [seg, k] = pair(d), A = seg ? LOOK_DUSK : LOOK_GOLDEN, B = seg ? LOOK_DARK : LOOK_DUSK;
  const sea = {} as WorldLook["sea"];
  for (const key of Object.keys(A.sea) as (keyof WorldLook["sea"])[]) sea[key] = lerpHex(A.sea[key], B.sea[key], k);
  return {
    sky: { c: A.sky.c.map((c, i) => lerpHex(c, B.sky.c[i], k)), e: A.sky.e },
    sea,
    cloud: { lit: lerpHex(A.cloud.lit, B.cloud.lit, k), mid: lerpHex(A.cloud.mid, B.cloud.mid, k), shade: lerpHex(A.cloud.shade, B.cloud.shade, k) },
    bounce: lerp3(A.bounce, B.bounce, k), sat: lerpN(A.sat, B.sat, k),
  };
};
