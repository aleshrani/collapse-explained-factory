import * as THREE from "three";
import type {Shot as View} from "../kit/shared";
import type {Shot} from "./types";
import type {Ob} from "../kit/collide";

// Framing: the host must be fully in frame (3 % margin), between ~12 % and ~70 % of the picture height, in the first, middle and last
// frame; side characters are either wholly inside or hidden. fitView() moves the camera (dolly along the ray to the host, then a truck/pedestal)
// until that holds, screenLimits() keeps his walk inside the frame, and checkFraming() is the gate: a "FRAMING ..." console line fails the build.
const ASPECT=16/9,UP=new THREE.Vector3(0,1,0);
export const HOST_FIG=1.1;   // the drawn figure (feet to hat top) measured on renders: about 1.1 m of the 2.3 m card (review: 1.6 gave hosts of 8-13 % where the gate said 18+)
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
/** how far the camera looks down, in degrees (negative = up). People are cards that only turn about the vertical axis, so a steep view makes them look flat on the floor. */
export const MAX_PITCH=25;
export const pitchOf=(c:CamState)=>{const d=c.target.clone().sub(c.pos).normalize();return THREE.MathUtils.radToDeg(Math.asin(-d.y));};
/** screen corners of every text surface (tagged userData.text) in a scene */
export function textSurfaces(root:THREE.Object3D){
  const out:THREE.Vector3[][]=[];root.updateMatrixWorld(true);
  root.traverse(o=>{
    if(!(o instanceof THREE.Mesh)||!o.userData.text)return;
    o.geometry.computeBoundingBox();const b=o.geometry.boundingBox!,w=b.max.x-b.min.x,h=b.max.y-b.min.y;
    const rects=(o.userData.rects as number[][]|undefined)??[[0,0,1,1]];   // [u0,v0,u1,v1], v measured from the top
    for(const [u0,v0,u1,v1] of rects){
      const pts:THREE.Vector3[]=[];
      for(const x of [b.min.x+u0*w,b.min.x+u1*w])for(const y of [b.max.y-v0*h,b.max.y-v1*h])pts.push(new THREE.Vector3(x,y,0).applyMatrix4(o.matrixWorld));
      out.push(pts);
    }
  });
  return out;
}
/** does a person standing at these base positions hide part of a text surface behind him? Checked at the start, middle and end of the shot. */
export function occludes(view:View,shot:Shot,texts:THREE.Vector3[][],people:{pos:[number,number,number];scale?:number}[]){
  for(const u of [0,.5,1]){
    const c=cameraAt(view,shot,u),fwd=c.target.clone().sub(c.pos).normalize();
    for(const p of people){
      const sc=p.scale??1,pb=project(c,boxPoints(p.pos[0],p.pos[1],p.pos[2],.45*sc,HOST_FIG*sc,.2));if(!pb)continue;
      const pd=new THREE.Vector3(...p.pos).sub(c.pos).dot(fwd);
      for(const t of texts){
        const tb=project(c,t);if(!tb)continue;
        const td=t.reduce((s,v)=>s+v.clone().sub(c.pos).dot(fwd),0)/4;
        if(td<pd)continue;   // the text is in front of him
        const ix=Math.max(0,Math.min(pb.x1,tb.x1)-Math.max(pb.x0,tb.x0)),iy=Math.max(0,Math.min(pb.y1,tb.y1)-Math.max(pb.y0,tb.y0)),ta=(tb.x1-tb.x0)*(tb.y1-tb.y0);
        if(ta>.002&&ix*iy>ta*.05)return true;
      }
    }
  }
  return false;
}
const depth=(c:CamState,p:THREE.Vector3)=>p.clone().sub(c.pos).dot(c.target.clone().sub(c.pos).normalize());
/** share of the picture covered by objects that stand wholly between the camera and the subject (the look point), floors and tiny props aside.
 *  Sums the projected boxes, so it errs high; the subject itself (anything containing the look point) never counts. */
