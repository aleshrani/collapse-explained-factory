// "The World" demo short for Collapse Explained (26 s, 1080 x 1920, 30 fps) in the bridge engine's look:
// one three.js world (world.ts) posed per frame from story.ts, post chain InkPass -> lens blur pre + main ->
// bloom (emissive only) -> NEUTRAL tone map -> colour grade (MSAA 4), then a 2D caption / card overlay.
// Every pixel-sized post parameter is specified at 1080 x 1920 and scales with the output size.
import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { AbsoluteFill, Audio, continueRender, delayRender, getInputProps, staticFile, useCurrentFrame } from "remotion";
import { ThreeCanvas } from "@remotion/three";
import { useThree } from "@react-three/fiber";
import { EffectComposer } from "@react-three/postprocessing";
import { BlendFunction, BloomEffect, ToneMappingEffect, ToneMappingMode } from "postprocessing";
import { World } from "./world";
import { InkPass, noInkFallback } from "./ink";
import { LensBlur } from "./lensblur";
import { GradeEffect, GRADES } from "./grade";
import { TOTAL, shotAt, dofAt, duskAt } from "./story";
import { drawOverlay, DISP, TXT } from "./overlay";

export const DUBAI_FRAMES = TOTAL;

const makeBloom = () => {
  const b = new BloomEffect({ blendFunction: BlendFunction.ADD, intensity: 0.55, luminanceThreshold: 1.0, luminanceSmoothing: 0.2, mipmapBlur: true, levels: 6, radius: 0.6 });
  const mip = b.mipmapBlurPass;
  const setSize = mip.setSize.bind(mip);
  mip.setSize = (w: number, h: number) => setSize(Math.round((1920 * w) / Math.max(h, 1)), 1920);
  return b;
};
const fwd = new THREE.Vector3(), fpt = new THREE.Vector3();

const Inner: React.FC<{ world: World }> = ({ world }) => {
  const f = useCurrentFrame();
  const { camera, scene } = useThree();
  const fx = useMemo(() => ({
    ink: new InkPass(scene, camera as THREE.PerspectiveCamera, {fadeNear: 270, fadeFar: 1450, farOpacity: .70}),
    lens: new LensBlur({ maxCoC: 24, nearScale: 1.2 }),
    bloom: makeBloom(),
    tone: new ToneMappingEffect({ mode: ToneMappingMode.NEUTRAL }),
    grade: (() => { const g = new GradeEffect(GRADES.golden, 1); return g; })(),
  }), [camera, scene]);
  useEffect(() => () => fx.ink.dispose(), [fx]);
  const post = useMemo(() => (
    <EffectComposer multisampling={4}>
      <primitive object={fx.ink} dispose={null} />
      <primitive object={fx.lens.pre} dispose={null} />
      <primitive object={fx.lens.main} dispose={null} />
      <primitive object={fx.bloom} dispose={null} />
      <primitive object={fx.tone} dispose={null} />
      <primitive object={fx.grade} dispose={null} />
    </EffectComposer>
  ), [fx]);
  const cam = camera as THREE.PerspectiveCamera;
  const s = shotAt(f);
  const target = world.update(s.id, f, cam, scene);
  noInkFallback(world.root);
  const d = dofAt(f);
  cam.getWorldDirection(fwd);
  if (d.focus) fpt.set(...d.focus(f)); else fpt.copy(target);
  fx.lens.focus = Math.max(0.3, fpt.sub(cam.position).dot(fwd));
  fx.lens.cInf = d.cInf;
  fx.grade.amount = .77 - 0.17 * Math.min(1, duskAt(f));
  return (
    <>
      <primitive object={world.root} dispose={null} />
      {post}
    </>
  );
};

const dprOverride = () => (getInputProps() as { post?: { dpr?: number } }).post?.dpr;
const Overlay: React.FC<{ f: number }> = ({ f }) => {
  const ref = useRef<HTMLCanvasElement>(null);
  useLayoutEffect(() => { const g = ref.current?.getContext("2d"); if (g) drawOverlay(g, f); }, [f]);
  return <canvas ref={ref} width={1080} height={1920} style={{ position: "absolute", left: 0, top: 0, width: "100%", height: "100%" }} />;
};

export const Dubai3D: React.FC = () => {
  const f = useCurrentFrame();
  const [h] = useState(() => delayRender("fonts + world"));
  const [world, setWorld] = useState<World | null>(null);
  useEffect(() => {
    Promise.all([new FontFace(DISP, `url(${staticFile("Boldonse-Regular.ttf")})`).load(), new FontFace(TXT, `url(${staticFile("BeVietnamPro-Bold.ttf")})`, { weight: "700" }).load()])
      .then((fs) => { fs.forEach((x) => document.fonts.add(x)); setWorld(new World()); continueRender(h); });
  }, [h]);
  if (!world) return null;
  const audio = (getInputProps() as { audio?: string }).audio;
  return (
    <AbsoluteFill style={{ background: "#e8a77c" }}>
      <AbsoluteFill>
        <ThreeCanvas width={1080} height={1920} {...(dprOverride() ? { dpr: dprOverride() } : {})} shadows gl={{ antialias: false, stencil: false, powerPreference: "high-performance", toneMappingExposure: 1.0 }}
          camera={{ fov: 40, near: 0.25, far: 7000 }}>
          <Inner world={world} />
        </ThreeCanvas>
      </AbsoluteFill>
      <Overlay f={f} />
      {audio ? <Audio src={staticFile(audio)} /> : null}
    </AbsoluteFill>
  );
};
