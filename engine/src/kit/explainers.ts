import * as THREE from "three";
import {ctex} from "../videos/bridge/paint";
import {lam} from "../videos/bridge/build";
import {camera, Model, painted, wood, Point} from "./shared";
import {addPerson} from "./extras";
import {CONTINENTS} from "../videos/dubai3d/islands";

export const bases=["map","documents","money","timeline","blueprint","boardroom","studio","skyline"] as const;
export type Base=typeof bases[number];
type Pin={label:string;lon:number;lat:number};
type Event={date:string;label:string};
type Params={subject:string;detail:string;value?:string;pins?:Pin[];events?:Event[];outline?:number[][];crowd?:number;weather?:string;damage?:number};
const ink="#293845",cream="#f3e8cb",sea="#9bc7ca",red="#bc644c";
function lettering(g:CanvasRenderingContext2D,text:string,x:number,y:number,w:number,size:number){
  g.fillStyle=ink;g.font="bold "+size+"px Arial";g.fillText(text,x,y,w);
}
function artwork(base:Base,p:Params){
  const key="explainer-"+base+JSON.stringify(p);
  return lam(key,()=>({map:ctex(key,1024,576,(g,r)=>{
    g.fillStyle=base==="map"?sea:cream;g.fillRect(0,0,1024,576);
    for(let i=0;i<1700;i++){g.fillStyle=i%2?"#ffffff25":"#42352717";g.fillRect(r()*1024,r()*576,2+r()*9,1+r()*3);}
    g.strokeStyle="#496d7840";g.lineWidth=1;
    for(let i=32;i<1024;i+=32){g.beginPath();g.moveTo(i,0);g.lineTo(i,576);g.moveTo(0,i);g.lineTo(1024,i);g.stroke();}
    if(base==="map"){
      const xy=(lon:number,lat:number)=>[48+(lon+180)/360*922,146+(82-lat)/152*340];
      for(const poly of CONTINENTS){
        g.beginPath();poly.forEach(([x,y],i)=>{const [a,b]=xy(x,y);if(i)g.lineTo(a,b);else g.moveTo(a,b);});g.closePath();g.fillStyle="#d7c286";g.fill();g.strokeStyle="#607975";g.stroke();
      }
      g.lineWidth=5;g.strokeStyle=red;g.beginPath();
      p.pins.forEach((pin,i)=>{const [x,y]=xy(pin.lon,pin.lat);if(i)g.lineTo(x,y);else g.moveTo(x,y);});g.stroke();
      p.pins.forEach((pin,i)=>{const [x,y]=xy(pin.lon,pin.lat);g.beginPath();g.arc(x,y,9,0,2*Math.PI);g.fillStyle=red;g.fill();lettering(g,pin.label,Math.max(20,Math.min(x-27,790)),y+(i%2?34:-16),202,24);});
    }else if(base==="timeline"){
      const events=p.events;g.fillStyle="#72979b";g.fillRect(90,320,842,8);
      events.forEach((e,i)=>{const x=110+i*794/Math.max(1,events.length-1);g.fillStyle=red;g.fillRect(x-8,306,16,35);const left=Math.min(780,x-36);lettering(g,e.date,left,285,170,38);lettering(g,e.label,left,380,211,27);});
    }else if(base==="blueprint"){
      g.fillStyle="#326579";g.fillRect(80,176,864,280);g.strokeStyle="#e6ead5";g.lineWidth=6;g.beginPath();
      p.outline.forEach(([x,y],i)=>i?g.lineTo(100+x*810,193+y*238):g.moveTo(100+x*810,193+y*238));g.stroke();
      g.lineWidth=2;g.setLineDash([10,8]);g.beginPath();g.moveTo(90,315);g.lineTo(933,315);g.stroke();g.setLineDash([]);
    }else if(base==="money"){lettering(g,p.value,80,378,858,137);}
    else if(base==="documents"){
      g.lineWidth=2;g.strokeStyle=ink;g.strokeRect(50,154,924,327);
      for(let col=0;col<3;col++)for(let j=0;j<10;j++){g.fillStyle=j%3?"#53636b80":"#53636ba8";g.fillRect(72+col*305,194+j*26,215+r()*61,4);}
    }
    else if(base==="boardroom"||base==="studio"||base==="skyline"){
      g.strokeStyle=ink;g.lineWidth=2;g.strokeRect(50,154,924,327);
      for(let j=0;j<4;j++){
        const y=196+j*72;g.strokeStyle=ink;g.lineWidth=4;g.strokeRect(78,y-22,34,34);
        if(j<3){g.beginPath();g.moveTo(84,y-4);g.lineTo(94,y+4);g.lineTo(108,y-18);g.strokeStyle=red;g.lineWidth=6;g.stroke();}
        g.fillStyle="#53636bb0";g.fillRect(140,y-14,330+r()*250,9);g.fillStyle="#53636b70";g.fillRect(140,y+4,200+r()*190,6);
      }
      g.fillStyle="#d3c49f";g.fillRect(700,176,242,282);g.strokeStyle=ink;g.lineWidth=3;g.strokeRect(700,176,242,282);
      for(let k=0;k<5;k++){g.fillStyle=k%2?"#72979b":"#bc644c";g.fillRect(720+k*42,438-(60+k*37%140),30,60+k*37%140);}
    }
    g.fillStyle=cream;g.fillRect(26,23,972,110);lettering(g,p.subject,49,98,921,64);
    g.fillStyle=ink;g.fillRect(26,506,972,51);g.fillStyle=cream;g.font="bold 31px Arial";g.fillText(p.detail,47,543,924);
  })}));
}

