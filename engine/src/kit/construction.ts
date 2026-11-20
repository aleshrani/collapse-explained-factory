import * as THREE from "three";
import { stencil } from "./markings";
import { rng } from "../videos/bridge/paint";
import { camera, Cameras, Context, container, limit, masonry, Model, painted, Point, ridge, wood } from "./shared";

export type Params = {floorsBuilt:number; totalFloors:number; craneAngle:number; abandoned:boolean};
export const defaults:Params={floorsBuilt:7,totalFloors:12,craneAngle:-14,abandoned:false};
export const hosts:Record<keyof Cameras,Point>={wide:[22,0,46],medium:[-7.61,.015,14.65],close:[2,0,10]};
export function build(params:Partial<Params>={}, _ctx:Context={}){
  const p={...defaults,...params},total=Math.round(limit(p.totalFloors,2,24)),floors=Math.round(limit(p.floorsBuilt,1,total));
  const m=new Model(), h=floors*3, r=rng(410);
  const steel=painted(p.abandoned?"#aa6349":"#b9613f"),gold=painted(p.abandoned?"#b1834d":"#eaba38");
  const metal=painted("#52646c"),concrete=masonry(),glass=painted("#399baa","glass"),form=painted("#e78847","rib");
  m.box(0,-.25,0,700,.5,700,painted("#a7a474","earth"),9);
  m.box(0,-.09,6,63,.2,104,painted("#c4a477","earth"),7);
  ridge(m,-74,painted("#879578","earth"),9,12);
  for(let i=0;i<19;i++){
    const x=-64+i*7,z=-33-r()*14,bh=4+r()*8;
    m.box(x,bh/2,z,5+r()*2,bh,6,painted(i%3===0?"#c5a68f":"#b5beb5","wall"),5);
    m.box(x,bh+.2,z,6.8,.45,6.4,metal);
  }
  // The core leads the slab pour; the upper formwork comes off once the planned roof is reached.
  const coreH=h+Math.min(6,(total-floors)*3);
  m.box(-2.6,coreH/2,-4,3.8,coreH,3.4,concrete,4);
  if(coreH>h){
    m.box(-2.6,coreH-1,-4,4.2,2.2,3.8,form);
    for(let i=0;i<6;i++)m.pipe([-4.2+i*.65,coreH,-2.5],[-4.2+i*.65,coreH+1.3,-2.5],.055,metal);
  }
  for(let n=0;n<=floors;n++){
    const y=n*3;
    m.box(0,y+.11,-2,12.7,.25,9,concrete);
    if(n===floors)break;
    for(const x of [-6,-2,2,6])for(const z of [-6.2,2.2])m.box(x,y+1.6,z,.29,3.2,.32,steel);
    for(const z of [-6.2,2.2])m.box(0,y+2.78,z,12.4,.35,.28,steel);
    if(n<Math.floor(floors*.49))m.box(0,y+1.53,-2,11.93,2.64,8.13,glass,3.2);
    else for(const x of [-6,6])m.beam([x,y+.26,-6.2],[x,y+2.83,-2.2],.16,steel);
  }
  // Planked scaffold wraps the east elevation in front of the exposed frame.
  for(let i=0;i<Math.min(floors,5);i++){
    const y=.15+i*2.5;
    m.box(7.15,y+.15,-2,1.55,.17,9.3,wood(),2.2);
    for(let z=-6.5;z<=2.5;z+=3){
      m.pipe([7.87,y,z],[7.87,y+2.6,z],.084,metal);
      if(z<2.5){m.beam([7.87,y,z],[7.87,y+2.48,z+3],.085,metal);m.pipe([7.87,y+1.18,z],[7.87,y+1.18,z+3],.055,gold);}
    }
  }
  const mastX=-8.9,mastZ=3.2,top=coreH+3.5;
  for(const sx of [-1,1])for(const sz of [-1,1])m.box(mastX+sx*.7,top/2,mastZ+sz*.7,.31,top,.31,gold);
  for(let i=0;i<Math.ceil(top/1.8);i++){
    const y=i*1.8,up=Math.min(top,y+1.8),s=i%2?1:-1;
    for(const k of [-1,1]){
      m.beam([mastX-s*.7,y,mastZ+k*.7],[mastX+s*.7,up,mastZ+k*.7],.18,gold);
      m.beam([mastX+k*.7,y,mastZ-s*.7],[mastX+k*.7,up,mastZ+s*.7],.18,gold);
    }
  }
  const jib=new Model();
  for(const z of [-.55,.55])jib.beam([-6,0,z],[19,0,z],.31,gold);
  jib.beam([-6,1.12,0],[19,1.12,0],.21,gold);
  for(let x=-6;x<19;x+=1.25) for(const z of [-.55,.55]){
    jib.beam([x,0,z],[x+.625,1.12,0],.18,gold);jib.beam([x+.625,1.12,0],[x+1.25,0,z],.18,gold);
  }
  jib.box(-4.6,.74,0,2.5,1.5,1.9,concrete);
  jib.box(.8,-.7,.76,1.6,1.5,1.18,glass,0);
  jib.beam([-1.6,.4,0],[0,4.4,0],.26,gold);
  for(const end of [-5,15])jib.beam([0,4.4,0],[end,1,0],.09,metal);
  const drop=Math.min(12,top*.44);
  for(const x of [14.5,14.8])jib.pipe([x,0,0],[x,-drop,0],.052,metal);
  jib.box(14.65,-drop,0,.86,.74,.58,painted("#edb750","stripe"),0);
  jib.add(new THREE.TorusGeometry(.45,.11,8,20,Math.PI*1.63).rotateZ(Math.PI*.73).translate(14.65,-drop-.62,0),metal);
  const cameras:Cameras={wide:camera([29,2.5,57],[0,top*.48,-2],Math.max(48,42+top*.26)),medium:camera([-9,1.47,18],[-3,5,0],57),close:camera([3,1.5,13],[1.8,1.22,9.6],39)};
  const head=jib.finish(cameras);head.position.set(mastX,top,mastZ);head.rotation.y=THREE.MathUtils.degToRad(limit(p.craneAngle,-180,180));m.group.add(head);
  container(m,-10,0,8,6.3,2.8,"#47918d",true);container(m,-10,2.7,8,6.3,2.8,"#dabe8f",true);
  container(m,12,0,-7,5.9,2.8,"#c97549");
  const fence=painted("#608a82","rib");
  for(let x=-21;x<=21;x+=3)if(x<0||x>7){
    m.box(x,1.03,12,2.94,2.05,.12,fence,2.4);m.box(x-1.48,1.1,12,.12,2.25,.22,metal);
  }
  for(let i=0;i<28;i++){const x=8+r()*6,z=5+r()*4;m.mound(x,.01,z,.25+r()*.8,.2+r()*.8,.4+r()*.7,concrete,i);}
  for(let i=0;i<5;i++)m.box(-3+i*.44,.2,8,.35,.32,3.8,steel);
  if(p.abandoned)for(let i=0;i<130;i++){
    const x=r()*35-17,z=r()*22-9;
    for(let k=0;k<3;k++)m.beam([x,0,z],[x+(r()-.5)*.4,.23+r()*.47,z+(r()-.5)*.5],.055,painted("#798349"));
  }
  // Barrier feet, stacked stock and field markings carry the foreground through to the crane.
  for(const [x,z] of [[-2.8,13.7],[7.9,14.5],[12.4,14.5],[18.3,39.5],[24.6,37.4]]){
    m.box(x,.15,z,2.65,.3,.82,concrete);
    m.box(x,.56,z,2.47,.65,.39,painted("#e79b53","stripe"),2.2);
  }
  for(let i=0;i<7;i++){
    const x=8.5+i%4*.54,y=i<4?.33:.78;
    m.pipe([x,y,9],[x,y,12.4],.245,metal);
    m.pipe([x,y,12.39],[x,y,12.425],.163,painted("#394752"));
  }
  m.box(-9.85,4.05,9.49,2.1,.75,.05,stencil("FIELD 3","#466d72"),0);
  m.box(-4.1,1.24,12.12,1.75,.7,.07,stencil("GATE 2","#995b39"),0);
  for(let i=0;i<4;i++){
    const z=-5.1+i*1.9;
    m.box(7.88,Math.min(4,floors-1)*2.5+.63,z,.065,.77,1.78,painted("#598c79","rib"),2.5);
  }
  const rut=painted("#a98867","earth"),gravel=painted("#948878","earth");
  // Temporary road mats carry deliveries over the soft cut at the gate.
  const matSteel=painted("#918576","plate"),edgeRust=painted("#8b705f");
  for(let i=0;i<5;i++){
    const x=23.9+i*.15,z=42+i*1.64;
    m.box(x,.035,z,4.65,.045,1.58,matSteel,2.1);
    for(const s of [-1,1]){
      m.box(x+2.14*s,.067,z-.51,.21,.019,.11,edgeRust);
      m.box(x+2.14*s,.067,z+.51,.21,.019,.11,edgeRust);
    }
  }
  for(let i=0;i<32;i++){
    const x=17.4+r()*5.2,z=39+r()*13;
    m.add(new THREE.PlaneGeometry(.19+r()*.45,.045+r()*.092).rotateX(-Math.PI/2).rotateY(-.64+r()*.25).translate(x,.022,z),gravel);
  }
  for(let i=0;i<65;i++){
    const z=12+i*.55,c=2+Math.sin(z*.047)*7+(z-12)*.28;
    for(const s of [-1,1]){
      const x=c+s*1.05;
      m.add(new THREE.PlaneGeometry(.38,.22).rotateX(-Math.PI/2).rotateY(s*.37).translate(x,.017,z),rut);
    }
    if(i%2===0)m.mound(c+(r()-.5)*6,.018,z,.13+r()*.25,.02+r()*.05,.10+r()*.2,gravel,i);
  }
  return m.finish(cameras);
}
