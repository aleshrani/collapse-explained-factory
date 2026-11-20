import * as THREE from "three";
import {buildIslands, islandGeos} from "../videos/dubai3d/islands";
import {buildDredger, buildIslandPalms, buildResort} from "../videos/dubai3d/props";
import {lawnHD, sandHD} from "../videos/dubai3d/paint2";
import {DREDGE, HOTEL, SAND_Y} from "../videos/dubai3d/story";
import {lam} from "../videos/bridge/build";
import {camera, Model, painted, Point, wood} from "./shared";
import {sea} from "./sea";

export const subjects = ["archipelago","delivery","landing","survey","dredger","beach","hotel","fridge"] as const;
type Subject = typeof subjects[number];
const locations:Record<Subject,Point>={
  archipelago:[0,.5,1],delivery:[43,1,2.9],landing:[46,1,.5],survey:[43,1,2.9],
  dredger:[DREDGE[0],4,DREDGE[2]],beach:[48,SAND_Y,-1.6],hotel:[HOTEL[0],2,HOTEL[2]],fridge:[46,1,1]
};
function delivery(m:Model,survey:boolean){
  const cx=43,cz=2.9,rail=painted("#b3bcb1"),hull=painted("#377574"),rim=painted("#a9553c");
  const shape=new THREE.Shape();
  shape.moveTo(-1.12,-2.8);shape.lineTo(1.12,-2.8);shape.lineTo(1.05,1.75);shape.quadraticCurveTo(.8,2.65,0,3.25);shape.quadraticCurveTo(-.8,2.65,-1.05,1.75);shape.closePath();
  const shell=new THREE.ExtrudeGeometry(shape,{depth:.7,bevelEnabled:true,bevelSegments:1,bevelSize:.09,bevelThickness:.08});
  m.add(shell.rotateX(-Math.PI/2).translate(cx,.05,cz),hull);
  m.box(cx,.8,cz,1.97,.14,4.55,wood());
  m.box(cx,1.28,cz-1.3,1.55,.83,1.22,painted("#f0dfba"));
  m.box(cx,1.64,cz-.65,1.27,.41,.06,painted("#76a2a5","glass"));
  m.box(cx,1.82,cz-1.27,1.78,.12,1.5,rim);
  for(const x of [-1,1]){m.pipe([cx+x,.8,cz+1],[cx+x,1.32,cz+1],.037,rail);m.pipe([cx+x,1.32,cz+1],[cx+x,1.32,cz-2],.038,rail);}
  if(survey){
    for(const [x,z] of [[-.46,.45],[.46,.45],[0,-.45]])m.pipe([cx+x,.89,cz+1+z],[cx,1.84,cz+1],.045,rim);
    m.box(cx,1.96,cz+1,.38,.26,.29,painted("#e6bc58"));
    m.pipe([cx+.8,.18,cz+1.8],[cx+.8,2.2,cz+1.8],.055,rail);
    for(let i=0;i<8;i++)m.box(cx+.8,.35+i*.2,cz+1.86,.11,.046,.026,rim);
  }else{
    m.box(cx,.98,cz+.86,.88,.3,.65,wood());
    for(const x of [-.22,.1])for(const z of [.72,1.01]){
      m.box(cx+x,1.26,cz+z,.21,.42,.22,painted("#f3e8cb"));
      m.box(cx+x,1.31,cz+z+.115,.2,.12,.02,hull);
      m.beam([cx+x-.085,1.5,cz+z],[cx+x+.085,1.5,cz+z],.09,rim,.18);
    }
  }
}
export function build(params:{subject?:string},ctx:{light?:"day"|"golden"}={}){
  const subject=subjects.includes(params.subject as Subject)?params.subject as Subject:"archipelago";
  const m=new Model(),list=buildIslands(),g=islandGeos(list),survey=subject==="survey";
  const sand=lam("episode-dubai-sand",()=>({map:sandHD(),vertexColors:true}));
  const lawn=lam("episode-dubai-lawn",()=>({map:lawnHD(),vertexColors:true,polygonOffset:true,polygonOffsetFactor:-1,polygonOffsetUnits:-2}));
  for(const [geo,mat] of [[g.sand,sand],[g.nz,sand],[g.grass,lawn]] as const){
    if(!survey){const mesh=new THREE.Mesh(geo,mat);mesh.receiveShadow=true;mesh.castShadow=mat===sand;m.group.add(mesh);}
  }
  m.group.add(sea(ctx.light??"day"));
  if(!survey){buildIslandPalms(m.group,list);buildResort(m.group);buildDredger(m.group);}
  const timber=wood();
  if(!survey){
    for(let i=0;i<36;i++)m.box(46,.83,-6.2+i*.31,2.45,.2,.295,timber);
    for(let i=0;i<5;i++)for(const x of [44.9,47.1])m.pipe([x,-1,-6+i*2.5],[x,1.19,-6+i*2.5],.13,timber);
  }
  delivery(m,subject==="survey");
  if(subject==="fridge"){
    m.box(46,1.81,1,.88,1.77,.8,painted("#d0dad0"));m.box(46,2.22,1.43,.84,.69,.06,painted("#e9e5d4"));
    m.pipe([45.7,1.62,1.47],[45.7,1.97,1.47],.035,painted("#666d6f"));
  }
  const unbuilt=subject==="beach"?list.find(i=>i.kind==="map"&&!i.green&&i.c[0]<-45):undefined;
  const [x,y,z]=unbuilt?[unbuilt.c[0],SAND_Y,unbuilt.c[1]]:locations[subject],large=subject==="archipelago",big=subject==="hotel"||subject==="dredger";
  const d=large?145:big?29:unbuilt?12:5;
  const eye=(a:number,b:number,c:number):Point=>[x+d*a,y+d*b,z+d*c];
  const look:Point=[x,y+(large?0:big?1:.32),z];
  const base=m.finish({wide:camera(eye(.68,.67,1.35),look,46),medium:camera(eye(-.66,.48,1),look,43),close:camera(eye(-.43,.27,.68),look,36)});
  base.cameras.aerial=camera(eye(.01,large?1.8:1.55,.24),look,45);
  const feet:Point=unbuilt?[x+.55,SAND_Y,z+.25]:subject==="dredger"?[x+1,4.96,z+1]:survey?[43.5,.88,2.85]:[46,.94,3.25];
  return {group:base,feet,place:"dubai"};
}

