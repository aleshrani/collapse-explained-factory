// The World short as one three.js scene: sky (5 stops by elevation), sun disc + halo, painted clouds, the sea
// (depression-angle gradient, drifting marks, sun glitter path, shallow-water mask around every island), the
// archipelago, mainland skyline, resort island, dredger + sand jet and the cast. update(id, f, camera) poses
// everything for shot `id` at frame f (pure function of id + f). Engine look from the bridge short.
import * as THREE from "three";
import { ctex, waterMarks, cloudHD } from "./paint";
import { sandHD, lawnHD } from "./paint2";
import { lam } from "./build";
import { TONE, CHAR, LFB, untone } from "./shade";
import { NOINK } from "./ink";
import { lightAt, lookAt, LightPreset } from "./lights";
import { buildIslands, islandGeos, maskTex, MASK, Island } from "./islands";
import { buildMainland, buildResort, buildIslandPalms, buildDredger, Jet, Glow } from "./props";
import { Pool, Actor, Fx, stage, placeSigns, signTimes } from "./cast";
import { FPS, SHOTS, ShotDef, camAt, duskAt, windowsAt, towerLights, EV, NZ, nzGrow, sprayOn, V3 } from "./story";

const discTex = () => ctex("sunDisc", 128, 128, (g) => {
  const gr = g.createRadialGradient(64, 64, 58, 64, 64, 64); gr.addColorStop(0, "rgba(255,255,255,1)"); gr.addColorStop(1, "rgba(255,255,255,0)");
  g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
});
const haloTex = () => ctex("sunHalo", 256, 256, (g) => {
  const im = g.createImageData(256, 256);
  for (let y = 0; y < 256; y++) for (let x = 0; x < 256; x++) {
    const u = Math.hypot(x - 127.5, y - 127.5) / 128;
    const a = (0.55 * Math.exp(-((u / 0.25) ** 2)) + 0.35 * Math.exp(-((u / 0.6) ** 2))) * (1 - Math.min(1, Math.max(0, (u - 0.8) / 0.2)));
    const i = (y * 256 + x) * 4; im.data[i] = im.data[i + 1] = im.data[i + 2] = 255; im.data[i + 3] = Math.round(255 * Math.min(1, a));
  }
  g.putImageData(im, 0, 0);
});

export class World {
  root = new THREE.Group();
  private pool = new Pool();
  private actors: Actor[] = [];
  private fxs: Fx[] = [];
  private sun: THREE.DirectionalLight; private hemi: THREE.HemisphereLight;
  private skyMat: THREE.ShaderMaterial; private sky: THREE.Mesh;
  private fog = new THREE.Fog("#efb489", 50, 400);
  private SU: Record<string, THREE.IUniform>;
  private sunDisc: THREE.Sprite; private sunHalo: THREE.Sprite;
  private sunCache = new Map<number, THREE.Vector3>();
  private clouds: THREE.Mesh[] = [];
  private cloudKey = "";
  private glowsTower: Glow[]; private glowsIsland: Glow[];
  private nz: THREE.Mesh; private dredger: THREE.Group; private jet: Jet;
  private islands: Island[];
  private frustum = new THREE.Frustum(); private m4 = new THREE.Matrix4(); private sph = new THREE.Sphere(); private v = new THREE.Vector3();

