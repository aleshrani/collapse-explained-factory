import * as THREE from "three";
import {Model, painted, wood} from "./shared";
import {stencil} from "./markings";

// Reusable gag props. Each builder draws at the origin, facing +z, about 3 m wide at most; dress.ts places it beside the host.
export const gagIds=["supercar","whiteboard","price-chart","ruler","deckchair","departure-board","filing-cabinet","mirror-wall","toy-models","form","framed-document","hair-dryer"] as const;
export type GagId=typeof gagIds[number];
const dark=()=>painted("#2f3945"),steel=()=>painted("#56696d"),cream=()=>painted("#efe7d2"),red=()=>painted("#bc644c"),brass=()=>painted("#c5a45d");
function board(m:Model,w:number,h:number,y:number,face:THREE.Material){
  m.box(0,y,-.05,w+.2,h+.2,.14,steel());m.box(0,y,.04,w,h,.04,face);
  for(const x of [-w/2+.3,w/2-.3])m.pipe([x,0,-.05],[x,y-h/2,-.05],.05,dark());
}
const line=(m:Model,x:number,y:number,len:number,col=painted("#53636b"))=>m.box(x,y,.08,len,.05,.02,col);
export function buildProp(id:GagId,text="Price"){
  const m=new Model();
  if(id==="supercar"){
    const body=painted("#c8382e","plate"),glass=painted("#4d7886","glass");
    m.box(0,.55,0,4.1,.5,1.7,body);m.box(.35,.95,0,2.0,.42,1.5,body);m.box(.5,1.05,0,1.5,.34,1.54,glass);m.box(-1.7,.85,0,.8,.12,1.6,body);
    m.beam([1.9,.62,0],[2.2,.5,0],.5,body);
    for(const x of [-1.25,1.25])for(const z of [-.85,.85]){m.add(new THREE.CylinderGeometry(.38,.38,.28,18).rotateX(Math.PI/2).translate(x,.38,z),dark());m.add(new THREE.CylinderGeometry(.2,.2,.3,12).rotateX(Math.PI/2).translate(x,.38,z),brass());}
    for(const z of [-.55,.55])m.box(2.02,.66,z,.1,.12,.35,painted("#fff3c8"));
  }else if(id==="whiteboard"){
    board(m,3.2,2.0,2.1,painted("#f4f1e6"));
    for(let i=0;i<4;i++){line(m,-.3,2.9-i*.38,2.0-i*.4);line(m,1.15,2.9-i*.38,.4-i*.05,red());}
    m.box(0,1.0,.1,3.0,.06,.14,brass());
  }else if(id==="price-chart"){
    board(m,3.4,2.2,2.2,painted("#f4f1e6"));
    m.beam([-1.4,1.4,.08],[-.2,2.0,.08],.07,red());m.beam([-.2,2.0,.08],[.8,2.9,.08],.07,red());m.beam([.8,2.9,.08],[1.4,2.4,.08],.07,red());
    for(const [x,y] of [[-1.4,1.4],[-.2,2.0],[.8,2.9],[1.4,2.4]])m.mound(x,y,.08,.08,.08,.04,red(),1);
    m.box(-1.5,2.2,.07,.04,1.7,.02,dark());m.box(0,1.36,.07,3.0,.04,.02,dark());
  }else if(id==="ruler"){
    m.box(0,.1,0,3.6,.06,.5,painted("#d9b062","plate"));
    for(let i=0;i<24;i++)m.box(-1.7+i*.15,.15,.15,.02,i%5?.08:.16,.02,dark());
    m.box(0,.2,-.5,1.8,.05,.4,painted("#d9b062"));
  }else if(id==="deckchair"){
    const stripe=painted("#4d9693","stripe");
    m.beam([-.7,.1,-.3],[-.2,.95,-.5],.07,wood());m.beam([.7,.1,-.3],[.2,.95,-.5],.07,wood());m.box(0,.55,.2,1.4,.06,1.0,stripe);m.box(0,.9,-.5,1.4,.9,.06,stripe);
    m.pipe([.9,.3,.55],[.9,.5,.55],.18,red());m.mound(.9,.55,.55,.2,.15,.2,cream(),3);m.mound(.82,.62,.52,.08,.08,.08,painted("#f2d27a"),5);
  }else if(id==="departure-board"){
    board(m,3.6,1.8,2.4,painted("#26323b"));
    for(let i=0;i<5;i++){line(m,-1.2,3.0-i*.3,.9,painted("#f2d27a"));line(m,.2,3.0-i*.3,.9,painted("#9ec3c8"));line(m,1.3,3.0-i*.3,.4,i%2?red():painted("#8fc79a"));}
  }else if(id==="filing-cabinet"){
    m.box(0,1.2,0,1.2,2.4,.8,painted("#7c8a83","rib"));
    for(let i=0;i<4;i++){m.box(0,.4+i*.6,.42,1.1,.5,.05,cream());m.box(0,.46+i*.6,.46,.4,.06,.05,brass());}
    m.box(.2,2.55,0,.9,.18,.5,painted("#e6ddc8"));
  }else if(id==="mirror-wall"){
    m.box(0,2,-.1,4.4,4.0,.12,steel());m.box(0,2,0,4.2,3.8,.04,painted("#b9d6dc","glass"));
    for(let i=0;i<4;i++)m.beam([-2+i*1.1,.3,.05],[-1.2+i*1.1,3.9,.05],.1,painted("#e8f2f2"));
  }else if(id==="toy-models"){
    m.box(0,.9,0,3.2,.12,1.4,wood());for(const x of [-1.4,1.4])for(const z of [-.5,.5])m.box(x,.42,z,.12,.84,.12,steel());
    for(let i=0;i<5;i++)m.box(-1.2+i*.6,1.2+(i%3)*.14,(i%2)*.3-.15,.4,.5+(i%3)*.28,.4,painted(["#9ba7a8","#b5b2a0","#a8b0a0","#c1a889","#8fa0a8"][i]),2);
    m.add(new THREE.ConeGeometry(.22,.35,4).translate(.9,1.8,0),red());
  }else if(id==="form"){
    m.box(0,1.5,0,2.2,2.9,.06,painted("#f4f1e6"));
    for(let i=0;i<5;i++){m.box(-.8,2.6-i*.5,.04,.2,.2,.02,painted("#d6cdb4"));m.box(-.8,2.6-i*.5,.05,.12,.04,.02,dark());line(m,.1,2.6-i*.5,1.2);}
    m.box(0,3.1,.04,1.9,.2,.02,painted("#4d7886"));
  }else if(id==="framed-document"){
    m.box(0,1.8,0,2.0,2.6,.12,brass());m.box(0,1.8,.07,1.75,2.35,.04,painted("#f4f1e6"));
    for(let i=0;i<7;i++)line(m,0,2.8-i*.28,1.4-(i%3)*.25);
    m.mound(.5,.9,.1,.17,.2,.04,red(),2);
    m.box(0,3.25,.07,1.2,.14,.03,painted("#4d7886"));
  }else{ // hair-dryer
    m.add(new THREE.CylinderGeometry(.22,.26,.9,16).rotateZ(Math.PI/2).translate(0,1.2,0),painted("#c8382e"));
    m.box(-.2,.8,0,.2,.7,.2,dark());m.add(new THREE.CylinderGeometry(.24,.18,.18,16).rotateZ(Math.PI/2).translate(.5,1.2,0),dark());
    m.pipe([-.2,.45,0],[-1.2,.1,.6],.03,dark());
  }
  void text;void stencil;
  return m.assemble();
}
