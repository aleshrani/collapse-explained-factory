import * as THREE from "three";
import {ctex} from "../videos/bridge/paint";
import {CONTINENTS} from "../videos/dubai3d/islands";
import {Model,painted,wood} from "./shared";
import {addPerson} from "./extras";
import {finish,paper,RoomParams,shell,sign,table} from "./interior";

function poster(m:Model,x:number,y:number,z:number,w:number,h:number,english:string,arabic:string,variant:number){
  const map=ctex("office-poster"+variant+english,512,768,(g,r)=>{
    g.fillStyle=variant?"#f1e6c8":"#cfe6e8";g.fillRect(0,0,512,768);
    g.fillStyle=variant?"#7fb8bf":"#3f9aa6";g.fillRect(24,24,464,470);
    for(const poly of CONTINENTS){g.beginPath();poly.forEach(([lon,lat],i)=>{const a=40+(lon+180)/360*432,b=60+(82-lat)/152*380;if(i)g.lineTo(a,b);else g.moveTo(a,b);});g.closePath();g.fillStyle="#e0c78b";g.fill();}
    g.fillStyle="#293845";g.font="bold 64px Arial";g.textAlign="center";g.fillText(english,256,580,460);g.font="bold 58px Arial";g.fillText(arabic,256,660,460);
    g.fillStyle="#bc644c";g.fillRect(150,700,212,8);
  });
  m.box(x,y,z-.05,w+.16,h+.16,.1,painted("#695e50"));
  const plane=new THREE.Mesh(new THREE.PlaneGeometry(w,h),new THREE.MeshLambertMaterial({map}));plane.position.set(x,y,z+.02);m.group.add(plane);
}
export function build(p:RoomParams){
  const m=new Model(),w=Math.max(12,Math.min(25,p.size??17));shell(m,w);
  const brass=painted("#ba9e62"),woodwork=wood(),paperboard=painted("#d4cab1");
  for(let j=0;j<4;j++){
    const x=-4.9+j*3.15;
    m.box(x,1,-4.78,2.94,1.93,1.07,woodwork);
    for(let n=0;n<3;n++){m.box(x,.45+n*.56,-4.2,2.75,.5,.09,paperboard);m.box(x,.51+n*.56,-4.12,.38,.067,.08,brass);}
    for(let n=0;n<7;n++)m.box(x-.94+n*.28,2.42,-4.86,.23,.8+(n%3)*.11,.65,painted(["#779694","#a97962","#a7a78b"][n%3],"rib"));
  }
  table(m,-.35,.25,6.2,3.3);paper(m,-1.28,1.16,1.02);paper(m,-1.12,1.205,.86);
  m.beam([-1.6,1.25,1.04],[-.92,1.25,.83],.056,brass);
  const sold=p.state==="signed";
  addPerson(m.group,{x:0,y:0,z:1.6,variant:3,scale:.95,walk:{dx:4.5,period:11}});addPerson(m.group,{x:-4.7,y:0,z:-.6,variant:0,scale:1});addPerson(m.group,{x:4.2,y:0,z:-.4,variant:5,scale:1});
  m.box(1.3,1.22,.67,.44,.13,.3,painted("#7b5547"));m.pipe([1.3,1.25,.67],[1.3,1.53,.67],.076,woodwork);
  m.box(.2,1.19,-.32,2.75,.12,1.35,painted("#6c9999","glass"));
  for(let i=0;i<9;i++){
    const x=-.77+(i%4)*.59,z=-.63+Math.floor(i/4)*.38;
    m.mound(x,1.28,z,.26,.14,.17,painted("#c5b183","sand"),i);
  }
  sign(m,-.46,2.75,-4.03,5.6,.87,p.subject||"Sales office");
  // marketing posters of the islands, English and Arabic, on the side walls
  poster(m,-w/2+.5,3.4,-4.3,1.9,2.8,"THE WORLD","العالم",0);poster(m,w/2-.5,3.4,-4.3,1.9,2.8,"SALES GALLERY","معرض المبيعات",1);
  sign(m,-.46,3.85,-4.0,3.8,.5,"معرض المبيعات | Sales gallery","#8c6a54");
  // islands drawn under the glass of the model table
  const atlas=ctex("office-atlas",512,256,(g,r)=>{g.fillStyle="#4aa3ab";g.fillRect(0,0,512,256);for(const poly of CONTINENTS){g.beginPath();poly.forEach(([lon,lat],i)=>{const a=10+(lon+180)/360*492,b=14+(82-lat)/152*228;if(i)g.lineTo(a,b);else g.moveTo(a,b);});g.closePath();g.fillStyle="#e3cb8e";g.fill();}});
  const atlasPlane=new THREE.Mesh(new THREE.PlaneGeometry(2.7,1.3).rotateX(-Math.PI/2),new THREE.MeshLambertMaterial({map:atlas}));atlasPlane.position.set(.2,1.26,-.32);m.group.add(atlasPlane);
  sign(m,-.8,1.57,-.98,2.4,.43,p.detail||(sold?"Signed contract":"Plot register"),"#8c6a54");
  for(const x of [-3.9,3.35]){m.box(x,.53,.75,.95,.17,.91,woodwork);m.box(x,1.03,.28,.95,1.08,.14,painted("#72908e"));for(const d of [-.34,.34])m.pipe([x+d,0,.75],[x+d,.52,.75],.06,brass);}
  const result=finish(m,p.state==="model"?[.15,1.3,-.3]:[-.55,1.42,.4],"property-office");
  result.feet=[2.07,0,2.32];
  return result;
}

