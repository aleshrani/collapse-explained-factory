import * as THREE from "three";
import {ctex} from "../videos/bridge/paint";
import {Model,painted,wood} from "./shared";
import {finish,RoomParams,shell,sign,table} from "./interior";
import {addPerson} from "./extras";
import {animate} from "./motion";

// Finance room: a wall of market screens above a trading desk. state "crash" = falling red charts,
// "rescue" = a steadied, rising line. Charts are schematic (no numbers) so no figure is invented.
export function build(p:RoomParams){
  const m=new Model(),w=Math.max(14,Math.min(24,p.size??18));shell(m,w);
  const steel=painted("#56696d"),dark=painted("#26323b"),brass=painted("#ba9e62"),crash=p.state!=="rescue";
  const screens=(n:number)=>ctex("finance-"+(crash?"crash":"rescue")+n,512,288,(g,r)=>{
    g.fillStyle="#13222b";g.fillRect(0,0,512,288);g.strokeStyle="#2d4a57";g.lineWidth=1;
    for(let x=0;x<512;x+=64){g.beginPath();g.moveTo(x,0);g.lineTo(x,288);g.stroke();}for(let y=0;y<288;y+=48){g.beginPath();g.moveTo(0,y);g.lineTo(512,y);g.stroke();}
    const up=!crash&&n%3!==0,col=up?"#58c27a":"#e2453c";g.strokeStyle=col;g.lineWidth=5;g.beginPath();
    let y=up?220:50+r()*30;for(let x=0;x<=512;x+=16){y+=up?-(4+r()*8)+(r()-.5)*14:(5+r()*9)+(r()-.5)*18;y=Math.max(20,Math.min(268,y));if(x)g.lineTo(x,y);else g.moveTo(x,y);}g.stroke();
    g.fillStyle=col;g.fillRect(14,14,70,26);g.fillStyle="#13222b";g.font="bold 20px Arial";g.fillText(up?"▲":"▼",34,34);
    for(let i=0;i<5;i++){g.fillStyle="#9ab3ba";g.fillRect(430,60+i*36,60+r()*20,8);}
  });
  m.box(0,3.5,-5.95,w-1.5,4.8,.2,dark);
  const cols=5,rows=2;
  for(let c=0;c<cols;c++)for(let r=0;r<rows;r++){
    const x=-w/2+2.4+c*(w-4.8)/(cols-1),y=2.6+r*2.15;
    m.box(x,y,-5.8,3.0,1.8,.12,steel);
    const plane=new THREE.Mesh(new THREE.PlaneGeometry(2.8,1.6),new THREE.MeshBasicMaterial({map:screens(c*rows+r)}));plane.position.set(x,y,-5.73);m.group.add(plane);
    const tex=screens(c*rows+r);tex.wrapS=THREE.RepeatWrapping;animate(m.group,t=>{tex.offset.x=((t*.09+(c*rows+r)*.23)%1+1)%1;});   // live ticker: every chart keeps scrolling
  }
  m.box(0,5.55,-6.1,w-3,.35,.1,painted("#bc644c"));
  sign(m,-1.5,6.3,-6.2,5.8,.7,"غرفة التداول | "+(p.subject||"Finance room"),"#3d4a55");
  table(m,0,-1.4,9,2.2,1.05);
  for(let i=0;i<4;i++){const x=-3.5+i*2.3;m.box(x,1.45,-1.9,.9,.55,.06,dark);m.box(x,1.3,-1.85,.07,.3,.07,steel);paper(m,x,1.15,-1.1);}
  m.box(3.6,1.2,-1.1,.5,.12,.4,painted("#2f3945"));m.pipe([3.6,1.25,-1.1],[3.6,1.45,-1.1],.06,dark);
  [-3.5,-1.2,1.1,3.4].forEach((x,i)=>addPerson(m.group,{x,y:.5,z:-2.6,variant:i,scale:1,seated:true}));
  addPerson(m.group,{x:0,y:0,z:-3.3,variant:5,scale:.95,carry:true,walk:{dx:4.2,period:9}});   // a runner crossing behind the desk
  sign(m,-.8,1.6,.9,2.6,.43,p.detail||(crash?"Markets falling":"Support announced"),"#8c6a54");
  return finish(m,[0,1.6,-1.4],"finance-wall");
}
function paper(m:Model,x:number,y:number,z:number){m.box(x,y,z,.7,.03,.5,painted("#e6ddc8"));}
