import * as THREE from "three";
import type {Shot as View} from "../kit/shared";
import type {Shot} from "./types";

// Framing: the host must be fully in frame (3 % margin), between ~12 % and ~70 % of the picture height, in the first, middle and last
// frame; side characters are either wholly inside or hidden. fitView() moves the camera (dolly along the ray to the host, then a truck/pedestal)
// until that holds, screenLimits() keeps his walk inside the frame, and checkFraming() is the gate: a "FRAMING ..." console line fails the build.
const ASPECT=16/9,UP=new THREE.Vector3(0,1,0);
export const HOST_FIG=1.6;   // the drawn figure (feet to hat top) fills ~70 % of the 2.3 m card
export const HOST_H=2.3,HOST_W=.7;   // card 1.38 wide: arms up in a jump reach ~.7 m either side
export type CamState={pos:THREE.Vector3;target:THREE.Vector3;fov:number};

export function rightOf(eye:THREE.Vector3,look:THREE.Vector3){
  const f=look.clone().sub(eye);f.y=0;if(f.lengthSq()<1e-9)f.set(0,0,-1);
  return f.normalize().cross(UP).normalize();
}
/** The camera at progress u (0..1) of the shot, exactly as World moves it. impact/whip are the short rehook and whip-cut transients. */
export function cameraAt(view:View,shot:Shot,u:number,impact=0,whip=0):CamState{
  const eye=new THREE.Vector3(...view.pos),look=new THREE.Vector3(...view.look),right=rightOf(eye,look);
  const move=shot.direction?.move??"push-in",eased=u*u*(3-2*u),distance=eye.distanceTo(look),travel=.007*u+.037*eased;
  const pos=eye.clone().lerp(look,move==="pull-back"?-travel:travel);
  if(move==="truck")pos.addScaledVector(right,distance*(eased-.5)*.11);
  if(move==="orbit")pos.sub(look).applyAxisAngle(UP,(eased-.5)*.16).add(look);
  if(move==="crane")pos.y+=distance*travel*1.4;
  pos.addScaledVector(right,impact*.10);
  const target=look.clone().addScaledVector(right,whip*distance*.38);
  if(move==="tilt")target.y+=distance*(eased-.5)*.05;
  return {pos,target,fov:view.fov-impact*.9};
}
const tmp=new THREE.PerspectiveCamera(50,ASPECT,.18,1400);
/** screen-space bounding box (fractions of the picture, y from the top) of world points; null when any point is behind the camera */
export function project(c:CamState,pts:THREE.Vector3[]){
  tmp.position.copy(c.pos);tmp.fov=c.fov;tmp.lookAt(c.target);tmp.updateProjectionMatrix();tmp.updateMatrixWorld(true);
  let x0=9,x1=-9,y0=9,y1=-9;
  for(const p of pts){
    if(p.clone().applyMatrix4(tmp.matrixWorldInverse).z>=-.05)return null;
    const n=p.clone().project(tmp);
    x0=Math.min(x0,(n.x+1)/2);x1=Math.max(x1,(n.x+1)/2);y0=Math.min(y0,(1-n.y)/2);y1=Math.max(y1,(1-n.y)/2);
  }
  return {x0,x1,y0,y1};
}
export const boxPoints=(x:number,y:number,z:number,w:number,h:number,d=w)=>{
  const out:THREE.Vector3[]=[];
  for(const sx of [-1,1])for(const sz of [-1,1])for(const sy of [0,1])out.push(new THREE.Vector3(x+sx*w,y+sy*h,z+sz*d));
  return out;
};
const hostBox=(f:[number,number,number])=>boxPoints(f[0],f[1],f[2],HOST_W,HOST_H,.25);
/** his height as a share of the picture: the vertical line from feet to hat top (the box also counts its depth, which inflates it from a high camera) */
const figureFrac=(c:CamState,f:[number,number,number])=>{
  const b=project(c,[new THREE.Vector3(f[0],f[1],f[2]),new THREE.Vector3(f[0],f[1]+HOST_FIG,f[2])]);
  return b?b.y1-b.y0:0;
};
const depth=(c:CamState,p:THREE.Vector3)=>p.clone().sub(c.pos).dot(c.target.clone().sub(c.pos).normalize());

/** Search camera moves for one that frames the host: dolly along the camera's own axis (in or back up) combined with a sideways truck,
 *  smallest move first. Accepted when he is inside the margins at the start, middle and end of the shot and 20-60 % of the picture high.
 *  Pitch and height never change, so a high camera stays high. Returns the original view when nothing works (the host then walks toward the target). */
