import * as THREE from "three";
import {camera, container, Model, painted, ridge, wood, Point} from "./shared";
import {sea} from "./sea";
import {stencil} from "./markings";
import {shell,paper,sign} from "./interior";
import * as caspian from "./caspian";
import * as railgun from "./railgun";
import * as museumKit from "./museum";
import * as boreholeKit from "./borehole";
import * as senegalKit from "./senegal";
import * as linearKit from "./linear";
import * as canalKit from "./canal";

export const ids=["caspian","railway-exhibit","pyramid-hotel","recovery","viewing-test","midtown-tower","castle-estate","capital-road","senegal-site","borehole","mars-habitat","fleet","ice-base","linear-city","settlement","tank-proposal","airport","atomic-concept","canal"] as const;
export type Project=typeof ids[number];
export type ProjectParams={phase?:"proposal"|"work"|"record";subject?:string;detail?:string;crowd?:number;damage?:number;weather?:string};
const settings:Record<Project,[string,number,number]>={
  caspian:["Caspian research craft",16,3],"railway-exhibit":["Railway exhibit",17,3],"pyramid-hotel":["Pyongyang hotel",28,14],recovery:["Pacific recovery ship",19,4],
  "viewing-test":["Sealed target",5,1.6],"midtown-tower":["Midtown tower",25,12],"castle-estate":["Mudurnu estate",20,5],"capital-road":["Naypyidaw boulevard",24,2],
  "senegal-site":["Mbodiène site",15,2],borehole:["Kola borehole",14,4],"mars-habitat":["Mars settlement proposal",17,3],fleet:["Fleet procurement",18,4],
  "ice-base":["Camp Century",14,3],"linear-city":["Saudi linear city",25,5],settlement:["San Francisco tower",24,12],"tank-proposal":["Unbuilt land vehicle study",12,2],
  airport:["Berlin Brandenburg terminal",22,5],"atomic-concept":["TV-8 concept model",10,2],canal:["Nicaragua canal proposal",22,3]
};
const steel=()=>painted("#647983"), cream=()=>painted("#dfceb1"), pane=()=>painted("#749aa9","glass");
function cylinder(m:Model,x:number,y:number,z:number,top:number,bottom:number,h:number,sides:number,col:string){
  m.add(new THREE.CylinderGeometry(top,bottom,h,sides).translate(x,y,z),painted(col));
}
function ellipsoid(m:Model,x:number,y:number,z:number,a:number,b:number,c:number,col:string){
  m.add(new THREE.SphereGeometry(1,24,14).scale(a,b,c).translate(x,y,z),painted(col));
}
function wheels(m:Model,x:number,y:number,z:number,r:number){
  const disk=new THREE.CylinderGeometry(r,r,.47,16).rotateX(Math.PI/2).translate(x,y,z);
  m.add(disk,steel());m.add(new THREE.CylinderGeometry(r*.51,r*.51,.5,14).rotateX(Math.PI/2).translate(x,y,z),cream());
}
function roof(m:Model,x:number,y:number,z:number,r:number,h:number,col:string){
  m.add(new THREE.ConeGeometry(r,h,4).rotateY(Math.PI/4).translate(x,y+h/2,z),painted(col));
}
function towerEntrance(m:Model,x:number,z:number){
  const bronze=painted("#8d775e"),concrete=cream();
  for(let step=0;step<3;step++)m.box(x,.08+step*.14,z-step*.27,4.7,.16,.46,concrete);
  for(const dx of [-1.32,-.45,.45,1.32]){
    m.box(x+dx,1.28,z-1.1,.81,1.73,.15,pane());
    m.box(x+dx+.31,1.18,z-.99,.052,.48,.081,bronze);
  }
  for(const dx of [-2.02,2.02])m.pipe([x+dx,0,z-.04],[x+dx,2.5,z-.04],.081,bronze);
  m.box(x,2.53,z-.72,4.85,.18,2.42,bronze);
  for(let i=-3;i<=3;i++)m.box(x+i*.62,2.41,z-.72,.056,.08,2.18,concrete);
}
function towerStreet(m:Model,phase:ProjectParams["phase"]){
  const kerb=painted("#a39c8c","plate"),asphalt=painted("#787f80","road"),iron=steel();
  m.box(0,-.01,8.5,38,.12,4.4,asphalt,4);
  for(let i=-8;i<=8;i++){
    m.box(i*2.15,.055,5.63,2.10,.13,1.3,kerb);
    if(i%2===0)m.box(i*2.15,.059,8.45,.93,.016,.067,cream());
  }
  for(const x of [-8.4,8.4]){
    m.pipe([x,0,5.49],[x,3.72,5.49],.085,iron);
    m.beam([x,3.74,5.49],[x,3.94,6.24],.09,iron);
    m.box(x,3.91,6.28,.28,.14,.63,cream());
    m.box(x+1.4,.36,4.55,1.92,.64,1.03,kerb);
    m.mound(x+1.4,.7,4.55,.83,.49,.40,painted("#879578","earth"),7);
  }
  if(phase==="work")for(let i=0;i<5;i++){
    const x=-5+i*2.55;m.box(x,.45,5.07,2.38,.76,.42,cream());
    m.box(x,.48,5.3,.72,.63,.04,painted("#b46f47"));
  }
  // A city block continues beyond the model in every exterior establishing shot.
  const sidewalk=painted("#b3aea0","plate"),glazing=painted("#9aa9a5","wall");
  for(const side of [-1,1]){
    m.box(side*22,.02,0,3.5,.14,63,asphalt,4);
    m.box(side*19.5,.1,0,1.42,.21,64,sidewalk,2);
    for(let block=0;block<6;block++){
      const z=-27+block*10.5,x=side*(27+block%2*2),h=3.2+(block*7%8);
      m.box(x,h/2,z,5.6,h,6.4,glazing,2);
      m.box(x,h+.1,z,5.86,.23,6.67,kerb);
      m.box(x+side*1.27,h+.49,z+.91,1.73,.69,2.14,iron);
    }
  }
  m.box(0,.035,-17.8,62,.15,4.6,asphalt);
  for(let i=-4;i<=4;i++){
    const x=i*5.3,h=4+(i*i%5);
    m.box(x,h/2,-27.5,4.52,h,5.19,glazing,1.9);
    m.box(x,h+.12,-27.5,4.75,.23,5.43,kerb);
  }
}
function glazedBays(m:Model,lowest:number){
  const spandrel=steel(),shades=["#719096","#86a2a4","#718990","#91aca6"].map(s=>painted(s,"glass"));
  for(let floor=lowest;floor<24;floor++){
    for(let col=0;col<7;col++){
      const x=-2.98+col*.993, tint=shades[(floor*7+col*3)%4];
      for(const side of [-1,1])m.box(x,floor+.46,side*3.055,.87,.72,.055,tint);
    }
    for(const side of [-1,1]){
      m.box(0,floor+.06,side*3.08,7.05,.11,.10,spandrel);
      for(let bay=0;bay<5;bay++)m.box(side*3.55,floor+.46,-2.39+bay*1.17,.07,.72,.99,shades[(bay+floor)%4]);
    }
  }
}
function building(m:Model,id:Project,p:ProjectParams){
  towerStreet(m,p.phase);
  if(id==="pyramid-hotel"){
    for(let i=0;i<3;i++){
      const wing=new Model();
      const shape=new THREE.Shape();shape.moveTo(-1.2,0);shape.lineTo(11,0);shape.lineTo(.55,27);shape.lineTo(-1.2,27);shape.closePath();
      wing.add(new THREE.ExtrudeGeometry(shape,{depth:1.75,bevelEnabled:false}).translate(0,0,-.87),p.phase==="work"?painted("#a09e95","rib"):pane());
      for(let n=1;n<=16;n++){
        const y=n*1.45,edge=11-y*.387;
        for(const side of [-1,1]){
          wing.beam([-1.1,y,.95*side],[edge,y,.95*side],.13,steel());
          for(let bay=-.7;bay<edge-.38;bay+=.88)
            wing.box(bay,y-.63,.94*side,.70,1.03,.06,painted((n+Math.floor(bay))%3?"#75969b":"#99b2ac","glass"));
        }
      }
      const part=wing.assemble();part.rotation.y=i*Math.PI*2/3;m.group.add(part);
    }
    cylinder(m,0,27.6,0,1.05,2.25,2.6,16,"#729198");
    for(let level=0;level<3;level++)cylinder(m,0,26.8+level*.77,0,2.16-level*.32,2.2-level*.32,.17,16,"#647780");
    towerEntrance(m,1.4,3.9);
  }else{
    const mid=id==="midtown-tower",h=23;
    const facade=painted("#96a99e","wall");m.box(0,mid?15:12.5,0,7,mid?18:23,6,facade,3);
    glazedBays(m,mid?6:2);
    towerEntrance(m,mid?0:3.1,mid?2.65:4.68);
    if(mid){
      for(const [x,z] of [[0,-2.6],[0,2.6],[-3,0],[3,0]])m.box(x,3,z,1.25,6,1.4,cream());
      for(let level=0;level<3;level++){const y=7+level*5;m.beam([-3.4,y+4.8,3.07],[0,y,3.07],.21,steel());m.beam([0,y,3.07],[3.4,y+4.8,3.07],.21,steel());}
      const s=new THREE.Shape();s.moveTo(-3.5,0);s.lineTo(3.5,0);s.lineTo(3.5,4.5);s.closePath();
      m.add(new THREE.ExtrudeGeometry(s,{depth:6,bevelEnabled:false}).translate(0,24,-3),pane());
    }else{
      m.box(4.2,3,1.1,4,6,5.3,pane());m.box(0,.49,0,9,.95,8,cream());
      for(const x of [-4.8,4.8]){m.pipe([x,0,3],[x,5,3],.075,steel());for(let j=0;j<10;j++)m.box(x,j*.45+.22,3.09,.3,.085,.08,j%2?cream():steel());}
      m.beam([-4.8,3.1,3.12],[4.8,3.1,3.12],.05,painted("#bc644c"));
    }
    for(let x=-17;x<=17;x+=6)if(Math.abs(x)>5)m.box(x,h*.22,-9,4,h*.44,4,pane(),2);
  }
}
function vessel(m:Model,id:Project){
  if(id==="caspian"){
    ellipsoid(m,0,2,0,12,1.4,1.55,"#a9b5b1");
    m.box(-1,2.08,0,3.6,.32,13.4,steel());m.box(-8,4.9,0,2,.3,5.6,steel());m.box(-8,3.58,0,2.1,3,.24,cream());
    for(let j=0;j<7;j++)m.box(2+j*.95,2.63,1.15,.4,.35,.18,pane());
    ellipsoid(m,8.15,2.77,0,2.1,.65,1.02,"#527783");
    for(const side of [-1,1]){
      for(let i=0;i<6;i++){
        const x=-4.95+i*1.4;
        m.box(x,2.22,side*1.52,.73,.32,.10,pane());
        m.box(x-.39,2.21,side*1.54,.055,.48,.08,cream());
      }
      for(let i=1;i<=4;i++)m.box(-1,2.26,side*(2.3+i*.88),3.42,.053,.065,painted("#babaac"));
      m.box(-.95,2.29,side*5.7,1.1,.05,.34,painted("#b07559"));
    }
  }else{
    const recovery=id==="recovery";
    ellipsoid(m,0,.48,0,11.5,1.63,2.82,recovery?"#4b697c":"#82959a");
    m.box(0,1.48,0,18.8,.47,4.5,steel());
    const brass=painted("#a89a77"),rail=painted("#d0c7ab"),safety=painted("#bb7759");
    for(const side of [-1,1]){
      for(let j=0;j<=15;j++){
        const x=-8.55+j*1.14,z=side*2.17;
        m.pipe([x,1.72,z],[x,2.32,z],.038,rail);
        if(j<15){
          m.beam([x,2.32,z],[x+1.14,2.32,z],.041,rail);
          m.beam([x,2.02,z],[x+1.14,2.02,z],.023,rail);
        }
      }
      for(const x of [-7.65,6.7]){
        m.box(x,1.76,side*1.54,.9,.11,.45,brass);
        for(const d of [-.26,.26])cylinder(m,x+d,1.97,side*1.54,.105,.13,.35,12,"#526872");
      }
      for(let i=0;i<4;i++)m.box(3.4+i*.62,1.77,side*.75,.46,.11,.83,painted("#91a09c","rib"));
    }
    for(let i=0;i<3;i++)m.box(-6.9+i*.86,2.94,1.85,.65,.5,.09,pane());
    if(recovery){
      m.box(-6.24,4.29,0,4.62,.21,4.09,rail);
      for(const side of [-1,1])for(let j=0;j<5;j++)m.box(-7.76+j*.73,3.77,side*1.84,.55,.5,.1,pane());
      for(const x of [-4.85,-4.27])m.pipe([x,1.72,1.85],[x,4.35,1.85],.047,brass);
      for(let j=0;j<8;j++)m.beam([-4.85,1.86+j*.32,1.86],[-4.27,1.86+j*.32,1.86],.049,brass);
      m.add(new THREE.TorusGeometry(.34,.09,8,20).translate(-6.9,2.42,1.90),safety);
    }
    if(recovery){
      for(const x of [-2.3,2.3])for(const z of [-1.6,1.6])m.beam([x,1.66,z],[x*.35,9.1,z*.42],.26,cream());
      for(let j=0;j<4;j++){const y=2+j*1.55;m.beam([-1.7,y,-1],[1.6,y+1.35,-1],.16,cream());}
      m.box(-6.2,2.85,0,3.9,2.7,3.6,painted("#b5b6a8","wall"));
      for(const x of [-1.4,1.4]){m.beam([x,4,2.8],[x*1.5,2.7,2.8],.28,steel());m.beam([x*1.5,2.7,2.8],[x*.75,2.15,2.8],.24,steel());}
    }else{
      m.add(new THREE.CylinderGeometry(1.65,3.65,4.35,4).rotateY(Math.PI/4).scale(1.55,1,.79).translate(-.85,3.7,0),steel());
      m.box(-.9,4.7,1.21,2.7,.39,.21,pane());
    }
  }
}
function deskModel(m:Model,id:Project){
  shell(m,18);
  m.box(0,1.05,0,12.5,.32,7,wood());
  for(const x of [-5,5])for(const z of [-2.6,2.6])m.box(x,.48,z,.45,.96,.45,steel());
  if(id==="viewing-test"){
    m.box(-1.45,1.25,0,3.35,.08,2.12,cream());m.beam([-3,1.3,-.92],[-1.45,1.3,.57],.065,steel());m.beam([-1.45,1.3,.57],[.12,1.3,-.92],.065,steel());
    m.box(2.3,1.28,.1,2.44,.11,2.99,painted("#deddd0"));m.beam([1.5,1.36,1],[2.8,1.36,-.7],.12,painted("#b48048"));
    sign(m,-2.45,2.86,-5.82,4.6,.66,"Target archive");
    for(let j=0;j<4;j++){
      const x=-5.5+j*3.5;m.box(x,.95,-4.95,2.82,1.9,.88,painted("#7c8a83","rib"));
      for(let i=0;i<3;i++){m.box(x,.43+i*.55,-4.47,2.62,.47,.06,cream());m.box(x,.47+i*.55,-4.42,.41,.065,.06,steel());}
    }
    paper(m,3.98,1.24,-1.83);paper(m,3.78,1.28,-1.66);
    m.box(-3.88,1.28,1.21,1.43,.085,.83,painted("#c5aa85"));
    m.box(-3.88,1.34,1.2,.38,.02,.42,painted("#a76654"));
  }else{
    sign(m,0,3.55,-5.8,5.28,.75,"Design study");
    for(const x of [-4.72,4.72]){m.pipe([x,0,2.6],[x,2.22,2.6],.055,steel());m.mound(x,2.24,2.6,.128,.13,.128,cream(),3);}
    m.beam([-4.72,2.12,2.6],[0,1.82,2.6],.045,painted("#88695b"));m.beam([0,1.82,2.6],[4.72,2.12,2.6],.045,painted("#88695b"));
    for(let i=0;i<3;i++){
      m.box(-4.55+i*.44,1.35,-1.85,.38,.4,.61,painted(["#819894","#a79575","#899aa0"][i]));
    }
    for(const z of [-1.27,1.27]){m.box(0,1.92,z,7.4,1.2,.48,steel());for(let i=0;i<6;i++)wheels(m,-3+i*1.15,1.86,z,.61);}
    if(id==="atomic-concept")ellipsoid(m,.35,3.04,0,3.92,1.24,1.63,"#919987");
    else{m.box(0,2.68,0,7.6,1.33,2.65,painted("#88918a","rib"));cylinder(m,-.5,3.6,0,.95,1.7,.85,8,"#a0a295");}
  }
}
function setting(m:Model,id:Project,p:ProjectParams){
  const trim=steel();
  if(id==="castle-estate"){
    for(let j=0;j<3;j++)for(let i=0;i<5;i++){
      const x=(i-2)*6.4,z=-j*7.3;m.box(x,2,z,4.1,4,3.8,painted("#b5b6ab","wall"),2.2);roof(m,x,4,z,3.3,1.84,"#697880");
      for(const dx of [-1.8,1.8]){cylinder(m,x+dx,2.2,z+1.5,.78,.8,4.35,12,"#c8c8b7");m.add(new THREE.ConeGeometry(1.02,2,12).translate(x+dx,5.3,z+1.5),trim);}
      m.box(x,.87,z+1.97,.82,1.74,.14,wood());
      m.box(x,2.85,z+1.97,.83,.98,.15,pane());m.box(x,2.29,z+2.1,1.12,.14,.37,cream());
      for(const dx of [-1.84,1.84]){
        m.box(x+dx,2.49,z+2.25,.45,.84,.12,pane());
        m.box(x+dx,1.99,z+2.27,.57,.12,.23,cream());
      }
      for(let n=0;n<3;n++)m.box(x,.10+n*.12,z+2.9-n*.25,1.23,.18,.43,cream());
    }
    for(let j=0;j<3;j++){const z=4.43-j*7.3;m.box(0,.018,z,35,.1,2.48,painted("#82857d","road"),2);for(let i=0;i<8;i++)m.box(-16+i*4.3,.09,z+1.27,4.26,.16,.23,cream());}
  }else if(id==="capital-road"){
    m.box(0,.03,0,33,.1,130,painted("#747a7e","road"),5);m.box(0,.17,0,1.65,.29,130,painted("#a8a775","earth"));
    for(let lane=-9;lane<=9;lane++)if(lane)for(let z=-48;z<48;z+=5)m.box(lane*1.6,.098,z,.085,.025,2,cream());
    for(let z=-45;z<40;z+=10){m.pipe([0,.25,z],[0,4,z],.09,trim);m.beam([-1,4,z],[1,4,z],.09,trim);}
    for(const side of [-1,1]){
      m.box(side*17.8,.08,0,1.58,.16,130,cream(),2);
      for(let j=0;j<16;j++){
        const z=-57+j*7.5,x=side*(20+j%3);
        m.pipe([x,0,z],[x,2.46,z],.17,wood());m.mound(x,2.78,z,1.35,1.09,1.18,painted("#86997a","earth"),j);
      }
      for(let j=0;j<4;j++){const x=side*(29+j%2*3),z=-43+j*16;m.box(x,2.17,z,7.02,4.34,5.65,painted("#a8afa1","wall"));roof(m,x,4.34,z,5.11,1.38,"#896f59");}
    }
  }else if(id==="linear-city"){
    for(const z of [-3,3])for(let i=-5;i<=5;i++){m.box(i*3.7,4,z,3.62,8,.74,pane());m.box(i*3.7,8.07,z,3.69,.16,.92,trim);}
    for(let x=-16;x<=16;x+=4)m.mound(x,0,.1,2.2,.8,1.4,painted("#84957b","earth"),x);
  }else if(id==="railway-exhibit"){
    for(const z of [-2.4,-1.3,1.3,2.4])m.box(0,.2,z,36,.27,.17,trim);
    for(let x=-17;x<18;x+=1.12)m.box(x,.06,0,.38,.1,6.1,wood());
    for(const z of [-2.35,2.35])for(let j=0;j<10;j++)wheels(m,-8+j*1.78,.87,z,.64);
    m.box(0,1.84,0,18,1.44,4.4,painted("#707e7c","rib"));ellipsoid(m,1.1,3.65,0,4.7,1.8,1.7,"#81908c");
    m.beam([-1,4.1,0],[11.6,5.8,0],.89,trim);
  }else if(id==="borehole"){
    const cap=painted("#a45241");cylinder(m,0,.28,0,1.4,1.55,.48,18,"#886954");cylinder(m,0,.57,0,1.25,1.25,.16,18,"#ac6552");
    for(let i=0;i<10;i++){const a=i*Math.PI/5;cylinder(m,1.03*Math.cos(a),.7,1.03*Math.sin(a),.1,.1,.13,6,"#546470");}
    for(const x of [-3.4,3.4])for(const z of [-4,-9])m.beam([x,0,z],[x*.25,11,(z+6.5)*.35-6.5],.23,trim);
    for(let y=2;y<10;y+=2)m.beam([-3+y*.18,y,-5],[3-y*.18,y+1.6,-5.4],.19,trim);m.box(5,.95,-4,3.9,1.9,3,cap);
  }else if(id==="ice-base"){
    for(let z=0;z>-24;z-=3){const ring=new THREE.TorusGeometry(3.35,.17,8,32,Math.PI).translate(0,0,z);m.add(ring,trim);}
    for(const x of [-4.1,4.1])m.box(x,2.7,-10,1.2,5.5,25,painted("#cadce1","ice"),4);
    m.box(0,2.4,-22,8.5,4.8,.65,painted("#bdcfd3","rib"));container(m,0,0,-17,3.8,3.2,"#b6b49a",true);
    m.box(0,.045,-9,6.05,.11,25,painted("#a0afa9","plate"),2);
    for(const side of [-1,1]){
      m.pipe([side*2.94,1.52,1.5],[side*2.94,1.52,-19],.15,painted("#a9815e"));
      for(let j=0;j<8;j++)m.box(side*2.96,1.5,1-j*2.77,.4,.42,.14,trim);
    }
    for(let j=0;j<6;j++){m.box(0,3.02,-j*3.7,.77,.15,.44,trim);m.box(0,2.92,-j*3.7,.63,.07,.32,cream());}
    m.box(0,2.97,1.94,7.62,.51,.61,painted("#b4c4c8","ice"));
    sign(m,0,3.02,2.29,2.74,.43,"Camp entrance");
  }else if(id==="airport"){
    m.box(0,3.3,-2,31,6.6,8,pane(),2.7);m.box(0,6.75,-1,33,.4,10.8,trim);
    for(let x=-14;x<=14;x+=3.5)m.pipe([x,0,3],[x,6.7,3],.15,cream());
    for(let j=0;j<3;j++){m.box(-10+j*7,1.7,5.8,1.85,3.4,2,painted("#a9ada4","rib"));m.box(-10+j*7,3.8,5.8,.93,.62,.88,trim);}
    m.box(0,-.018,7.8,68,.09,28.6,painted("#89908b","road"),4);
    for(let i=-14;i<=14;i+=2){
      m.box(i,3.42,2.07,.09,6.57,.14,trim);
      for(const y of [1.8,3.7,5.53])m.box(i+.96,y,2.07,1.91,.10,.14,trim);
    }
    for(let gate=0;gate<3;gate++){
      const x=-10+gate*7;const body=painted("#b9bcb0","rib");
      m.box(x,2.93,4.09,1.89,1.44,4.19,body);
      for(const side of [-1,1])for(let n=0;n<4;n++)m.box(x+side*.965,3.08,2.55+n*.89,.09,.67,.64,pane());
      m.box(x,3.62,6.23,2.21,.2,1.24,cream());
      sign(m,x,4.92,2.23,1.74,.61,"G "+(gate+1));
      m.box(x,.042,10.8,.09,.012,6.46,painted("#dbc076"));
      for(let j=0;j<3;j++)m.box(x-1+j*.88,.047,13.1,.49,.015,.11,cream());
    }
  }else if(id==="mars-habitat"){
    for(const x of [-5,1,6])ellipsoid(m,x,0,-3,3.1,2.8,3.1,"#c8b69a");
    for(let i=0;i<5;i++){m.box(-5+i*2.4,.84,3,2.14,.2,2.45,pane());m.pipe([-5+i*2.4,0,3],[-5+i*2.4,.8,3],.11,trim);}
    for(let i=0;i<25;i++)m.mound((i*7%33)-17,0,-8-(i*3%14),1.3+i%3,.6+i%2,1.6,painted("#a56247","earth"),i);
    for(const x of [-5,1,6]){
      m.box(x,.96,-.39,1.62,1.92,1.22,painted("#ae9b80","rib"));m.box(x,.91,.265,1.13,1.69,.12,trim);
      m.box(x,1.25,.342,.72,.48,.08,pane());
      for(const dx of [-1.29,1.29])m.box(x+dx,1.01,-.25,.53,.44,.13,pane());
      for(let j=0;j<3;j++)m.box(x,.09+j*.12,1.09-j*.26,1.37,.16,.45,cream());
    }
    for(const z of [-2.8,-3.28]){
      m.pipe([-4,.81,z],[5.6,.81,z],.4,painted("#b6ab91","rib"));
      for(let i=0;i<10;i++)m.pipe([-4+i,.81,z],[-3.91+i,.81,z],.43,trim);
    }
  }else if(id==="senegal-site"){
    for(let j=0;j<5;j++)for(const z of [0,6])m.pipe([-7+j*3.55,0,z],[-7+j*3.55,1.35,z],.085,wood());
    m.box(0,.23,-1,3.6,.43,2.65,cream());m.box(0,.84,-1,1.38,.85,.97,painted("#9d9482","rib"));
    for(let i=0;i<18;i++)m.mound(i*3-26,0,-10-i%3,2.4,1.1+i%2,2.2,painted("#8b986d","earth"),i);
    for(let i=0;i<4;i++)for(const z of [0,6]){
      const x=-7+i*3.55;m.beam([x,1.11,z],[x+3.55,1.05,z],.052,painted("#b59a65"));
      m.beam([x,.61,z],[x+3.55,.58,z],.044,trim);
    }
    for(let i=0;i<9;i++){const x=-8+i*2.09;m.mound(x,.012,3.6+Math.sin(i)*.5,1.19,.055,.41,painted("#a29271","sand"),i);}
    sign(m,-4,1.43,1.42,2.8,.62,"Project site");for(const x of [-5.15,-2.85])m.box(x,.66,1.37,.095,1.32,.13,wood());
  }else if(id==="canal"){
    m.box(0,.08,0,3.8,.14,80,painted("#589f9e","glass"),7);
    for(let i=0;i<18;i++){const z=i*4.4-38;m.mound(-3-i%2,.05,z,1.8,.55,2.7,painted("#a6b57d","earth"),i);m.mound(3+i%2,.05,z,1.8,.55,2.7,painted("#a5ae79","earth"),i+2);}
    for(const x of [-4.7,4.7])m.pipe([x,0,3],[x,2,3],.08,wood());
    for(let j=0;j<9;j++){
      const z=-32+j*7.93,x=4.61+j%2;
      m.pipe([x,0,z],[x,1.5,z],.075,wood());m.box(x,1.34,z,.35,.25,.14,cream());
      m.box(-x,.05,z-.77,1.47,.1,.54,painted("#969f76","earth"));
    }
  }
}
export function build(id:Project,p:ProjectParams,ctx:{light?:"day"|"golden"}){
  if(id==="caspian")return caspian.build(p,ctx);
  if(id==="railway-exhibit")return railgun.build(p,ctx);
  if(id==="borehole")return boreholeKit.build(p,ctx);
  if(id==="senegal-site")return senegalKit.build(p,ctx);
  if(id==="linear-city")return linearKit.build(p,ctx);
  if(id==="canal")return canalKit.build(p);
  if(id==="viewing-test"||id==="atomic-concept"||id==="tank-proposal")return museumKit.build(id,p);
  const [label,d,h]=settings[id],m=new Model(),water=["recovery","fleet","caspian"].includes(id),museum=["viewing-test","atomic-concept","tank-proposal"].includes(id);
  if(water)m.group.add(sea(ctx.light??"day"));
  else if(!museum){
    m.box(0,-.19,0,690,.34,690,painted(id==="ice-base"?"#cadbe4":id==="mars-habitat"?"#b77858":"#b9ac8d",id==="ice-base"?"snow":"earth"),5);
    const distant=painted(id==="mars-habitat"?"#a56952":id==="ice-base"?"#c0d1d6":"#8f9d88","earth");
    ridge(m,-78,distant,11,21);ridge(m,-119,distant,16,14);
  }
  if(water)vessel(m,id);
  else if(["pyramid-hotel","midtown-tower","settlement"].includes(id))building(m,id,p);
  else if(museum)deskModel(m,id);
  else setting(m,id,p);
  const title=String(p.subject||label);
  const plate=new THREE.Mesh(new THREE.PlaneGeometry(Math.min(d*.43,7),Math.min(d*.10,1.65)),stencil(title,"#49686c"));
  plate.position.set(-d*.42,water?2.7:1.6,water?2.9:4.2);m.group.add(plate);
  const target:Point=[0,h,0];
  const group=m.finish({wide:camera([d*.74,h+d*.60,d*1.38],target,48),medium:camera([d*.43,h+d*.22,d],target,44),close:camera([-d*.44,h+d*.08,d*.65],target,41)});
  if(museum){
    group.cameras.wide=camera([5.6,4.72,8.57],target,52);
    group.cameras.medium=camera([2.12,3.85,6.34],target,47);
    group.cameras.aerial=camera([.38,9.25,2.02],target,51);
    group.cameras.low=camera([-3.14,1.82,6.52],target,49);
    group.cameras.dolly=camera([3.15,3.36,5.54],target,46);
  }
  const feet:Point=water?[0,1.72,1.1]:museum?[3.9,0,4.05]:[d*.32,0,d*.19];
  return {group,feet,place:id};
}

