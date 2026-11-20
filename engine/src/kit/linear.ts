import * as THREE from "three";
import {camera, container, limit, Context, Model, painted, Point, ridge} from "./shared";
import {stencil} from "./markings";

// Linear city proposal: two mirror-faced walls facing each other across a narrow corridor, running to the horizon.
// phase "proposal" = finished walls (a drawing of the idea), "work" = built segment + steel frame + excavation, "record" = short finished stub.
// Walls run along x; corridor centre z = 0; ground y = 0.
export type LinearParams={subject?:string;detail?:string;damage?:number;phase?:"proposal"|"work"|"record";crowd?:number;weather?:string};
const H=46,GAP=15;
export function build(p:LinearParams={},_ctx:Context={}){
  const m=new Model(),phase=p.phase??"proposal",wear=limit(Number(p.damage)||0,0,1);
  const mirror=painted("#a9c9d1","glass"),band=painted("#d6e6e8"),steel=painted("#5f727b"),dark=painted("#35444e"),lattice=painted("#d9b04a"),
        sand=painted("#d3bb88","earth"),pit=painted("#7a6a50","earth"),road=painted("#9a7e5c","road"),cap=painted("#e8f0f0");
  m.box(0,-.19,0,690,.34,690,painted("#d8c18d","earth"),5);
  ridge(m,-110,painted("#b9a374","earth"),9,23);ridge(m,-150,painted("#b0a07a","earth"),12,52);
  const built=phase==="proposal"?170:phase==="work"?90:34,x0=-85;
  for(const s of [-1,1]){
    const z=s*GAP/2;
    m.box(x0+built/2,H/2,z+s*.6,built,H,1.2,painted("#b8cdd1","plate"));
    m.box(x0+built/2,H/2,z-s*.02,built,H,.12,mirror,4);
    m.box(x0+built/2,H/2,z+s*1.24,built,H,.1,mirror,4);
    for(let x=x0+4;x<x0+built;x+=4)m.box(x,H/2,z+s*1.32,.1,H,.1,band);
    for(let x=x0+4;x<x0+built;x+=4)m.box(x,H/2,z-s*.14,.1,H,.1,band);
    for(let y=6;y<H;y+=6)m.box(x0+built/2,y,z-s*.14,built,.1,.1,band);
    m.box(x0+built/2,H+.3,z+s*.3,built,.6,1.6,cap);
    // steel frame continues past the finished segment while construction is under way
    if(phase==="work")for(let x=x0+built+4;x<85;x+=8){
      m.box(x,H*.3,z+s*.6,.5,H*.6,.5,steel);
      for(let y=7;y<H*.6;y+=8)m.beam([x,y,z+s*.6],[x+8,y,z+s*.6],.3,steel);
    }
  }
  // excavation along the corridor and a haul road
  if(phase!=="record"){
    m.box(0,-.15,0,170,.3,GAP-1.2,pit,5);
    for(let i=0;i<10;i++)m.mound(-80+i*17,0,GAP/2+3+(i%2)*2,6,1.6,2.2,sand,i);
    m.box(0,.02,GAP/2+13,170,.1,6,road,4);
  }else m.box(0,.02,0,170,.08,GAP-1.2,painted("#cdb888","road"),4);
  // tower cranes at the construction front
  if(phase==="work")for(const x of [x0+built+2,x0+built+34]){
    for(const [dx,dz] of [[-1,-1],[1,-1],[1,1],[-1,1]])m.beam([x+dx*1.2,0,dz*1.2],[x+dx*1.2,H+10,dz*1.2],.2,lattice);
    for(let y=3;y<H+10;y+=3)m.beam([x-1.2,y,0],[x+1.2,y+3,0],.1,lattice);
    m.beam([x-14,H+11,0],[x+30,H+11,0],.5,lattice);m.box(x,H+12.4,0,3,2,3,steel);m.pipe([x+22,H+11,0],[x+22,H-8,0],.08,dark);
  }
  // dump trucks and a site office
  for(let i=0;i<3;i++){const x=-60+i*22+ (phase==="record"?200:0);m.box(x,1.4,GAP/2+13,5,1.4,2.4,painted("#d9a43a","plate"));m.box(x+2,2.4,GAP/2+13,1.8,1.3,2.3,painted("#e6ddc8"));for(const dx of [-1.6,1.6])for(const dz of [-1.3,1.3])m.add(new THREE.CylinderGeometry(.7,.7,.4,14).rotateX(Math.PI/2).translate(x+dx,.7,GAP/2+13+dz),dark);}
  container(m,22,0,GAP/2+9,6.1,2.5,"#6a7e86",true);container(m,29,0,GAP/2+9,6.1,2.5,"#a8905a");
  if(wear>.4)for(let i=0;i<8;i++)m.box(-60+i*20,.5,GAP/2+6,2.2,.8,.5,painted("#c9553a"));
  // foreground sign and scale pole
  const title=String(p.subject||"Linear city proposal");
  const post=new Model();for(const x of [10,13.2])post.pipe([x,0,40],[x,2.2,40],.08,dark);m.group.add(post.assemble());
  const plate=new THREE.Mesh(new THREE.PlaneGeometry(3.4,1.2),stencil(title,"#49686c"));plate.position.set(11.6,1.8,39.94);m.group.add(plate);
  const group=m.finish({wide:camera([45,22,85],[-8,20,0],54),medium:camera([14,5,52],[-6,16,0],48),close:camera([13,2.8,46],[0,10,0],44)});
  group.cameras.aerial=camera([30,95,60],[-10,8,0],58);
  group.cameras.low=camera([14,1.1,50],[-10,22,0],56);
  group.cameras.dolly=camera([-95,5,0],[60,18,0],62);   // down the corridor between the walls
  const feet:Point=[11.6,0,42];
  return {group,feet,place:"linear-city"};
}
