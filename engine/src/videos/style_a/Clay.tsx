// Style A: claymation / stop-motion. Matte clay (roughness .92) with a thumbprint bump map and a low-frequency vertex
// wobble on every rounded form, warm key + cool fill with soft (VSM) shadows, a painted backdrop gradient, mild lens blur.
import React from "react";
import * as THREE from "three";
import { StyleStage, StyleDef } from "../style_lab/stage";
import { buildDummy, buildStreet, bumpTex, skyTex, SIDEWALK_Y, MatFn } from "../style_lab/core";
import { LensBlur } from "../style_lab/lensblur";
import { ToneMappingMode } from "postprocessing";

const CLAY_TINT: Record<string, string> = { dummy: "#f0b636", dummyDark: "#d99a2e", car: "#cf5c47", asphalt: "#6a6870", sidewalk: "#d4c8b6", eyeWhite: "#f6f1e6" };
const def: StyleDef = {
  cam: { pos: [0.45, 1.2, 3.35], look: [0, 0.98, 0], fov: 34 },
  shadows: "variance",
  tone: ToneMappingMode.NEUTRAL,
  exposure: 1.05,
  build: (scene) => {
    const thumb = bumpTex("thumb", 5), fine = bumpTex("fine", 6), cache = new Map<string, THREE.Material>();
    const mat: MatFn = (role, color, map) => {
      const key = role + color + (map ? map.uuid : "");
      let m = cache.get(key);
      if (!m) {
        const decal = role === "marker" || role === "number";
        m = new THREE.MeshStandardMaterial({ color: map ? "#ffffff" : CLAY_TINT[role] ?? color, map: map ?? null, roughness: role === "glass" || role === "eyeWhite" ? 0.55 : 0.92, metalness: 0,
          bumpMap: decal ? null : role === "asphalt" || role === "sidewalk" ? fine : thumb, bumpScale: 6, transparent: decal, alphaTest: decal ? 0.4 : 0,
          polygonOffset: decal, polygonOffsetFactor: -2 });
        cache.set(key, m);
      }
      return m;
    };
    const root = new THREE.Group();
    root.add(buildStreet(mat, { wobble: 0.01 }));
    const d = buildDummy(mat, { panic: true, wobble: 0.009 }); d.position.y = SIDEWALK_Y; d.rotation.y = 0.12; root.add(d);
    scene.background = skyTex("#9ec3e0", "#f3dcc0");
    root.add(new THREE.HemisphereLight("#fff1dd", "#8a7a6a", 0.9));
    const key = new THREE.DirectionalLight("#ffe0b8", 2.8); key.position.set(-3.5, 6, 5); key.target.position.set(0, 1, 0);
    key.castShadow = true; key.shadow.mapSize.set(2048, 2048); key.shadow.radius = 14; key.shadow.blurSamples = 24; key.shadow.bias = -0.0004;
    Object.assign(key.shadow.camera, { left: -6, right: 6, top: 6, bottom: -6, near: 0.5, far: 30 });
    root.add(key, key.target);
    const fill = new THREE.DirectionalLight("#b8d0ff", 0.7); fill.position.set(4, 2, 3); root.add(fill);
    const rim = new THREE.DirectionalLight("#fff4e0", 1.2); rim.position.set(1, 4, -5); root.add(rim);
    const lens = new LensBlur({ maxCoC: 24, nearScale: 1.2 }); lens.cInf = 9; lens.focus = 3.3;
    return { root, post: [lens.pre, lens.main] };
  },
};
export const StyleA: React.FC = () => <StyleStage def={def} />;
