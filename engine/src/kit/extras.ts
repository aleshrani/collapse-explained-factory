import * as THREE from "three";
import {ctex} from "../videos/bridge/paint";
import {blobMaterial,cardShade} from "../videos/bridge/cardshade";
import {NOINK} from "../videos/bridge/ink";
import {ARCH_PRESETS,drawScientist,PersonLook} from "../videos/dubai3d/scientist";
import {Pen} from "../videos/dubai3d/toon";
import {animate} from "./motion";

// Everyone who is not the host is drawn with the host's own 2D card rig (round head, dot eyes, thin limbs, same line weight);
// only clothes, hair, hat and glasses change. Kits record where people stand in group.userData.people; dress() turns them into cards.
export type Person={x:number;y?:number;z:number;variant:number;scale?:number;walk?:{dx:number;period:number;angle?:number;pause?:boolean};seated?:boolean;carry?:boolean};   // walk: paces up to dx metres either side of x (shortened to stay clear); seated: behind a desk or bench, so it may overlap its furniture
type Look={coat:string;coatDk:string;shirt:string;pants:string;hair:string;skin:string;hat:string;h:number;person:PersonLook};
// Twelve different people: women and men, different skin, hair (colour, length, bald), build, clothes (shirt, sweater, dress, jacket, kandura with
// ghutra), mostly no glasses, never the architect's orange tie. The STYLE gate below checks the mix.
const V:Look[]=[
  {coat:"#3d3f4a",coatDk:"#2f313a",shirt:"#f1eee6",pants:"#2a2c36",hair:"#2b2420",skin:"#c99468",hat:"none",h:1,person:{noGlasses:true,tie:"#3d6fb0",width:1.06}},                 // dark suit, blue tie
  {coat:"#1fa89a",coatDk:"#198a7e",shirt:"#f4f1e8",pants:"#1fa89a",hair:"#5a3a26",skin:"#e2b48c",hat:"none",h:.94,person:{noGlasses:true,garment:"dress",hair:"long"}},   // woman, teal dress, long brown hair
  {coat:"#9db7d1",coatDk:"#86a0ba",shirt:"#ffffff",pants:"#4a4f5c",hair:"#c99468",skin:"#c99468",hat:"none",h:1.02,person:{noGlasses:true,garment:"shirt",width:1.14}},   // bald, big, shirt sleeves
  {coat:"#b8453f",coatDk:"#9a3833",shirt:"#f1e6d4",pants:"#3a3f4c",hair:"#1f1b1a",skin:"#8a5a3c",hat:"none",h:.93,person:{noGlasses:false,garment:"sweater"}},               // woman, red sweater, glasses
  {coat:"#f2f0ea",coatDk:"#dcd8cf",shirt:"#ffffff",pants:"#f2f0ea",hair:"#1d1a1a",skin:"#c58f62",hat:"none",h:1.02,person:{noGlasses:true,garment:"kandura",width:1.04}}, // Emirati man, kandura and ghutra
  {coat:"#7a9a4a",coatDk:"#62803a",shirt:"#f4f1e8",pants:"#4a4a40",hair:"#b8b8b8",skin:"#e7bb94",hat:"none",h:.97,person:{noGlasses:false,garment:"sweater",width:.96}},   // grey-haired, green sweater, glasses
  {coat:"#e9d9c0",coatDk:"#d2bf9f",shirt:"#fffaf0",pants:"#5a4a42",hair:"#d8b46a",skin:"#f0c8a0",hat:"none",h:.95,person:{noGlasses:true,garment:"shirt",hair:"long"}},       // woman, cream blouse, long blond hair
  {coat:"#7c6a58",coatDk:"#66564a",shirt:"#e8dcc3",pants:"#4d4338",hair:"#8a3f22",skin:"#e8b896",hat:"none",h:1,person:{noGlasses:true,garment:"suit",tie:"none",width:.92}},       // brown jacket, no tie, red hair
  {coat:"#8a3f86",coatDk:"#6f3270",shirt:"#f1e6d4",pants:"#8a3f86",hair:"#16120f",skin:"#7a4a30",hat:"none",h:.94,person:{noGlasses:true,garment:"dress",hair:"long"}},      // woman, plum dress, long black hair
  {coat:"#7a8f4a",coatDk:"#62773a",shirt:"#d9d4c4",pants:"#3b4a3f",hair:"#2a1f18",skin:"#b07d56",hat:"none",h:1.03,person:{noGlasses:true,garment:"shirt",width:1.1}},       // worker's green shirt
  {coat:"#efe9dc",coatDk:"#d9d2c2",shirt:"#ffffff",pants:"#efe9dc",hair:"#2a2018",skin:"#b88458",hat:"none",h:.99,person:{noGlasses:false,garment:"kandura"}},            // Emirati man, glasses
  {coat:"#a24f6a",coatDk:"#873f57",shirt:"#f6e9ec",pants:"#3a3848",hair:"#6a4a30",skin:"#f0c8a0",hat:"none",h:.95,person:{noGlasses:true,garment:"suit",tie:"none"}},        // woman, rose blazer, brown bob
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
// STYLE gate: nobody may pass for a second architect (blue-grey coat #46617f, white hard hat, glasses, orange tie), and the crowd must be varied:
// no hats, coats at least 60 RGB away from his, no orange tie, at most 4 of 12 with glasses, at least 3 women's looks (dress / long hair),
// 2 kandura, 1 bald, and no two neighbours in the table alike.
(()=>{
  const host=[0x46,0x61,0x7f],hex=(c:string)=>[1,3,5].map(i=>parseInt(c.slice(i,i+2),16));
  V.forEach((v,i)=>{
    const d=Math.hypot(...hex(v.coat).map((x,k)=>x-host[k])),tie=(v.person.tie??"#ff7a2f").toLowerCase();
    const orange=!v.person.garment||v.person.garment==="suit"?(tie==="#ff7a2f"||tie==="#f08030"):false;
    if(v.hat!=="none"||(d<60&&v.person.garment!=="kandura")||orange)console.error("STYLE side-character variant "+i+" looks like the architect (hat "+v.hat+", coat distance "+d.toFixed(0)+", orange tie "+orange+")");
  });
  const glasses=V.filter(v=>!v.person.noGlasses).length,women=V.filter(v=>v.person.garment==="dress"||v.person.hair==="long").length,kandura=V.filter(v=>v.person.garment==="kandura").length;
  if(glasses>4||women<3||kandura<2)console.error("STYLE the crowd is not varied enough (glasses "+glasses+"/12, women "+women+", kandura "+kandura+")");
})();
export function extraCard(variant:number,scale=1){
  const v=V[((variant%V.length)+V.length)%V.length];scale*=v.h;
  const maps=POSES.map((pose,k)=>{
    const map=ctex("kit-extra-"+variant+"-"+k,600,1000,g=>drawScientist(new Pen(g),pose,{look:"architect",glasses:false,hat:v.hat,person:v.person,
      palette:{coat:v.coat,coatDk:v.coatDk,shirt:v.shirt,pants:v.pants,hair:v.hair,hairDk:v.hair,hairHi:v.hair,tips:v.hair,skin:v.skin,glove:v.skin,moustache:v.hair,brow:v.hair}}));
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

/** A walk with a route, not a pendulum: along a line at `angle` degrees (0 = across the picture, 90 = toward / away from the camera, anything between =
 *  diagonal) between -reach and +reach of (x0,z0) at 1 m/s. He stops and turns round at each end (idle gesture, mirrored), and with `pause` also stops
 *  in the middle to look at something. Feet change every .5 m of real distance (2 steps a second, no sliding), the body bobs with each step and the
 *  height follows the ground under the route (`ground(s)`, s = signed distance along the route), so he is neither above nor below the surface. */
export function walkPerson(root:THREE.Object3D,card:THREE.Mesh,x0:number,z0:number,angleDeg:number,reach:number,ground:(s:number)=>number,seed:number,pause=false){
  const maps=card.userData.poses as THREE.Texture[],mat=card.material as THREE.MeshLambertMaterial,depth=card.customDepthMaterial as THREE.MeshDepthMaterial;
  const V=1,STEP=.5,ux=Math.cos(angleDeg*Math.PI/180),uz=Math.sin(angleDeg*Math.PI/180);
  // route as legs: [duration, from, to] along the line; pauses have from == to
  const legs:[number,number,number][]=[];const push=(a:number,b:number)=>{if(pause&&Math.abs(b-a)>1){const m=(a+b)/2;legs.push([Math.abs(m-a)/V,a,m],[1.4,m,m],[Math.abs(b-m)/V,m,b]);}else legs.push([Math.abs(b-a)/V,a,b]);};
  push(-reach,reach);legs.push([1.2,reach,reach]);push(reach,-reach);legs.push([1.2,-reach,-reach]);
  const total=legs.reduce((n,l)=>n+l[0],0),start=((seed*.37)%1)*total;let cur=-1;
  animate(root,t=>{
    let u=(t+start)%total,travelled=0,s=legs[0][1],moving=false,flip=false;
    for(let i=0;i<legs.length;i++){
      const [d,a,b]=legs[i];
      if(u<=d){moving=a!==b;s=a+(b-a)*(u/d);travelled+=Math.abs(b-a)*(u/d);flip=b>=a;break;}
      u-=d;travelled+=Math.abs(b-a);s=b;flip=b>=a;
    }
    card.position.x=x0+ux*s;card.position.z=z0+uz*s;
    const base=ground(s);
    let idx:number;
    if(moving){idx=4+(Math.floor(travelled/STEP)%2);card.position.y=base+.045*Math.abs(Math.sin(Math.PI*travelled/STEP));}
    else{idx=Math.floor((t+start)/1.0)%2?1:2;card.position.y=base;}   // paused: an idle gesture
    card.scale.x=flip?1:-1;                                           // turns round at the ends (the card is mirrored)
    if(idx!==cur){cur=idx;mat.map=maps[idx];depth.map=maps[idx];}
  });
}
