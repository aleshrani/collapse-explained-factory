import * as THREE from "three";
import { stencil } from "./markings";
import { rng } from "../videos/bridge/paint";
import { camera, Cameras, Context, limit, Model, painted, Point, ridge } from "./shared";
export type Params={towerCount:number;lanes:number;sandLevel:number};
export const defaults:Params={towerCount:18,lanes:6,sandLevel:.55};
export const hosts:Record<keyof Cameras,Point>={wide:[-4.8,.04,24],medium:[2.98,.04,8.95],close:[3,.04,3]};
export function build(params:Partial<Params>={},_ctx:Context={}){
  const p={...defaults,...params},m=new Model(),r=rng(813);
  const count=Math.round(limit(p.towerCount,2,40)),lanes=Math.round(limit(p.lanes,2,10)),sand=limit(p.sandLevel,0,1);
  const edge=lanes*1.55, asphalt=painted("#666974","road"),dune=painted("#deb77e","sand"),curb=painted("#c9b5a1");
  const wall=painted("#d7bc9e","wall"),inset=painted("#83a6a4","glass"),balcony=painted("#e8d4ae"),ochre=painted("#ae7959","rib");
  m.box(0,-.24,-50,760,.45,760,dune,8);
  m.box(0,-.07,-53,edge*2,.18,235,asphalt,6);
  const markings=new Model();
  for(let lane=1;lane<lanes;lane++){
    const x=lane*3.1-edge;
    for(let z=-168;z<61;z+=7)markings.add(new THREE.PlaneGeometry(.13,3.2).rotateX(-Math.PI/2).translate(x,.026,z),painted("#e2ce9e","road"));
  }
  const stripes=markings.assemble();
  stripes.traverse(o=>{if(o instanceof THREE.Mesh){o.castShadow=false;}});m.group.add(stripes);
  for(const s of [-1,1]){
    m.box(s*(edge-.24),.033,-53,.15,.014,234,painted("#e7bb67"));
    m.box(s*(edge+1.5),.08,-53,3,.25,235,curb,2);
    for(let z=-142;z<27;z+=18){
      const x=s*(edge+.65);
      m.pipe([x,.2,z],[x,6.3,z],.115,painted("#648383"));
      m.beam([x,6.15,z],[x-s*1.8,6.75,z],.15,painted("#648383"));
      m.box(x-s*1.8,6.7,z,.83,.2,.39,balcony);
    }
  }
  for(let i=0;i<count;i++){
    const side=i%2===0?-1:1,row=Math.floor(i/2),z=5-row*16+(side>0?-9:0);
    const x=side*(edge+8.5+(row%3===1?2:0)), height=21.6;
    m.box(x,height/2,z,8.5,height,8.3,wall,5.4);
    m.box(x,height/2,z+4.18,2.55,height,.48,inset,3.5);
    m.box(x+side*3.63,height/2,z+4.19,.61,height,.58,ochre);
    for(let f=1;f<=7;f++){
      const y=f*2.7;
      m.box(x-side*4.3,y,z,1.5,.24,7.8,balcony);
      m.box(x-side*4.95,y+.48,z,.16,.84,7.8,painted("#a3b7ad","rib"),2);
      m.box(x-1.85,y,z+4.55,2.65,.24,.95,balcony);
    }
    m.box(x,height+.2,z,9,.44,8.85,balcony);
    m.box(x+1,height+1.05,z-1,4.3,1.45,4.3,ochre);
    m.box(x,.99,z+4.28,1.6,2,.25,inset,0);
  }
  for(let i=0;i<74;i++){
    const side=i%2?1:-1,z=-150+r()*193,x=side*(edge+3+r()*14);
    if(sand>0)m.mound(x,.035,z,(2+r()*5)*sand, (.3+r()*1.55)*sand,(2+r()*6)*sand,dune,i);
  }
  // Crosswinds lay low, tapering tongues obliquely across the carriageway.
  for(const [side,z,reach] of [[1,15,.89],[-1,5,1.1],[1,-5,.97],[-1,-19,.81],[1,-35,1.25],[-1,-57,.98],[1,-76,1.1]]){
    if(sand===0)break;
    for(let j=0;j<5;j++){
      const t=j/4, x=side*(edge+1.4-(.8+t*1.25)*reach*edge*sand);
      m.mound(x,.028,z+t*3.6,1+(1-t*.66)*6*sand,(.06+(1-t)*.57)*sand, (.8+(1-t)*2.85)*sand,dune,j+z);
    }
  }
  // A vacant stop, a fading route marker and utility pods establish human scale.
  for(const [s,z] of [[-1,1],[1,-21],[-1,-53]]){
    const x=s*(edge+1.45);
    for(const dz of [-1.48,1.48])m.box(x,.99,z+dz,.10,2,.12,painted("#637977"));
    m.box(x,2.13,z,1.93,.17,3.68,ochre);m.box(x,.59,z,.54,.13,2.65,balcony);
    m.box(x+s*.39,1.18,z,.12,1.32,2.94,inset,2);
    m.box(x,2.37,z+1.56,1.17,.58,.12,stencil("12","#487c7b"),0);
  }
  // Local resurfacing strips and irregular sealed cracks break up the long asphalt field.
  const seal=painted("#50575f","road");
  for(let i=0;i<60;i++){
    const x=(r()-.5)*edge*1.8,z=-65+r()*97;
    const coords:[[number,number],[number,number],[number,number]]=[[x,z],[x+.23,z+.44],[x-.12,z+.96]];
    for(let j=0;j<2;j++){const [a,b]=coords[j],[c,d]=coords[j+1];m.beam([a,.024,b],[c,.024,d],.033,seal,.024);}
  }
  ridge(m,-180,painted("#cb9578","sand"),12,87);
  const cameras:Cameras={wide:camera([-5,3.45,32],[1,7.5,-27],57),medium:camera([3.15,1.48,12.4],[-4,5.4,-36],51),close:camera([3,1.35,5.5],[3,1.2,3],38)};
  return m.finish(cameras);
}