  constructor() {
    const R = this.root;
    // ---- sky ----
    this.skyMat = new THREE.ShaderMaterial({
      uniforms: { c0: { value: new THREE.Color() }, c1: { value: new THREE.Color() }, c2: { value: new THREE.Color() },
        c3: { value: new THREE.Color() }, c4: { value: new THREE.Color() }, e: { value: new THREE.Vector4() } },
      vertexShader: "varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }",
      fragmentShader: `uniform vec3 c0, c1, c2, c3, c4; uniform vec4 e; varying vec3 vP;
        void main(){ float el = asin(clamp(normalize(vP).y, -1.0, 1.0));
          vec3 c = mix(c0, c1, smoothstep(0.0, e.x, el));
          c = mix(c, c2, smoothstep(e.x, e.y, el));
          c = mix(c, c3, smoothstep(e.y, e.z, el));
          c = mix(c, c4, smoothstep(e.z, e.w, el));
          gl_FragColor = vec4(c, 1.0); }`,
      side: THREE.BackSide, depthWrite: false, fog: false,
    });
    this.sky = new THREE.Mesh(new THREE.SphereGeometry(5000, 48, 24), this.skyMat);
    this.sky.renderOrder = -1; this.sky.frustumCulled = false; this.sky.layers.set(NOINK);
    R.add(this.sky);
    this.sunDisc = new THREE.Sprite(new THREE.SpriteMaterial({ map: discTex(), color: new THREE.Color(6.0, 4.4, 2.4), fog: false, depthWrite: false }));
    this.sunHalo = new THREE.Sprite(new THREE.SpriteMaterial({ map: haloTex(), fog: false, depthWrite: false, transparent: true, blending: THREE.AdditiveBlending }));
    this.sunDisc.renderOrder = -0.5; this.sunHalo.renderOrder = 5;
    for (const m of [this.sunDisc, this.sunHalo]) { m.frustumCulled = false; m.layers.set(NOINK); R.add(m); }
    this.hemi = new THREE.HemisphereLight("#d8b0b8", "#8a6a60", 0.5);
    this.sun = new THREE.DirectionalLight("#ffab5e", 5.5);
    this.sun.castShadow = true; this.sun.shadow.mapSize.set(4096, 4096);
    R.add(this.hemi, this.sun, this.sun.target);
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2 + 0.3, d = 2600 + (i % 3) * 300;
      const m = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ transparent: true, depthWrite: false, fog: false }));
      const w = 600 + (i % 4) * 160;
      m.position.set(Math.cos(a) * d, 380 + (i % 4) * 140, Math.sin(a) * d); m.scale.set(w, w / 2, 1);
      m.layers.set(NOINK); this.clouds.push(m); R.add(m);
    }

    // ---- sea ----
    this.islands = buildIslands();
    const wNear = waterMarks("near", 28, 5), wFar = waterMarks("far", 220, 30), mask = maskTex(this.islands);
    for (const t of [wNear, wFar]) { t.colorSpace = THREE.NoColorSpace; t.anisotropy = 16; t.needsUpdate = true; }
    this.SU = {
      wNearC: { value: new THREE.Color() }, wMidC: { value: new THREE.Color() }, wFarC: { value: new THREE.Color() }, wShallow: { value: new THREE.Color() },
      wLagoon: { value: new THREE.Color() }, wFoam: { value: new THREE.Color() }, wCrest: { value: new THREE.Color() }, wTrough: { value: new THREE.Color() },
      wGlint: { value: new THREE.Color() }, wPath: { value: new THREE.Color() }, wSun: { value: new THREE.Vector3(0, 0.1, -1) },
      wNearTex: { value: wNear }, wFarTex: { value: wFar }, wMask: { value: mask }, wTime: { value: 0 },
      wMaskBox: { value: new THREE.Vector4(MASK.x0, MASK.z0, MASK.x1 - MASK.x0, MASK.z1 - MASK.z0) },
    };
    const seaM = new THREE.MeshLambertMaterial({ color: 0xffffff });
    seaM.onBeforeCompile = (sh) => {
      Object.assign(sh.uniforms, this.SU);
      sh.vertexShader = sh.vertexShader.replace("#include <common>", "#include <common>\nvarying vec3 vWP;")
        .replace("#include <project_vertex>", "#include <project_vertex>\nvWP = (modelMatrix * vec4(transformed, 1.0)).xyz;");
      sh.fragmentShader = sh.fragmentShader.replace("#include <common>", SEA_DECL).replace("#include <map_fragment>", SEA_COL)
        .replace("#include <lights_fragment_begin>", "float sunVis = 1.0;\n" + LFB)
        .replace("#include <lights_fragment_end>", "#include <lights_fragment_end>\n  reflectedLight.directDiffuse = diffuseColor.rgb * mix(vec3(0.62, 0.64, 0.8), vec3(1.0), sunVis);\n  reflectedLight.indirectDiffuse = vec3(0.0);");
    };
    seaM.customProgramCacheKey = () => "sea2";
    const sea = new THREE.Mesh(new THREE.PlaneGeometry(9000, 9000).rotateX(-Math.PI / 2), seaM);
    sea.receiveShadow = true; R.add(sea);

    // ---- islands ----
    const geos = islandGeos(this.islands);
    const sandM = lam("islandSand", () => ({ map: sandHD(), vertexColors: true }));
    const grassM = lam("islandLawn", () => ({ map: lawnHD(), vertexColors: true, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -2 }));
    for (const [g, m] of [[geos.sand, sandM], [geos.grass, grassM]] as const) { const me = new THREE.Mesh(g, m); me.receiveShadow = true; me.castShadow = m === sandM; R.add(me); }
    geos.nz.translate(-NZ[0], 0, -NZ[2]);
    this.nz = new THREE.Mesh(geos.nz, sandM); this.nz.position.set(NZ[0], 0, NZ[2]); this.nz.receiveShadow = true; R.add(this.nz);
    this.glowsTower = buildMainland(R);
    this.glowsIsland = buildResort(R);
    buildIslandPalms(R, this.islands);
    this.dredger = buildDredger(R);
    this.jet = new Jet(R);
    // signs: chosen against the shot-4 camera (mean of its keys)
    const c4 = camAt(4, Math.round((SHOTS[3].a + SHOTS[3].b) / 2));
    placeSigns(this.islands, new THREE.Vector3(...c4.pos), new THREE.Vector3(...c4.look));
    if ((globalThis as { __signLog?: boolean }).__signLog !== true) { (globalThis as { __signLog?: boolean }).__signLog = true; console.warn("SIGNTIMES " + JSON.stringify(signTimes())); }
  }

  /** camera-relative sun frozen per shot: the shot's mean view direction turned by az toward screen right, lifted by el */
  private shotSun(s: ShotDef) {
    let v = this.sunCache.get(s.id);
    if (v) return v;
    let fx = 0, fz = 0;
    for (let f = s.a; f < s.b; f += 3) {
      const c = camAt(s.id, f), x = c.look[0] - c.pos[0], z = c.look[2] - c.pos[2], n = Math.hypot(x, z) || 1;
      fx += x / n; fz += z / n;
    }
    const n = Math.hypot(fx, fz) || 1; fx /= n; fz /= n;
    const az = THREE.MathUtils.degToRad(s.sunAz), el = THREE.MathUtils.degToRad(s.sunEl);
    const hx = fx * Math.cos(az) - fz * Math.sin(az), hz = fz * Math.cos(az) + fx * Math.sin(az);
    v = new THREE.Vector3(hx * Math.cos(el), Math.sin(el), hz * Math.cos(el)).normalize();
    this.sunCache.set(s.id, v);
    return v;
  }
  private actor(i: number) { while (this.actors.length <= i) this.actors.push(new Actor(this.root)); return this.actors[i]; }
  private fx(i: number) { while (this.fxs.length <= i) this.fxs.push(new Fx(this.root)); return this.fxs[i]; }

  update(id: number, f: number, cam: THREE.PerspectiveCamera, scene: THREE.Scene) {
    const t = f / FPS, s = SHOTS[id - 1], dusk = duskAt(f), L: LightPreset = lightAt(dusk), K = lookAt(dusk);
    // ---- camera ----
    const c = camAt(id, f);
    cam.position.set(...c.pos); cam.up.set(0, 1, 0); cam.lookAt(...c.look); cam.rotateZ(c.roll);
    cam.fov = c.fov; cam.near = id === 1 || id === 9 ? 3 : 0.72; cam.far = 5150; cam.updateProjectionMatrix(); cam.updateMatrixWorld();
    cam.layers.enable(NOINK);
    const focus = new THREE.Vector3(...c.look), dist = cam.position.distanceTo(focus);
    // ---- light rig ----
    const sunDir = this.shotSun(s);
    this.hemi.intensity = 0.5;
    this.sun.color.set(L.sunCol); this.sun.intensity = L.sunI;
    const anchor = camAt(id, Math.floor((s.a + s.b) / 2));
    const shadowFocus = new THREE.Vector3(...anchor.look);
    const Rr = THREE.MathUtils.clamp(new THREE.Vector3(...anchor.pos).distanceTo(shadowFocus) * 1.3 + 14, 32, 130);
    this.sun.position.copy(shadowFocus).addScaledVector(sunDir, 400); this.sun.target.position.copy(shadowFocus);
    const sc = this.sun.shadow.camera;
    sc.left = -Rr; sc.right = Rr; sc.top = Rr; sc.bottom = -Rr; sc.near = 100; sc.far = 800; sc.updateProjectionMatrix();
    this.sun.shadow.bias = L.bias; this.sun.shadow.normalBias = L.normalBias * (Rr / 12);
    TONE.uLitCol.value.set(...L.lit); TONE.uShadeCol.value.set(...L.shade); TONE.uShadeLift.value.set(...L.lift);
    TONE.uLambert.value = L.lambert; TONE.uSideK.value = L.sideK; TONE.uTerm.value = L.term; TONE.uBounce.value.set(...K.bounce); TONE.uSat.value = K.sat;
    CHAR.uCharTint.value.set(...L.charTint); CHAR.uCharShade.value = L.charShade; CHAR.uGrad.value = L.charGrad;
    CHAR.uBodyGrad.value = L.bodyGrad; CHAR.uSideTint.value.set(...L.sideTint);
    // ---- sky, fog, sun, clouds ----
    const su = this.skyMat.uniforms;
    K.sky.c.forEach((h, i) => untone(h, su["c" + i].value));
    const e = K.sky.e.map((deg) => THREE.MathUtils.degToRad(deg));
    su.e.value.set(e[1], e[2], e[3], e[4]);
    this.sky.position.copy(cam.position);
    untone(K.sky.c[0], this.fog.color); this.fog.near = s.fog[0]; this.fog.far = s.fog[1];
    scene.fog = this.fog; scene.background = null;
    this.sunDisc.position.copy(cam.position).addScaledVector(sunDir, 4000);
    this.sunDisc.scale.setScalar(2 * 4000 * Math.tan(THREE.MathUtils.degToRad(1.6)));
    this.sunHalo.position.copy(this.sunDisc.position); this.sunHalo.scale.setScalar(2 * 4000 * Math.tan(THREE.MathUtils.degToRad(22)));
    (this.sunHalo.material as THREE.SpriteMaterial).color.set(L.sunDisc).multiplyScalar(1.3 * (1 - 0.5 * Math.min(1, dusk)));
    (this.sunDisc.material as THREE.SpriteMaterial).color.setRGB(6.0, 4.4, 2.4).multiplyScalar(1 - 0.55 * Math.min(1, dusk));
    const ck = `${K.cloud.lit}`;
    for (let i = 0; i < this.clouds.length; i++) {
      const m = this.clouds[i], mat = m.material as THREE.MeshBasicMaterial;
      m.lookAt(cam.position.x, m.position.y, cam.position.z);
      if (ck !== this.cloudKey) mat.map = cloudHD(i % 4, K.cloud);
    }
    this.cloudKey = ck;
    // ---- sea ----
    const W = this.SU, wc = K.sea;
    untone(wc.near, W.wNearC.value); untone(wc.mid, W.wMidC.value); untone(wc.far, W.wFarC.value); untone(wc.shallow, W.wShallow.value);
    untone(wc.lagoon, W.wLagoon.value); untone(wc.foam, W.wFoam.value); untone(wc.crest, W.wCrest.value); untone(wc.trough, W.wTrough.value);
    untone(wc.glint, W.wGlint.value); untone(wc.path, W.wPath.value);
    W.wSun.value.copy(sunDir); W.wTime.value = t;
    // ---- lights in windows ----
    const win = windowsAt(f), tl = towerLights(f);
    for (const g of this.glowsTower) g.mat.emissive.copy(g.base).multiplyScalar(.62 * tl);
    for (const g of this.glowsIsland) g.mat.emissive.copy(g.base).multiplyScalar(2.1 * win);
    // ---- dredger + jet + growing island ----
    const gk = nzGrow(f);
    this.nz.scale.set(0.35 + 0.65 * gk, 0.4 + 0.6 * gk, 0.35 + 0.65 * gk);
    this.dredger.position.y = 0.06 * Math.sin(t * 1.3);
    this.dredger.rotation.z = 0.006 * Math.sin(t * 1.1);
    if (sprayOn(f)) this.jet.set(0, 1, t);
    else { const u = (f - EV.STOP) / 24; this.jet.set(Math.min(1, u * 1.9), 1, t, Math.min(1, u * 2.2)); }
    // ---- cast + effects ----
    const right = new THREE.Vector3().setFromMatrixColumn(cam.matrixWorld, 0);
    const st = stage(id, f, { pos: cam.position, right, sun: sunDir });
    this.frustum.setFromProjectionMatrix(this.m4.multiplyMatrices(cam.projectionMatrix, cam.matrixWorldInverse));
    let ai = 0;
    const used: Actor[] = [];
    for (const p of st.places) {
      if (!this.frustum.intersectsSphere(this.sph.set(this.v.set(p.x, p.y + 1, p.z), 2.5))) continue;
      const a = this.actor(ai++);
      const [w, h, k] = p.size;
      a.r = this.pool.req(p.key, w, h, k, p.draw);
      a.mesh.visible = true; a.mesh.position.set(p.x, p.y, p.z);
      a.mesh.rotation.set(0, Math.atan2(cam.position.x - p.x, cam.position.z - p.z), 0);
      a.mesh.scale.setScalar(p.scale);
      used.push(a);
    }
    for (let i = ai; i < this.actors.length; i++) this.actors[i].mesh.visible = false;
    const tint = new THREE.Color(1, 1, 1), litTint = new THREE.Color(...L.charTint).lerp(new THREE.Color(1, 1, 1), 0.45).multiplyScalar(Math.max(0.55, 1 - 0.35 * dusk));
    let fi = 0;
    const fused: Fx[] = [];
    for (const p of st.fx) {
      if (!this.frustum.intersectsSphere(this.sph.set(this.v.set(p.x, p.y, p.z), Math.max(p.w, p.h)))) continue;
      const e = this.fx(fi++);
      e.r = this.pool.req(p.key, p.cw, p.ch, 1, p.draw);
      e.use(!!p.soft, p.lit || p.soft ? litTint : tint);
      e.mesh.visible = true; e.mesh.position.set(p.x, p.y, p.z);
      if (p.flat) e.mesh.rotation.set(-Math.PI / 2, 0, p.rot ?? 0);
      else if (p.upright) e.mesh.rotation.set(0, Math.atan2(cam.position.x - p.x, cam.position.z - p.z), p.rot ?? 0, "YXZ");
      else { e.mesh.quaternion.copy(cam.quaternion); e.mesh.rotateZ(p.rot ?? 0); }
      e.mesh.scale.set(p.w, p.h, 1);
      fused.push(e);
    }
    for (let i = fi; i < this.fxs.length; i++) this.fxs[i].mesh.visible = false;
    this.pool.flush();
    for (const a of used) a.bind();
    for (const e of fused) e.bind();
    return focus;
  }
}
export type { V3 };

