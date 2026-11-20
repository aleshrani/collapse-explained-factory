import * as THREE from "three";
import {camera, container, limit, Context, Model, painted, Point, ridge, wood} from "./shared";
import {stencil} from "./markings";

// Inert railway-gun exhibit: four rails, twenty-axle carriage, elevated tube, shells on dunnage,
// brick engine shed behind and a shunter for scale. Nose +x, tracks along x, ground at y = 0.
export type RailParams={subject?:string;detail?:string;damage?:number;phase?:"proposal"|"work"|"record";crowd?:number;weather?:string};
const RAILS=[-4.4,-2.97,2.97,4.4];
function wheel(m:Model,x:number,z:number,mat:THREE.Material,hub:THREE.Material){
  m.add(new THREE.CylinderGeometry(.62,.62,.2,18).rotateX(Math.PI/2).translate(x,.66,z),mat);
  m.add(new THREE.CylinderGeometry(.3,.3,.26,12).rotateX(Math.PI/2).translate(x,.66,z),hub);
}
export function build(p:RailParams={},_ctx:Context={}){
  const m=new Model(),wear=limit(Number(p.damage)||0,0,1);
  const iron=painted("#4f5b61"),steel=painted("#677a82"),dark=painted("#333e45"),grey=painted("#79878a","rib"),cream=painted("#dfceb1"),
        rust=painted("#8a5a42"),brass=painted("#a89a77"),brick=painted("#a8806a","wall"),roofm=painted("#6f6a62","rib"),gravel=painted("#a39a89","earth"),
        sleeper=wood(),railtop=painted("#a3abab"),shell=painted("#6e7a70"),band=painted("#c3a24a"),pane=painted("#749aa9","glass");
  // Ground, hills, ballast and sleepers.
  m.box(0,-.19,0,690,.34,690,painted("#b9ac8d","earth"),5);
  const distant=painted("#8f9d88","earth");ridge(m,-78,distant,11,21);ridge(m,-119,distant,16,14);
  m.box(0,.06,0,64,.14,13.4,gravel,5);
  for(let x=-30;x<=30;x+=.95)for(const z of [-3.7,3.7])m.box(x,.17,z,.34,.12,3.5,sleeper);
  for(const z of RAILS){m.box(0,.3,z,64,.14,.1,railtop);m.box(0,.22,z,64,.1,.19,dark);}
  for(let i=0;i<22;i++)m.mound(-31+i*3,.08,(i%2?-1:1)*(6.2+i%3*.4),1.6,.2,.8,gravel,i);
  // Twenty-axle carriage: two bogie trains per side, girders, cross-members, spring blocks.
  for(const z of RAILS)for(let k=0;k<11;k++)wheel(m,-9.5+k*1.9,z,iron,brass);
  for(const z of [-3.7,3.7]){
    m.box(0,1.35,z,21.5,.44,3.4,dark);
    for(let k=0;k<5;k++){m.box(-8.6+k*4.3,1.0,z-1.43,3.4,.42,.14,steel);m.box(-8.6+k*4.3,1.0,z+1.43,3.4,.42,.14,steel);}
    m.box(0,2.62,z,22.6,2.0,1.15,painted("#6d7f86","plate"),3);
    m.box(0,3.74,z,23,.26,1.45,steel);
    for(let k=0;k<11;k++)m.box(-10+k*2,2.62,z+(z>0?-.6:.6),.09,2,.07,dark);
  }
  for(let x=-10.5;x<=10.5;x+=2.1)m.box(x,2.55,0,1.1,.7,7.6,steel);
  m.box(0,3.35,0,22,.3,6.4,grey);
  for(const z of [-3.7,3.7])for(let x=-9;x<=9;x+=3)m.box(x,.62,z-(z>0?1.6:-1.6),.24,.5,.2,brass);
  // Central cradle: two heavy cheeks, trunnion, breech housing and the elevating arc.
  for(const s of [-1,1]){
    m.box(0,6.3,s*2.05,6.4,5.2,.55,painted("#6c7b82","plate"),3);
    m.box(0,3.9,s*2.05,7.2,.5,.9,steel);
    m.box(-3.4,5.3,s*1.2,2.4,2.4,.6,steel);
    for(let k=0;k<4;k++)m.box(-.4+k*.9,8.95,s*2.05,.42,.28,.62,brass);
  }
  m.pipe([0,6.9,-2.4],[0,6.9,2.4],.42,dark);
  m.box(-3.6,5.8,0,2.8,3.0,3.1,painted("#5b6a72","plate"),2.5);
  m.box(-3.55,7.52,0,2.1,.5,2.5,steel);
  for(let k=0;k<5;k++){const a=-1.25+k*.62;m.beam([-4.7+a*.1,4,-.9+a*.3],[-4.2+a*.1,6.1,-.9+a*.3],.16,dark);}
  for(const s of [-1,1])m.beam([-3.2,3.8,s*1.3],[-4.6,5.4,s*1.0],.3,brass);
  // The tube: breech jacket, long tube with collars, muzzle brake, and two recoil cylinders along it.
  const axis=new THREE.Vector3(16.5,7.8,0).normalize(),origin=new THREE.Vector3(-4.2,6.0,0);
  const at=(t:number):Point=>{const v=origin.clone().addScaledVector(axis,t);return [v.x,v.y,v.z];};
  m.pipe(at(0),at(8.5),.74,painted("#566873"));
  m.pipe(at(8.5),at(26),.52,painted("#5a6c76"));
  for(const [t,r] of [[1.2,.84],[5.6,.82],[9.5,.64],[14.5,.6],[19.5,.6],[24.8,.62]] as const)m.pipe(at(t-.18),at(t+.18),r,dark);
  m.pipe(at(25.4),at(27.6),.66,dark);
  for(const k of [0,1,2])m.box(...at(26.1+k*.5),.12,.95,.95,painted("#3a464d"));
  for(const s of [-1,1]){
    const a=at(.3),b=at(6.4);
    m.pipe([a[0],a[1]+.15,s*1.18],[b[0],b[1]+.15,s*1.18],.17,brass);
  }
  m.box(...at(.4),1.1,1.0,1.1,steel);
  // Walkways, handrails, ladder and a maintenance gantry beside the cradle.
  for(const s of [-1,1]){
    m.box(2.5,3.74,s*4.6,9.5,.14,.9,painted("#8e9a95","rib"));
    for(let j=0;j<=9;j++)m.pipe([-2+j*1.06,3.78,s*5.05],[-2+j*1.06,4.7,s*5.05],.04,cream);
    m.beam([-2,4.7,s*5.05],[7.5,4.7,s*5.05],.05,cream);m.beam([-2,4.25,s*5.05],[7.5,4.25,s*5.05],.04,cream);
  }
  m.beam([7,.4,4.9],[7.6,3.74,4.9],.07,cream);m.beam([7.5,.4,4.9],[8.1,3.74,4.9],.07,cream);
  for(let j=0;j<12;j++)m.beam([7.1+j*.045,.4+j*.28,4.9],[7.6+j*.045,.4+j*.28,4.9],.05,cream);
  // Shells on dunnage: ogive nose, driving band and base plug.
  const shells=new Model();
  for(const [dz,dy] of [[0,0],[.82,0],[.41,.7]] as const){
    shells.pipe([-8.2,1.02+dy,8.1+dz*1.0],[-5.3,1.02+dy,8.1+dz*1.0],.38,shell);
    shells.add(new THREE.ConeGeometry(.38,1.0,14).rotateZ(-Math.PI/2).translate(-4.8,1.02+dy,8.1+dz),shell);
    shells.pipe([-6.1,1.02+dy,8.1+dz],[-5.7,1.02+dy,8.1+dz],.4,band);
  }
  for(const x of [-7.6,-5.6]){shells.box(x,.3,8.5,.5,.6,2.0,wood());}
  m.group.add(shells.assemble());
  // Brick engine shed with glazing, roller door and roof, set back across the yard.
  m.box(0,3.6,-15,46,7.2,.9,brick,4);
  m.box(0,7.35,-14.2,47.5,.4,3.0,roofm);
  for(let x=-19;x<=19;x+=6.3)m.box(x,3.9,-14.45,2.6,2.4,.08,pane);
  m.box(-8,2.0,-14.5,5.4,4.0,.12,painted("#5d7078","rib"));
  m.box(14,2.0,-14.5,5.4,4.0,.12,painted("#5d7078","rib"));
  // Shunter locomotive at the left for scale.
  const loco=new Model();
  loco.box(-23,1.65,-3.7,6.8,1.5,2.8,painted("#9a4e3d","plate"));
  loco.box(-21.4,3.0,-3.7,3.0,1.6,2.7,cream);loco.box(-21.4,3.2,-3.7,3.02,.6,2.72,pane);
  loco.box(-25,2.7,-3.7,2.4,.8,2.4,painted("#8a4636"));
  for(const dx of [-24.5,-22.5,-20.7])for(const s of [-1,1]){loco.add(new THREE.CylinderGeometry(.55,.55,.18,16).rotateX(Math.PI/2).translate(dx,.6,-3.7+s*1.42),iron);}
  m.group.add(loco.assemble());
  // Telegraph poles, a signal and a stack of freight containers.
  for(let x=-28;x<=28;x+=14){m.pipe([x,0,-10.5],[x,6.2,-10.5],.1,wood());m.beam([x-1.1,5.9,-10.5],[x+1.1,5.9,-10.5],.08,wood());}
  m.pipe([19,0,6.4],[19,5.2,6.4],.08,iron);m.box(19,5.45,6.4,.5,.9,.34,dark);
  container(m,24,0,-11,6.1,2.5,"#9a5c3d");container(m,24,2.64,-11.2,6.1,2.5,"#617a80");container(m,-30,0,-11,6.1,2.5,"#a8905a");
  // Weathering from the damage parameter.
  for(let i=0;i<Math.round(wear*18);i++){
    const x=-10+(i*5%20)*1.0,z=(i%2?3.7:-3.7)+(i%2?-.6:.6)+(i%2?-.06:.06);
    m.box(x,2.2+(i*3%5)*.28,z,.5+(i%3)*.5,.35,.05,i%3?rust:painted("#2f2a29"));
  }
  // Information board near the host.
  const title=String(p.subject||"Railway exhibit");
  const board=new Model();for(const x of [4.6,6.8]){board.pipe([x,0,7.2],[x,1.9,7.2],.06,dark);}
  m.group.add(board.assemble());
  const plate=new THREE.Mesh(new THREE.PlaneGeometry(2.3,.8),stencil(title,"#49686c"));
  plate.position.set(5.7,1.55,7.14);plate.rotation.y=.55;m.group.add(plate);
  const target:Point=[3,5.5,0];
  const group=m.finish({wide:camera([30,11.5,38],target,50),medium:camera([17.4,3.7,15.5],[5.2,4.4,0],44),close:camera([13.5,2.8,12.6],[9,3.6,3],40)});
  group.cameras.aerial=camera([14,26,30],[2,3,0],54);
  group.cameras.low=camera([14.5,1.1,15],[3,6,0],46);
  group.cameras.dolly=camera([22,4.6,17.5],[0,5,0],42);
  const feet:Point=[10.6,0,7.4];
  return {group,feet,place:"railway-exhibit"};
}
