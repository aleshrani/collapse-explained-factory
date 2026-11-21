import * as THREE from "three";
import {animate} from "../kit/motion";
import {bandFor,BODY,firstHit,freeRun,HEIGHT,issue,Ob,relocate} from "../kit/collide";
import {ctex} from "../videos/bridge/paint";
import {Model, painted, Point} from "../kit/shared";
import {stencil} from "../kit/markings";
import {buildProp,gagIds,GagId} from "../kit/props";
import {animatePerson,extraCard,Person,walkPerson} from "../kit/extras";

/** height of the solid surface under (x,z), searched from above y; undefined over open water or when nothing is there */
export function surfaceY(root:THREE.Object3D,x:number,y:number,z:number){
  const hit=new THREE.Raycaster(new THREE.Vector3(x,y+1.2,z),new THREE.Vector3(0,-1,0),0,30).intersectObject(root,true)[0];
  return hit&&!hit.object.userData.sea&&Math.abs(hit.point.y-y)<.8?hit.point.y:undefined;
}

/** where a gag prop stands (beside the host, turned to the lens) and how far it reaches, so framing can keep it in the picture */
/** is there solid ground (not open water) just under this point? */
export function landUnder(root:THREE.Object3D,x:number,y:number,z:number){
  const hit=new THREE.Raycaster(new THREE.Vector3(x,y+1.2,z),new THREE.Vector3(0,-1,0),0,30).intersectObject(root,true)[0];
  return !!hit&&!hit.object.userData.sea&&Math.abs(hit.point.y-y)<.7;
}
export function gagSpot(p:Record<string,unknown>,feet:Point,eye:Point,look:Point,obs:Ob[]=[],land:(x:number,y:number,z:number)=>boolean=()=>true):{pos:Point;r:number;rx:number;rz:number}|undefined{
  if(typeof p.gag!=="string"||!(gagIds as readonly string[]).includes(p.gag))return undefined;
  const big=p.gag==="supercar"||p.gag==="mirror-wall",pref=Number(p.gagSide)||-1;
  const gap=Math.max(2.2,Math.min(3,Math.hypot(eye[0]-feet[0],eye[2]-feet[2])*.1))*(big?1.4:1);   // close enough that host and prop fit one picture
  // beside him ALONG THE CAMERA'S RIGHT AXIS (not world x); the first spot that is on solid ground and clear of buildings wins:
  // preferred side, other side, then diagonally toward the camera, then straight toward / away from it
  // the sideways axis is perpendicular to the camera's optical axis (eye to look), so host and prop sit at the same depth and the same scale
  let fx=look[0]-eye[0],fz=look[2]-eye[2];const fl=Math.hypot(fx,fz)||1;fx/=fl;fz/=fl;const rx=-fz,rz=fx,r=big?2.4:1.8;
  const at=(lat:number,dep:number):Point=>[feet[0]+rx*lat*gap+fx*(.6+dep*gap),feet[1],feet[2]+rz*lat*gap+fz*(.6+dep*gap)];
  // badness of a spot: samples along the prop that touch a building (1) or have no solid ground (2); the least bad wins, ring order breaks ties
  const bad=(q:Point)=>[-1,-.5,0,.5,1].reduce((n,k)=>{const x=q[0]+rx*k*r*.8,z=q[2]+rz*k*r*.8;return n+(firstHit(obs,x,z,.6,q[1]+.2,q[1]+1.4)?1:0)+(land(x,q[1],z)?0:2);},0);
  const ring=Array.from({length:12},(_,k)=>k*Math.PI/6).sort((a,b)=>Math.abs(Math.atan2(Math.sin(a-(pref>0?0:Math.PI)),Math.cos(a-(pref>0?0:Math.PI))))-Math.abs(Math.atan2(Math.sin(b-(pref>0?0:Math.PI)),Math.cos(b-(pref>0?0:Math.PI)))));
  let pick=ring[0],best=1e9;for(const th of ring){const sc=bad(at(Math.cos(th),-Math.sin(th)))*.6+Math.abs(Math.sin(th))*3.5;if(sc<best){best=sc;pick=th;}}   // lateral spots keep host and prop side by side in the picture
  return {pos:at(Math.cos(pick),-Math.sin(pick)),r,rx,rz};
}
export function dress(scene:THREE.Group,feet:Point,eye:Point,p:Record<string,unknown>,legacy:boolean,look:Point=feet){
  const crowd=Math.min(6,Math.max(0,Number(p.crowd)||0)),wear=Math.min(1,Math.max(0,Number(p.damage)||0));
  // other people: same card rig as the host, turned to the lens. Nobody passes through anything: standing people must not overlap built
  // objects (seated ones sit behind their furniture), walkers pace only as far as the free space allows, and every person is an obstacle
  // for everyone else (a walker's whole sweep counts).
  const solids=(scene.userData.obstacles??[]) as Ob[],people:Ob[]=[{x0:feet[0]-BODY,x1:feet[0]+BODY,z0:feet[2]-BODY,z1:feet[2]+BODY,y0:feet[1],y1:feet[1]+HEIGHT,tag:"the host"}];
  const crowdPeople:Person[]=Array.from({length:crowd},(_,i)=>({x:feet[0]-2.5+(i%3)*1.05,y:feet[1],z:feet[2]-2-Math.floor(i/3)*1.3,variant:i+2,scale:.95}));
  for(const person of [...((scene.userData.people??[]) as Person[]),...crowdPeople]){
    let g=person.y??0;const all0=[...solids,...people];
    if(!person.seated){   // a standing person who would start inside furniture or another person steps to the nearest free spot
      const spot=relocate(all0,person.x,person.z,g);
      if(!spot)issue(scene,`person (variant ${person.variant}) at x=${person.x} z=${person.z} has no free spot within 3.5 m`);
      else{person.x=spot[0];person.z=spot[1];}
    }
    if(!person.seated){const sy=surfaceY(scene,person.x,g,person.z);if(sy!==undefined)g=sy;}   // feet exactly on the surface, above or below where the kit put him
    const card=extraCard(person.variant,person.scale??1);card.position.set(person.x,g,person.z);
    card.rotation.y=Math.atan2(eye[0]-person.x,eye[2]-person.z);scene.add(card);card.userData.scale=person.scale??1;((scene.userData.cards??=[]) as THREE.Mesh[]).push(card);if(!person.walk)animatePerson(scene,card,card.position.y,person.variant*3+person.x);
    const [y0,y1]=bandFor(g),all=[...solids,...people];
    if(!person.seated){
      const o=firstHit(all,person.x,person.z,BODY,y0,y1);
      if(o)issue(scene,`person (variant ${person.variant}) at x=${person.x} z=${person.z} stands inside ${o.tag??"an object"} (${o.x0.toFixed(1)}..${o.x1.toFixed(1)}, ${o.z0.toFixed(1)}..${o.z1.toFixed(1)})`);
    }
    let reach=0;
    if(person.walk){
      const w=person.walk,ang=(w.angle??0)*Math.PI/180,ux=Math.cos(ang),uz=Math.sin(ang),x0=card.position.x,z0=card.position.z;
      reach=Math.min(w.dx,freeRun(all,person.x,person.z,ux,uz,g,w.dx),freeRun(all,person.x,person.z,-ux,-uz,g,w.dx));
      if(reach>.3){
        const hs:number[]=[];for(let k=0;k<=8;k++){const s=-reach+reach*2*k/8,sy=surfaceY(scene,x0+ux*s,g,z0+uz*s);hs.push(sy??g);}
        const ground=(s:number)=>{const f=Math.max(0,Math.min(8,(s+reach)/(2*reach)*8)),i=Math.min(7,Math.floor(f));return hs[i]+(hs[i+1]-hs[i])*(f-i);};
        walkPerson(scene,card,x0,z0,w.angle??0,reach,ground,person.variant*3+person.x,!!w.pause);
      }else animatePerson(scene,card,card.position.y,person.variant*3+person.x);
    }
    if(person.carry){   // a stack of papers carried in front of the body
      const sc=person.scale??1,stack=new THREE.Mesh(new THREE.BoxGeometry(.32*sc,.03*sc,.23*sc),painted("#f6f1e2"));   // a few sheets, not a block (QUALITY-RULES 25)
scene.add(stack);
      animate(scene,()=>{stack.visible=card.visible&&card.parent!==null;const r=card.rotation.y;stack.position.set(card.position.x+Math.cos(r)*.3*sc+Math.sin(r)*.12,card.position.y+.92*sc,card.position.z-Math.sin(r)*.3*sc+Math.cos(r)*.12);stack.rotation.y=r;});
    }
    card.userData.reach=reach;card.userData.angle=person.walk?.angle??0;card.userData.baseY=g;card.userData.seated=!!person.seated;
    {const ang=(person.walk?.angle??0)*Math.PI/180,ux=Math.cos(ang),uz=Math.sin(ang),n=reach>.3?Math.max(2,Math.ceil(reach*2/.6)):1;   // the route as small boxes, not one big bounding box
      for(let k=0;k<n;k++){const sgm=n===1?0:-reach+reach*2*k/(n-1),cx=person.x+ux*sgm,cz=person.z+uz*sgm;people.push({x0:cx-BODY-.15,x1:cx+BODY+.15,z0:cz-BODY-.15,z1:cz+BODY+.15,y0:g,y1:g+HEIGHT,tag:"a person (variant "+person.variant+")"});}}
  }
  scene.userData.people_ob=people;
  // A gag prop stands beside the host and turns to the lens; it is the must-show object of the beat.
  if(typeof p.gag==="string"&&(gagIds as readonly string[]).includes(p.gag)){
    const prop=buildProp(p.gag as GagId),spot=gagSpot(p,feet,eye,look,solids,(x,y,z)=>landUnder(scene,x,y,z))!;
    prop.position.set(...spot.pos);
    prop.rotation.y=Math.atan2(eye[0]-prop.position.x,eye[2]-prop.position.z);
    scene.add(prop);
    // a prop never hangs over open water: where its footprint is not on solid ground, a little sand platform carries it
    const rxx=Math.sin(prop.rotation.y),rzz=Math.cos(prop.rotation.y);
    if([-1,-.5,0,.5,1].some(k=>!landUnder(scene,spot.pos[0]+rzz*k*spot.r*.8,spot.pos[1],spot.pos[2]-rxx*k*spot.r*.8))){
      const pad=new THREE.Mesh(new THREE.BoxGeometry(spot.r*2+.8,.5,2.2),painted("#e9dcbc","sand"));
      pad.position.set(spot.pos[0],spot.pos[1]-.27,spot.pos[2]);pad.rotation.y=prop.rotation.y;pad.receiveShadow=true;scene.add(pad);
    }
    const box=new THREE.Box3().setFromObject(prop);((scene.userData.obstacles??=[]) as Ob[]).push({x0:box.min.x,x1:box.max.x,z0:box.min.z,z1:box.max.z,y0:box.min.y,y1:box.max.y,tag:"the "+p.gag+" prop"});
  }
  if(!legacy&&!crowd&&!wear)return;
  const dressing=new Model(),panel=painted("#566968");
  if(legacy&&typeof p.subject==="string"&&typeof p.detail==="string"){
    for(const [i,word] of [p.subject,p.detail].entries()){
      const card=new THREE.Mesh(new THREE.PlaneGeometry(2.3,i?.34:.56),stencil(word,i?"#816d57":"#476d74"));
      card.position.set(0,i?.95:1.45,.06);dressing.group.add(card);
    }
    for(const x of [-1,1])dressing.pipe([x,0,0],[x,1.68,0],.045,panel);
  }
  for(let i=0;i<Math.round(wear*16);i++){
    const x=-1.1+(i*37%22)*.1,z=(i*29%16)*.14;
    dressing.mound(x,.004,z,.07+(i%3)*.045,.035,.09,painted("#88775e","earth"),i);
  }
  const group=dressing.assemble();
  group.position.set(feet[0]-2.8,feet[1],feet[2]-2);
  group.rotation.y=Math.atan2(eye[0]-group.position.x,eye[2]-group.position.z);
  scene.add(group);
}

