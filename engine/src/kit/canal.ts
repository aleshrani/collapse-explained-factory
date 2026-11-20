import * as THREE from "three";
import {camera, limit, Model, painted, Point, wood} from "./shared";
import {shell, sign} from "./interior";

// Nicaragua canal: the route was never built, so the kit is the proposal's scale model on an exhibition table:
// lake end, winding channel, lock chamber with gates and a toy ship, survey flags, trees and a legend card.
export type CanalParams={subject?:string;detail?:string;damage?:number;phase?:"proposal"|"work"|"record";crowd?:number;weather?:string};
export function build(p:CanalParams={}){
  const m=new Model(),wear=limit(Number(p.damage)||0,0,1);
  shell(m,22);
  const steel=painted("#56696d"),dark=painted("#2f3945"),cream=painted("#efe7d2"),water=painted("#4fa3a8","glass"),deep=painted("#3c8e96","glass"),
        green=painted("#7f9a62","earth"),hill=painted("#6f8c5a","earth"),sand=painted("#cdb883","earth"),concrete=painted("#b4b0a2","plate"),red=painted("#c9553a"),hull=painted("#35546b","plate");
  // table and base board
  m.box(0,1.0,0,18,.3,9,wood());for(const x of [-8.2,8.2])for(const z of [-3.8,3.8])m.box(x,.43,z,.4,.86,.4,steel);
  m.box(0,1.28,0,17.2,.26,8.4,sand,3);
  // terrain: hills either side, flat green plain
  m.box(0,1.46,0,17,.1,8.2,green,3);
  for(let i=0;i<16;i++){const x=-7.6+i%8*2.15+(i>7?1:0),z=(i>7?3.35:-3.3)+(i%3)*.15;m.mound(x,1.5,z,.8+(i%3)*.2,.28+(i%4)*.1,.65,hill,i);}
  // lake at the west end, channel snaking east
  m.add(new THREE.CylinderGeometry(3,3,.08,36).translate(-5.4,1.53,.2),deep);
  const path:[number,number][]=[[-3,.2],[-1.8,-.7],[-.5,.1],[.9,.9],[2.2,.3],[3.6,-.6],[5,.1],[7.2,.4]];
  for(let i=1;i<path.length;i++)m.beam([path[i-1][0],1.54,path[i-1][1]],[path[i][0],1.54,path[i][1]],1.05,water,.07);
  for(const [x,z] of path)m.add(new THREE.CylinderGeometry(.52,.52,.06,16).translate(x,1.54,z),water);
  // lock chamber: concrete walls, two gates, raised upper pool and a toy ship inside
  const lx=2.6,lz=.4;
  for(const s of [-1,1]){m.box(lx,1.82,lz+s*.82,2.8,.7,.32,concrete);m.box(lx,2.2,lz+s*.82,2.9,.08,.4,painted("#d6d1c0"));}
  for(const x of [lx-1.5,lx+1.5])for(const s of [-1,1])m.box(x+(x<lx?-.1:.1),1.9,lz+s*.35,.12,.78,.68,steel);
  m.box(lx,1.78,lz,2.8,.12,1.34,deep);
  m.box(lx,2.7,lz,.22,.2,1.9,steel);m.box(lx-1.5,2.4,lz,.14,.9,.14,steel);m.box(lx+1.5,2.4,lz,.14,.9,.14,steel);
  const ship=new THREE.Mesh(new THREE.CapsuleGeometry(.16,1.2,6,14).rotateZ(Math.PI/2),hull);ship.position.set(lx,1.99,lz);ship.scale.set(1,.7,1.3);m.group.add(ship);
  m.box(lx-.5,2.18,lz,.34,.22,.3,cream);
  for(let i=0;i<4;i++)m.box(lx+.1+i*.22,2.17,lz,.2,.14,.28,[red,painted("#e0b24a"),painted("#6c8aa0"),red][i]);
  // survey flags along the route, scale pins, little trees
  for(const [x,z] of [[-2.6,1.3],[-1.2,-1.5],[.4,1.6],[1.6,-1.2],[4.1,1.1],[5.6,-1.0],[6.8,1.2],[4,-1.6]]){m.pipe([x,1.52,z],[x,2.05,z],.015,dark);m.box(x+.12,1.98,z,.24,.14,.015,red);}
  for(let i=0;i<20;i++){const x=-7.5+(i*17%15),z=(i%2?-1:1)*(2.2+(i*7%4)*.4);if(x>1&&x<4.2&&Math.abs(z)<1.8)continue;m.add(new THREE.ConeGeometry(.16,.5,6).translate(x,1.76,z),painted("#4f7a4c","earth"));m.pipe([x,1.5,z],[x,1.52,z],.03,wood());}
  // legend card and sign on the wall; exhibition ropes
  m.box(-7.2,1.34,4.9,2.2,.06,.7,cream);for(let j=0;j<3;j++)m.box(-7.2,1.4,4.8+j*.2,1.7,.02,.04,steel);
  sign(m,0,4.5,-6.1,6.4,.9,String(p.subject||"Canal proposal model"));
  sign(m,-8.4,3,-6.1,3.0,.7,String(p.detail||"Proposed route"));
  const m2=new Model();for(let i=0;i<5;i++){const x=-8+i*4;m2.pipe([x,0,6],[x,1.05,6],.06,painted("#b6a06a"));}
  for(let i=0;i<4;i++)m2.beam([-8+i*4,.95,6],[-4+i*4,.95,6],.03,red);
  m.group.add(m2.assemble());
  if(wear>.5)m.box(-1.4,1.56,-1.2,1.1,.12,.8,painted("#c9a86a","earth"));
  const aim:Point=[0,1.7,0];
  const group=m.finish({wide:camera([9,7.5,13],aim,50),medium:camera([4.5,3.8,6.2],[2,1.8,0],44),close:camera([3.6,2.9,3.4],[2.6,1.9,.4],38)});
  group.cameras.aerial=camera([1,11,3],aim,52);
  group.cameras.low=camera([6,1.7,6.5],[1.5,1.9,0],46);
  group.cameras.dolly=camera([-9,4.2,5],[3,1.8,0],46);
  return {group,feet:[9.3,0,3.8] as Point,place:"canal"};
}
