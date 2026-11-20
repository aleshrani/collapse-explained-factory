import * as THREE from "three";
import { Batch, boxGeo, lam, V } from "../videos/bridge/build";
import { ctex, jit, rng, stoneHD, planksHD } from "../videos/bridge/paint";

export type Point = [number, number, number];
export type Shot = { pos: Point; look: Point; fov: number };
export type Cameras = Record<"wide" | "medium" | "close", Shot>;
export type Context = { light?: "day" | "golden" };
export const limit = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
type Finish = "plate" | "rib" | "glass" | "earth" | "snow" | "sand" | "road" | "stripe" | "ice" | "wall";

// One tile in world units. Directional brush marks, inset joins and edge chips remain
// legible at different distances; fine aggregate sits underneath the larger marks.
export function painted(color: string, finish: Finish = "plate") {
  const key = "kit-" + finish + color;
  return lam(key, () => ({map: ctex(key, 512, 512, (g, r) => {
    const rect = (col: string, x: number, y: number, w: number, h: number) => {
      g.fillStyle = col; g.fillRect(x, y, w, h);
    };
    const stroke = (col: string, width: number, x: number, y: number, dx: number, dy: number) => {
      g.beginPath(); g.moveTo(x,y); g.quadraticCurveTo(x + dx * .43, y + dy * .8 - 2, x+dx, y+dy);
      g.strokeStyle = col; g.lineWidth = width; g.stroke();
    };
    rect(color, 0, 0, 512, 512);
    const granular = ["earth","snow","sand","road","ice"].includes(finish);
    for (let i=0; i< (granular ? 260 : 75); i++) {
      const x=r()*512, y=r()*512;
      g.fillStyle=jit(r,color,.19,4,.09);
      g.globalAlpha=.55;
      g.beginPath(); g.ellipse(x,y, 4+r()*37, 1+r()*6, (r()-.5)*.45, 0, Math.PI*2); g.fill();
    }
    g.globalAlpha=1;
    for (let i=0;i<650;i++) rect(jit(r,color,.27,5,.12),r()*512,r()*512,1+r()*5,1+r()*2);
    if (granular) {
      for(let i=0;i<54;i++){
        const x=r()*512, y=r()*512, w=6+r()*48;
        stroke("rgba(52,46,63,.17)",1+r()*2,x,y,w,-2-r()*4);
        stroke("rgba(255,246,216,.32)",2,x+2,y-2,w*.8,-4);
      }
      if(finish==="ice" || finish==="road") for(let i=0;i<3;i++) {
        let x=r()*512, y=r()*512;
        for(let j=0;j<5;j++){const dx=(r()-.5)*42,dy=r()*32; stroke("rgba(48,73,95,.4)",2,x,y,dx,dy);x+=dx;y+=dy;}
      }
      return;
    }
    if(finish==="stripe") for(let x=-600;x<600;x+=128){
      g.fillStyle="#39424b"; g.beginPath();g.moveTo(x,0);g.lineTo(x+50,0);g.lineTo(x+562,512);g.lineTo(x+512,512);g.fill();
    }
    if(finish==="rib") for(let x=0;x<512;x+=32){
      rect("rgba(34,34,51,.32)",x,0,6,512);rect("rgba(255,247,212,.38)",x+7,0,3,512);
    }
    if(finish==="glass" || finish==="wall"){
      const facade=finish==="wall";
      for(let j=0;j<2;j++) for(let i=0;i<2;i++){
        const x=i*256+(facade?44:5),y=j*256+(facade?39:5),w=facade?168:246,h=facade?126:246;
        const grad=g.createLinearGradient(x,y,x+w,y+h);
        grad.addColorStop(0,"#364d62");grad.addColorStop(.5,facade?"#67868b":color);grad.addColorStop(1,"#acc8bd");
        rect("#3f4650",x-5,y-5,w+10,h+10);g.fillStyle=grad;g.fillRect(x,y,w,h);
        g.save();g.beginPath();g.rect(x,y,w,h);g.clip();
        for(let k=0;k<2;k++){stroke("rgba(215,240,234,.36)",k?8:26,x-5+k*32,y+h*.84,w,-h*.7);}
        g.restore();rect("#465d68",x+w*.51,y,5,h);
        rect("#dbd3b9",x-7,y+h+4,w+14,7);
        if(facade){rect("#979181",x-15,y+h+12,w+30,14);rect("rgba(60,46,51,.17)",x-8,y+h+26,w+26,9);}
      }
    }
    if(finish!=="glass"){
      rect("rgba(43,38,51,.45)",0,0,512,4);rect("rgba(43,38,51,.35)",0,0,4,512);
      rect("rgba(255,248,218,.4)",5,5,502,3);
      for(const x of [14,498]) for(const y of [14,498]){
        rect("#53555b",x-3,y-2,7,7);rect("#d5cfbc",x-2,y-3,5,3);
      }
      for(let i=0;i<26;i++){const x=r()*512,y=r()*512;stroke("rgba(248,235,192,.34)",2,x,y,4+r()*22,1);}
    }
  })}));
}
export const masonry = () => lam("kit-formstone",()=>({map:stoneHD("kitFormstone",["#b8bab2","#c3c0b4","#aab0ac","#cdc9bd"],"#8f9692")}));
export const wood = () => lam("kit-timber",()=>({map:planksHD()}));
export const camera = (pos: Point,look: Point,fov: number): Shot => ({pos,look,fov});

