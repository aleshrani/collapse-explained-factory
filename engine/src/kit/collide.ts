import * as THREE from "three";

// Nothing passes through anything: people and moving objects keep clear of every built object, and of each other.
// Kits record their footprints (XZ rectangle + height range) automatically in Model; this file plans walking lines that stop
// short of obstacles and checks every moving object's whole path. Problems go to the browser console as "COLLISION ..."
// lines; test-clip.mjs, render-episode.mjs and check-collisions.mjs fail the build when they see one.
export type Ob={x0:number;x1:number;z0:number;z1:number;y0:number;y1:number;tag?:string};
export type Track={id:string;kind:"boat"|"car"|"paper"|"bird";r:number;h:number;pos:(t:number)=>[number,number,number];drop?:()=>void};

export const BODY=.3,GAP=.3,HEIGHT=2.1;
export const rectDist=(o:Ob,x:number,z:number)=>Math.hypot(Math.max(o.x0-x,0,x-o.x1),Math.max(o.z0-z,0,z-o.z1));
const overlapsY=(o:Ob,y0:number,y1:number)=>o.y1>y0&&o.y0<y1;
/** what blocks a standing person whose feet are at g: anything above the floor (g+.2) and below head height */
export const bandFor=(g:number)=>[g+.2,g+HEIGHT] as const;
export function firstHit(list:Ob[],x:number,z:number,r:number,y0:number,y1:number){
  for(const o of list)if(overlapsY(o,y0,y1)&&rectDist(o,x,z)<r)return o;
  return undefined;
}
/** how far a person at (x,z), feet at g, can walk along the unit direction before getting within BODY of anything, or within BODY+GAP of
 *  something he would be moving toward. Obstacles already close at the start only block further approach. */
export function freeRun(list:Ob[],x:number,z:number,dx:number,dz:number,g:number,maxLen:number,y0?:number,y1?:number){
  const [a,b]=y0===undefined?bandFor(g):[y0,y1!];
  const near=list.filter(o=>overlapsY(o,a,b)&&rectDist(o,x,z)<maxLen+BODY+GAP+1),d0=near.map(o=>rectDist(o,x,z));
  for(let s=0;s<=maxLen;s+=.05){
    const px=x+dx*s,pz=z+dz*s;
    for(let i=0;i<near.length;i++){
      const d=rectDist(near[i],px,pz);
      if(d<BODY&&d<d0[i]+.001||d<BODY+GAP&&d<d0[i]-.01)return Math.max(0,s-.05);
    }
  }
  return maxLen;
}
/** nearest standing spot (searched outward in rings) where a person at height g overlaps nothing; the original spot if it is already free */
export function relocate(list:Ob[],x:number,z:number,g:number,maxR=3.5):[number,number]|undefined{
  const [y0,y1]=bandFor(g);
  if(!firstHit(list,x,z,BODY+.05,y0,y1))return [x,z];
  for(let r=.2;r<=maxR;r+=.2)for(let k=0;k<16;k++){
    const a=k/16*Math.PI*2+r,px=x+Math.cos(a)*r,pz=z+Math.sin(a)*r;
    if(!firstHit(list,px,pz,BODY+.05,y0,y1))return [px,pz];
  }
  return undefined;
}
const inPoly=(q:number[][],x:number,z:number)=>{
  let inside=false;
  for(let i=0,j=q.length-1;i<q.length;j=i++)if((q[i][1]>z)!==(q[j][1]>z)&&x<(q[j][0]-q[i][0])*(z-q[i][1])/(q[j][1]-q[i][1])+q[i][0])inside=!inside;
  return inside;
};
export function track(root:THREE.Object3D,t:Track){((root.userData.tracks??=[]) as Track[]).push(t);}
export const issue=(root:THREE.Object3D,text:string)=>{((root.userData.issues??=[]) as string[]).push(text);};

/** Check every registered moving object along the shot. Decorative ones (paper, birds) that would hit something are removed
 *  (extra paper candidates beyond the wanted count too); boats and cars that hit something are reported as issues. */
export function verifyTracks(root:THREE.Object3D,obstacles:Ob[],duration:number){
  const tracks=((root.userData.tracks??[]) as Track[]),polys=(root.userData.islandPolys??[]) as number[][][];
  const kept:Record<string,number>={},want=(root.userData.keep??{}) as Record<string,number>;
  for(const tr of tracks){
    let bad="";
    for(let t=0;t<=duration&&!bad;t+=1/12){
      const [x,y,z]=tr.pos(t),o=firstHit(obstacles,x,z,tr.r,y-.1,y+tr.h);
      if(o)bad=`${tr.id} hits ${o.tag??"an object"} at t=${t.toFixed(1)}s (x=${x.toFixed(1)} z=${z.toFixed(1)})`;
      else if(tr.kind==="boat"||tr.kind==="car")for(const poly of polys){
        for(let k=0;k<8&&!bad;k++)if(inPoly(poly,x+Math.cos(k*.785)*tr.r,z+Math.sin(k*.785)*tr.r))bad=`${tr.id} runs onto an island at t=${t.toFixed(1)}s (x=${x.toFixed(1)} z=${z.toFixed(1)})`;
        if(bad)break;
      }
    }
    if(!bad&&(tr.kind==="paper"||tr.kind==="bird")&&want[tr.kind]!==undefined){
      kept[tr.kind]=(kept[tr.kind]??0)+1;
      if(kept[tr.kind]>want[tr.kind]){tr.drop?.();continue;}
    }
    if(bad){if(tr.drop)tr.drop();else issue(root,bad);}
  }
}
export function report(root:THREE.Object3D,label:string){
  for(const text of (root.userData.issues??[]) as string[])console.error(text.startsWith("FRAMING ")?"FRAMING ["+label+"] "+text.slice(8):text.startsWith("FLOAT ")?"FLOAT ["+label+"] "+text.slice(6):"COLLISION ["+label+"] "+text);
}