export function foregroundArea(c:CamState,obs:Ob[],look:THREE.Vector3,floorY:number){
  const fwd=c.target.clone().sub(c.pos).normalize(),limit=depth(c,look)-.3;let sum=0;
  for(const o of obs){
    if(o.tag?.includes("prop"))continue;   // a gag prop is meant to be in front of the subject
    const sz=Math.max(o.x1-o.x0,o.z1-o.z0);
    if(o.y1<floorY+.3||o.y1-o.y0<.4||sz<.8||sz>12)continue;   // floors, small props and whole walls are not foreground
    if(Math.hypot(Math.max(o.x0-c.pos.x,0,c.pos.x-o.x1),Math.max(o.z0-c.pos.z,0,c.pos.z-o.z1))>c.pos.distanceTo(look)*.8)continue;
    if(look.x>=o.x0-.3&&look.x<=o.x1+.3&&look.z>=o.z0-.3&&look.z<=o.z1+.3&&look.y>=o.y0-.3&&look.y<=o.y1+.3)continue;
    const pts:THREE.Vector3[]=[];let far=-1e9,near=1e9;
    for(const x of [o.x0,o.x1])for(const y of [o.y0,o.y1])for(const z of [o.z0,o.z1]){const p=new THREE.Vector3(x,y,z),d=p.clone().sub(c.pos).dot(fwd);far=Math.max(far,d);near=Math.min(near,d);pts.push(p);}
    if(far>limit||far<=0)continue;                       // reaches the subject's depth, or is behind the camera
    const b=project(c,pts);
    sum+=b?Math.max(0,Math.min(b.x1,1)-Math.max(b.x0,0))*Math.max(0,Math.min(b.y1,1)-Math.max(b.y0,0)):near<.3?.3:0;   // a box the camera is inside or touching counts as a big block
  }
  return sum;
}

/** Search camera moves for one that frames the host: dolly along the camera's own axis (in or back up) combined with a sideways truck,
 *  smallest move first. Accepted when he is inside the margins at the start, middle and end of the shot and 20-60 % of the picture high.
 *  Pitch and height never change, so a high camera stays high. Returns the original view when nothing works (the host then walks toward the target). */