export function fitView(view:View,shot:Shot,feet:[number,number,number]):View{
  const eye=new THREE.Vector3(...view.pos),look=new THREE.Vector3(...view.look),fwd=look.clone().sub(eye).normalize(),rt=rightOf(eye,look),D=eye.distanceTo(look);
  const ok=(v:View)=>{
    for(const u of [0,.5,1]){
      const c=cameraAt(v,shot,u),b=project(c,hostBox(feet));
      if(!b||b.x0<.05||b.x1>.95||b.y0<.05||b.y1>.95)return 0;
      const h=figureFrac(c,feet);if(h<.2||h>.6)return 0;
    }
    return 1;
  };
  if(ok(view))return view;
  let best:View|undefined,cost=1e9;
  for(let t=-D*.92;t<=14;t+=.5)for(const sj of [0,.5,-.5,1,-1,1.5,-1.5,2.5,-2.5,4,-4])for(const h of [0,-1,-2])for(const q of [0,-1,1,-2,2,-3,3,-4,-5,-6]){
    const s=sj*Math.max(1,D*.12),pos=eye.clone().addScaledVector(fwd,-t).addScaledVector(rt,s);pos.y+=h;
    if(pos.y<feet[1]+.9||(h<0&&pos.y<eye.y*.5))continue;
    const v:View={pos:[pos.x,pos.y,pos.z],look:[look.x+rt.x*s,look.y+h+q*D*.12,look.z+rt.z*s],fov:view.fov};   // q pitches the camera, never raises or lowers it
    const c=Math.abs(t)+Math.abs(s)*.8+Math.abs(q)*1.2+Math.abs(h)*.8;
    if(c<cost&&ok(v)){best=v;cost=c;}
  }
  return best??view;
}
/** how far the host can walk along (dx,dz) from `feet` before leaving the safe part of the picture, at any point of the move */
export function screenLimits(view:View,shot:Shot,feet:[number,number,number],dx:number,dz:number,maxLen:number){
  const lim=(sign:number)=>{
    let ok=0;
    for(let s=0;s<=maxLen;s+=.1){
      const f:[number,number,number]=[feet[0]+dx*s*sign,feet[1],feet[2]+dz*s*sign];
      for(const u of [0,.25,.5,.75,1]){
        const b=project(cameraAt(view,shot,u),hostBox(f));
        if(!b||b.x0<.07||b.x1>.93)return ok;
      }
      ok=s;
    }
    return ok;
  };
  return {pos:lim(1),neg:lim(-1)};
}
/** the gate: host fully in frame (3 % margin) and 12-70 % of the picture height at the start, middle and end. At(u) gives his position. */
export function checkFraming(view:View,shot:Shot,at:(age:number)=>[number,number,number]){
  const dur=shot.end-shot.start,out:string[]=[];
  for(const u of [0,.5,1]){
    const c=cameraAt(view,shot,u),p=at(Math.min(dur-.04,u*dur)),b=project(c,hostBox(p));
    const label=["first","middle","last"][u*2];
    if(!b){out.push(`FRAMING the host is behind the camera in the ${label} frame`);continue;}
    const h=figureFrac(c,p);
    if(b.x0<.03||b.x1>.97||b.y0<.03||b.y1>.97)out.push(`FRAMING the host is cut by the frame or out of it in the ${label} frame (x ${b.x0.toFixed(2)}..${b.x1.toFixed(2)}, y ${b.y0.toFixed(2)}..${b.y1.toFixed(2)})`);
    if(h<.18)out.push(`FRAMING the host is too small in the ${label} frame (${(h*100).toFixed(0)} % of the picture height)`);
    if(h>.7)out.push(`FRAMING the host is too big in the ${label} frame (${(h*100).toFixed(0)} % of the picture height)`);
  }
  return out;
}
/** side characters: wholly inside the frame or hidden, never cut in half. Hidden ones are returned. */
export function hideCutCards(view:View,shot:Shot,cards:THREE.Mesh[]){
  const hidden:THREE.Mesh[]=[];
  for(const card of cards){
    const sc=(card.userData.scale as number)||1,w=.42*sc,h=2.3*sc;
    let inside=false,outside=false,cut=false;
    for(const u of [0,.5,1]){
      const b=project(cameraAt(view,shot,u),boxPoints(card.position.x,card.position.y,card.position.z,w,h));
      if(!b){outside=true;continue;}
      if(b.x1<0||b.x0>1||b.y1<0||b.y0>1)outside=true;
      else if(b.x0>=0&&b.x1<=1&&b.y0>=0&&b.y1<=1)inside=true;
      else cut=true;
    }
    if(cut||(inside&&outside)){card.visible=false;hidden.push(card);}
  }
  return hidden;
}
