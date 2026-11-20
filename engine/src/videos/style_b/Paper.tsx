// Style B: cut paper. Everything is a thin extruded paper cut-out with slightly crooked (jittered) edges, a fibre
// grain map + bump, a white paper core on the cut edges, and real soft shadows between the layers. The set is a
// cardboard diorama seen nearly head-on: sky sheet, clouds, house row, road strip, parked car, lamp, hydrant,
// cardboard kerb in front; the dummy is a stack of ~40 paper pieces (limbs, joints, face parts) a few cm apart.
import React from "react";
import * as THREE from "three";
import { ToneMappingMode } from "postprocessing";
import { StyleStage, StyleDef } from "../style_lab/stage";
import { bumpTex, canvasTex, rand, resetRand, targetTex } from "../style_lab/core";
import { LensBlur } from "../style_lab/lensblur";

type P = [number, number];
const J = 0.0035; // edge jitter (m)
const circ = (cx: number, cy: number, rx: number, ry = rx, n = 40): P[] => Array.from({ length: n }, (_, i) => { const a = (i / n) * Math.PI * 2; return [cx + rx * Math.cos(a), cy + ry * Math.sin(a)]; });
const stadium = (a: P, b: P, r: number): P[] => {
  const dx = b[0] - a[0], dy = b[1] - a[1], ang = Math.atan2(dy, dx), out: P[] = [];
  for (let i = 0; i <= 12; i++) { const t = ang + Math.PI / 2 + (Math.PI * i) / 12; out.push([b[0] + r * Math.cos(t - Math.PI), b[1] + r * Math.sin(t - Math.PI)]); }
  for (let i = 0; i <= 12; i++) { const t = ang - Math.PI / 2 + (Math.PI * i) / 12; out.push([a[0] + r * Math.cos(t - Math.PI), a[1] + r * Math.sin(t - Math.PI)]); }
  return out;
};
const rect = (x0: number, y0: number, x1: number, y1: number, r = 0.01): P[] => {
  const out: P[] = [];
  for (const [cx, cy, a] of [[x1 - r, y1 - r, 0], [x0 + r, y1 - r, 90], [x0 + r, y0 + r, 180], [x1 - r, y0 + r, 270]] as const)
    for (let i = 0; i <= 4; i++) out.push([cx + r * Math.cos(((a + 22.5 * i) * Math.PI) / 180), cy + r * Math.sin(((a + 22.5 * i) * Math.PI) / 180)]);
  return out;
};
/** densify + jitter the outline so cuts look hand-made */
const crooked = (pts: P[], j = J): P[] => {
  const out: P[] = [];
  for (let i = 0; i < pts.length; i++) {
    const a = pts[i], b = pts[(i + 1) % pts.length], n = Math.max(1, Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) / 0.03));
    for (let k = 0; k < n; k++) out.push([a[0] + ((b[0] - a[0]) * k) / n + (rand() - 0.5) * 2 * j, a[1] + ((b[1] - a[1]) * k) / n + (rand() - 0.5) * 2 * j]);
  }
  return out;
};