export function fitView(view:View,shot:Shot,feet:[number,number,number],obs:Ob[]=[],keep=0,must:THREE.Vector3[]=[]):View{
  const eye=new THREE.Vector3(...view.pos),look=new THREE.Vector3(...view.look),fwd=look.clone().sub(eye).normalize(),rt=rightOf(eye,look),D=eye.distanceTo(look);
  const lookV=new THREE.Vector3(...view.look);
  const ok=(v:View,withKeep:boolean)=>{
    for(const u of [0,.5,1]){
      const c=cameraAt(v,shot,u),b=project(c,hostBox(feet));
      if(!b||b.x0<.05||b.x1>.95||b.y0<.05||b.y1>.95)return 0;
      if(pitchOf(c)>MAX_PITCH)return 0;
      const h=figureFrac(c,feet);if(h<.2||h>.6)return 0;
      if(withKeep&&keep){   // the subject (a board, a page of text) stays whole in the picture
        const l=new THREE.Vector3(v.look[0],v.look[1],v.look[2]),r=rightOf(new THREE.Vector3(...v.pos),l),sb=project(c,[l.clone().addScaledVector(r,-keep),l.clone().addScaledVector(r,keep)]);
        if(!sb||sb.x0<.02||sb.x1>.98)return 0;
      }
      if(must.length){const mb=project(c,must);if(!mb||mb.x0<.03||mb.x1>.97||mb.y0<.03||mb.y1>.97)return 0;}   // the gag prop is wholly in the picture
      if(foregroundArea(c,obs,new THREE.Vector3(v.look[0],v.look[1],v.look[2]),feet[1])>.14)return 0;
    }
    return 1;
  };
  void lookV;
  if(ok(view,true))return view;
  let best:View|undefined,cost=1e9;
  const dirH=eye.clone().sub(look).setY(0),R0=Math.max(.5,dirH.length());dirH.normalize();
  const P0=THREE.MathUtils.radToDeg(Math.atan2(eye.y-look.y,R0));
  for(const withKeep of keep?[true,false]:[false])if(!best){
    // family 1: dolly along the camera's own axis, sideways truck, pedestal, pitch
    for(let t=-D*.92;t<=14;t+=.5)for(const sj of must.length?[0,.25,-.25,.5,-.5,.75,-.75,1,-1,1.5,-1.5,2,-2,3,-3,4,-4]:[0,.5,-.5,1,-1,1.5,-1.5,2.5,-2.5,4,-4])for(const h of must.length?[0]:[0,-1,-2])for(const q of [0,-1,1,-2,2,-3,3,-4,-5,-6]){
      const s=sj*Math.max(1,D*.12),pos=eye.clone().addScaledVector(fwd,-t).addScaledVector(rt,s);pos.y+=h;
      if(pos.y<feet[1]+.9||(h<0&&pos.y<eye.y*.5))continue;
      const v:View={pos:[pos.x,pos.y,pos.z],look:[look.x+rt.x*s,look.y+h+q*D*.12,look.z+rt.z*s],fov:view.fov};
      const c=Math.abs(t)+Math.abs(s)*.8+Math.abs(q)*1.2+Math.abs(h)*.8;
      if(c<cost&&ok(v,withKeep)){best=v;cost=c;}
    }
    // family 2: re-aim from the same side at a shallower angle (a steep top-down view is not allowed with people in the picture)
    if(!best||P0>MAX_PITCH)for(const az of [0,35,-35,70,-70])for(const rm of [.12,.2,.3,.45,.6,.8,1,1.25,1.5,2,2.8])for(const P of [8,12,16,20,24])for(const sj of [0,.5,-.5,1,-1,2,-2])for(const q of [0,-1,1,-2,2]){
      const dA=dirH.clone().applyAxisAngle(UP,THREE.MathUtils.degToRad(az)),rtA=rightOf(look.clone().add(dA),look);
      const R=R0*rm,s=sj*Math.max(1,D*.12),pos=look.clone().addScaledVector(dA,R).addScaledVector(rtA,s);pos.y=look.y+R*Math.tan(THREE.MathUtils.degToRad(P));
      if(pos.y<feet[1]+.9)continue;
      const v:View={pos:[pos.x,pos.y,pos.z],look:[look.x+rtA.x*s,look.y+q*D*.12,look.z+rtA.z*s],fov:view.fov};
      const c=Math.abs(R-R0)*.6+Math.abs(P-P0)*.15+Math.abs(s)*.8+Math.abs(q)*1.2+Math.abs(az)*.06+(P0>MAX_PITCH?0:5);
      if(c<cost&&ok(v,withKeep)){best=v;cost=c;}
    }
  }
  // family 3 (last resort): a host-centred view from the original side. The subject may fall partly out of the picture, the host never does.
  if(!best){
    const chest=new THREE.Vector3(feet[0],feet[1]+.9,feet[2]);
    for(const az of [0,35,-35,70,-70,110,-110])for(const R of [4,5,6,8,10,13])for(const P of [4,10,16,22])for(const sj of [0,1.5,-1.5,3,-3]){
      const dA=dirH.clone().applyAxisAngle(UP,THREE.MathUtils.degToRad(az)),rtA=rightOf(chest.clone().add(dA),chest);
      const pos=chest.clone().addScaledVector(dA,R).addScaledVector(rtA,sj*.5);pos.y=chest.y+R*Math.tan(THREE.MathUtils.degToRad(P));
      const lk=chest.clone().addScaledVector(rtA,sj*.5);lk.y=chest.y-.2;
      const v:View={pos:[pos.x,pos.y,pos.z],look:[lk.x,lk.y,lk.z],fov:view.fov};
      const c=20+R*.2+Math.abs(az)*.05+P*.05+Math.abs(sj)*.2;
      if(c<cost&&ok(v,false)){best=v;cost=c;}
    }
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
export function checkFraming(view:View,shot:Shot,at:(age:number)=>[number,number,number],obs:Ob[]=[],must:THREE.Vector3[]=[]){
  const dur=shot.end-shot.start,out:string[]=[];
  for(const u of [0,.5,1]){
    const c=cameraAt(view,shot,u),p=at(Math.min(dur-.04,u*dur)),b=project(c,hostBox(p));
    const label=["first","middle","last"][u*2];
    if(!b){out.push(`FRAMING the host is behind the camera in the ${label} frame`);continue;}
    const h=figureFrac(c,p);
    if(b.x0<.03||b.x1>.97||b.y0<.03||b.y1>.97)out.push(`FRAMING the host is cut by the frame or out of it in the ${label} frame (x ${b.x0.toFixed(2)}..${b.x1.toFixed(2)}, y ${b.y0.toFixed(2)}..${b.y1.toFixed(2)})`);
    if(h<.18)out.push(`FRAMING the host is too small in the ${label} frame (${(h*100).toFixed(0)} % of the picture height)`);
    if(must.length){const mb=project(c,must);if(!mb||mb.x0<.02||mb.x1>.98||mb.y0<.02||mb.y1>.98)out.push(`FRAMING the gag prop is cut by the frame or out of it in the ${label} frame`);}
    if(pitchOf(c)>MAX_PITCH+.5)out.push(`FRAMING the camera looks down ${pitchOf(c).toFixed(0)} degrees in the ${label} frame (max ${MAX_PITCH} with people in the picture)`);
    const fg=foregroundArea(c,obs,new THREE.Vector3(...view.look),p[1]);
    if(fg>.2)out.push(`FRAMING foreground objects cover ${(fg*100).toFixed(0)} % of the picture in the ${label} frame`);
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
    const reach=Number(card.userData.reach??0);
    for(const u of [0,.5,1])for(const o of [-reach,0,reach]){   // a walker is checked at both ends of his walk too
      const b=project(cameraAt(view,shot,u),boxPoints(card.position.x+o,card.position.y,card.position.z,w,h));
      if(!b){outside=true;continue;}
      if(b.x1<0||b.x0>1||b.y1<0||b.y0>1)outside=true;
      else if(b.x0>=.01&&b.x1<=.99&&b.y0>=.01&&b.y1<=.99)inside=true;
      else cut=true;
    }
    if(cut||(inside&&outside)){card.visible=false;hidden.push(card);}
  }
  return hidden;
}
