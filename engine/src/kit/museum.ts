import * as THREE from "three";
import {camera, Model, painted, Point, wood} from "./shared";
import {shell, sign, paper, table} from "./interior";

// Gallery / archive room shared by three unbuilt-programme episodes: a plinth model hall for
// the super-heavy tank and the atomic concept, and the sealed-target desk for the remote-viewing tests.
export type MuseumId="tank-proposal"|"atomic-concept"|"viewing-test";
export type MuseumParams={subject?:string;detail?:string;damage?:number;phase?:"proposal"|"work"|"record";crowd?:number;weather?:string};
function tracked(m:Model,x0:number,x1:number,z:number,wheels:number,r:number,dark:THREE.Material,steel:THREE.Material,rubber:THREE.Material){
  const len=x1-x0,cx=(x0+x1)/2;
  m.box(cx,r+.15,z,len,r*2,1.35,rubber,2);
  for(const dz of [-.72,.72])m.box(cx,r+.15,z+dz,len+.1,r*2.1,.1,dark);
  for(let i=0;i<wheels;i++){
    const x=x0+r+i*(len-2*r)/(wheels-1);
    m.add(new THREE.CylinderGeometry(r*.78,r*.78,1.62,16).rotateX(Math.PI/2).translate(x,r+.15,z),steel);
    m.add(new THREE.CylinderGeometry(r*.35,r*.35,1.7,10).rotateX(Math.PI/2).translate(x,r+.15,z),dark);
  }
  for(let i=0;i<Math.floor(len/.55);i++)m.box(x0+.3+i*.55,r*2+.28,z,.34,.07,1.4,dark);
}
function plinthRoom(m:Model,title:string){
  shell(m,22);
  const brass=painted("#b6a06a"),dark=painted("#35444e"),cream=painted("#e6ddc8"),steel=painted("#56696d"),rope=painted("#a4474a");
  m.box(0,.3,0,17,.6,10.5,painted("#6a7a80","plate"),3);
  m.box(0,.64,0,17.4,.08,10.9,painted("#d9cdb0","plate"),3);
  const posts:Point[]=[];
  for(let x=-8.4;x<=8.5;x+=2.8)posts.push([x,0,6.4]);
  for(let z=5;z>=-5;z-=3.3)posts.push([8.9,0,z],[-8.9,0,z]);
  for(const [x,,z] of posts){m.pipe([x,0,z],[x,1.15,z],.07,brass);m.mound(x,1.15,z,.14,.14,.14,brass,x+z);}
  for(let i=0;i<7;i++)m.beam([-8.4+i*2.8,.95,6.4],[-5.6+i*2.8,.95,6.4],.035,rope);
  m.box(0,.5,6.45,7,.1,.5,painted("#42616a"));
  sign(m,0,4.1,-6.1,6.2,.9,title);
  // wall graphics: dated record card, drawing frame and a bench
  m.box(-8.4,3.1,-6.15,2.8,3.4,.1,steel);m.box(-8.4,3.1,-6.08,2.55,3.15,.05,cream);
  for(let j=0;j<6;j++)m.box(-8.4,4.3-j*.46,-6.03,2.0-(j%3)*.35,.07,.02,painted("#807c71"));
  m.box(8.4,3.1,-6.15,2.8,3.4,.1,steel);m.box(8.4,3.1,-6.08,2.55,3.15,.05,painted("#3d7f93"));
  m.beam([7.4,2.2,-6.0],[9.3,4.0,-6.0],.06,cream);m.beam([7.4,3.9,-6.0],[9.3,2.2,-6.0],.06,cream);
  table(m,-6,7.9,3.2,.9,.85);
  // gallery spotlights on a rail
  m.beam([-7,6.6,-4.6],[7,6.6,-4.6],.1,dark);
  for(let x=-6;x<=6;x+=3)m.add(new THREE.ConeGeometry(.28,.5,12).translate(x,6.2,-4.4),dark);
}
function superHeavyTank(m:Model){
  const hull=painted("#8f9a92","plate"),dark=painted("#3a464d"),steel=painted("#5e6f76"),rubber=painted("#4a5359"),trim=painted("#b8aa84");
  for(const z of [-2.9,0,2.9])tracked(m,-9.4,9.4,z,16,.62,dark,steel,rubber);
  m.box(0,2.2,0,19.4,1.2,8.3,hull,4);
  for(const s of [-1,1])m.box(0,1.65,s*4.1,19.7,.55,.2,steel);
  const sh=new THREE.Shape();sh.moveTo(-9.5,0);sh.lineTo(9.5,0);sh.lineTo(7.6,1.5);sh.lineTo(-7.6,1.5);sh.closePath();
  m.add(new THREE.ExtrudeGeometry(sh,{depth:7.2,bevelEnabled:false}).translate(0,2.8,-3.6),painted("#99a49b","plate"));
  m.add(new THREE.CylinderGeometry(3.1,3.35,1.3,28).translate(1.8,5.1,0),hull);
  m.add(new THREE.CylinderGeometry(2.7,3.0,.5,28).translate(1.8,5.95,0),painted("#a2ada4"));
  m.box(4.3,5.35,0,2.6,1.9,4.4,painted("#8a958d","plate"));
  for(const z of [-1.0,1.0]){
    m.pipe([5.2,5.5,z],[16.2,6.5,z],.34,steel);
    m.pipe([15.2,6.4,z],[16.8,6.55,z],.46,dark);
  }
  m.add(new THREE.CylinderGeometry(1.5,1.7,.9,18).translate(-6.7,4.95,0),hull);
  m.add(new THREE.CylinderGeometry(1.1,1.2,.35,18).translate(-6.7,5.6,0),painted("#a2ada4"));
  for(const dz of [-.35,.35])m.pipe([-6.1,5.2,dz],[-1.9,5.4,dz],.14,steel);
  for(const [x,z] of [[-4.2,-2.2],[-2.2,2.2],[0,-2.6]])m.pipe([x,4.3,z],[x+.7,5.1,z],.06,dark);
  for(let i=0;i<10;i++){m.box(-7.8+i*1.7,3.0,3.7,.6,.4,.06,painted("#5d6e75"));m.box(-7.8+i*1.7,3.0,-3.7,.6,.4,.06,painted("#5d6e75"));}
  m.box(2,.78,4.5,5,.04,.4,trim);   // scale-bar strip on the plinth edge
  for(let i=0;i<11;i++)m.box(-.5+i*.5,.8,4.52,.05,.18,.02,dark);
}
function atomicConcept(m:Model){
  const body=painted("#97a08c","plate"),dark=painted("#3a464d"),steel=painted("#5e6f76"),rubber=painted("#4a5359"),stripe=painted("#c8a243","stripe"),pane=painted("#6f9aa8","glass");
  for(const z of [-2.5,2.5])tracked(m,-6.3,6.3,z,10,.7,dark,steel,rubber);
  m.add(new THREE.SphereGeometry(1,28,16).scale(7.2,2.3,3.1).translate(0,3.3,0),body);
  m.box(0,2.45,0,11.8,.3,4.9,steel);
  m.add(new THREE.SphereGeometry(1,16,10).scale(1.8,.95,1.1).translate(4.4,5.0,0),pane);
  for(const z of [-1,1])m.box(3.5,4.1,z*2.95,2.4,.8,.1,pane);
  m.box(-5.8,3.4,0,2.3,2.3,3.3,stripe,2);
  m.add(new THREE.CylinderGeometry(1.0,1.2,2.2,20).translate(-5.8,5.4,0),painted("#a6ab9c"));
  m.add(new THREE.CylinderGeometry(.3,.3,1.6,12).translate(-4.5,5.6,1.0),dark);m.add(new THREE.CylinderGeometry(.3,.3,1.6,12).translate(-4.5,5.6,-1.0),dark);
  for(let i=0;i<5;i++)m.box(-2.5+i*1.5,5.5,0,.75,.07,.8,painted("#7d8a86","rib"));
  for(let i=0;i<8;i++)for(const z of [-1,1])m.add(new THREE.CylinderGeometry(.12,.12,.08,8).rotateX(Math.PI/2).translate(-4+i*1.1,3.1+Math.sin(i)*.1,z*3.04),painted("#d6cdb4"));
}
function viewingDesk(m:Model){
  shell(m,22);
  const wood_=wood(),steel=painted("#56696d"),cream=painted("#e6ddc8"),dark=painted("#35444e"),rug=painted("#6b7d86","plate"),seal=painted("#a8453c"),brass=painted("#c5a45d");
  m.box(0,.02,0,13,.05,8,rug,3);
  m.box(0,1.12,0,9.5,.28,4.6,wood_);
  for(const x of [-4.2,4.2])for(const z of [-1.8,1.8])m.box(x,.5,z,.4,1.0,.4,steel);
  // screen partition between the two seats
  m.box(0,2.2,-.15,.14,2.4,3.8,painted("#6d8a80","plate"));m.box(0,3.5,-.15,.3,.2,3.9,steel);
  for(const s of [-1,1]){
    m.box(s*3.0,.7,0,1.3,.14,1.3,painted("#48546a"));m.box(s*3.7,1.45,0,.14,1.6,1.3,painted("#48546a"));
    for(const dx of [-.5,.5])for(const dz of [-.5,.5])m.pipe([s*3+dx,0,dz],[s*3+dx,.65,dz],.05,dark);
  }
  // sealed envelope, response sheets, stopwatch and the target cards on the far side
  paper(m,-2.4,1.33,.9);paper(m,-2.1,1.37,1.15,"#d9d2b8");m.box(-2.4,1.4,.9,.25,.03,.25,seal);
  paper(m,2.3,1.33,-1.0);paper(m,2.7,1.37,-.85,"#d9d2b8");
  m.pipe([1.2,1.3,1.1],[1.2,1.42,1.1],.2,steel);m.pipe([1.2,1.46,1.1],[1.2,1.52,1.1],.05,brass);
  for(let i=0;i<5;i++)m.box(-2+i*1.1,1.32+i*.015,-1.3,.8,.03,1.1,painted(["#e6ddc8","#cfd8cc","#e0c9a8","#d9d2b8","#c9d6d8"][i]));
  m.pipe([-3.9,1.3,-1.6],[-3.9,2.0,-1.6],.04,dark);m.beam([-3.9,2.0,-1.6],[-3.4,2.0,-1.2],.04,dark);
  // locker wall with sealed target boxes and a clock
  for(let j=0;j<5;j++){
    const x=-8.2+j*3.4;m.box(x,1.5,-5.9,2.9,3.0,.8,painted("#7c8a83","rib"));
    for(let i=0;i<4;i++){m.box(x,.4+i*.7,-5.47,2.7,.6,.06,cream);m.box(x,.46+i*.7,-5.43,.5,.07,.06,brass);}
  }
  m.add(new THREE.CylinderGeometry(.62,.62,.1,24).rotateX(Math.PI/2).translate(5.3,4.8,-6.0),cream);
  m.beam([5.3,4.8,-5.93],[5.3,5.28,-5.93],.05,dark);m.beam([5.3,4.8,-5.93],[5.64,4.65,-5.93],.05,dark);
  sign(m,-1.5,4.6,-6.1,5.6,.85,"Target archive");
}
export function build(id:MuseumId,p:MuseumParams={}){
  const m=new Model();
  const title=String(p.subject||(id==="tank-proposal"?"Design study":id==="atomic-concept"?"TV-8 concept model":"Target archive"));
  if(id==="viewing-test"){viewingDesk(m);}
  else{plinthRoom(m,title);const g=modelOf(id==="tank-proposal"?superHeavyTank:atomicConcept);g.scale.setScalar(id==="tank-proposal"?.6:.92);g.position.y=.68;m.group.add(g);}
  const aim:Point=id==="viewing-test"?[0,2.0,0]:[0,2.7,0];
  const group=m.finish(id==="viewing-test"?
    {wide:camera([8.8,6.2,11.5],aim,50),medium:camera([4.4,3.6,6.8],aim,46),close:camera([1.6,2.6,4.0],[0,1.4,0],42)}:
    {wide:camera([15,8.8,18.5],aim,50),medium:camera([10.5,5.4,12.4],aim,46),close:camera([8.5,3.8,9.8],[3.5,3.4,0],42)});
  if(id!=="viewing-test"){
    group.cameras.aerial=camera([4,17,10],[1.5,2,0],52);
    group.cameras.low=camera([11,.9,12.4],[2,3.2,0],50);
    group.cameras.dolly=camera([17.5,5.2,8.5],[-1,3.4,0],46);
  }
  const feet:Point=id==="viewing-test"?[3.4,0,3.3]:[7.4,.66,8.2];
  return {group,feet,place:id};
}
function modelOf(draw:(m:Model)=>void){const sub=new Model();draw(sub);return sub.assemble();}