function panelDesk(m:Model,base:Base,crowd:number){
  const steel=painted("#56696d"),brass=painted("#c5a45d"),floor=wood(),dark=painted("#2f3945"),paper=painted("#e6ddc8"),glass=painted("#789a9e","glass");
  m.box(0,1.1,1.3,7.8,.23,2.1,floor);m.box(0,.52,1.3,7.4,1.04,1.7,base==="studio"?painted("#486a7a","rib"):steel);
  m.box(0,.65,2.17,6.4,.5,.06,painted("#bc644c"));
  const n=Math.min(6,Math.max(1,crowd));
  for(let i=0;i<n;i++){
    const x=(i-(n-1)/2)*1.25;
    addPerson(m.group,{x,y:-.35,z:.35,variant:i,scale:.95});
    m.box(x,1.25,1.5,.55,.05,.4,paper);                    // sheet at each seat
    m.pipe([x+.45,1.23,1.65],[x+.45,1.4,1.65],.045,dark);  // glass / mic stem
    m.box(x+.45,1.43,1.65,.08,.05,.08,base==="studio"?brass:dark);
  }
  if(base==="studio"){
    for(const x of [-5.2,5.2]){m.pipe([x,0,2],[x,3.5,2],.09,steel);m.box(x,3.6,2,.88,.62,.75,brass);m.box(x,3.6,2.4,.7,.46,.05,painted("#fff3c8"));}
    m.box(-2.4,1.5,1.6,1.3,.8,.12,dark);m.box(-2.4,1.5,1.66,1.2,.7,.02,painted("#4b7f8d","glass"));  // desk monitors
    m.box(2.4,1.5,1.6,1.3,.8,.12,dark);m.box(2.4,1.5,1.66,1.2,.7,.02,painted("#4b7f8d","glass"));
    // camera on a tripod with lens and tally lamp
    for(const a of [0,2.1,4.2])m.beam([8,1.5,5],[8+Math.cos(a)*.9,0,5+Math.sin(a)*.9],.07,dark);
    m.box(8,1.85,5,.9,.6,1.4,dark);m.pipe([8,1.85,5.7],[8,1.85,6.5],.26,steel);m.mound(8,2.2,4.5,.12,.1,.12,painted("#d0462f"),1);
    m.box(0,6.4,-7.6,5.6,.95,.1,painted("#bc644c"));
  }else{
    for(const x of [-3.2,3.2])m.beam([x,.2,-.2],[x,.8,-.2],.12,steel);
    void glass;
  }
}
function city(m:Model,mat:THREE.Material){
  const steel=painted("#56696d"),road=painted("#778181","road"),curb=painted("#a39c8c","plate");
  m.box(0,.01,2,34,.1,13,road,4);
  for(let x=-16;x<=16;x+=3)m.box(x,.07,2,1.3,.02,.15,painted("#e3d9b8"));
  for(let n=0;n<44;n++){
    const x=(n%11-5)*2.4+(n%3)*.2,row=Math.floor(n/11),z=-9-row*3.8,h=3+(n*13%17)+row*1.5,w=1.5+(n%3)*.3;
    m.box(x,h/2,z,w,h,w*1.35,painted(n%2?"#9ba7a8":n%3?"#b5b2a0":"#a8b0a0","wall"),2.4);m.box(x,h+.13,z,w+.17,.25,w*1.35+.12,steel);
    if(n%4===1)m.pipe([x,h+.25,z],[x,h+1.4,z],.05,steel);
  }
  // central tower carries the billboard that names the subject
  m.box(0,8,-7.5,4.2,16,3.2,painted("#a9b4aa","wall"),2.2);m.box(0,16.1,-7.5,4.45,.3,3.45,steel);
  m.box(0,12.3,-5.78,9.2,5.2,.3,steel);
  const sign=new THREE.Mesh(new THREE.PlaneGeometry(8.9,4.9),mat);sign.position.set(0,12.3,-5.6);m.group.add(sign);
  for(const x of [-3.6,3.6])m.beam([x,10,-5.9],[x*.9,9,-7.2],.1,steel);
  for(let x=-14;x<=14;x+=4)for(const z of [-3,6]){m.pipe([x,0,z],[x,3.6,z],.07,steel);m.box(x+.3,3.6,z,.7,.12,.2,painted("#e6dbb8"));}
  for(const [x,z] of [[-7,5],[8,-3],[-9,-3]]){m.pipe([x,0,z],[x,1.3,z],.14,painted("#6a4f3a"));m.mound(x,1.3,z,1.1,1.5,1.1,painted("#7da16d","earth"),x);}
  m.box(0,.12,6.8,34,.2,.9,curb);
}

