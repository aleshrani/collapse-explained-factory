import * as THREE from "three";
import {ctex} from "../videos/bridge/paint";
import {blobMaterial,cardShade} from "../videos/bridge/cardshade";
import {NOINK} from "../videos/bridge/ink";
import {ARCH_PRESETS,drawScientist} from "../videos/dubai3d/scientist";
import {Pen} from "../videos/dubai3d/toon";
import {animate} from "./motion";

// Everyone who is not the host is drawn with the host's own 2D card rig (round head, dot eyes, thin limbs, same line weight);
// only clothes, hair, hat and glasses change. Kits record where people stand in group.userData.people; dress() turns them into cards.
export type Person={x:number;y?:number;z:number;variant:number;scale?:number;walk?:{dx:number;period:number};seated?:boolean;carry?:boolean};   // walk: paces up to dx metres either side of x (shortened to stay clear); seated: behind a desk or bench, so it may overlap its furniture
const V:{coat:string;coatDk:string;shirt:string;hair:string;skin:string;glasses:boolean;hat:string}[]=[
  {coat:"#3d3f4a",coatDk:"#2f313a",shirt:"#f1eee6",hair:"#2b2420",skin:"#c99468",glasses:false,hat:"none"},   // dark suit, black hair
  {coat:"#7c6a58",coatDk:"#66564a",shirt:"#e8dcc3",hair:"#6a4a30",skin:"#dfac82",glasses:true,hat:"none"},    // brown jacket, glasses
  {coat:"#6f8f4a",coatDk:"#5a7a3a",shirt:"#f4f1e8",hair:"#b9a37a",skin:"#e7bb94",glasses:false,hat:"none"},  // green jacket, fair hair
  {coat:"#8a3f3f",coatDk:"#713232",shirt:"#f1e6d4",hair:"#1f1b1a",skin:"#b07d56",glasses:true,hat:"none"},    // maroon jacket, glasses
  {coat:"#7a3f6e",coatDk:"#633259",shirt:"#dbe7f2",hair:"#8a8a8a",skin:"#d9a679",glasses:true,hat:"none"},    // plum suit, grey hair
  {coat:"#d9d4c4",coatDk:"#bdb7a4",shirt:"#ffffff",hair:"#3a2a22",skin:"#c08c62",glasses:false,hat:"none"},  // cream jacket
  {coat:"#8a7a5a",coatDk:"#6f6048",shirt:"#e6e9ee",hair:"#1d1a1a",skin:"#cf9c70",glasses:false,hat:"none"},  // grey suit
];
// a step: the front foot lifts and lands ahead, the back foot pushes off, arms swing against the legs (same numbers as the host's walk)
function walkPose(step:number){
  return {...ARCH_PRESETS.neutral,footL:[248+step*23,974-Math.max(0,step)*30] as [number,number],footR:[349-step*23,974+Math.min(0,step)*30] as [number,number],
    armL:{target:[205-step*18,585] as [number,number],hand:"relaxed" as const},armR:{target:[430+step*18,585] as [number,number],hand:"relaxed" as const}};
}
const POSES=[
  ARCH_PRESETS.neutral,
  {...ARCH_PRESETS.neutral,armR:{target:[455,455] as [number,number],hand:"open" as const}},                                   // right hand up, talking
  {...ARCH_PRESETS.neutral,armL:{target:[150,430] as [number,number],hand:"open" as const},armR:{target:[470,500] as [number,number],hand:"open" as const}},   // both hands
  {...ARCH_PRESETS.neutral,armR:{target:[500,350] as [number,number],hand:"point" as const}},                                   // pointing
  walkPose(1),walkPose(-1),                                                                                                       // the two steps of a walk cycle
];
// STYLE gate: the architect wears a blue-grey coat (#46617f), a white hard hat and glasses. No side character may have a hat, or a coat
// close to his (RGB distance < 60), so nobody reads as a second architect.
(()=>{
  const host=[0x46,0x61,0x7f],hex=(c:string)=>[1,3,5].map(i=>parseInt(c.slice(i,i+2),16));
  V.forEach((v,i)=>{
    const d=Math.hypot(...hex(v.coat).map((x,k)=>x-host[k]));
    if(v.hat!=="none"||d<60)console.error("STYLE side-character variant "+i+" looks like the architect (hat "+v.hat+", coat distance "+d.toFixed(0)+")");
  });
})();
export function extraCard(variant:number,scale=1){
  const v=V[((variant%V.length)+V.length)%V.length];
  const maps=POSES.map((pose,k)=>{
    const map=ctex("kit-extra-"+variant+"-"+k,600,1000,g=>drawScientist(new Pen(g),pose,{look:"architect",glasses:v.glasses,hat:v.hat,
      palette:{coat:v.coat,coatDk:v.coatDk,shirt:v.shirt,pants:v.coatDk,hair:v.hair,hairDk:v.hair,hairHi:v.hair,tips:v.hair,skin:v.skin,glove:v.skin,moustache:v.hair,brow:v.hair}}));
    map.wrapS=map.wrapT=THREE.ClampToEdgeWrapping;return map;
  });
  const map=maps[0],w=1.38*scale,h=2.30*scale;
  const card=new THREE.Mesh(new THREE.PlaneGeometry(w,h).translate(0,h*.475,0),cardShade(new THREE.MeshLambertMaterial({map,alphaTest:.4,side:THREE.DoubleSide})));
  card.layers.set(NOINK);card.receiveShadow=true;card.castShadow=true;
  card.customDepthMaterial=new THREE.MeshDepthMaterial({map,alphaTest:.4,depthPacking:THREE.RGBADepthPacking});
  card.userData.poses=maps;
  // contact shadow under the feet, same as the host's
  const shade=ctex("kit-contact",128,128,g=>{
    const grad=g.createRadialGradient(64,64,3,64,64,62);grad.addColorStop(0,"#89858a");grad.addColorStop(.48,"#b2aeb2");grad.addColorStop(1,"white");g.fillStyle=grad;g.fillRect(0,0,128,128);
  });
  const blob=new THREE.Mesh(new THREE.PlaneGeometry(1.25*scale,.66*scale).rotateX(-Math.PI/2),blobMaterial(shade));blob.layers.set(NOINK);blob.position.y=.009;card.add(blob);
  return card;
}
/** Everyone else is alive too: they gesture (pose swaps), bob and sway. Seeded by their variant and position so crowds do not move in step. */
export function animatePerson(root:THREE.Object3D,card:THREE.Mesh,baseY:number,seed:number){
  const maps=card.userData.poses as THREE.Texture[],mat=card.material as THREE.MeshLambertMaterial,depth=card.customDepthMaterial as THREE.MeshDepthMaterial;
  let cur=0;const ph=(seed*1.7)%3,rate=.55+((seed*13)%7)/20;
  animate(root,t=>{
    const k=Math.floor(((t*rate+ph)%4+4)%4),use=k===0&&Math.sin(t*.7+seed)>.2?0:k;
    if(use!==cur){cur=use;mat.map=maps[use];depth.map=maps[use];}
    card.position.y=baseY+.03*Math.abs(Math.sin(t*2.6+seed));
  });
}
/** Kits call this instead of drawing blocky figures. */
export function addPerson(group:THREE.Group,person:Person){
  (group.userData.people??=[]).push(person);
}

/** A real walk cycle: constant speed 1 m/s along x between x0-reach and x0+reach (turning round at the ends), the feet change every .5 m
 *  (two steps a second, so the stride length times the cadence equals the speed and no foot slides), the body bobs with each step. */
export function walkPerson(root:THREE.Object3D,card:THREE.Mesh,x0:number,reach:number,baseY:number,seed:number){
  const maps=card.userData.poses as THREE.Texture[],mat=card.material as THREE.MeshLambertMaterial,depth=card.customDepthMaterial as THREE.MeshDepthMaterial;
  const V=1,STEP=.5,ph=(seed*.37)%2;let cur=-1;
  animate(root,t=>{
    const u=t*V/(2*reach)+ph,tri=Math.abs(((u%2)+2)%2-1);
    card.position.x=x0+reach*(2*tri-1);
    const dist=t*V+ph*reach*2,idx=Math.floor(dist/STEP)%2;
    if(idx!==cur){cur=idx;mat.map=maps[4+idx];depth.map=maps[4+idx];}
    card.position.y=baseY+.045*Math.abs(Math.sin(Math.PI*dist/STEP));
  });
}
