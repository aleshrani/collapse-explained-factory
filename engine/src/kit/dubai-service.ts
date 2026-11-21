import * as THREE from "three";
import {camera, Model, painted, wood, Point} from "./shared";
import {stencil} from "./markings";
import {addPerson} from "./extras";

export const stations=["bath","seabed","breakwater","channel","kitchen","reception","dispatch"] as const;
type Station=typeof stations[number];
export function build(p:{station?:string;state?:string;label?:string}){
  const s=stations.includes(p.station as Station)?p.station:"seabed",state=p.state??"open",m=new Model();
  const cream=painted("#e8d8b9"),teal=painted("#5f969b"),steel=painted("#839592"),sand=painted("#d1b183","sand"),tile=painted("#c8cabe","plate");
  m.box(0,-.13,0,28,.24,25,wood());m.box(0,3,-5.4,28,6,.4,painted("#aaa999","rib"));
  for(let j=0;j<5;j++)m.box(-10+j*4.3,3.25,-5.15,3.2,2.6,.16,painted("#80abb3","glass"));
  const table=(h:number)=>{m.box(0,h,0,6,.19,3.6,wood());for(const x of [-2.6,2.6])for(const z of [-1.35,1.35])m.box(x,h/2,z,.25,h,.25,steel);};
  if(s==="bath"||s==="seabed"||s==="channel"||s==="breakwater"){
    table(.85);
    m.box(0,1.01,0,5.1,.17,2.93,cream);
    m.box(0,1.24,0,4.95,.37,2.76,painted("#739da0","glass"));
    for(const x of [-2.54,2.54])m.box(x,1.33,0,.1,.53,2.99,cream);
    for(const z of [-1.48,1.48])m.box(0,1.5,z,5.13,.11,.13,cream);
    if(s==="bath"||s==="seabed"){
      m.mound(-.45,1.12,-.05,s==="bath"?1.1:2.02,state==="submerged"?.24:.76,.87,sand,22);
      m.pipe([1.48,1.14,-.65],[1.48,2.7,-.65],.055,cream);
      for(let i=0;i<10;i++)m.box(1.48,1.2+i*.14,-.585,.14,.027,.023,steel);
      if(s==="bath"){m.add(new THREE.SphereGeometry(.47,24,8,0,Math.PI*2,Math.PI*.5,Math.PI*.5).translate(1.49,1.75,.62),painted("#c29165"));m.mound(1.49,1.72,.62,.44,.18,.42,sand);}
    }else{
      for(let i=0;i<25;i++){
        const a=i*Math.PI*2/25;
        if(state!=="closed"&&i>3&&i<7)continue;
        m.mound(Math.cos(a)*1.94,1.39,Math.sin(a)*1.06,.29,.24,.23,painted("#899287","earth"),i);
      }
      for(let i=0;i<7;i++)m.mound((i%3-1)*.75,1.35,(Math.floor(i/3)-1)*.48,.32,.23,.2,sand,i);
      m.box(.86,1.51,.79,.46,.15,.15,teal);m.box(.8,1.65,.79,.17,.14,.13,cream);
    }
  }else if(s==="kitchen"){
    for(let i=-2;i<=2;i++){m.box(i*.95,.63,-1,.92,1.24,1.05,teal);m.box(i*.95+.23,1.02,-.44,.21,.06,.05,cream);}
    m.box(0,1.33,-1,4.96,.17,1.16,tile);m.box(-.75,1.427,-1,.85,.03,.62,steel);
    m.pipe([-.75,1.41,-1.43],[-.75,1.92,-1.43],.052,steel);m.pipe([-.75,1.9,-1.43],[-.75,1.9,-1.03],.055,steel);
    m.add(new THREE.CylinderGeometry(.12,.096,.32,12).translate(-.68,1.59,-.93),painted("#b6cecc","glass"));
    m.box(2.97,1.14,-.9,1.04,2.26,1.02,cream);m.box(2.97,1.82,-.36,1,.78,.07,tile);m.box(2.6,1.06,-.31,.055,.59,.05,steel);
  }else{
    table(1.08);
    const paper=painted("#e4dec5");
    for(let i=0;i<5;i++)m.box(.15+i*.017,1.2+i*.024,.4,1.78,.023,1.19,paper);
    m.beam([.3,1.38,0],[1.14,1.38,.79],.085,teal);
    if(s==="reception"){m.box(-1.74,1.49,-.44,1.04,.62,.16,stencil(state==="closed"?"CLOSED":"OPEN","#50787a"));m.mound(1.62,1.22,.44,.27,.18,.25,steel);}
    else{m.box(-1.73,1.62,-.3,1.02,.92,.78,wood());m.box(-1.73,1.77,.102,.72,.34,.02,stencil("MILK","#567972"));}
  }
  if(p.label){const pl=new THREE.Mesh(new THREE.PlaneGeometry(2.3,.48),stencil(p.label,"#516e72"));pl.position.set(.3,.85,1.85);m.group.add(pl);}
  const look:Point=s==="kitchen"?[.1,1.3,-.6]:[0,1.39,0];
  addPerson(m.group,{x:-3,y:0,z:3.6,variant:4,carry:true,walk:{dx:4,period:10}});   // a worker crosses the room with papers
  const group=m.finish({wide:camera([3.7,3.7,6.65],look,45),medium:camera([-2.5,3.38,4.05],look,43),close:camera([.8,2.78,3.56],look,41)});
  const feet:Point=[2.68,0,2.35];return {group,feet,place:"dubai-service"};
}

