import * as THREE from "three";
import {camera, limit, Context, Model, painted, Point, ridge, wood} from "./shared";
import {stencil} from "./markings";
import {ctex} from "../videos/bridge/paint";

// Announced-city site on the Senegalese savanna: foundation stone under a ceremony canopy, laterite track,
// survey stakes and tripod, baobabs, boundary fence, and a billboard with the proposed concept (a drawing, not a building).
export type SenegalParams={subject?:string;detail?:string;damage?:number;phase?:"proposal"|"work"|"record";crowd?:number;weather?:string};
export function build(p:SenegalParams={},_ctx:Context={}){
  const m=new Model(),wear=limit(Number(p.damage)||0,0,1),empty=p.phase==="record"||wear>.5;
  const dark=painted("#35444e"),steel=painted("#5f727b"),cream=painted("#efe7d2"),stone=painted("#a9a393","plate"),bronze=painted("#8d775e"),
        grass=painted("#c4b36d","earth"),green=painted("#8a9a58","earth"),laterite=painted("#a65a3f","road"),trunk=painted("#9a8670","earth"),ribbon=painted("#d6542f");
  m.box(0,-.19,0,690,.34,690,painted("#cdb883","earth"),5);
  const hills=painted("#a7aa7c","earth");ridge(m,-90,hills,5,41);ridge(m,-130,hills,8,17);
  m.box(0,.02,16,6,.08,80,laterite,4);m.box(0,.02,26,60,.08,5,laterite,4);
  for(let i=0;i<70;i++){const gx=-40+(i*17%81),gz=-30+(i*29%60);if(gx>-2&&gx<11&&gz>-1&&gz<13)continue;m.mound(gx,.0,gz,1.1+(i%3)*.6,.45+(i%4)*.18,.9,i%3?grass:green,i);}
  // baobabs
  for(const [x,z,s] of [[-18,-16,1.3],[17,-22,1.6],[-30,2,1],[28,8,1.2]] as const){
    m.pipe([x,0,z],[x,3.2*s,z],.9*s,trunk);m.pipe([x,2.4*s,z],[x,4.2*s,z],.62*s,trunk);
    for(let k=0;k<6;k++){const a=k*1.05;m.beam([x,4.1*s,z],[x+Math.cos(a)*2.8*s,5.2*s,z+Math.sin(a)*2.8*s],.22*s,trunk);m.mound(x+Math.cos(a)*2.8*s,5.0*s,z+Math.sin(a)*2.8*s,1.7*s,.9*s,1.7*s,green,k+x);}
  }
  // foundation stone on a stepped plinth with plaque
  for(let i=0;i<3;i++)m.box(0,.12+i*.24,0,5-i*1.1,.24,3.4-i*.8,stone);
  m.box(0,1.15,0,1.5,1.4,.7,stone);
  const plaque=new THREE.Mesh(new THREE.PlaneGeometry(1.15,.55),stencil(String(p.subject||"Mbodiène site"),"#6b5a43"));plaque.position.set(0,1.1,.36);m.group.add(plaque);
  m.box(0,1.9,0,1.62,.18,.82,stone);
  // ceremony canopy, chairs, cloth-covered table (not shown when the site is shown empty)
  if(!empty){
    for(const x of [-6,-2.5,1,4.5])for(const z of [-5.2,-9.5])m.pipe([x+1,0,z],[x+1,3,z],.05,cream);
    m.box(-.5,3.1,-7.3,11,.1,5,painted("#e9e1cb"));m.box(-.5,3.3,-7.3,11.4,.12,.2,painted("#4d9693"));
    for(let r=0;r<3;r++)for(let c=0;c<8;c++)m.box(-4.5+c*1.3,.45,-5.8-r*1.1,.55,.1,.55,painted("#d0ccbd"));
    for(let r=0;r<3;r++)for(let c=0;c<8;c++)m.box(-4.5+c*1.3,.75,-6.1-r*1.1,.55,.6,.08,painted("#d0ccbd"));
  }
  // billboard with the proposed concept, drawn on a canvas
  const art=new THREE.MeshLambertMaterial({map:ctex("senegal-concept"+(empty?"-fade":""),1024,512,(g,r)=>{
    g.fillStyle="#f3e8cb";g.fillRect(0,0,1024,512);g.fillStyle="#bde0e4";g.fillRect(24,24,976,330);
    g.fillStyle="#d9b57a";g.fillRect(24,300,976,54);
    for(let i=0;i<13;i++){const h=60+r()*180,x=60+i*70;g.fillStyle=i%2?"#7da0a8":"#a8bcc0";g.fillRect(x,300-h,48,h);}
    g.strokeStyle="#bc644c";g.lineWidth=7;g.beginPath();g.arc(512,215,120,Math.PI,2*Math.PI);g.stroke();
    g.fillStyle="#293845";g.font="bold 62px Arial";g.fillText("PROPOSED CITY",30,430,960);g.font="bold 36px Arial";g.fillText("concept drawing, not a building",30,490,960);
    if(empty){g.fillStyle="rgba(243,232,203,.55)";g.fillRect(0,0,1024,512);}
  })});
  for(const x of [-13.4,-5.6])m.pipe([x,0,-12],[x,5,-12],.14,wood());
  m.box(-9.5,3.6,-12.07,9.2,4.1,.2,steel);const bb=new THREE.Mesh(new THREE.PlaneGeometry(8.8,3.7),art);bb.position.set(-9.5,3.6,-11.95);m.group.add(bb);
  if(empty)m.beam([-13.4,4.6,-11.9],[-12,2,-11.9],.12,wood());
  // survey stakes with ribbons, tripod instrument, boundary fence
  for(let i=0;i<5;i++)for(let j=0;j<3;j++){const x=5+i*3.2,z=-2+j*4;m.pipe([x,0,z],[x,.9,z],.03,wood());m.box(x,.8,z,.04,.22,.35,ribbon);}
  for(const a of [0,2.1,4.2])m.beam([14,1.3,2],[14+Math.cos(a)*.6,0,2+Math.sin(a)*.6],.04,dark);
  m.box(14,1.45,2,.34,.28,.3,steel);m.pipe([14,1.6,2.2],[14,1.7,2.55],.07,dark);
  for(let x=-34;x<=34;x+=3){m.pipe([x,0,32],[x,1.3,32],.06,wood());}
  m.beam([-34,1.1,32],[34,1.1,32],.02,dark);m.beam([-34,.6,32],[34,.6,32],.02,dark);
  // pickup truck
  const body=painted("#e6ddc8","plate");
  m.box(-12,1.0,14,4.6,.8,2,body);m.box(-12.8,1.65,14,1.9,.8,1.9,body);m.box(-12.8,1.75,14,1.7,.5,1.95,painted("#4d7886","glass"));m.box(-10.8,1.45,14,2.2,.1,1.95,dark);
  for(const x of [-13.4,-10.6])for(const z of [13,15])m.add(new THREE.CylinderGeometry(.5,.5,.3,16).rotateX(Math.PI/2).translate(x,.5,z),dark);
  // information board near the host
  const board=new Model();for(const x of [9.2,10.9])board.pipe([x,0,3.4],[x,1.7,3.4],.06,dark);m.group.add(board.assemble());
  const plate=new THREE.Mesh(new THREE.PlaneGeometry(1.9,.7),stencil(String(p.detail||"Project site"),"#49686c"));plate.position.set(10.05,1.4,3.34);m.group.add(plate);
  const target:Point=[0,1.4,0];
  const group=m.finish({wide:camera([13,6.5,22],[-1,2,-3],52),medium:camera([6.5,2.5,11],[0,1.4,0],46),close:camera([7.4,1.9,10.5],[2,1.3,0],40)});
  group.cameras.aerial=camera([6,22,26],[-2,0,-4],56);
  group.cameras.low=camera([6,.7,11],[0,1.7,0],50);
  group.cameras.dolly=camera([-4,3,16],[-6,2.5,-8],48);
  void target;
  const feet:Point=[4.2,0,4.6];
  return {group,feet,place:"senegal-site"};
}