// Static meshes are merged per material using the same batcher as the bridge town.
export class Model {
  readonly group = new THREE.Group();
  private readonly batch = new Batch();
  add(geo: THREE.BufferGeometry, mat: THREE.Material) { this.batch.add(geo,mat); }
  box(x:number,y:number,z:number,w:number,h:number,d:number,mat:THREE.Material,tile=3){
    this.add(boxGeo(V(x-w/2,y-h/2,z-d/2),V(x+w/2,y+h/2,z+d/2),tile,true),mat);
  }
  beam(a:Point,b:Point,width:number,mat:THREE.Material,depth=width){
    const start=V(...a),end=V(...b),dir=end.clone().sub(start),len=dir.length();
    if(len<.0001)return;
    const g=boxGeo(V(-width/2,-len/2,-depth/2),V(width/2,len/2,depth/2),2,true);
    g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(V(0,1,0),dir.normalize()));
    const mid=start.lerp(end,.5);this.add(g.translate(mid.x,mid.y,mid.z),mat);
  }
  pipe(a:Point,b:Point,r:number,mat:THREE.Material){
    const start=V(...a),end=V(...b),dir=end.clone().sub(start),len=dir.length();
    const g=new THREE.CylinderGeometry(r,r,len,12);
    g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(V(0,1,0),dir.normalize()));
    const mid=start.lerp(end,.5);this.add(g.translate(mid.x,mid.y,mid.z),mat);
  }
  mound(x:number,y:number,z:number,rx:number,h:number,rz:number,mat:THREE.Material,seed=1){
    const g=new THREE.SphereGeometry(1,18,8,0,Math.PI*2,0,Math.PI/2);
    const p=g.attributes.position,uv=g.attributes.uv;
    for(let i=0;i<p.count;i++){
      const a=p.getX(i), b=p.getY(i), c=p.getZ(i);
      const k=1+.105*Math.sin(a*5+c*4+seed)+.055*Math.cos(c*9-b*3+seed);
      p.setXYZ(i,x+a*rx*k,y+b*h*k,z+c*rz*k);uv.setXY(i,(x+a*rx)/5,(z+c*rz)/5);
    }
    g.computeVertexNormals();this.add(g,mat);
  }
  assemble(){this.batch.build(this.group);return this.group;}
  finish(base:Cameras){
    const {wide,medium}=base;
    const low=camera([medium.pos[0],medium.pos[1]-.58,medium.pos[2]],medium.look,medium.fov+6);
    const dist=V(...wide.pos).distanceTo(V(...wide.look));
    const aerial=camera([wide.pos[0]*.82,wide.pos[1]+Math.min(46,dist*.57),wide.pos[2]*.82],wide.look,wide.fov);
    const dolly=camera([medium.pos[0]+1.15,medium.pos[1]+.2,medium.pos[2]+1.4],medium.look,medium.fov-5);
    return Object.assign(this.assemble(),{cameras:{...base,low,aerial,dolly}});
  }
}
export function ridge(m:Model,z:number,mat:THREE.Material,height:number,seed:number){
  const r=rng(seed);
  for(let x=-170;x<=170;x+=17)m.mound(x,-1,z+r()*7,16+r()*18,height*(.35+r()),12+r()*18,mat,x);
}
export function container(m:Model,x:number,y:number,z:number,w:number,d:number,col:string,office=false){
  const trim=painted("#69767a"), wall=painted(col,"rib");
  m.box(x,y+1.32,z,w,2.64,d,wall,3);
  for(const h of [.12,2.57])m.box(x,y+h,z,w+.12,.16,d+.1,trim);
  for(const s of [-1,1])for(const t of [-1,1])m.box(x+s*w*.49,y+1.3,z+t*d*.49,.14,2.6,.14,trim);
  if(office){
    m.box(x-w*.3,y+1,z+d/2+.04,.94,2,.08,painted("#395e66"));
    m.box(x+w*.15,y+1.5,z+d/2+.06,w*.44,1,.1,painted("#6cabb8","glass"),0);
  }else for(const s of [-1,1])m.pipe([x+w/2+.04,y+.21,z+s*d*.24],[x+w/2+.04,y+2.42,z+s*d*.24],.045,trim);
}
