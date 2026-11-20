// Style C: vinyl toy diorama. Glossy clear-coated plastic on every part (MeshPhysicalMaterial), studio environment
// reflections (RoomEnvironment), saturated toy colours, a higher camera looking down on the miniature street and a
// strong thin-lens blur so near and far fall off fast (tilt-shift miniature).
import React from "react";
import * as THREE from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { ToneMappingMode } from "postprocessing";
import { StyleStage, StyleDef } from "../style_lab/stage";
import { buildDummy, buildStreet, skyTex, SIDEWALK_Y, MatFn, bumpTex } from "../style_lab/core";
import { LensBlur } from "../style_lab/lensblur";

const TOY: Record<string, string> = {
  dummy: "#ffc414", dummyDark: "#f5a50c", joint: "#3b3f52", jointHi: "#5b6280", car: "#2f8cff", carTrim: "#f4f4f8", hydrant: "#ff3b30",
  lamp: "#18a86b", asphalt: "#4a4c5c", sidewalk: "#e9e2d6", curb: "#d9d3ca", wall0: "#ff7a59", wall1: "#ffd23f", wall2: "#4cc3ff", wall3: "#ff8fb8",
  wall4: "#7be07b", wall5: "#fff0d6", window: "#2a4a8a", door: "#b4483a", tail: "#ff4a4a",
};
const def: StyleDef = {
  cam: { pos: [1.1, 2.45, 3.55], look: [0, 0.92, 0], fov: 32 },
  shadows: "percentage",
  tone: ToneMappingMode.NEUTRAL,
  exposure: 1.0,
  build: (scene, gl) => {
    const pm = new THREE.PMREMGenerator(gl);
    scene.environment = pm.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environmentIntensity = 0.75;
    const fine = bumpTex("fine", 8), cache = new Map<string, THREE.Material>();
    const mat: MatFn = (role, color, map) => {
      const key = role + color + (map ? map.uuid : "");
      let m = cache.get(key);
      if (!m) {
        const decal = role === "marker" || role === "number", ground = role === "asphalt" || role === "sidewalk";
        m = new THREE.MeshPhysicalMaterial({ color: map ? "#ffffff" : TOY[role] ?? color, map: map ?? null, roughness: ground ? 0.7 : 0.32, metalness: 0,
          clearcoat: ground ? 0 : 1, clearcoatRoughness: 0.06, bumpMap: ground ? fine : null, bumpScale: 1,
          transparent: decal, alphaTest: decal ? 0.4 : 0, polygonOffset: decal, polygonOffsetFactor: -2 });
        cache.set(key, m);
      }
      return m;
    };
    const root = new THREE.Group();
    root.add(buildStreet(mat));
    const d = buildDummy(mat, { panic: true, bigFace: 1.12 }); d.position.y = SIDEWALK_Y; d.rotation.y = 0.2; root.add(d);
    scene.background = skyTex("#3f9cff", "#bfe6ff");
    root.add(new THREE.HemisphereLight("#dff1ff", "#6b5a4a", 0.5));
    const key = new THREE.DirectionalLight("#fff6e8", 3.0); key.position.set(-3, 7, 4); key.target.position.set(0, 1, 0);
    key.castShadow = true; key.shadow.mapSize.set(2048, 2048); key.shadow.bias = -0.0003; key.shadow.normalBias = 0.02;
    Object.assign(key.shadow.camera, { left: -6, right: 6, top: 6, bottom: -6, near: 0.5, far: 30 });
    root.add(key, key.target);
    const lens = new LensBlur({ maxCoC: 34, nearScale: 1.6 }); lens.cInf = 26; lens.focus = 3.75;
    return { root, post: [lens.pre, lens.main] };
  },
};
export const StyleC: React.FC = () => <StyleStage def={def} />;
