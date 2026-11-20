// Generic one-shot stage for the style exploration: a style supplies its scene build (materials + lights), camera and
// post effects; this renders it in a 1080x1920 ThreeCanvas with a slow push-in, tone mapping last.
import React, { useMemo } from "react";
import * as THREE from "three";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ThreeCanvas } from "@remotion/three";
import { useThree } from "@react-three/fiber";
import { EffectComposer } from "@react-three/postprocessing";
import { Effect, ToneMappingEffect, ToneMappingMode } from "postprocessing";

export type Cam = { pos: [number, number, number]; look: [number, number, number]; fov: number };
export type StyleDef = {
  cam: Cam;
  shadows: boolean | "variance" | "basic" | "percentage";
  build: (scene: THREE.Scene, gl: THREE.WebGLRenderer, cam: THREE.PerspectiveCamera) => { root: THREE.Object3D; post: Effect[]; frame?: (f: number) => void };
  tone?: ToneMappingMode; exposure?: number; background?: string;
};

const Inner: React.FC<{ def: StyleDef }> = ({ def }) => {
  const f = useCurrentFrame();
  const { camera, scene, gl } = useThree();
  const cam = camera as THREE.PerspectiveCamera;
  const built = useMemo(() => def.build(scene, gl, cam), [def, scene, gl, cam]);
  const tone = useMemo(() => new ToneMappingEffect({ mode: def.tone ?? ToneMappingMode.AGX }), [def]);
  const k = Math.exp(-0.0015 * f);
  const [px, py, pz] = def.cam.pos, [lx, ly, lz] = def.cam.look;
  cam.position.set(lx + (px - lx) * k, ly + (py - ly) * k, lz + (pz - lz) * k);
  cam.up.set(0, 1, 0); cam.lookAt(lx, ly, lz); cam.fov = def.cam.fov; cam.near = 0.1; cam.far = 200; cam.updateProjectionMatrix(); cam.updateMatrixWorld();
  built.frame?.(f);
  gl.toneMappingExposure = def.exposure ?? 1;
  return (
    <>
      <primitive object={built.root} dispose={null} />
      <EffectComposer multisampling={4}>
        {[...built.post.map((e, i) => <primitive key={i} object={e} dispose={null} />), <primitive key="tone" object={tone} dispose={null} />]}
      </EffectComposer>
    </>
  );
};

export const StyleStage: React.FC<{ def: StyleDef }> = ({ def }) => (
  <AbsoluteFill style={{ background: def.background ?? "#cfe3f2" }}>
    <ThreeCanvas width={1080} height={1920} shadows={def.shadows} gl={{ antialias: false, stencil: false, powerPreference: "high-performance" }}
      camera={{ fov: def.cam.fov, near: 0.1, far: 200 }}>
      <Inner def={def} />
    </ThreeCanvas>
  </AbsoluteFill>
);
