import * as THREE from "three";
import {painted, Point} from "./shared";
import {track} from "./collide";

// Ambient life for every kit. Frames are rendered independently, so everything here is a pure function of time t (seconds
// since the shot started): kits register animators on their root group and World calls runAnims(group,t) before each frame.
export type Anim=(t:number)=>void;
export function animate(root:THREE.Object3D,fn:Anim){((root.userData.anim??=[]) as Anim[]).push(fn);}
export function runAnims(root:THREE.Object3D,t:number){for(const f of (root.userData.anim??[]) as Anim[])f(t);}

const mesh=(geo:THREE.BufferGeometry,mat:THREE.Material,cast=true)=>{const m=new THREE.Mesh(geo,mat);m.castShadow=cast;m.receiveShadow=true;return m;};
const tri=(x:number)=>Math.abs(((x%2)+2)%2-1);                 // triangle wave 0..1..0 with period 2

/** A small motor boat; local +z is the bow. Origin on the waterline. */
export function boatMesh(len=3,hullCol="#e8e1cf",stripe="#377574"){
  const g=new THREE.Group(),w=len*.34;
  const hull=new THREE.Shape();hull.moveTo(-w/2,-len/2);hull.lineTo(w/2,-len/2);hull.lineTo(w*.42,len*.22);hull.quadraticCurveTo(w*.2,len*.42,0,len/2);hull.quadraticCurveTo(-w*.2,len*.42,-w*.42,len*.22);hull.closePath();
  const geo=new THREE.ExtrudeGeometry(hull,{depth:len*.2,bevelEnabled:false}).rotateX(-Math.PI/2);
  g.add(mesh(geo,painted(hullCol)));
  const band=mesh(new THREE.BoxGeometry(w*1.02,len*.05,len*1.02),painted(stripe));band.position.y=len*.08;g.add(band);
  const cab=mesh(new THREE.BoxGeometry(w*.7,len*.2,len*.3),painted("#f0dfba"));cab.position.set(0,len*.3,-len*.12);g.add(cab);
  const roof=mesh(new THREE.BoxGeometry(w*.85,len*.04,len*.38),painted("#a9553c"));roof.position.set(0,len*.41,-len*.12);g.add(roof);
  return g;
}
/** white wake behind a moving boat: a flat triangle that pulses */
function wake(len:number){
  const sh=new THREE.Shape();sh.moveTo(-len*.14,0);sh.lineTo(len*.14,0);sh.lineTo(len*.45,-len*2.2);sh.lineTo(-len*.45,-len*2.2);sh.closePath();
  const m=new THREE.Mesh(new THREE.ShapeGeometry(sh).rotateX(-Math.PI/2),new THREE.MeshBasicMaterial({color:0xf4fbff,transparent:true,opacity:.32,depthWrite:false}));
  m.position.y=.03;m.renderOrder=2;return m;
}
/** boat circling a centre (ellipse) at a steady speed, bobbing and with a wake. y = water level. */
export function circlingBoat(root:THREE.Object3D,c:[number,number],rx:number,rz:number,y:number,len:number,period:number,phase=0,col="#e8e1cf",stripe="#377574"){
  const g=new THREE.Group(),b=boatMesh(len,col,stripe),w=wake(len);g.add(b,w);root.add(g);
  const at=(t:number):[number,number,number]=>{const a=(t/period+phase)*Math.PI*2;return [c[0]+Math.cos(a)*rx,y,c[1]+Math.sin(a)*rz];};
  track(root,{id:"boat@"+c[0].toFixed(0)+","+c[1].toFixed(0),kind:"boat",r:len*.5,h:len*.5,pos:at});
  animate(root,t=>{
    const a=(t/period+phase)*Math.PI*2,[x,,z]=at(t);
    const dx=-Math.sin(a)*rx,dz=Math.cos(a)*rz;
    g.position.set(x,y+.05*Math.sin(t*2.1+phase*9),z);g.rotation.y=Math.atan2(dx,dz);
    b.rotation.z=.035*Math.sin(t*1.7+phase*5);b.rotation.x=.03*Math.sin(t*1.3+phase*3);
    w.scale.set(1,1,.85+.15*Math.sin(t*5));
  });
  return g;
}
/** boat shuttling in a straight line between two points (ping-pong, turns around) */
export function shuttleBoat(root:THREE.Object3D,a:Point,b:Point,len:number,period:number,phase=0,col="#e8e1cf",stripe="#377574"){
  const g=new THREE.Group(),bm=boatMesh(len,col,stripe),w=wake(len);g.add(bm,w);root.add(g);
  const ang=Math.atan2(b[0]-a[0],b[2]-a[2]);
  const at=(t:number):[number,number,number]=>{const e=tri(t/period+phase);return [a[0]+(b[0]-a[0])*e,a[1],a[2]+(b[2]-a[2])*e];};
  track(root,{id:"shuttle@"+a[0].toFixed(0)+","+a[2].toFixed(0),kind:"boat",r:len*.5,h:len*.5,pos:at});
  animate(root,t=>{
    const u=t/period+phase,dir=Math.floor(u)%2===0?1:-1,[x,y,z]=at(t);
    g.position.set(x,y+.04*Math.sin(t*2+phase*7),z);g.rotation.y=ang+(dir>0?0:Math.PI);bm.rotation.z=.03*Math.sin(t*1.9);
  });
  return g;
}
/** a flock of gulls circling above a point; swept wings flap */
export function gulls(root:THREE.Object3D,c:Point,n:number,radius:number,height:number,period=14,size=1){
  const mat=new THREE.MeshBasicMaterial({color:0xfdfdfb,side:THREE.DoubleSide}),dark=new THREE.MeshBasicMaterial({color:0x4a5158,side:THREE.DoubleSide});
  const sh=new THREE.Shape();sh.moveTo(0,.12);sh.lineTo(.95,.34);sh.lineTo(.62,-.04);sh.lineTo(.12,-.16);sh.closePath();     // a swept wing, seen from above
  const wing=new THREE.ShapeGeometry(sh).rotateX(-Math.PI/2).scale(size*.8,1,size*.8);
  const birds:{g:THREE.Group;l:THREE.Mesh;r:THREE.Mesh;a:number;rr:number;h:number;f:number}[]=[];
  for(let i=0;i<n;i++){
    const g=new THREE.Group(),m=i%4===0?dark:mat;
    const l=new THREE.Mesh(wing,m),r=new THREE.Mesh(wing,m);r.scale.x=-1;
    const body=new THREE.Mesh(new THREE.BoxGeometry(.14*size,.1*size,.5*size),m);
    g.add(l,r,body);root.add(g);
    birds.push({g,l,r,a:i*2.4,rr:radius*(.6+.4*((i*37)%10)/10),h:height+((i*53)%7)*.35*size,f:5+((i*29)%5)*.4});
  }
  const at=(b:typeof birds[number],t:number):[number,number,number]=>{
    const a=b.a+t/period*Math.PI*2*(b.rr>radius*.8?1:1.25);
    return [c[0]+Math.cos(a)*b.rr,c[1]+b.h+.25*Math.sin(t*1.6+b.a),c[2]+Math.sin(a)*b.rr];
  };
  birds.forEach((b,i)=>track(root,{id:"gull#"+i,kind:"bird",r:.5*size,h:.3*size,pos:t=>at(b,t),drop:()=>{b.g.visible=false;}}));
  animate(root,t=>{for(const b of birds){
    const a=b.a+t/period*Math.PI*2*(b.rr>radius*.8?1:1.25);
    b.g.position.set(...at(b,t));
    b.g.rotation.y=Math.atan2(-Math.sin(a)*b.rr,Math.cos(a)*b.rr);
    const flap=.35+Math.sin(t*b.f+b.a)*.55;b.l.rotation.z=flap;b.r.rotation.z=-flap;
  }});
}
/** soft cloud puffs drifting across the sky (visible in wide and aerial views) */
export function clouds(root:THREE.Object3D,c:Point,spread:number,n:number,size:number,speed=3){
  const mat=new THREE.MeshBasicMaterial({color:0xffffff,transparent:true,opacity:.92,fog:false});
  const list:THREE.Group[]=[];
  for(let i=0;i<n;i++){
    const g=new THREE.Group();
    for(let k=0;k<4;k++){const s=new THREE.Mesh(new THREE.SphereGeometry(1,10,8),mat);s.scale.set(size*(.7+.3*((i+k)%3)),size*.32,size*.5);s.position.set((k-1.5)*size*.62,((k*7)%3)*size*.08,0);g.add(s);}
    g.userData={x:((i*61)%100)/100,z:((i*37)%100)/100,y:c[1]+((i*17)%5)*size*.3};
    root.add(g);list.push(g);
  }
  animate(root,t=>{for(const g of list){
    const u=((g.userData.x+t*speed/(2*spread))%1+1)%1;
    g.position.set(c[0]-spread+u*2*spread,g.userData.y,c[2]+(g.userData.z-.5)*spread);
  }});
}
/** cars driving along a straight road (looping) */
export function traffic(root:THREE.Object3D,a:Point,b:Point,n:number,speed:number,size=1){
  const cols=["#c9553a","#e8e1cf","#35546b","#d9a43a","#6f8a6a"];
  const len=Math.hypot(b[0]-a[0],b[2]-a[2]),ang=Math.atan2(b[0]-a[0],b[2]-a[2]),cars:THREE.Group[]=[];
  const at=(i:number,t:number):[number,number,number]=>{const u=((i/n+t*speed/len)%1+1)%1;return [a[0]+(b[0]-a[0])*u,a[1]+.3*size,a[2]+(b[2]-a[2])*u];};
  for(let i=0;i<n;i++){
    const g=new THREE.Group(),col=painted(cols[i%cols.length]);
    const top=mesh(new THREE.BoxGeometry(.9*size,.45*size,1.2*size),painted("#76a2a5","glass"));top.position.set(0,.5*size,-.15*size);
    g.add(mesh(new THREE.BoxGeometry(1.1*size,.55*size,2.4*size),col),top);
    g.rotation.y=ang;root.add(g);cars.push(g);
    track(root,{id:"car#"+i+"@"+a[0].toFixed(0),kind:"car",r:1.2*size,h:.9*size,pos:t=>at(i,t)});
  }
  animate(root,t=>{cars.forEach((g,i)=>g.position.set(...at(i,t)));});
}
/** papers fluttering up and falling again, around a point. 4x candidates are made; collide.verifyTracks keeps the n that never touch anything. */
export function papers(root:THREE.Object3D,c:Point,n:number,radius:number,height:number){
  const mat=new THREE.MeshBasicMaterial({color:0xf6f1e2,side:THREE.DoubleSide}),sheets:THREE.Mesh[]=[],total=n*4;
  (root.userData.keep??={}).paper=n;
  const at=(i:number,t:number):[number,number,number]=>{
    const u=((t/3.2+i/total)%1+1)%1,a=i*2.4+t*.9,rr=radius*(.3+.7*((i*37)%10)/10)*(.4+.6*u);
    return [c[0]+Math.cos(a)*rr,c[1]+height*Math.sin(u*Math.PI),c[2]+Math.sin(a)*rr];
  };
  for(let i=0;i<total;i++){
    const m=new THREE.Mesh(new THREE.PlaneGeometry(.32,.42),mat);root.add(m);sheets.push(m);
    track(root,{id:"paper#"+i,kind:"paper",r:.25,h:.3,pos:t=>at(i,t),drop:()=>{m.visible=false;}});
  }
  animate(root,t=>{sheets.forEach((m,i)=>{m.position.set(...at(i,t));m.rotation.set(t*2.3+i,t*1.7+i*2,t*1.1);});});
}
/** swing a group of meshes (crane jib, wind sock, pendulum) around Y by +-amp radians */
export function swing(obj:THREE.Object3D,root:THREE.Object3D,amp:number,period:number,phase=0,axis:"x"|"y"|"z"="y"){
  animate(root,t=>{obj.rotation[axis]=amp*Math.sin((t/period+phase)*Math.PI*2);});
}
/** bob/sway something: vertical bob and roll */
export function bob(obj:THREE.Object3D,root:THREE.Object3D,base:number,amp:number,period:number,phase=0){
  animate(root,t=>{obj.position.y=base+amp*Math.sin((t/period+phase)*Math.PI*2);});
}
/** foam rings expanding on the water (a ripple pulse) */
export function ripples(root:THREE.Object3D,c:Point,n:number,maxR:number,period=3){
  const rings:THREE.Mesh[]=[];
  for(let i=0;i<n;i++){
    const m=new THREE.Mesh(new THREE.RingGeometry(.9,1,40).rotateX(-Math.PI/2),new THREE.MeshBasicMaterial({color:0xf4fbff,transparent:true,opacity:.6,depthWrite:false,side:THREE.DoubleSide}));
    m.position.set(c[0],c[1]+.04,c[2]);m.renderOrder=2;root.add(m);rings.push(m);
  }
  animate(root,t=>{rings.forEach((m,i)=>{const u=((t/period+i/n)%1+1)%1;m.scale.setScalar(.3+u*maxR);(m.material as THREE.MeshBasicMaterial).opacity=.6*(1-u);});});
}
/** spray of droplets from a nozzle, arcing and falling */
export function spray(root:THREE.Object3D,from:Point,dir:Point,n:number,speed:number,color=0xe9f6f8){
  const mat=new THREE.MeshBasicMaterial({color}),drops:THREE.Mesh[]=[];
  for(let i=0;i<n;i++){const m=new THREE.Mesh(new THREE.SphereGeometry(.22,6,5),mat);root.add(m);drops.push(m);}
  animate(root,t=>{drops.forEach((m,i)=>{
    const u=((t*.7+i/n)%1+1)%1,tt=u*2.4,jx=Math.sin(i*12.9)*.25,jz=Math.cos(i*7.1)*.25;
    m.position.set(from[0]+(dir[0]+jx)*speed*tt,from[1]+dir[1]*speed*tt-4.9*tt*tt*.5,from[2]+(dir[2]+jz)*speed*tt);
    m.scale.setScalar(1-u*.5);
  });});
}
/** a ring that expands and fades on a vertical board (map pin pulse) */
export function pulseRing(root:THREE.Object3D,at:Point,maxR:number,period=1.8,phase=0,color=0xbc644c){
  const m=new THREE.Mesh(new THREE.RingGeometry(.78,1,36),new THREE.MeshBasicMaterial({color,transparent:true,opacity:.8,depthWrite:false,side:THREE.DoubleSide}));
  m.position.set(...at);m.renderOrder=3;root.add(m);
  animate(root,t=>{const u=((t/period+phase)%1+1)%1;m.scale.setScalar(.05+u*maxR);(m.material as THREE.MeshBasicMaterial).opacity=.85*(1-u);});
}
/** a bright marker sliding back and forth along a straight line on a board */
export function slider(root:THREE.Object3D,a:Point,b:Point,r:number,period:number,color=0xd9502f){
  const m=new THREE.Mesh(new THREE.SphereGeometry(r,14,10),new THREE.MeshBasicMaterial({color}));root.add(m);
  animate(root,t=>{const k=tri(t/period),e=k*k*(3-2*k);m.position.set(a[0]+(b[0]-a[0])*e,a[1]+(b[1]-a[1])*e,a[2]+(b[2]-a[2])*e);m.scale.setScalar(1+.18*Math.sin(t*9));});
}
