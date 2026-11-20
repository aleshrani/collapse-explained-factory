import * as THREE from "three";
import { ARCH_PRESETS, drawScientist, Pose } from "../videos/dubai3d/scientist";
import { Pen } from "../videos/dubai3d/toon";
import { Shot } from "./types";
export function animateArchitect(card:THREE.Mesh<THREE.PlaneGeometry,THREE.MeshLambertMaterial>){
  const canvas=document.createElement("canvas");canvas.width=600;canvas.height=1000;
  const g=canvas.getContext("2d")!,map=new THREE.CanvasTexture(canvas);map.colorSpace=THREE.SRGBColorSpace;
  const pen=new Pen(g);card.material.map=map;(card.customDepthMaterial as THREE.MeshDepthMaterial).map=map;
  return {dispose:()=>map.dispose(),draw(shot:Shot,t:number,frame:number,rms:number){
    const face=ARCH_PRESETS[shot.expression],idle=ARCH_PRESETS.neutral,walk=Math.min(1,t/.95);
    const arms=shot.action==="facepalm"?ARCH_PRESETS.facepalm:shot.action==="shocked-jump"?ARCH_PRESETS.shocked:shot.action==="laugh"?ARCH_PRESETS.laughing:
      shot.action==="explain"||shot.action==="point"?ARCH_PRESETS.explaining:idle;
    const pose:Pose={...face,armL:arms.armL,armR:arms.armR,eyes:{...face.eyes,blink:Math.max(0,1-Math.abs(frame%83-40)/2.5)},
      head:{...face.head,tilt:(face.head?.tilt??0)+2.4*Math.sin(t*3.4),nod:(face.head?.nod??0)+.6*Math.sin(t*5)}};
    if(shot.action==="shrug"){pose.armL={target:[145,475],hand:"open"};pose.armR={target:[458,473],hand:"open"};pose.brows={raise:[4,7]};}
    if(shot.action==="explain")pose.armR={target:[465,486+25*Math.sin(t*3)],hand:"open"};
    if(shot.action==="walk-in"&&walk<1){
      const step=Math.sin(walk*Math.PI*4);pose.footL=[248+step*23,974-Math.max(0,step)*30];pose.footR=[349-step*23,974+Math.min(0,step)*30];
    }
    if(rms>.045)pose.mouth=rms>.48?"A":rms>.23?(frame%7<4?"E":"O"):"FV";
    card.position.y=shot.action==="shocked-jump"?.41*Math.sin(Math.PI*Math.min(1,t/.52)):shot.action==="laugh"?.047*Math.abs(Math.sin(t*12)):0;
    g.clearRect(0,0,600,1000);drawScientist(pen,pose,{look:"architect",glasses:true,hat:"white"});map.needsUpdate=true;
  }};
}
