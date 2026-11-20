import * as THREE from "three";
import { quad, V } from "../videos/bridge/build";
import { camera, Cameras, Context, container, limit, Model, painted, Point, wood } from "./shared";
import { sea } from "./sea";
import { stencil } from "./markings";
export type Params={derrickUp:boolean;damage:number};
export const defaults:Params={derrickUp:true,damage:.12};
export const hosts:Record<keyof Cameras,Point>={wide:[22.9,1.48,49.6],medium:[2.65,4.41,14.1],close:[2.5,4.41,8.4]};
export function build(params:Partial<Params>={},ctx:Context={}){
  const p={...defaults,...params},m=new Model(),damage=limit(p.damage,0,1);
  const shell=painted("#345e70"),boot=painted("#ab543f"),cream=painted("#e1d8b8"),deck=painted("#7d9792");
  const gold=painted("#dfaa49"),dark=painted("#485665"),glazing=painted("#517e89","glass");
  const stations=[[-26,4.3],[-23,6.9],[-14,7.5],[8,7.5],[16,6.6],[21,4.5],[26,.12]];
  const point=(i:number,s:number,y:number,k:number)=>V(s*stations[i][1]*k,y,stations[i][0]);
  for(let i=0;i<stations.length-1;i++){
    const dz=stations[i+1][0]-stations[i][0];
    for(const s of [-1,1]){
      for(const [y0,y1,k0,k1,mat] of [
        [-2.7,.96,.69,.92,boot],[.96,3.65,.92,1,shell],[3.65,3.87,1,1.005,cream],[3.87,4.4,1.005,1.005,shell]
      ] as const){
        const a=point(i,s,y0,k0),b=point(i,s,y1,k1),c=point(i+1,s,y1,k1),d=point(i+1,s,y0,k0);
        m.add(s===1?quad(a,b,c,d,(y1-y0)/3,dz/3):quad(d,c,b,a,(y1-y0)/3,dz/3),mat);
      }
      // Leave a real opening through the working deck between the hatch coamings.
      const inner=i===2?2.05:0;
      const a=V(s*inner,4.4,stations[i][0]),b=point(i,s,4.4,1.005),c=point(i+1,s,4.4,1.005),d=V(s*inner,4.4,stations[i+1][0]);
      m.add(s===1?quad(d,c,b,a,2,dz/3):quad(a,b,c,d,2,dz/3),deck);
      const railA=point(i,s,5.2,.99),railB=point(i+1,s,5.2,.99);
      for(const y of [4.89,5.27])m.pipe([railA.x,y,railA.z],[railB.x,y,railB.z],.061,cream);
      for(let j=0;j<Math.ceil(dz/2.1);j++){
        const mid=railA.clone().lerp(railB,j/Math.ceil(dz/2.1));
        m.pipe([mid.x,4.4,mid.z],[mid.x,5.27,mid.z],.066,dark);
      }
    }
  }
  m.box(0,1.35,-26,8.6,6,.15,shell);
  for(const s of [-1,1]){
    for(const z of [-20,-17,-14,-11,-8,10,12.5]){
      const x=s*(z< -14?6.99:7.31);
      const g=new THREE.TorusGeometry(.25,.075,8,16).rotateY(Math.PI/2).translate(x,3.12,z);m.add(g,cream);
    }
    m.box(s*2.19,4.62,-3,.32,.43,22,painted("#dbab56","stripe"),2.1);
    m.box(s*1.1,4.4,-8.9,2.14,.27,10.2,painted("#758483","rib"),2);
    m.box(s*1.1,4.4,6.6,2.14,.27,2.8,painted("#758483","rib"),2);
  }
  // Accommodation block: overhanging wheelhouse, continuous bridge glazing, two uptakes and a radar bar.
  for(let i=0;i<3;i++){
    const y=4.4+i*1.83;
    m.box(0,y+.93,-18+i*.35,10-i*.65,1.8,8.1-i*.4,cream);
    m.box(0,y+1.22,-18+i*.35,10.1-i*.65,.61,8.19-i*.4,glazing,2);
    m.box(0,y+1.85,-18+i*.35,10.65-i*.65,.16,8.6-i*.4,deck);
  }
  m.box(0,10.93,-16.7,10.9,1.8,5.1,glazing,2.3);
  m.box(0,11.93,-16.7,11.3,.26,5.52,cream);
  for(const s of [-1,1]){
    m.box(s*2.5,12,-20.6,1.5,4.5,1.7,boot);m.box(s*2.5,14.1,-20.6,1.63,.63,1.84,dark);
  }
  m.pipe([0,12,-16.4],[0,15.8,-16.4],.14,dark);
  m.box(0,15.55,-16.4,3.5,.22,.4,cream);
  // Both lifting frames rotate down around their pinned feet into deck cradles.
  const H=p.derrickUp?17.5:3.9, shift=p.derrickUp?0:12.4;
  const corners=(t:number):Point[]=>[-1,1].flatMap(s=>[-1,1].map(v=>[s*(4.7-3.35*t),4.5+H*t,-3+shift*t+v*(5.4-4.1*t)] as Point));
  const order=[0,1,3,2],base=corners(0),top=corners(1);
  for(let j=0;j<4;j++)m.beam(base[j],top[j],.54,gold);
  for(let n=0;n<6;n++){
    const lower=corners(n/6),upper=corners((n+1)/6);
    for(let j=0;j<4;j++){
      const a=order[j],b=order[(j+1)%4];
      m.beam(upper[a],upper[b],.23,gold);
      m.beam(n%2?lower[a]:lower[b],n%2?upper[b]:upper[a],.21,gold);
    }
  }
  m.box(0,4.72+H,-3+shift,3.65,.61,3.25,boot);
  for(const x of [-.31,.31])m.pipe([x,4.5+H,-3+shift],[x,5.5+H*.32,-3+shift],.073,dark);
  m.box(0,5.5+H*.32,-3+shift,1.16,.94,.68,painted("#dba742","stripe"),0);
  for(const s of [-1,1]){container(m,s*3.95,4.41,-11,3.1,2.4,s>0?"#b5694e":"#5f9493");m.pipe([s*3.25,4.42,16],[s*3.25,5.2,16],.32,dark);}
  m.box(0,4.73,19.6,2.68,.65,2.8,deck);
  if(damage>0)for(let i=0;i<Math.ceil(damage*24);i++){
    const z=-12+i*.81,x=7.49-.15*Math.sin(i);
    m.beam([x,3.66,z],[x-.18,3.66-damage*(.6+.45*(i%3)),z+.09],.12+damage*.15,boot);
  }
  // Fender tyres hang clear of the shell. The bow carries a paired windlass, chain and mooring chocks.
  for(const s of [-1,1]){
    for(const z of [-12,-5,2,8]){
      m.add(new THREE.TorusGeometry(.46,.17,9,20).rotateY(Math.PI/2).translate(s*7.48,2.73,z),dark);
      for(const dz of [-.25,.25])m.beam([s*7.5,3.02,z+dz],[s*7.56,4.37,z+dz*1.55],.055,cream);
    }
    for(const z of [17.9,20.9]){
      m.pipe([s*1.85-.59,5.02,z],[s*1.85+.59,5.02,z],.31,painted("#769393","rib"));
      for(const dx of [-.46,.46])m.pipe([s*1.85+dx-.07,5.02,z],[s*1.85+dx+.07,5.02,z],.45,boot);
      m.box(s*1.85,4.58,z,1.52,.33,1.14,cream);
    }
    for(let i=0;i<15;i++){
      const g=new THREE.TorusGeometry(.124,.044,6,12).scale(.76,1.3,1).rotateX(-Math.PI/2+(i%2)*.85);
      m.add(g.translate(s*(1.85-i*.065),4.47+(i%2)*.05,20.6+i*.22),dark);
    }
  }
  m.group.add(sea(ctx.light??"day"));
  // Observer's tender landing provides a real standing surface for the sea-level wide.
  m.box(23.5,1.31,51.2,4.5,.34,10,wood(),2.25);
  for(const x of [21.55,25.45])for(const z of [46.45,55.95])m.pipe([x,-1,z],[x,1.69,z],.18,dark);
  m.box(-.05,10.08,-12.78,2.08,.6,.07,stencil("04","#597777"),0);
  return m.finish({wide:camera([25,4.1,58.5],[0,7.6,2],55),medium:camera([2.5,5.88,17.5],[.15,9,-4],55),close:camera([3.2,5.8,11.15],[2.3,5.65,8.1],40)});
}
