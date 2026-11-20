import * as THREE from "three";
import { camera, Cameras, Context, limit, masonry, Model, painted, Point, ridge } from "./shared";
import { stencil } from "./markings";

export type Params={variant:"entrance"|"tunnel";iceLevel:number;lightsOn:boolean};
export const defaults:Params={variant:"entrance",iceLevel:.7,lightsOn:true};
export const hosts:Record<Params["variant"],Record<keyof Cameras,Point>>={
  entrance:{wide:[7.4,.015,18.5],medium:[2.06,.015,10.2],close:[1.4,.015,6]},
  tunnel:{wide:[-.32,.06,7.5],medium:[1.46,.06,2.82],close:[1.15,.06,-2]}
};
function door(m:Model,x:number,z:number,w:number,h:number){
  const metal=painted("#405a66"),leaf=painted("#7d9995"),trim=painted("#dda94e","stripe");
  m.box(x,h/2,z,w+.72,h+.45,.55,metal);
  for(const s of [-1,1]){
    m.box(x+s*w*.252,h/2,z+.32,w*.49,h-.18,.25,leaf,2);
    for(const y of [h*.16,h*.68])m.box(x+s*w*.251,y,z+.49,w*.43,.17,.13,metal);
    m.box(x+s*w*.43,h*.42,z+.53,.19,.65,.25,trim,0);
  }
  m.box(x,h-.13,z+.53,w,.26,.13,trim,1.6);
  const wheel=painted("#b85e40");
  m.add(new THREE.TorusGeometry(.48,.082,8,28).translate(x-.38,h*.47,z+.66),wheel);
  for(let i=0;i<3;i++){
    const a=i*Math.PI/3,dx=Math.cos(a)*.43,dy=Math.sin(a)*.43;
    m.beam([x-.38-dx,h*.47-dy,z+.66],[x-.38+dx,h*.47+dy,z+.66],.055,wheel);
  }
}
function luminaire(m:Model,x:number,y:number,z:number,on:boolean){
  m.box(x,y,z,1.28,.26,.42,painted("#485d69"));
  const lens=painted(on?"#ffe9a5":"#808d8c","glass");
  const lit=new THREE.MeshLambertMaterial({map:lens.map,emissive:on?"#ffd58b":"#323637",emissiveIntensity:on?1.7:.03});
  m.box(x,y-.11,z+.03,1.06,.17,.35,lit,0);
}
export function build(params:Partial<Params>={},_ctx:Context={}){
  const p={...defaults,...params}, ice=limit(p.iceLevel,0,1),m=new Model();
  const snow=painted("#d5e5ea","snow"),glacier=painted("#87b8c9","ice"),red=painted("#b7664b","rib"),steel=painted("#597782");
  if(p.variant==="entrance"){
    m.box(0,-.26,0,670,.52,670,snow,7);
    ridge(m,-75,glacier,19,40);ridge(m,-41,snow,8,41);
    for(const s of [-1,1]){
      m.mound(s*12,-.03,-5,8+ice*5,4+4*ice,11,glacier,s+2);
      m.mound(s*12,-.05,-6,9+ice*4,4.4+4*ice,10,snow,s+2);
    }
    m.box(0,2.94,-2,12.6,5.88,7,masonry(),3.9);
    m.box(0,6,-2,13.3,.5,7.4,steel);
    m.mound(-1.5,6.21,-2.1,6.8,.48+ice*.6,3.7,snow);
    door(m,-.8,1.65,5.2,4.25);
    m.box(3.85,2.9,1.58,2.7,5.8,.32,red);
    m.box(3.85,3.38,1.78,2.18,.95,.12,stencil("07","#824733"),0);
    luminaire(m,-.8,4.84,2.14,p.lightsOn);
    for(const x of [-4.6,5.7]){
      m.pipe([x,0,2],[x,6.85,2],.15,steel);
      m.pipe([x,6.85,2],[x,6.85,.7],.15,steel);
    }
    for(let i=0;i<16*ice;i++){
      const x=-6.2+i*.8;
      m.add(new THREE.ConeGeometry(.12,.54+(i%3)*.18,6).rotateZ(Math.PI).translate(x,5.86,1.66),glacier);
    }
    for(let i=0;i<3;i++)m.box(-2+i*1.36,6.98,-3,.95,1.24,.94,painted("#58808c","rib"));
    for(const x of [-5.5,4.7])for(let z=4;z<15;z+=4){
      m.box(x,.72,z,.24,1.45,.24,painted("#db9d4d","stripe"),1.2);
    }
    // Meteorological mast, ceramic insulators and an enclosed service stair on the exposed flank.
    const mx=-5.35,mz=-.6;
    for(let j=0;j<7;j++)m.pipe([mx,6.25+j*.78,mz],[mx,7.03+j*.78,mz],.13,j%2?red:steel);
    m.pipe([mx-1.25,10.35,mz],[mx+1.25,10.35,mz],.075,steel);
    for(const x of [mx-1,mx+1])m.pipe([x,9.97,mz],[x,10.77,mz],.08,red);
    for(const x of [-6.1,-4.6])m.beam([mx,10,mz],[x,6.2,1],.046,steel);
    for(const s of [-1,1]){
      for(let i=0;i<5;i++){
        const x=s*(3.6+.52*i),z=3.3+i*.82;
        m.box(x,.39,z,1.1,.8,1.3,masonry(),1.15);
        m.mound(x,.75,z,.64,.19+.12*ice,.79,snow,i);
      }
    }
    for(let i=0;i<24;i++){
      const s=i%2?1:-1,z=3.8+(i%12)*1.72,x=s*(2.1+.32*((i*7)%11));
      m.mound(x,.003,z,.25+.18*(i%4),.045+.029*(i%4),.37+.12*(i%5),i%4===0?glacier:snow,i);
    }
    // Two packed tracks continue into the snow, centred on the heavy door.
    for(const x of [-1.88,.23])for(let z=2.8;z<31;z+=.75)m.box(x,.009,z,.51,.015,.35,painted("#b1c5ce","snow"),1);
    return m.finish({wide:camera([11,2.65,28],[-.4,3,-1],53),medium:camera([3.8,1.48,13.5],[-1,2.75,1],49),close:camera([2,1.45,8.8],[-.1,1.72,4],40)});
  }
  const liner=painted("#839c9d","plate"),floor=painted("#9aa7a1","road"),pipe=painted("#b76c46");
  m.box(0,-.21,-14,10,.53,60,floor,3.3);
  // A continuous barrel vault with independent ribs and recessed service strips.
  for(let i=0;i<14;i++){
    const a=i*Math.PI/14,b=(i+1)*Math.PI/14;
    const x1=4.8*Math.cos(a),y1=1.05+4.65*Math.sin(a),x2=4.8*Math.cos(b),y2=1.05+4.65*Math.sin(b);
    m.beam([x1,y1,-14],[x2,y2,-14],.29,liner,60);
    for(let z=-42;z<=15;z+=3.4)m.beam([x1*.974,y1-.06,z],[x2*.974,y2-.06,z],.27,steel,.31);
  }
  for(const s of [-1,1]){
    m.box(s*4.77,.66,-14,.27,1.32,60,liner);
    m.box(s*3.65,.16,-14,1.62,.28,60,painted("#627877","rib"),2);
    m.box(s*2.89,.30,-14,.13,.04,60,painted("#ddbb6b"));
    for(const y of [1.53,2.08])m.pipe([s*4.37,y,15],[s*4.37,y,-43],.17,pipe);
    for(let z=-42;z<15;z+=3.4){
      for(const y of [1.53,2.08])m.pipe([s*4.37,y,z],[s*4.37,y,z+.16],.22,steel);
      m.box(s*3.66,3.92,z,.67,.12,.19,steel);
    }
    for(let i=0;i<4;i++)m.pipe([s*(3.35+i*.12),4.01,15],[s*(3.35+i*.12),4.01,-43],.064,painted("#565c68"));
    for(let i=0;i<ice*19;i++)m.mound(s*(4.18+.34*Math.sin(i)),.33,12-i*3.2,.52+ice*.25,.3+(i%4)*.18,1.3,glacier,i);
  }
  for(let z=11;z>-42;z-=6.8){
    luminaire(m,0,5.3,z,p.lightsOn);
    if(p.lightsOn){
      const glow=new THREE.PointLight("#ffcb87",32,11,2);glow.position.set(0,4.85,z);m.group.add(glow);
    }
  }
  // Slotted drainage grates, inspection covers and freeze-thaw deposits interrupt the long floor.
  for(let z=-39;z<14;z+=5.1){
    m.box(0,.061,z,5.72,.012,.039,steel,1.4);
    for(const s of [-1,1]){
      m.box(s*2.65,.065,z,.38,.026,1.55,steel,1.2);
      for(let j=0;j<7;j++)m.box(s*2.65,.083,z-.63+j*.2,.28,.014,.064,painted("#384d56"),.7);
    }
  }
  for(const s of [-1,1])for(let i=0;i<20*ice;i++){
    const z=9.6-i*2.9,y=2.7+(i%4)*.22,x=s*Math.sqrt(1-((y-1.05)/4.65)**2)*4.69;
    m.add(new THREE.ConeGeometry(.082+(i%3)*.037,.35+ice*(i%4)*.21,7).rotateZ(Math.PI).translate(x,y-.19,z),glacier);
  }
  m.box(0,2.8,-43,10,5.6,.4,masonry());door(m,0,-42.7,3.25,3.1);
  for(const z of [-28,-7,4]){
    m.box(-3.98,2.85,z,.35,1.18,1.05,red);
    m.box(-3.96,2.8,z+.55,.36,.34,.035,stencil("7","#95543c"),0);
  }
  const g=m.finish({wide:camera([.65,1.9,14],[-.25,2.45,-14],62),medium:camera([1.6,1.48,6],[-.8,2.32,-17],52),close:camera([1.3,1.4,.5],[1.1,1.2,-2],38)});
  g.cameras.aerial=camera([.7,4.35,12],[0,1.25,-9],64);
  // Use ordinary Lambert on the interior so the practical lamps light the lining.
  g.traverse(obj=>{if(obj instanceof THREE.Mesh && obj.material instanceof THREE.MeshLambertMaterial && obj.material.emissiveIntensity===1){
    const original=obj.material;obj.material=new THREE.MeshLambertMaterial({map:original.map,color:original.color});
  }});
  return g;
}