const def: StyleDef = {
  cam: { pos: [0.08, 1.0, 4.7], look: [0, 0.98, 0], fov: 27 },
  shadows: "variance",
  tone: ToneMappingMode.NEUTRAL,
  exposure: 1.05,
  build: (scene) => {
    resetRand(5);
    const fibre = bumpTex("fibre", 1);
    const grain = canvasTex(512, 512, (g) => {
      g.fillStyle = "#ffffff"; g.fillRect(0, 0, 512, 512);
      for (let i = 0; i < 2600; i++) { const x = rand() * 512, y = rand() * 512, a = rand() * Math.PI, l = 4 + rand() * 14; g.strokeStyle = `rgba(0,0,0,${0.03 + rand() * 0.06})`; g.lineWidth = 1; g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l); g.stroke(); }
      for (let i = 0; i < 9000; i++) { g.fillStyle = `rgba(0,0,0,${rand() * 0.05})`; g.fillRect(rand() * 512, rand() * 512, 2, 2); }
    }, true, [1, 1]);
    for (const t of [fibre, grain]) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(1.6, 1.6); }
    const edge = new THREE.MeshStandardMaterial({ color: "#f4efe6", roughness: 1 });
    const mats = new Map<string, THREE.Material>();
    const paper = (col: string) => {
      let m = mats.get(col);
      if (!m) { m = new THREE.MeshStandardMaterial({ color: col, map: grain, bumpMap: fibre, bumpScale: 2, roughness: 0.95 }); mats.set(col, m); }
      return m;
    };
    const root = new THREE.Group();
    /** one paper piece: outline in the x/y plane at depth z, thickness th */
    const piece = (pts: P[], col: string, z: number, th = 0.004, rot = 0, j = J, parent: THREE.Object3D = root, map?: THREE.Texture) => {
      const shape = new THREE.Shape(crooked(pts, j).map(([x, y]) => new THREE.Vector2(x, y)));
      const g = new THREE.ExtrudeGeometry(shape, { depth: th, bevelEnabled: false, curveSegments: 4 });
      const face = map ? new THREE.MeshStandardMaterial({ color: "#ffffff", map, roughness: 0.95, bumpMap: fibre, bumpScale: 2 }) : paper(col);
      if (map) { g.computeBoundingBox(); const bb = g.boundingBox!, uv = g.attributes.uv as THREE.BufferAttribute, pos = g.attributes.position as THREE.BufferAttribute;
        for (let i = 0; i < uv.count; i++) uv.setXY(i, (pos.getX(i) - bb.min.x) / (bb.max.x - bb.min.x), (pos.getY(i) - bb.min.y) / (bb.max.y - bb.min.y)); }
      const m = new THREE.Mesh(g, [face, edge]);
      m.position.z = z; m.rotation.z = rot; m.castShadow = true; m.receiveShadow = true;
      parent.add(m);
      return m;
    };
    // ---- set: sky sheet, clouds, house row, road, car, lamp, hydrant, kerb ----
    piece(rect(-8, -3, 8, 9, 0.001), "#8fc4ea", -7, 0.01, 0, 0.001);
    for (const [x, y, s] of [[-2.2, 4.4, 1], [1.8, 5.2, 1.3], [3.4, 3.6, 0.8]] as const) {
      const c = [...circ(x, y, 0.6 * s, 0.3 * s), ...circ(x + 0.5 * s, y + 0.15 * s, 0.45 * s, 0.35 * s), ...circ(x - 0.45 * s, y + 0.05 * s, 0.35 * s, 0.25 * s)];
      piece(circ(x, y, 0.75 * s, 0.38 * s, 30), "#fbf8f2", -6.6, 0.006, 0, 0.03); void c;
    }
    const walls = ["#d9765a", "#e9c46a", "#7fb0d4", "#e39bb0", "#9cc97f", "#efe2c6"];
    let x = -5.2;
    for (let i = 0; x < 5.5; i++) {
      const w = 1.7 + rand() * 0.9, h = 2.8 + rand() * 1.6, col = walls[i % walls.length];
      piece([...rect(x, 0, x + w, h, 0.005), ], col, -5.2 - (i % 2) * 0.12, 0.008, (rand() - 0.5) * 0.02);
      piece([[x - 0.06, h], [x + w + 0.06, h], [x + w / 2, h + 0.55 + rand() * 0.3]], i % 2 ? "#a8564a" : "#7a6a8a", -5.25 - (i % 2) * 0.12, 0.008, 0);
      const cols = Math.max(2, Math.floor(w / 0.55));
      for (let fl = 0; fl < Math.floor((h - 0.6) / 0.8); fl++) for (let c = 0; c < cols; c++) {
        const wx = x + (w * (c + 0.5)) / cols, wy = 0.95 + fl * 0.8;
        if (fl === 0 && c === Math.floor(cols / 2)) { piece(rect(wx - 0.18, 0, wx + 0.18, 0.75, 0.04), "#6a4632", -5.13 - (i % 2) * 0.12, 0.004); continue; }
        piece(rect(wx - 0.17, wy - 0.24, wx + 0.17, wy + 0.24, 0.01), "#fbf7ef", -5.15 - (i % 2) * 0.12, 0.004, (rand() - 0.5) * 0.04);
        piece(rect(wx - 0.13, wy - 0.2, wx + 0.13, wy + 0.2, 0.01), "#3d5a7a", -5.13 - (i % 2) * 0.12, 0.004, (rand() - 0.5) * 0.04);
      }
      x += w + 0.04;
    }
    // far sidewalk + road strip with dashes
    piece(rect(-6, -0.05, 6, 0.32, 0.005), "#cfc6b8", -4.2, 0.006);
    piece(rect(-6, -0.5, 6, 0.06, 0.005), "#5d5e68", -3.4, 0.006);
    for (let dx = -5; dx < 5; dx += 0.9) piece(rect(dx, -0.2, dx + 0.45, -0.15, 0.01), "#f3ecd8", -3.38, 0.003, (rand() - 0.5) * 0.06);
    // parked car (left, behind the dummy)
    const car = new THREE.Group(); car.position.set(-1.25, 0, -2.2); root.add(car);
    piece([[-1.3, 0.25], [1.3, 0.25], [1.32, 0.62], [0.65, 0.66], [0.38, 1.02], [-0.55, 1.02], [-0.85, 0.66], [-1.32, 0.6]], "#d9463a", 0, 0.006, 0, J, car);
    piece([[-0.5, 0.68], [-0.08, 0.68], [-0.08, 0.95], [-0.45, 0.95]], "#a9d2ea", 0.02, 0.004, 0, J, car);
    piece([[0.0, 0.68], [0.55, 0.68], [0.34, 0.95], [0.0, 0.95]], "#a9d2ea", 0.02, 0.004, 0, J, car);
    piece(rect(-1.32, 0.3, 1.32, 0.38, 0.03), "#f1ebe0", 0.02, 0.004, 0, J, car);
    for (const wx of [-0.78, 0.8]) { piece(circ(wx, 0.24, 0.24), "#2a2830", 0.03, 0.006, 0, J, car); piece(circ(wx, 0.24, 0.11), "#d8d4cc", 0.05, 0.004, 0, J, car); }
    piece(circ(1.22, 0.52, 0.06), "#fff1b8", 0.03, 0.004, 0, J, car);
    // cardboard kerb + near sidewalk in front of everything (corrugated stripes printed on)
    const card = canvasTex(512, 128, (g) => { g.fillStyle = "#c79a62"; g.fillRect(0, 0, 512, 128); for (let i = 0; i < 64; i++) { g.fillStyle = i % 2 ? "rgba(90,60,30,0.18)" : "rgba(255,240,210,0.12)"; g.fillRect(i * 8, 0, 4, 128); } }, true);
    piece(rect(-4, -2, 4, 0.22, 0.004), "#c9c0b2", 0.6, 0.012);
    for (let tx = -3.5; tx < 3.5; tx += 0.62) piece([[tx, -1.9], [tx + 0.02, 0.18]].length ? rect(tx, -1.9, tx + 0.012, 0.18, 0.002) : [], "#a69c8e", 0.613, 0.002);
    piece(rect(-4, 0.12, 4, 0.26, 0.004), "#b8b1a6", 0.62, 0.016, 0, J, root);
    piece(rect(-4, -2, 4, -0.2, 0.004), "#ffffff", 0.64, 0.02, 0, 0.002, root, card);
    // lamp post (right) + hydrant (left)
    piece([...rect(0.92, 0.1, 0.99, 3.2, 0.01)], "#2f6a55", -0.4, 0.006);
    piece([[0.7, 3.2], [1.2, 3.2], [1.1, 3.42], [0.8, 3.42]], "#2f6a55", -0.38, 0.006);
    piece(circ(0.95, 3.08, 0.16, 0.14), "#fff0b0", -0.41, 0.004);
    piece(rect(0.86, 0.1, 1.05, 0.42, 0.03), "#2f6a55", -0.37, 0.006);
    piece(rect(-0.82, 0.12, -0.6, 0.62, 0.06), "#d8402f", -0.3, 0.006);
    piece(circ(-0.71, 0.64, 0.12, 0.09), "#d8402f", -0.29, 0.006);
    piece(rect(-0.9, 0.42, -0.52, 0.5, 0.03), "#b8352a", -0.28, 0.004);
    // ---- the dummy: paper layers at z 0 .. 0.12 ----
    const Y = "#f2b52e", Yd = "#d99a2a", G = "#4a4955", K = "#1d1a20", D = new THREE.Group(); D.position.set(0.02, 0.15, 0); root.add(D);
    const pc = (pts: P[], col: string, z: number, rot = 0, map?: THREE.Texture) => piece(pts, col, z, 0.004, rot, J, D, map);
    const legs: [P, P, P][] = [[[-0.1, 0.46], [-0.06, 0.27], [-0.22, 0.08]], [[0.1, 0.46], [0.06, 0.27], [0.22, 0.08]]];
    for (const [h, k, a] of legs) {
      pc(stadium(h, k, 0.058), Y, 0.0); pc(stadium(k, a, 0.052), Y, 0.006);
      pc(circ(k[0], k[1], 0.058), G, 0.014); pc(rect(a[0] - 0.08 + Math.sign(a[0]) * 0.03, 0.0, a[0] + 0.08 + Math.sign(a[0]) * 0.03, 0.09, 0.035), "#2c2a33", 0.016);
    }
    const arms: [P, P, P][] = [[[-0.24, 1.08], [-0.4, 1.25], [-0.47, 1.52]], [[0.24, 1.08], [0.42, 1.2], [0.52, 1.42]]];
    for (const [s, e, hd] of arms) { pc(stadium(s, e, 0.052), Y, 0.004); pc(stadium(e, hd, 0.047), Y, 0.01); pc(circ(e[0], e[1], 0.056), G, 0.016); pc(circ(hd[0], hd[1], 0.064), G, 0.018); }
    pc(rect(-0.17, 0.42, 0.17, 0.56, 0.05), G, 0.02);
    pc(rect(-0.15, 0.56, 0.15, 0.63, 0.02), Yd, 0.026); pc(rect(-0.16, 0.64, 0.16, 0.71, 0.02), Yd, 0.03);
    pc(rect(-0.06, 1.1, 0.06, 1.25, 0.02), G, 0.024);
    pc(circ(0, 0.93, 0.215, 0.255), Y, 0.036);
    pc(rect(-0.2, 0.8, 0.2, 0.825, 0.01), G, 0.042);
    for (const s of [-1, 1]) pc(circ(s * 0.245, 1.08, 0.068), G, 0.046);
    pc(circ(-0.09, 0.99, 0.06), "#ffffff", 0.044, 0, targetTex());
    pc(rect(0.02, 0.95, 0.16, 1.03, 0.005), "#ffffff", 0.044, 0, canvasTex(256, 160, (g) => { g.fillStyle = Y; g.fillRect(0, 0, 256, 160); g.font = `900 140px "Arial Black", Arial, sans-serif`; g.textAlign = "center"; g.textBaseline = "middle"; g.fillStyle = K; g.fillText("07", 128, 86); }));
    // head + face
    pc(circ(0, 1.43, 0.215, 0.226), Y, 0.05);
    for (const s of [-1, 1]) { pc(circ(s * 0.205, 1.42, 0.035, 0.045), G, 0.044); pc(circ(s * 0.15, 1.55, 0.042), "#ffffff", 0.056, 0, targetTex()); }
    for (const s of [-1, 1]) {
      pc(circ(s * 0.075, 1.47, 0.06, 0.066), "#fdfbf6", 0.058);
      pc(circ(s * 0.068, 1.46, 0.021), K, 0.064);
      pc(stadium([s * 0.035, 1.565], [s * 0.115, 1.535], 0.014), K, 0.064);
    }
    pc(circ(0, 1.33, 0.05, 0.062), "#5c1a26", 0.058);
    pc(circ(0, 1.3, 0.03, 0.02), "#e46a74", 0.064);
    for (const [sx, sy, sc] of [[-0.3, 1.6, 1], [0.31, 1.55, 0.85], [-0.28, 1.4, 0.7]] as const)
      pc([...circ(sx, sy, 0.026 * sc, 0.026 * sc, 16).slice(8), [sx + Math.sign(sx) * 0.012, sy + 0.06 * sc], ...circ(sx, sy, 0.026 * sc, 0.026 * sc, 16).slice(0, 8)], "#9bd3f6", 0.07, 0);
    // ---- light: soft warm key from upper left front (shadows step between the layers), cool sky fill ----
    scene.background = new THREE.Color("#8fc4ea");
    root.add(new THREE.HemisphereLight("#f4f8ff", "#b8a890", 1.1));
    const key = new THREE.DirectionalLight("#fff0da", 2.4); key.position.set(-3.6, 3.2, 3.4); key.target.position.set(0, 1, 0);
    key.castShadow = true; key.shadow.mapSize.set(2048, 2048); key.shadow.radius = 6; key.shadow.blurSamples = 16; key.shadow.bias = -0.0002;
    Object.assign(key.shadow.camera, { left: -4, right: 4, top: 5, bottom: -3, near: 0.5, far: 20 });
    root.add(key, key.target);
    const lens = new LensBlur({ maxCoC: 20, nearScale: 1.0 }); lens.cInf = 6; lens.focus = 4.65;
    return { root, post: [lens.pre, lens.main] };
  },
};
export const StyleB: React.FC = () => <StyleStage def={def} />;
