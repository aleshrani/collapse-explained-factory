import * as THREE from "three";
import {buildIslands, islandGeos, Island, proj} from "../videos/dubai3d/islands";
import {buildDredger, buildMainland, Jet} from "../videos/dubai3d/props";
import {lawnHD, sandHD} from "../videos/dubai3d/paint2";
import {DREDGE, HOTEL, SAND_Y, NZ} from "../videos/dubai3d/story";
import {lam} from "../videos/bridge/build";
import {camera, Model, painted, Point, wood} from "./shared";
import {sign} from "./interior";
import {sea} from "./sea";

// The World, Dubai, built to match the ISS photo of 6 Apr 2022 (data/refs/dubai/SOURCES.md):
// a thin oval rock breakwater, ~300 bare sand islands packed into continent outlines,
// only a handful developed, the city coast to the east, Palm Jumeirah just south near the coast.
export const subjects = ["archipelago","delivery","landing","survey","dredger","beach","hotel","fridge",
  "coast","palm","ireland","villa","breakwater"] as const;
type Subject = typeof subjects[number];

// Map frame: +x east, +z south (proj puts north at -z). Archipelago spans about x -175..185, z -85..95.
const CENTRE:[number,number]=[8,4];
const RING:[number,number]=[150,90];            // breakwater half-axes
const SHORE_X=330;                               // city coast, east of the archipelago
const PALM:[number,number]=[262,205];            // Palm Jumeirah trunk root (at the coast side)
const IRELAND=proj(-8,53.2);                     // the island the four Irish businessmen bought
const ARAB:[number,number]=[308,150];            // Burj Al Arab islet, off the coast north of the Palm
const KHALIFA:[number,number]=[452,40];          // Burj Khalifa, inland

const locations:Record<Subject,Point>={
  archipelago:[40,.5,10],delivery:[43,1,2.9],landing:[46,1,.5],survey:[43,1,2.9],
  dredger:[DREDGE[0],4,DREDGE[2]],beach:[48,SAND_Y,-1.6],hotel:[HOTEL[0],2,HOTEL[2]],fridge:[46,1,1],
  coast:[120,SAND_Y,30],palm:[PALM[0]-40,0,PALM[1]],ireland:[IRELAND[0],SAND_Y,IRELAND[1]],
  villa:[HOTEL[0],SAND_Y,HOTEL[2]],breakwater:[CENTRE[0]+RING[0]*.92,1,CENTRE[1]+RING[1]*.38],
};

// Real islands are separated by open channels; shrink every map island toward its centre.
function realistic(list:Island[]){
  for(const is of list){
    if(is.kind!=="map")continue;
    is.poly=is.poly.map(([x,z])=>[is.c[0]+(x-is.c[0])*.8,is.c[1]+(z-is.c[1])*.8]);
    is.green=false;                                // bare sand, as in every aerial photo
  }
  return list.filter(is=>is.kind!=="sandbar");
}

function breakwater(m:Model){
  const rock=painted("#a89e8c","earth"),cap=painted("#c8bfa9","earth");
  const n=180;
  for(let i=0;i<n;i++){
    const a=i/n*Math.PI*2;
    if(Math.abs(Math.cos(a))>.985)continue;      // openings east and west, as in the photo
    const a2=(i+1)/n*Math.PI*2;
    const p:Point=[CENTRE[0]+RING[0]*Math.cos(a),.35,CENTRE[1]+RING[1]*Math.sin(a)];
    const q:Point=[CENTRE[0]+RING[0]*Math.cos(a2),.35,CENTRE[1]+RING[1]*Math.sin(a2)];
    m.beam(p,q,2.6,rock,1.1);
    m.beam([p[0],.95,p[2]],[q[0],.95,q[2]],1.3,cap,.25);
  }
}

// Palm Jumeirah: trunk from the coast, 16 fronds, crescent breakwater around the crown.
function palmJumeirah(m:Model,sand:THREE.Material){
  // Trunk runs from the coast out to sea (west); 8 fronds on each side fan out from it.
  const [x0,z0]=PALM,tip=x0-58;
  m.box((x0+tip)/2,.3,z0,x0-tip,.6,7,sand);
  for(let i=0;i<8;i++){
    const sx=tip+5+i*4,len=30-Math.abs(i-3.5)*3,lean=-10+i*1.6;
    for(const s of [-1,1])m.beam([sx,.3,z0+s*3],[sx+lean,.3,z0+s*(3+len)],3,sand,.6);
  }
  // Crescent breakwater around the crown, open toward the coast.
  const rock=painted("#c9bea5","earth"),cx=tip+18;
  for(let i=0;i<80;i++){
    const a=Math.PI*(.62+i/80*.76),a2=Math.PI*(.62+(i+1)/80*.76);
    m.beam([cx+Math.cos(a)*44,.3,z0+Math.sin(a)*48],[cx+Math.cos(a2)*44,.3,z0+Math.sin(a2)*48],4,rock,.8);
  }
  m.box(cx-44,1.6,z0,6,2.6,12,painted("#d9a76a"));          // the resort on the crescent
}

