import * as THREE from "three";
import {Model,painted,wood} from "./shared";
import {finish,paper,RoomParams,shell,sign,table} from "./interior";
import {addPerson} from "./extras";
import {swing} from "./motion";
export function build(p:RoomParams){
  const m=new Model();shell(m,Math.max(13,Math.min(24,p.size??17)));
  const oak=wood(),trim=painted("#786453"),leather=painted("#5c6f66");
  if(p.state==="custody"){
    const steel=painted("#74807e","rib"),glass=painted("#88a4a3","glass"),tile=painted("#a6aaa0","plate");
    m.box(0,1.94,-1.55,10.4,3.88,.28,tile);
    m.box(-1.72,1.61,-1.36,2.55,3.21,.21,steel);
    m.box(-1.72,2.23,-1.22,1.59,.98,.07,glass);
    for(let j=0;j<6;j++)m.box(-2.43+j*.28,2.23,-1.14,.071,.99,.09,trim);
    m.box(-.8,1.3,-1.17,.3,.13,.15,trim);
    m.box(1.69,.54,-.88,2.62,.17,1,oak);
    for(const x of [.57,2.82])m.box(x,.26,-.87,.2,.53,.62,steel);
    sign(m,1.72,2.34,-1.29,2.68,.57,p.subject||"Custody record");
    sign(m,-1.72,3.41,-1.28,2.26,.38,p.detail||"Holding room");
    // something always moves in the foreground: a guard paces the corridor and the hanging lamp swings
    addPerson(m.group,{x:.5,y:0,z:.6,variant:2,scale:1,walk:{dx:3.6,period:9,angle:20,pause:true}});
    const lamp=new THREE.Group();lamp.position.set(2.4,4.7,.3);
    const cord=new THREE.Mesh(new THREE.CylinderGeometry(.02,.02,1.5,6),painted("#26323b"));cord.position.y=-.75;
    const shade=new THREE.Mesh(new THREE.ConeGeometry(.5,.42,18,1,true),painted("#c5a45d"));shade.material.side=THREE.DoubleSide;shade.position.y=-1.6;
    lamp.add(cord,shade);m.group.add(lamp);swing(lamp,m.group,.2,3.4,0,"z");
    return finish(m,[-.49,1.62,-1.4],"courtroom");
  }
  m.box(0,.22,-3.6,10,.44,3.7,oak);
  m.box(0,1.2,-2.76,8.7,1.55,1.33,oak);
  m.box(0,2.02,-2.76,9.05,.17,1.58,trim);
  for(let i=-3;i<=3;i++){m.box(i*1.13,1.23,-2.04,.88,1.16,.1,trim);m.box(i*1.13,1.23,-1.973,.7,.93,.057,oak);}
  for(const x of [-2.7,0,2.7]){m.box(x,2.57,-3.68,1.32,1.72,.28,leather);m.box(x,1.82,-3.5,1.43,.18,.72,trim);paper(m,x,2.13,-2.77);}
  [-2.7,0,2.7].forEach((x,i)=>addPerson(m.group,{x,y:1.45,z:-3.25,variant:i+4,scale:.9,seated:true}));
  addPerson(m.group,{x:0,y:0,z:-1.3,variant:6,scale:.95,carry:true,walk:{dx:3.2,period:8,angle:-22,pause:true}});   // the clerk crossing the well
  for(let j=0;j<2;j++)for(const x of [-3.35,3.35]){
    const z=2.15+j*1.86;m.box(x,.56,z,3.82,.15,.73,oak);m.box(x,.96,z+.36,3.85,.86,.13,oak);
    for(const side of [-1,1])m.box(x+side*1.48,.28,z,.23,.56,.62,trim);
  }
  table(m,-1.3,.05,2.8,1.36);paper(m,-1.2,1.17,.12);
  m.box(1.91,.74,-.64,1.14,1.48,.86,oak);m.box(1.91,1.55,-.64,1.42,.18,1.05,trim);
  m.pipe([1.75,1.63,-.65],[1.82,1.98,-.75],.035,leather);
  sign(m,0,4.75,-5.6,3.6,.5,"المحكمة | Tribunal","#5c4a3a");
  sign(m,0,3.75,-5.65,5.5,.82,p.subject||"Public hearing");
  sign(m,-1.25,1.39,-.52,2.36,.39,p.detail||"Hearing record");
  return finish(m,p.state==="exhibit"?[-1.18,1.32,.09]:[0,2.08,-2.55],"courtroom");
}

