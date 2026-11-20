// Persona 2 lab: Yolbo (egg) and Krevvo (ceramic arch) in style A (clay: matte, thumbprint bump, soft VSM light) and
// style C (vinyl toy: clear-coat plastic, studio reflections, strong miniature lens blur) on the street set, calm and
// panicked, plus square avatars (character only, plain saturated background).
import React, { useMemo } from "react";
import * as THREE from "three";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ThreeCanvas } from "@remotion/three";
import { useThree } from "@react-three/fiber";
import { EffectComposer } from "@react-three/postprocessing";
import { Effect, ToneMappingEffect, ToneMappingMode } from "postprocessing";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { buildStreet, bumpTex, skyTex, SIDEWALK_Y, MatFn } from "../style_lab/core";
import { LensBlur } from "../style_lab/lensblur";
import { buildYolbo, buildKrevvo, eggTray } from "./chars";

export type Who = "yolbo" | "krevvo";
export type Look = "A" | "C";
type V3 = [number, number, number];
const DARK_WALLS: Record<string, string> = { wall0: "#3b4c74", wall1: "#7a3a36", wall2: "#2c5653", wall3: "#57406b", wall4: "#3f6438", wall5: "#6a5646", frame: "#c9c2b4" };
const TOY: Record<string, string> = {
  joint: "#3b3f52", car: "#2f8cff", carTrim: "#f4f4f8", hydrant: "#ff3b30", lamp: "#18a86b", asphalt: "#4a4c5c", sidewalk: "#e9e2d6", curb: "#d9d3ca",
  wall0: "#ff7a59", wall1: "#ffd23f", wall2: "#4cc3ff", wall3: "#ff8fb8", wall4: "#7be07b", wall5: "#fff0d6", window: "#2a4a8a", door: "#b4483a", tail: "#ff4a4a",
};
const CLAY: Record<string, string> = { car: "#cf5c47", asphalt: "#6a6870", sidewalk: "#d4c8b6", eyeWhite: "#f6f1e6" };

const kit = (look: Look, scene: THREE.Scene, gl: THREE.WebGLRenderer, who: Who): MatFn => {
  const cache = new Map<string, THREE.Material>();
  const over = { ...(look === "C" ? TOY : CLAY), ...(who === "yolbo" ? DARK_WALLS : {}) };
  if (look === "C") { const pm = new THREE.PMREMGenerator(gl); scene.environment = pm.fromScene(new RoomEnvironment(), 0.04).texture; scene.environmentIntensity = 0.75; }
  const thumb = bumpTex("thumb", 5), fine = bumpTex("fine", 8);
  return (role, color, map) => {
    const key = role + color + (map ? map.uuid : "");
    let m = cache.get(key);
    if (m) return m;
    const decal = role === "marker" || role === "number", ground = role === "asphalt" || role === "sidewalk" || role === "pulp";
    const col = map ? "#ffffff" : over[role] ?? color;
    if (look === "A") {
      m = new THREE.MeshStandardMaterial({ color: col, map: map ?? null, roughness: role === "glaze" ? 0.55 : role === "eyeWhite" || role === "glass" ? 0.5 : 0.92,
        bumpMap: decal ? null : ground ? fine : thumb, bumpScale: role === "shell" ? 3 : 6, transparent: decal, alphaTest: decal ? 0.4 : 0 });
    } else {
      const matte = ground || role === "bisque" || role === "bootSole";
      m = new THREE.MeshPhysicalMaterial({ color: col, map: map ?? null, roughness: matte ? 0.75 : role === "shell" ? 0.45 : 0.3, clearcoat: matte ? 0 : role === "shell" ? 0.5 : 1,
        clearcoatRoughness: 0.06, bumpMap: matte ? fine : null, bumpScale: 1, transparent: decal, alphaTest: decal ? 0.4 : 0 });
    }
    cache.set(key, m);
    return m;
  };
};
const lights = (look: Look, root: THREE.Object3D) => {
  if (look === "A") {
    root.add(new THREE.HemisphereLight("#fff1dd", "#8a7a6a", 0.9));
    const key = new THREE.DirectionalLight("#ffe0b8", 2.8); key.position.set(-3.5, 6, 5); key.target.position.set(0, 1, 0);
    key.castShadow = true; key.shadow.mapSize.set(2048, 2048); key.shadow.radius = 14; key.shadow.blurSamples = 24; key.shadow.bias = -0.0004;
    Object.assign(key.shadow.camera, { left: -6, right: 6, top: 6, bottom: -6, near: 0.5, far: 30 });
    root.add(key, key.target);
    const fill = new THREE.DirectionalLight("#b8d0ff", 0.7); fill.position.set(4, 2, 3); root.add(fill);
    const rim = new THREE.DirectionalLight("#fff4e0", 1.4); rim.position.set(1, 4, -5); root.add(rim);
  } else {
    root.add(new THREE.HemisphereLight("#dff1ff", "#6b5a4a", 0.5));
    const key = new THREE.DirectionalLight("#fff6e8", 3.0); key.position.set(-3, 7, 4); key.target.position.set(0, 1, 0);
    key.castShadow = true; key.shadow.mapSize.set(2048, 2048); key.shadow.bias = -0.0003; key.shadow.normalBias = 0.02;
    Object.assign(key.shadow.camera, { left: -6, right: 6, top: 6, bottom: -6, near: 0.5, far: 30 });
    root.add(key, key.target);
  }
};