function landmarks(m:Model){
  // Burj Al Arab: a white sail on its own islet, joined to the shore by a thin bridge.
  const [ax,az]=ARAB,white=painted("#f2efe6"),sand=painted("#e6d6b3","sand");
  m.mound(ax,0,az,9,1.2,9,sand,3);
  const sail=new THREE.Shape();
  sail.moveTo(0,0);sail.quadraticCurveTo(10,26,2,58);sail.lineTo(-2,58);sail.lineTo(-3,0);sail.closePath();
  const g=new THREE.ExtrudeGeometry(sail,{depth:8,bevelEnabled:false});
  m.add(g.translate(-4,0,-4).rotateY(-Math.PI/2).translate(ax,1,az),white);
  m.pipe([ax,58,az],[ax,66,az],.5,white);
  m.beam([ax+6,1,az],[SHORE_X,1,az],1.5,white,.6);
  // Burj Khalifa: stepped tapering needle far above everything else.
  const [kx,kz]=KHALIFA,glass=painted("#9fb3c4","glass");
  const steps=[[30,60],[24,120],[18,180],[13,240],[9,290],[5,330]];
  let y=0;
  for(const [r,top] of steps){m.add(new THREE.CylinderGeometry(r*.92,r,top-y,6).translate(kx,(y+top)/2,kz),glass);y=top;}
  m.pipe([kx,y,kz],[kx,y+60,kz],1.6,painted("#d7dee4"));
}

function irelandSign(m:Model){
  const [x,z]=IRELAND,pole=painted("#d9d4c8");
  m.pipe([x+2,SAND_Y,z+2],[x+2,SAND_Y+6,z+2],.12,pole);
  const flag=new THREE.Mesh(new THREE.PlaneGeometry(1.8,1.2),lam("flag-ie",()=>({color:0xffffff,map:ieFlag(),side:THREE.DoubleSide})));
  flag.position.set(x+2.95,SAND_Y+5.3,z+2);m.group.add(flag);
  sign(m,x-1.5,SAND_Y+1.4,z+2.6,3.6,1.1,"IRELAND","#2f6b4f");
  m.pipe([x-2.6,SAND_Y,z+2.6],[x-2.6,SAND_Y+.9,z+2.6],.08,wood());
  m.pipe([x-.4,SAND_Y,z+2.6],[x-.4,SAND_Y+.9,z+2.6],.08,wood());
}
function ieFlag(){
  const c=document.createElement("canvas");c.width=96;c.height=64;const g=c.getContext("2d")!;
  g.fillStyle="#169b62";g.fillRect(0,0,32,64);g.fillStyle="#ffffff";g.fillRect(32,0,32,64);g.fillStyle="#ff883e";g.fillRect(64,0,32,64);
  const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;return t;
}

// One developed island: a single villa, a diesel generator and fuel drums (no grid power reaches the islands).
function villa(m:Model){
  const [x,,z]=locations.villa,white=painted("#efe9dc"),glass=painted("#7fa6b2","glass");
  m.box(x,SAND_Y+1.6,z,9,3.2,6,white);m.box(x,SAND_Y+3.4,z,9.8,.4,6.8,painted("#d8cfbd"));
  m.box(x,SAND_Y+1.6,z+3.02,6,2.2,.06,glass);
  m.box(x+8,SAND_Y+.9,z-1,3.2,1.8,1.8,painted("#5f7d63","rib"));        // generator housing
  m.pipe([x+9.2,SAND_Y+1.8,z-1.4],[x+9.2,SAND_Y+3.6,z-1.4],.14,painted("#3b3d42"));
  for(let i=0;i<4;i++)m.pipe([x+7+i*.7,SAND_Y,z+1.6],[x+7+i*.7,SAND_Y+.9,z+1.6],.3,painted(i%2?"#2f5a7a":"#a8452f"));
  for(let i=0;i<10;i++)m.box(x-6+i*.62,SAND_Y+.2,z+6.5,.5,.06,2.6,wood());   // short jetty
}