const SEA_DECL = `#include <common>
varying vec3 vWP;
uniform vec3 wNearC, wMidC, wFarC, wShallow, wLagoon, wFoam, wCrest, wTrough, wGlint, wPath, wSun;
uniform sampler2D wNearTex, wFarTex, wMask;
uniform vec4 wMaskBox;
uniform float wTime;`;
const SEA_COL = `
  vec3 wV = vWP - cameraPosition;
  float wd = length(wV);
  float wDep = asin(clamp(-wV.y / wd, 0.0, 1.0));
  float wf = 1.0 - smoothstep(0.0, 0.42, wDep);
  vec3 wc = mix(mix(wNearC, wMidC, smoothstep(0.0, 0.55, wf)), wFarC, smoothstep(0.62, 1.0, wf));
  // shallows around the islands (mask: r foam line, g turquoise shallows, b broad lagoon tint)
  vec2 muv = (vWP.xz - wMaskBox.xy) / wMaskBox.zw;
  vec4 msk = (muv.x > 0.0 && muv.x < 1.0 && muv.y > 0.0 && muv.y < 1.0) ? texture2D(wMask, muv) : vec4(0.0);
  float far = smoothstep(120.0, 900.0, wd);
  wc = mix(wc, wLagoon * 0.85 + wShallow * 0.15, msk.b * 0.55 * (1.0 - 0.5 * wf));
  wc = mix(wc, wShallow, smoothstep(0.05, 0.7, msk.g) * 0.75 * (1.0 - 0.4 * wf));
  wc = mix(wc, wLagoon, smoothstep(0.55, 1.0, msk.g) * 0.7 * (1.0 - 0.4 * wf));
  vec2 wp = vWP.xz + vec2(0.25 * wTime, 0.12 * wTime);
  vec4 mk = mix(texture2D(wNearTex, wp / 8.0), texture2D(wFarTex, wp / 40.0 + 0.37), smoothstep(25.0, 90.0, wd));
  mk *= (1.0 - far * 0.85) * mix(1.0, 0.3, smoothstep(0.35, 1.1, wDep)) * mix(1.0, 0.3, smoothstep(40.0, 200.0, cameraPosition.y));
  wc = mix(wc, wTrough, mk.g * 0.55);
  wc = mix(wc, wCrest, mk.r * 0.65);
  // sun glitter path: reflection of the low sun, broken up by the marks
  vec3 rv = reflect(normalize(wV), vec3(0.0, 1.0, 0.0));
  float sp = max(dot(rv, normalize(wSun)), 0.0);
  float path = (pow(sp, 160.0) * 0.9 + pow(sp, 22.0) * 0.18) * (0.55 + 0.9 * mk.r + 0.6 * mk.b);
  wc = mix(wc, wPath, clamp(path, 0.0, 0.85));
  wc = mix(wc, wGlint, clamp(mk.b * (0.08 + 0.3 * wf + 2.0 * pow(sp, 12.0)) + mk.r * pow(sp, 30.0) * 1.5, 0.0, 1.0));
  // foam line hugging the beaches, gently pulsing
  float foam = smoothstep(0.25, 0.75, msk.r) * (0.75 + 0.25 * sin(wTime * 2.2 + vWP.x * 0.7 + vWP.z * 0.5));
  wc = mix(wc, wFoam, foam * (1.0 - 0.6 * far));
  diffuseColor.rgb = wc;`;