type Shot = { who: Who; look: Look; panic: boolean; avatar?: boolean };
const camOf = (s: Shot): { pos: V3; look: V3; fov: number } => {
  if (s.avatar) return s.who === "yolbo" ? { pos: [0.05, 1.05, 2.35], look: [-0.12, 0.98, 0], fov: 28 } : { pos: [0.05, 0.9, 2.5], look: [0.0, 0.55, 0], fov: 30 };
  if (s.who === "yolbo") return s.look === "C" ? { pos: [0.6, 2.1, 3.9], look: [0.06, 0.74, 0], fov: 30 } : { pos: [0.2, 1.05, 3.75], look: [0.06, 0.8, 0], fov: 30 };
  return s.look === "C" ? { pos: [0.7, 2.0, 4.4], look: [0, 0.48, 0], fov: 30 } : { pos: [0.25, 0.9, 4.4], look: [0, 0.55, 0], fov: 30 };
};

const Inner: React.FC<{ s: Shot }> = ({ s }) => {
  const f = useCurrentFrame();
  const { camera, scene, gl } = useThree();
  const cam = camera as THREE.PerspectiveCamera, c = camOf(s);
  const built = useMemo(() => {
    const mat = kit(s.look, scene, gl, s.who), root = new THREE.Group();
    if (!s.avatar) root.add(buildStreet(mat, { wobble: s.look === "A" ? 0.01 : 0 }));
    else {
      const floor = new THREE.Mesh(new THREE.CircleGeometry(3, 48), new THREE.ShadowMaterial({ opacity: 0.25 })); floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; root.add(floor);
    }
    const ch = s.who === "yolbo" ? buildYolbo(mat, s.panic, { wobble: s.look === "A" ? 0.006 : 0 }) : buildKrevvo(mat, s.panic, { wobble: s.look === "A" ? 0.005 : 0 });
    const gy = s.avatar ? 0 : SIDEWALK_Y;
    ch.position.set(s.who === "yolbo" && !s.avatar ? -0.06 : 0, gy, 0); ch.rotation.y = s.who === "krevvo" ? 0.45 : 0.1; root.add(ch);
    if (s.who === "yolbo" && !s.avatar) { const t = eggTray(mat, -0.06 - 0.5); t.position.set(0.5, SIDEWALK_Y, 0.62); t.rotation.y = -0.55; root.add(t); }
    scene.background = s.avatar ? new THREE.Color(s.who === "yolbo" ? "#2f5bd6" : "#f2a43a") : s.look === "C" ? skyTex("#3f9cff", "#bfe6ff") : skyTex("#9ec3e0", "#f3dcc0");
    lights(s.look, root);
    const dist = Math.hypot(c.pos[0] - c.look[0], c.pos[1] - c.look[1], c.pos[2] - c.look[2]);
    const lens = new LensBlur({ maxCoC: s.look === "C" ? 34 : 24, nearScale: s.look === "C" ? 1.6 : 1.2 });
    lens.cInf = s.avatar ? 0 : s.look === "C" ? 24 : 9; lens.focus = dist;
    const post: Effect[] = [lens.pre, lens.main];
    return { root, post, tone: new ToneMappingEffect({ mode: ToneMappingMode.NEUTRAL }) };
  }, [s, scene, gl]); // eslint-disable-line react-hooks/exhaustive-deps
  const k = Math.exp(-0.0015 * f);
  cam.position.set(c.look[0] + (c.pos[0] - c.look[0]) * k, c.look[1] + (c.pos[1] - c.look[1]) * k, c.look[2] + (c.pos[2] - c.look[2]) * k);
  cam.up.set(0, 1, 0); cam.lookAt(...c.look); cam.fov = c.fov; cam.near = 0.1; cam.far = 200; cam.updateProjectionMatrix(); cam.updateMatrixWorld();
  gl.toneMappingExposure = 1.05;
  return (
    <>
      <primitive object={built.root} dispose={null} />
      <EffectComposer multisampling={4}>
        {[...built.post.map((e, i) => <primitive key={i} object={e} dispose={null} />), <primitive key="tone" object={built.tone} dispose={null} />]}
      </EffectComposer>
    </>
  );
};

export const Persona2: React.FC<Shot & { w: number; h: number }> = ({ w, h, ...s }) => {
  const shot = useMemo(() => s, [s.who, s.look, s.panic, s.avatar]); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <AbsoluteFill>
      <ThreeCanvas width={w} height={h} shadows={shot.look === "A" ? "variance" : "percentage"} gl={{ antialias: false, stencil: false, powerPreference: "high-performance" }}
        camera={{ fov: 34, near: 0.1, far: 200 }}>
        <Inner s={shot} />
      </ThreeCanvas>
    </AbsoluteFill>
  );
};
