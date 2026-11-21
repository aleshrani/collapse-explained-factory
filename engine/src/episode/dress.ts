import * as THREE from "three";
import {animate} from "../kit/motion";
import {bandFor,BODY,firstHit,freeRun,HEIGHT,issue,Ob,relocate} from "../kit/collide";
import {ctex} from "../videos/bridge/paint";
import {Model, painted, Point} from "../kit/shared";
import {stencil} from "../kit/markings";
import {buildProp,gagIds,GagId} from "../kit/props";
import {animatePerson,extraCard,Person} from "../kit/extras";

export function dress(scene:THREE.Group,feet:Point,eye:Point,p:Record<string,unknown>,legacy:boolean){
  const crowd=Math.min(6,Math.max(0,Number(p.crowd)||0)),wear=Math.min(1,Math.max(0,Number(p.damage)||0));
  // other people: same card rig as the host, turned to the lens. Nobody passes through anything: standing people must not overlap built
  // objects (seated ones sit behind their furniture), walkers pace only as far as the free space allows, and every person is an obstacle
  // for everyone else (a walker's whole sweep counts).
  const solids=(scene.userData.obstacles??[]) as Ob[],people:Ob[]=[{x0:feet[0]-BODY,x1:feet[0]+BODY,z0:feet[2]-BODY,z1:feet[2]+BODY,y0:feet[1],y1:feet[1]+HEIGHT,tag:"the host"}];
  const crowdPeople:Person[]=Array.from({length:crowd},(_,i)=>({x:feet[0]-2.5+(i%3)*1.05,y:feet[1],z:feet[2]-2-Math.floor(i/3)*1.3,variant:i+2,scale:.95}));
  for(const person of [...((scene.userData.people??[]) as Person[]),...crowdPeople]){
    const g=person.y??0,all0=[...solids,...people];
    if(!person.seated){   // a standing person who would start inside furniture or another person steps to the nearest free spot
      const spot=relocate(all0,person.x,person.z,g);
      if(!spot)issue(scene,`person (variant ${person.variant}) at x=${person.x} z=${person.z} has no free spot within 3.5 m`);
      else{person.x=spot[0];person.z=spot[1];}
    }
    const card=extraCard(person.variant,person.scale??1);card.position.set(person.x,g,person.z);
    card.rotation.y=Math.atan2(eye[0]-person.x,eye[2]-person.z);scene.add(card);card.userData.scale=person.scale??1;((scene.userData.cards??=[]) as THREE.Mesh[]).push(card);animatePerson(scene,card,card.position.y,person.variant*3+person.x);
    const [y0,y1]=bandFor(g),all=[...solids,...people];
    if(!person.seated){
      const o=firstHit(all,person.x,person.z,BODY,y0,y1);
      if(o)issue(scene,`person (variant ${person.variant}) at x=${person.x} z=${person.z} stands inside ${o.tag??"an object"} (${o.x0.toFixed(1)}..${o.x1.toFixed(1)}, ${o.z0.toFixed(1)}..${o.z1.toFixed(1)})`);
    }
    let reach=0;
    if(person.walk){
      const w=person.walk,card0=card.position.x;
      reach=Math.min(w.dx,freeRun(all,person.x,person.z,1,0,g,w.dx),freeRun(all,person.x,person.z,-1,0,g,w.dx));
      if(reach>.3)animate(scene,t=>{card.position.x=card0+reach*Math.sin(t/w.period*Math.PI*2+person.variant);});
    }
    if(person.carry){   // a stack of papers carried in front of the body
      const sc=person.scale??1,stack=new THREE.Mesh(new THREE.BoxGeometry(.36*sc,.07*sc,.27*sc),painted("#efe7d2"));scene.add(stack);
      animate(scene,()=>{const r=card.rotation.y;stack.position.set(card.position.x+Math.cos(r)*.3*sc+Math.sin(r)*.12,card.position.y+.92*sc,card.position.z-Math.sin(r)*.3*sc+Math.cos(r)*.12);stack.rotation.y=r;});
    }
    people.push({x0:person.x-reach-BODY,x1:person.x+reach+BODY,z0:person.z-BODY,z1:person.z+BODY,y0:g,y1:g+HEIGHT,tag:"a person (variant "+person.variant+")"});
  }
  scene.userData.people_ob=people;
  // A gag prop stands beside the host and turns to the lens; it is the must-show object of the beat.
  if(typeof p.gag==="string"&&(gagIds as readonly string[]).includes(p.gag)){
    const prop=buildProp(p.gag as GagId),big=p.gag==="supercar"||p.gag==="mirror-wall";
    const side=Number(p.gagSide)||-1;
    const gap=Math.max(2.3,Math.min(6,Math.hypot(eye[0]-feet[0],eye[2]-feet[2])*.2))*(big?1.5:1);
    prop.position.set(feet[0]+side*gap,feet[1],feet[2]-.6);
    prop.rotation.y=Math.atan2(eye[0]-prop.position.x,eye[2]-prop.position.z);
    scene.add(prop);
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