function deskScene(m:Model,base:Base){
  const steel=painted("#56696d"),dark=painted("#2f3945"),cork=painted("#b98f62","earth"),cream=painted("#e6ddc8"),red=painted("#bc644c"),green=painted("#6f946a"),brass=painted("#c5a45d"),floor=wood();
  // pin board with clippings and string, filing cabinets and binder shelf behind the desk
  m.box(0,3.2,-4.1,9.4,4.4,.18,steel);m.box(0,3.2,-3.98,9.0,4.0,.1,cork,3);
  const tints=["#e6ddc8","#d9d2b8","#cfd8cc","#e0c9a8"];
  for(let i=0;i<9;i++){const x=-3.8+(i%5)*1.9+(i>4?.9:0),y=3.9-Math.floor(i/5)*1.8+((i*7)%3)*.1;m.box(x,y,-3.9,1.2+(i%3)*.15,1.0+(i%2)*.2,.03,painted(tints[i%4]));m.box(x,y+.45,-3.86,.1,.1,.03,red);for(let j=0;j<3;j++)m.box(x,y+.2-j*.22,-3.87,.8,.04,.01,painted("#807c71"));}
  m.beam([-3.8,4.35,-3.84],[0,2.6,-3.84],.025,red);m.beam([0,2.6,-3.84],[3.8,4.1,-3.84],.025,red);
  for(const x of [-6.2,6.2]){m.box(x,1.3,-3.3,1.7,2.6,1.1,painted("#7c8a83","rib"));for(let i=0;i<4;i++){m.box(x,.4+i*.62,-2.74,1.55,.5,.05,cream);m.box(x,.42+i*.62,-2.7,.4,.06,.05,brass);}}
  m.box(6.2,2.9,-3.3,1.7,.1,1.1,steel);
  for(let i=0;i<7;i++)m.box(5.6+i*.18,3.3,-3.3,.14,.7+(i%3)*.12,.6,painted(["#b8795b","#6b8aa0","#8f9a6a","#a98b5a"][i%4]));
  // desk lamp, mug, pen cup and folders
  const ox=-3.2;
  m.pipe([ox,1.25,-1.5],[ox,2.3,-1.5],.04,dark);m.beam([ox,2.3,-1.5],[ox+.8,2.15,-1.2],.04,dark);m.add(new THREE.ConeGeometry(.3,.35,16,1,true).rotateZ(Math.PI/2+.15).translate(ox+1.0,2.05,-1.15),painted("#4d7e86"));
  m.box(ox,1.3,-1.5,.5,.08,.5,dark);
  m.pipe([3.2,1.3,-1.4],[3.2,1.65,-1.4],.2,red);m.pipe([3.17,1.65,-1.4],[3.1,2.05,-1.38],.025,dark);m.pipe([3.24,1.65,-1.4],[3.34,2.0,-1.42],.025,brass);
  for(let i=0;i<3;i++)m.box(-2.2+i*.2,1.3+i*.04,-1.55+i*.05,1.6,.04,1.1,painted(["#b8795b","#6b8aa0","#8f9a6a"][i]));
  m.pipe([1.7,1.3,-1.45],[1.7,1.62,-1.45],.17,green);
  // chair pulled up to the desk
  m.box(-.6,.8,2.9,1.5,.14,1.4,painted("#48546a"));m.box(-.6,1.55,3.55,1.5,1.4,.14,painted("#48546a"));
  for(const dx of [-.55,.55])for(const dz of [-.5,.5])m.pipe([-.6+dx,0,2.9+dz],[-.6+dx,.75,2.9+dz],.05,dark);
  if(base==="money"){
    for(let i=0;i<3;i++)for(let j=0;j<4;j++)m.box(2.2+i*.7,1.28+j*.1,.95,.62,.09,.34,painted("#84a087"));
    m.box(-1.6,1.32,1.4,.8,.1,1.0,dark);m.box(-1.6,1.38,1.4,.7,.02,.9,painted("#9eb5a2"));
  }
  if(base==="blueprint"){
    m.pipe([5.2,0,0],[5.2,1.5,0],.45,painted("#9a8566"));for(let i=0;i<5;i++)m.pipe([5.1+i*.08,1.5,-.1+i*.05],[5.1+i*.12,2.9,-.1+i*.05],.1,painted(i%2?"#e6ddc8":"#3d7f93"));
    m.box(-4.1,1.3,.8,.2,.04,3.4,steel);m.box(-4.1,1.3,2.5,1.6,.04,.2,steel);
  }
  if(base==="documents"){
    for(let i=0;i<6;i++)m.box(-3.6+i*.28,1.32,1.4+((i%3)-1)*.1,.5,.03,.7,painted(tints[i%4]),1);
    m.box(1.2,1.3,1.2,.7,.2,.5,painted("#a45a45"));m.box(1.2,1.42,1.2,.6,.04,.4,brass);
  }
  void floor;
}
export function build(base:Base,p:Params){
  if(!p.subject?.trim()||!p.detail?.trim())throw Error("Missing episode dressing for "+base);
  const m=new Model(),mat=artwork(base,p),steel=painted("#56696d"),brass=painted("#c5a45d"),paper=painted("#e6ddc8");
  const wall=painted("#a8afa5","rib"),window=painted("#749da5","glass"),floor=wood();
  m.box(0,-.15,0,55,.28,40,base==="skyline"?painted("#b2a98e","earth"):floor,5);if(base!=="skyline")m.box(0,5,-8,53,10,.5,wall);
  if(base!=="skyline")for(let x=-20;x<=20;x+=5){m.box(x,5.5,-7.65,3.4,5.4,.16,window);m.box(x,2.69,-7.54,3.65,.15,.3,steel);}
  const board=(x:number,y:number,z:number,w:number,h:number)=>{
    m.box(x,y,z-.12,w+.18,h+.18,.2,steel);
    const plate=new THREE.Mesh(new THREE.PlaneGeometry(w,h),mat);plate.position.set(x,y,z+.01);m.group.add(plate);
  };
  const desk=base==="documents"||base==="money"||base==="blueprint";
  if(desk){
    m.box(0,1.12,0,8.5,.22,4.4,floor);
    for(const x of [-3.65,3.65])for(const z of [-1.65,1.65])m.box(x,.52,z,.35,1.05,.35,steel);
    const page=new THREE.Mesh(new THREE.PlaneGeometry(4.5,2.52),mat);page.rotation.x=-Math.PI/2;page.position.set(-.45,1.252,.15);m.group.add(page);
    if(base==="money")for(let i=0;i<10;i++){const x=2.46+(i%2)*.57,y=1.28+Math.floor(i/4)*.19,z=-.8+Math.floor(i%4/2)*.68;m.box(x,y,z,.51,.18,.63,painted("#84a087"));m.box(x,y+.10,z,.16,.026,.63,paper);}
    if(base==="documents")for(let i=0;i<8;i++)m.box(2.73,1.24+i*.028,-.18+i*.02,1.12,.025,1.43,i%3?paper:brass);
    if(base==="blueprint"){m.pipe([2.32,1.39,-1.5],[2.32,1.39,1.5],.16,paper);m.beam([-2.94,1.27,-.87],[-2.65,1.27,1.3],.09,brass);}
    deskScene(m,base);
  }else{
    if(base!=="skyline")board(0,3.15,-2.6,8.48,4.77);
    if(base==="map"||base==="timeline")for(const x of [-3.9,3.9])m.box(x,1,-2.7,.17,2,.22,brass);
    if(base==="boardroom"||base==="studio")panelDesk(m,base,p.crowd??2);
    if(base==="boardroom"){
      // rug, clock, plant and mic stands give the decision room scale
      m.box(0,.02,.8,11,.05,5.4,painted("#6b7d86","plate"),4);
      m.pipe([-6.4,0,-1],[-6.4,.8,-1],.4,painted("#b8795b"));for(let i=0;i<5;i++)m.mound(-6.4+Math.sin(i*1.3)*.35,.8+i*.18,-1+Math.cos(i*1.3)*.3,.34,.55,.3,painted("#6f946a","earth"),i);
      m.add(new THREE.CylinderGeometry(.55,.55,.1,24).rotateX(Math.PI/2).translate(5.4,6.7,-7.6),painted("#efe7d2"));
      m.beam([5.4,6.7,-7.52],[5.4,7.12,-7.52],.05,steel);m.beam([5.4,6.7,-7.52],[5.72,6.6,-7.52],.05,steel);
    }
    if(base==="skyline")city(m,mat);
  }
  const target:Point=desk?[-.3,1.23,0]:[0,3,-2.5];
  const group=m.finish({wide:camera([5.5,5.8,10.2],target,48),medium:camera(desk?[1.4,5.6,4.1]:[.7,3.4,7.1],target,45),close:camera(desk?[.1,4.75,2.3]:[-.8,3,5.1],target,41)});
  if(desk)group.cameras.aerial=camera([-.3,8,.1],target,45);
  if(base==="skyline"){
    group.cameras.wide=camera([2.5,6.2,16],[0,9,-6],56);group.cameras.medium=camera([3.2,4.4,11],[0,10,-6],48);group.cameras.close=camera([2.8,3.4,9.2],[0,11,-6],42);
    group.cameras.aerial=camera([6,22,12],[0,6,-5],60);group.cameras.low=camera([4,1.2,10.5],[0,10,-6],54);group.cameras.dolly=camera([-3,5,12.5],[0,10,-6],46);
  }
  const feet:Point=desk?[3.3,0,2.6]:base==='skyline'?[4.4,.12,4.6]:[4.6,0,-.2];
  return {group,feet,place:base};
}