export function build(params:{subject?:string},ctx:{light?:"day"|"golden"}={}){
  const subject=subjects.includes(params.subject as Subject)?params.subject as Subject:"archipelago";
  const m=new Model(),list=realistic(buildIslands()),g=islandGeos(list),survey=subject==="survey";
  const sand=lam("episode-dubai-sand",()=>({map:sandHD(),vertexColors:true}));
  const lawn=lam("episode-dubai-lawn",()=>({map:lawnHD(),vertexColors:true,polygonOffset:true,polygonOffsetFactor:-1,polygonOffsetUnits:-2}));
  for(const [geo,mat] of [[g.sand,sand],[g.nz,sand],[g.grass,lawn]] as const){
    if(!survey){const mesh=new THREE.Mesh(geo,mat);mesh.receiveShadow=true;mesh.castShadow=mat===sand;m.group.add(mesh);}
  }
  m.group.add(sea(ctx.light??"day"));
  if(!survey){
    breakwater(m);
    const flat=painted("#e9dcbc","sand");
    palmJumeirah(m,flat);
    landmarks(m);
    const city=new THREE.Group();buildMainland(city);
    city.rotation.y=-Math.PI/2;city.position.set(SHORE_X-640,0,0);    // shore line z=-640 → x=SHORE_X
    m.group.add(city);
    irelandSign(m);
    villa(m);
    if(subject==="dredger"){buildDredger(m.group);const jet=new Jet(m.group);jet.set(0,1,0);}     // the rainbow of sand landing on an island
  }
  const timber=wood();
  if(!survey&&(subject==="landing"||subject==="delivery"||subject==="fridge")){
    for(let i=0;i<36;i++)m.box(46,.83,-6.2+i*.31,2.45,.2,.295,timber);
    for(let i=0;i<5;i++)for(const x of [44.9,47.1])m.pipe([x,-1,-6+i*2.5],[x,1.19,-6+i*2.5],.13,timber);
  }
  if(subject==="delivery"||subject==="survey"||subject==="landing"||subject==="fridge")delivery(m,survey);
  if(subject==="fridge"){
    m.box(46,1.81,1,.88,1.77,.8,painted("#d0dad0"));m.box(46,2.22,1.43,.84,.69,.06,painted("#e9e5d4"));
    m.pipe([45.7,1.62,1.47],[45.7,1.97,1.47],.035,painted("#666d6f"));
  }
  const unbuilt=subject==="beach"?list.find(i=>i.kind==="map"&&i.c[0]<-45&&i.c[1]>0):undefined;
  const [x,y,z]=unbuilt?[unbuilt.c[0],SAND_Y,unbuilt.c[1]]:locations[subject];
  const huge=subject==="archipelago",large=subject==="coast"||subject==="palm",big=subject==="hotel"||subject==="dredger"||subject==="breakwater";
  const d=huge?205:large?70:big?29:unbuilt||subject==="ireland"||subject==="villa"?13:5;
  const eye=(a:number,b:number,c:number):Point=>[x+d*a,y+d*b,z+d*c];
  let look:Point=[x,y+(huge?0:big?1:.32),z];
  let wideCam=camera(eye(-.62,.55,1.25),look,46);
  if(subject==="coast"){look=[SHORE_X+90,55,40];wideCam=camera([x-70,y+9,z+30],look,38);}       // from the islands toward the skyline
  const base=m.finish({wide:wideCam,medium:camera(eye(-.66,.48,1),look,43),close:camera(eye(-.43,.27,.68),look,36)});
  base.cameras.aerial=camera(eye(.01,huge?1.55:1.55,.24),look,huge?52:45);
  if(subject==="coast")base.cameras.aerial=camera([x-60,160,z+120],[SHORE_X,20,z],46);
  const feet:Point=unbuilt?[x+.55,SAND_Y,z+.25]:subject==="dredger"?[DREDGE[0]+1,4.96,DREDGE[2]+1]:survey?[43.5,.88,2.85]
    :subject==="ireland"?[x+.4,SAND_Y,z+.6]:subject==="villa"?[x-3,SAND_Y,z+5]:subject==="coast"?[x,SAND_Y,z]:[46,.94,3.25];
  return {group:base,feet,place:"dubai"};
}

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
