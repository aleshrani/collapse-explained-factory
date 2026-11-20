// Style D: comic-book cel shading. The same 3D dummy and street in three-tone toon materials with a hard terminator,
// an inverted-hull ink outline on every solid, and a screen-space halftone (Ben-Day dots) that only appears in the
// shadows. Cheap: no painted textures needed, hard shadows, no DOF; it reads like a printed comic panel.
import React from "react";
import * as THREE from "three";
import { Effect, ToneMappingMode } from "postprocessing";
import { StyleStage, StyleDef } from "../style_lab/stage";
import { buildDummy, buildStreet, skyTex, SIDEWALK_Y, MatFn } from "../style_lab/core";

const COMIC: Record<string, string> = { dummy: "#ffc21f", dummyDark: "#f0a21a", car: "#e8392e", asphalt: "#5b5f74", sidewalk: "#e6dccb", lamp: "#1f8a62" };
const HALFTONE = /* glsl */ `
void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
  float s = resolution.y / 1920.0, cell = 10.0 * s;
  vec2 p = uv * resolution / cell;
  p = mat2(0.7071, -0.7071, 0.7071, 0.7071) * p;
  vec2 g = fract(p) - 0.5;
  float l = dot(inputColor.rgb, vec3(0.2126, 0.7152, 0.0722));
  float r = clamp((0.42 - l) * 1.25, 0.0, 0.5);
  float dotm = 1.0 - smoothstep(r - 0.08, r + 0.08, length(g));
  outputColor = vec4(inputColor.rgb * (1.0 - 0.55 * dotm), inputColor.a);
}`;
class Halftone extends Effect { constructor() { super("Halftone", HALFTONE); } }
const ramp = () => {
  const t = new THREE.DataTexture(new Uint8Array([70, 70, 70, 255, 160, 160, 160, 255, 255, 255, 255, 255]), 3, 1, THREE.RGBAFormat);
  t.minFilter = t.magFilter = THREE.NearestFilter; t.needsUpdate = true; return t;
};
const outlineMat = (w: number) => {
  const m = new THREE.MeshBasicMaterial({ color: "#14101a", side: THREE.BackSide });
  m.onBeforeCompile = (sh) => { sh.vertexShader = sh.vertexShader.replace("#include <begin_vertex>", "vec3 transformed = position + normal * " + w.toFixed(4) + ";"); };
  return m;
};
const def: StyleDef = {
  cam: { pos: [0.55, 1.15, 3.35], look: [0, 0.98, 0], fov: 34 },
  shadows: "basic",
  tone: ToneMappingMode.NEUTRAL,
  build: (scene) => {
    const cache = new Map<string, THREE.Material>(), grad = ramp();
    const mat: MatFn = (role, color, map) => {
      const key = role + color + (map ? map.uuid : "");
      let m = cache.get(key);
      if (!m) {
        const decal = role === "marker" || role === "number";
        m = decal ? new THREE.MeshBasicMaterial({ map: map ?? null, transparent: true, alphaTest: 0.4, polygonOffset: true, polygonOffsetFactor: -2 })
          : new THREE.MeshToonMaterial({ color: map ? "#ffffff" : COMIC[role] ?? color, map: map ?? null, gradientMap: grad });
        cache.set(key, m);
      }
      return m;
    };
    const root = new THREE.Group();
    const street = buildStreet(mat), dummy = buildDummy(mat, { panic: true, bigFace: 1.08 });
    dummy.position.y = SIDEWALK_Y; dummy.rotation.y = 0.12;
    const hull = (g: THREE.Object3D, w: number) => {
      const m = outlineMat(w), list: THREE.Mesh[] = [];
      g.traverse((o) => { if (o instanceof THREE.Mesh && !(o.geometry instanceof THREE.PlaneGeometry) && o.geometry.attributes.normal) list.push(o); });
      for (const o of list) { if (o.geometry instanceof THREE.BoxGeometry || (o.geometry as THREE.BufferGeometry).boundingSphere?.radius! > 8) continue; const h = new THREE.Mesh(o.geometry, m); o.add(h); }
    };
    hull(dummy, 0.008); hull(street, 0.02);
    root.add(street, dummy);
    scene.background = skyTex("#2f8fe8", "#a9dcff");
    root.add(new THREE.AmbientLight("#ffffff", 0.9));
    const key = new THREE.DirectionalLight("#ffffff", 2.6); key.position.set(-3, 6, 5); key.target.position.set(0, 1, 0);
    key.castShadow = true; key.shadow.mapSize.set(2048, 2048); key.shadow.bias = -0.0005;
    Object.assign(key.shadow.camera, { left: -6, right: 6, top: 6, bottom: -6, near: 0.5, far: 30 });
    root.add(key, key.target);
    return { root, post: [new Halftone()] };
  },
};
export const StyleD: React.FC = () => <StyleStage def={def} />;
