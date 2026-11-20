import * as THREE from "three";
import {camera, Context, limit, Model, painted, Point} from "./shared";
import {sea} from "./sea";
import {stencil} from "./markings";

// Ground-effect research craft moored beside a service pontoon.
// Scale ~1:3.5 of the real 92 m aircraft: nose +x, tail -x, wing tips on +/-z, water at y = 0.
export type CaspianParams={subject?:string;detail?:string;damage?:number;phase?:"proposal"|"work"|"record";crowd?:number;weather?:string};
const AXIS=2.7,SQUASH=.88;
const profile:[number,number][]=[[-13.2,.28],[-12.4,.5],[-10,.95],[-6,1.5],[-1,1.78],[6,1.78],[9.5,1.62],[11.6,1.2],[12.7,.62],[13.25,0]];
// Lathe along the x axis: radius at fuselage station x.
export function radius(x:number){
  for(let i=1;i<profile.length;i++){
    const [x0,r0]=profile[i-1],[x1,r1]=profile[i];
    if(x<=x1)return r0+(r1-r0)*Math.max(0,(x-x0)/(x1-x0));
  }
  return 0;
}
// Fuselage side surface at height dy above the axis (the hull is squashed, so the half-width shrinks away from the axis).
const side=(x:number,dy:number)=>Math.sqrt(Math.max(0,radius(x)**2-(dy/SQUASH)**2));
function lathe(mat:THREE.Material,m:Model,scale=1,phiStart=0,phiLength=Math.PI*2){
  const pts=profile.map(([x,r])=>new THREE.Vector2(r*scale,x));
  m.add(new THREE.LatheGeometry(pts,28,phiStart,phiLength).scale(1,1,SQUASH).rotateZ(-Math.PI/2).translate(0,AXIS,0),mat);
}
function wing(m:Model,pts:[number,number][],y:number,thick:number,mat:THREE.Material,sign:1|-1){
  const s=new THREE.Shape();pts.forEach(([x,z],i)=>i?s.lineTo(x,-z*sign):s.moveTo(x,-z*sign));s.closePath();
  m.add(new THREE.ExtrudeGeometry(s,{depth:thick,bevelEnabled:false}).rotateX(-Math.PI/2).translate(0,y,0),mat);
}
export function build(p:CaspianParams={},ctx:Context={}){
  const m=new Model(),wear=limit(Number(p.damage)||0,0,1);
  m.group.add(sea(ctx.light??"day"));
  const hullMat=painted("#cfd6d3","plate"),belly=painted("#4c6572"),stripe=painted("#b45a40"),steel=painted("#5f727b"),dark=painted("#35444e"),
        glass=painted("#4d7886","glass"),cream=painted("#e5dcc1"),foam=painted("#eef6f3","snow"),pontoon=painted("#bda97f","rib"),rust=painted("#8a5a42");
  // Fuselage, darker belly, nose glazing.
  lathe(hullMat,m);
  lathe(belly,m,1.012,Math.PI*.04,Math.PI*.9);
  for(const s of [-1,1]){
    m.box(10.55,AXIS+.56,s*side(10.55,.56)*.94,1.7,.5,.07,glass);
    m.box(11.45,AXIS+.55,s*side(11.45,.55)*.9,.9,.45,.07,glass);
  }
  m.box(12.12,AXIS+.5,0,.46,.46,1.1,glass);
  // Windows and the cheat line follow the hull radius along its length.
  for(let i=0;i<13;i++){
    const x=-6+i*1.15;
    for(const s of [-1,1])m.box(x,AXIS+.52,s*(side(x,.52)+.02),.52,.4,.08,glass);
  }
  for(let x=-11;x<9.6;x+=1.4)for(const s of [-1,1])m.box(x+.7,AXIS-.18,s*(side(x+.7,-.18)+.03),1.42,.22,.06,stripe);
  // Forward canard with eight turbojets, carried on a pylon.
  m.box(7.4,AXIS+1.9,0,2.2,.8,2.0,steel);
  m.box(7.6,AXIS+2.58,0,2.5,.2,10.6,painted("#b9c3c1"));
  for(const s of [-1,1])for(const k of [.9,2.15,3.4,4.65]){
    const z=s*k;
    m.add(new THREE.CylinderGeometry(.42,.38,2.6,14).rotateZ(Math.PI/2).translate(8.55,AXIS+2.25,z),painted("#a7b2b0"));
    m.add(new THREE.CylinderGeometry(.3,.3,.4,14).rotateZ(Math.PI/2).translate(9.95,AXIS+2.25,z),dark);
    m.box(7.6,AXIS+2.4,z,1.0,.26,.2,steel);
  }
  // Short broad main wing with an end float on each tip, flaps and trailing hinge line.
  for(const s of [1,-1] as const){
    wing(m,[[3.7,1.1],[3.2,6.8],[1.3,6.9],[-3.6,1.15]],AXIS-1.05,.34,painted("#c4ccca"),s);
    wing(m,[[-3.6,1.2],[1.3,6.9],[.6,6.95],[-4.0,1.2]],AXIS-1.0,.2,painted("#b0746a"),s);
    const z=s*7.15;
    m.add(new THREE.SphereGeometry(1,20,12).scale(2.8,.52,.56).translate(.9,.5,z),painted("#bfc9c7"));
    m.box(.9,1.12,s*6.95,3.2,.9,.2,painted("#aeb9b8"));
    m.add(new THREE.SphereGeometry(1,16,8).scale(3.6,.04,1.2).translate(.9,.035,z),foam);
    m.add(new THREE.SphereGeometry(1,16,8).scale(2.2,.04,.8).translate(-2.8,.034,z),foam);
    for(let i=0;i<4;i++)m.box(-1.8+i*1.2,AXIS-.8,s*(3.2+i*.85),.04,.14,2.2,steel);
  }
  // Wake and bow wave.
  for(let i=0;i<5;i++)for(const s of [-1,1])m.add(new THREE.SphereGeometry(1,16,8).scale(1.7+i*.35,.035,.45).translate(-6.5-i*3.2,.03+i*.001,s*(1.1+i*.55)),foam);
  m.add(new THREE.SphereGeometry(1,16,8).scale(1.7,.04,1.25).translate(12.6,.03,0),foam);
  // T-tail: swept fin, stabiliser with end plates, two tail nozzles.
  const fin=new THREE.Shape();fin.moveTo(-13,AXIS+.8);fin.lineTo(-8.3,AXIS+.8);fin.lineTo(-9.4,AXIS+6.5);fin.lineTo(-12.6,AXIS+6.7);fin.closePath();
  m.add(new THREE.ExtrudeGeometry(fin,{depth:.38,bevelEnabled:false}).translate(0,0,-.19),painted("#c7cfcc"));
  m.box(-11,AXIS+6.82,0,3.0,.24,9.4,painted("#bcc6c4"));
  for(const s of [-1,1]){m.box(-11,AXIS+7.25,s*4.7,2.6,.9,.2,painted("#a8b3b2"));m.box(-11,AXIS+6.95,s*2.3,2.8,.08,2.3,stripe);}
  m.box(-11,AXIS+6.82,0,3.1,.05,.26,dark);
  for(const s of [-1,1])m.add(new THREE.CylinderGeometry(.42,.34,2.2,14).rotateZ(Math.PI/2).translate(-10.5,AXIS+1.95,s*.62),dark);
  // Hull wear: dark streaks and exposed repair plates, driven by the damage parameter.
  for(let i=0;i<Math.round(wear*14);i++){
    const x=-9+(i*7%16)*1.2,s=i%2?1:-1,dy=-.6+(i*5%7)*.2;
    m.box(x,AXIS+dy,s*(side(x,dy)+.03),.7+(i%3)*.4,.22+(i%2)*.12,.05,i%3?rust:painted("#97a3a2"));
  }
  // Mooring pontoon at the nose: deck, bollards, ladder, rope, service boat and sign.
  const px=14.5,pz=4.8;
  m.box(px,.34,pz,7.2,.48,3.6,pontoon,3);
  m.box(px,.6,pz-1.6,7.2,.09,.2,painted("#8d7b58"));
  for(const x of [px-3.2,px+3.2])for(const z of [pz-1.3,pz+1.3]){m.pipe([x,.55,z],[x,1.02,z],.12,dark);m.box(x,1.06,z,.34,.1,.34,dark);}
  for(let i=0;i<4;i++)m.box(px-2.6+i*1.7,.6,pz+1.45,.9,.06,.6,painted("#b6a07a"));
  m.beam([px-3.2,1.05,pz+1.3],[11.8,AXIS+.5,.4],.04,painted("#5a4a3a"));
  for(const x of [px-3,px+3])m.pipe([x,-.1,pz-1.9],[x,.05,pz-1.9],.16,painted("#c26f4d"));
  const boat=new Model();
  boat.add(new THREE.SphereGeometry(1,18,10,0,Math.PI*2,0,Math.PI/2).scale(2.6,.7,1.0).translate(7,.12,10.2),painted("#c06a4c"));
  boat.box(7.2,.95,10.2,1.5,.75,1.3,cream);boat.box(7.2,1.05,10.2,1.52,.34,1.32,glass);
  boat.pipe([6.5,.6,10.2],[6.5,2.2,10.2],.05,dark);
  for(const [dx,dz] of [[1.2,1],[1.2,-1],[-1.5,1],[-1.5,-1]])boat.box(7+dx,.6,10.2+dz*.62,.08,.18,.7,painted("#e3dbc2"));
  m.group.add(boat.assemble());
  // Painted pontoon sign.
  const title=String(p.subject||"Caspian research craft");
  const post=new Model();post.pipe([px-3.5,.5,pz-1.4],[px-3.5,1.9,pz-1.4],.06,dark);post.pipe([px-1.5,.5,pz-1.4],[px-1.5,1.9,pz-1.4],.06,dark);
  m.group.add(post.assemble());
  const plate=new THREE.Mesh(new THREE.PlaneGeometry(1.95,.7),stencil(title,"#49686c"));
  plate.position.set(px-2.5,1.55,pz-1.3);plate.rotation.y=.35;m.group.add(plate);
  const target:Point=[3.2,3.1,0];
  const group=m.finish({wide:camera([17.5,9.5,29],target,50),medium:camera([21.5,4.6,13.2],[6,AXIS+.9,0],42),close:camera([17.2,3.8,10.4],[10,AXIS+.6,.5],38)});
  group.cameras.wide=camera([22,10.5,26.5],target,52);
  group.cameras.low=camera([16,1.35,12.6],[5,AXIS+.7,0],46);
  const feet:Point=[px+.6,.6,pz+.4];
  return {group,feet,place:"caspian"};
}
