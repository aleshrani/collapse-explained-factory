import * as THREE from "three";
import {camera, Model, painted, wood, Point} from "./shared";
import {stencil} from "./markings";

export type RoomParams={subject?:string;detail?:string;size?:number;state?:string};
export function shell(m:Model,width:number){
  const floor=wood(),plaster=painted("#c8bda5","plate"),trim=painted("#697674"),glass=painted("#789a9e","glass");
  m.box(0,-.12,0,width,.23,14,floor,2.1);
  m.box(0,3.65,-6.7,width,7.3,.32,plaster);
  for(const side of [-1,1]){
    m.box(side*(width/2-.12),3.65,-.4,.24,7.3,12.5,plaster);
    m.box(side*(width/2-.27),.47,-.4,.13,.9,12.42,floor);
  }
  m.box(0,.5,-6.45,width,1,.12,floor);
  for(let x=-width/2+1.9;x<width/2-.7;x+=3.75){
    m.box(x,4.4,-6.43,2.75,3.45,.17,glass);
    m.box(x,4.4,-6.29,.105,3.53,.1,trim);
    m.box(x,4.6,-6.29,2.85,.105,.1,trim);
    m.box(x,2.59,-6.23,3.05,.16,.51,plaster);
    for(let j=0;j<3;j++)m.box(x,6.1-j*.16,-6.16,2.95,.085,.34,floor);
  }
}
export function table(m:Model,x:number,z:number,w:number,d:number,y=1.05){
  m.box(x,y,z,w,.16,d,wood());
  for(const a of [-1,1])for(const b of [-1,1])m.box(x+a*(w*.43),y/2,z+b*d*.39,.16,y,.16,painted("#637272"));
}
export function sign(m:Model,x:number,y:number,z:number,w:number,h:number,text:string,base="#426e72"){
  const frame=painted("#695e50");m.box(x,y,z-.045,w+.13,h+.13,.13,frame);
  const p=new THREE.Mesh(new THREE.PlaneGeometry(w,h),stencil(text,base));p.position.set(x,y,z+.045);m.group.add(p);
}
export function paper(m:Model,x:number,y:number,z:number,col="#e6dbc0"){
  const p=painted(col);m.box(x,y,z,1.13,.035,.78,p);
  for(let j=0;j<4;j++)m.box(x-.04,y+.023,z-.17+j*.104,j%2?.7:.87,.008,.018,painted("#807c71"));
}
export function finish(m:Model,target:Point,place:string){
  const [x,y,z]=target;
  return {group:m.finish({wide:camera([x+4.1,y+2.2,z+8.1],target,48),medium:camera([x-2.4,y+1.45,z+5.5],target,46),close:camera([x+.95,y+.9,z+3.9],target,41)}),feet:[x+2.15,0,z+1.25] as Point,place};
}

