// CarRiver collision check: steps every frame 0..449 and reports
//  (1) any penetration > 1 cm between a car part (OBB) and the static world (deck, ribs, rails, posts, hangers, chains,
//      towers, quay banks, river bed, landing stage), except the railing stretch being broken during the break frames
//      and the water surface from the first water contact (splash) on;
//  (2) any frame where the driver card's drawn silhouette pokes outside the cabin (while he is inside the car).
// Run: node scripts/carriver-collide.mjs [--bed=-0.6] [--verbose]
import { carAt, EV, CAR_FRAMES } from "../src/videos/carriver/car";
import { carBoxes, staticBoxes, penetration, GAP, axesOf, toLocal, CABIN_IN, WORLD, V3 } from "../src/videos/carriver/collide";
import { driverAt, POSE_EXT, SU, SCD } from "../src/videos/carriver/drivertrack";
import { camAt, shotAt } from "../src/videos/carriver/story";

const arg = (k: string) => process.argv.find((a) => a.startsWith(`--${k}`));
const bed = arg("bed"); if (bed) WORLD.bed = Number(bed.split("=")[1]);
const verbose = !!arg("verbose");
const TOL = 0.01;
if (!GAP.hit) { GAP.hit = EV.HIT; GAP.z0 = EV.ZHIT - 0.4; GAP.z1 = EV.ZHIT + 0.4; console.log("(car.ts sets no railing gap: using the old fixed +-0.4 m gap at the hit point)"); }
const c400 = carAt(400), dock: V3 = [c400.x + 3.9, 0, c400.z - 3.7];
const waterFrom = (EV as { WATER?: number }).WATER ?? EV.LAND;
console.log(`events: HIT ${EV.HIT}  TIP ${EV.TIP}  water contact ${waterFrom}  LAND ${EV.LAND}  gap z ${GAP.z0.toFixed(2)}..${GAP.z1.toFixed(2)}  bed ${WORLD.bed}`);

let hits = 0, hitFrames = new Set<number>(), cardHits = 0, cardFrames = new Set<number>();
const worst = new Map<string, { f: number; d: number; n: number }>();
for (let f = 0; f < CAR_FRAMES; f++) {
  const pose = carAt(f), car = carBoxes(pose), stat = staticBoxes(f, dock);
  for (const s of stat) {
    if (s.tag === "railbreak") continue;
    if (s.tag === "water" && f >= waterFrom) continue;
    for (const b of car) {
      const d = penetration(b, s.box);
      if (d > TOL) {
        hits++; hitFrames.add(f);
        const key = `${b.name} x ${s.box.name.replace(/@.*/, "")}`, w = worst.get(key);
        if (!w) worst.set(key, { f, d, n: 1 }); else { w.n++; if (d > w.d) { w.d = d; w.f = f; } }
        if (verbose) console.log(`f${f}: ${b.name} x ${s.box.name} ${(d * 100).toFixed(1)} cm`);
      }
    }
  }
  // driver card inside the cabin
  const dr = driverAt(f);
  if (dr && !dr.world) {
    const ax = axesOf(pose), l = dr.local ?? [-0.4, 1.3 - (975 - 400) * SU * SCD, 0];
    const p: V3 = [pose.x + ax[0][0] * l[0] + ax[1][0] * l[1] + ax[2][0] * l[2], pose.y + ax[0][1] * l[0] + ax[1][1] * l[1] + ax[2][1] * l[2], pose.z + ax[0][2] * l[0] + ax[1][2] * l[1] + ax[2][2] * l[2]];
    const cam = camAt(shotAt(f).id, f).pos, yaw = Math.atan2(cam[0] - p[0], cam[2] - p[2]), r: V3 = [Math.cos(yaw), 0, -Math.sin(yaw)];
    const e = POSE_EXT[dr.pose], m = SU * SCD, xs = dr.mirror ? [-e.x1, -e.x0] : [e.x0, e.x1];
    let out = 0;
    for (const xd of xs) for (const yd of [-25, 975 - e.top]) {
      const w: V3 = [p[0] + r[0] * xd * m, p[1] + yd * m, p[2] + r[2] * xd * m], q = toLocal(pose, ax, w);
      for (let i = 0; i < 3; i++) out = Math.max(out, CABIN_IN.min[i] - q[i], q[i] - CABIN_IN.max[i]);
    }
    if (out > TOL) {
      cardHits++; cardFrames.add(f);
      if (verbose) console.log(`f${f}: driver card (${dr.pose}) ${(out * 100).toFixed(1)} cm outside the cabin`);
    }
  }
}
const ranges = (s: Set<number>) => { const a = [...s].sort((x, y) => x - y), r: string[] = []; for (let i = 0; i < a.length; i++) { let j = i; while (j + 1 < a.length && a[j + 1] === a[j] + 1) j++; r.push(i === j ? `${a[i]}` : `${a[i]}-${a[j]}`); i = j; } return r.join(", "); };
console.log(`\ncar vs world: ${hits} penetrations > 1 cm in ${hitFrames.size} frames${hitFrames.size ? ` (${ranges(hitFrames)})` : ""}`);
for (const [k, w] of [...worst].sort((a, b) => b[1].d - a[1].d)) console.log(`  ${k.padEnd(28)} ${String(w.n).padStart(4)} hits, worst ${(w.d * 100).toFixed(1)} cm at f${w.f}`);
console.log(`driver card outside the cabin: ${cardFrames.size} frames${cardFrames.size ? ` (${ranges(cardFrames)})` : ""}`);
process.exitCode = hits + cardHits ? 1 : 0;
