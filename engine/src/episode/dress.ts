import * as THREE from "three";
import {ctex} from "../videos/bridge/paint";
import {Model, painted, Point} from "../kit/shared";
import {stencil} from "../kit/markings";
import {buildProp,gagIds,GagId} from "../kit/props";

export function dress(scene:THREE.Group,feet:Point,eye:Point,p:Record<string,unknown>,legacy:boolean){
  const crowd=Math.min(6,Math.max(0,Number(p.crowd)||0)),wear=Math.min(1,Math.max(0,Number(p.damage)||0));
  // A gag prop stands beside the host and turns to the lens; it is the must-show object of the beat.
  if(typeof p.gag==="string"&&(gagIds as readonly string[]).includes(p.gag)){
    const prop=buildProp(p.gag as GagId),big=p.gag==="supercar"||p.gag==="mirror-wall";
    const side=Number(p.gagSide)||-1;
    const gap=Math.max(2.3,Math.min(6,Math.hypot(eye[0]-feet[0],eye[2]-feet[2])*.2))*(big?1.5:1);
    prop.position.set(feet[0]+side*gap,feet[1],feet[2]-.6);
    prop.rotation.y=Math.atan2(eye[0]-prop.position.x,eye[2]-prop.position.z);
    scene.add(prop);
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
  if(crowd){
    const tex=ctex("episode-bystander",192,384,g=>{
      g.clearRect(0,0,192,384);g.strokeStyle="#363945";g.lineCap="round";g.lineWidth=9;
      g.beginPath();g.moveTo(82,220);g.lineTo(71,370);g.moveTo(103,220);g.lineTo(113,370);g.stroke();
      g.beginPath();g.ellipse(94,170,42,76,0,0,Math.PI*2);g.fillStyle="#607d85";g.fill();g.stroke();
      g.beginPath();g.ellipse(95,78,48,52,0,0,Math.PI*2);g.fillStyle="#c99b78";g.fill();g.stroke();
      for(const x of [81,106]){g.beginPath();g.arc(x,73,4,0,Math.PI*2);g.fillStyle="#3b3a3b";g.fill();}
      g.beginPath();g.moveTo(81,98);g.lineTo(109,98);g.stroke();
    });
    const coat=new THREE.MeshLambertMaterial({map:tex,side:THREE.DoubleSide,alphaTest:.4});
    for(let i=0;i<crowd;i++){const person=new THREE.Mesh(new THREE.PlaneGeometry(.86,1.8),coat);
      person.position.set(-2.5+(i%3)*1.05,.91,-2-Math.floor(i/3)*1.3);person.castShadow=true;dressing.group.add(person);}
  }
  const group=dressing.assemble();
  group.position.set(feet[0]-2.8,feet[1],feet[2]-2);
  group.rotation.y=Math.atan2(eye[0]-group.position.x,eye[2]-group.position.z);
  scene.add(group);
}

