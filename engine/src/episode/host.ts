import * as THREE from "three";
import { ARCH_PRESETS, drawScientist, Pose } from "../videos/dubai3d/scientist";
import { Pen } from "../videos/dubai3d/toon";
import { Shot } from "./types";
export function animateArchitect(card:THREE.Mesh<THREE.PlaneGeometry,THREE.MeshLambertMaterial>){
  const canvas=document.createElement("canvas");canvas.width=600;canvas.height=1000;
  const g=canvas.getContext("2d")!,map=new THREE.CanvasTexture(canvas);map.colorSpace=THREE.SRGBColorSpace;
  const pen=new Pen(g);card.material.map=map;(card.customDepthMaterial as THREE.MeshDepthMaterial).map=map;
  return {dispose:()=>map.dispose(),draw(shot:Shot,t:number,frame:number,rms:number,mv:{stride:boolean;side:number;phase?:number}={stride:false,side:1,phase:0}){
    const face=ARCH_PRESETS[shot.expression],idle=ARCH_PRESETS.neutral;
    const arms=shot.action==="facepalm"?ARCH_PRESETS.facepalm:shot.action==="shocked-jump"?ARCH_PRESETS.shocked:shot.action==="laugh"?ARCH_PRESETS.laughing:
      shot.action==="explain"||shot.action==="point"?ARCH_PRESETS.explaining:idle;
    const pose:Pose={...face,armL:arms.armL,armR:arms.armR,eyes:{...face.eyes,blink:Math.max(0,1-Math.abs(frame%83-40)/2.5)},
      head:{...face.head,tilt:(face.head?.tilt??0)+2.4*Math.sin(t*3.4),nod:(face.head?.nod??0)+.6*Math.sin(t*5)}};
    if(shot.action==="shrug"){pose.armL={target:[145,475],hand:"open"};pose.armR={target:[458,473],hand:"open"};pose.brows={raise:[4,7]};}
    if(shot.action==="explain")pose.armR={target:[465,486+25*Math.sin(t*3)],hand:"open"};
    // walking (entrance or pacing): foot steps, torso lean into the stride
    if(mv.stride){
      const step=Math.sin(mv.phase??0);pose.footL=[248+step*23,974-Math.max(0,step)*30];pose.footR=[349-step*23,974+Math.min(0,step)*30];
      pose.armL={target:[205-step*18,585],hand:"relaxed"};if(shot.action==="stand"||shot.action==="walk-in")pose.armR={target:[430+step*18,585],hand:"relaxed"};
    }
    // reach toward the discussed object: the arm on its side points at it, the body leans in and the head turns
    const toward=mv.side>0;
    if(shot.action==="point"){
      const a={target:[toward?515:85,350+14*Math.sin(t*2.4)] as [number,number],hand:"point" as const};
      if(toward)pose.armR=a;else pose.armL=a;
      pose.lean=mv.side*6+1.5*Math.sin(t*1.4);pose.head={...pose.head,turn:mv.side*.35};
    }
    if(shot.action==="explain"){
      const a={target:[toward?490:110,470+30*Math.sin(t*3)] as [number,number],hand:"open" as const};
      if(toward)pose.armR=a;else pose.armL=a;pose.lean=mv.side*3;
    }
    if(shot.action==="stand"&&!mv.stride){ // idle is never frozen: breathing, small hand gestures, shifting weight
      pose.lean=2*Math.sin(t*1.1);
      const g=Math.floor(t/1.3+(shot.start*3)%3)%3;
      if(g===1)pose.armR={target:[430,520+16*Math.sin(t*5)],hand:"open"};
      if(g===2)pose.armL={target:[170,520+16*Math.sin(t*5)],hand:"open"};
    }
    if(shot.action==="thumbs-up"){pose.armR={target:[470,410],hand:"fist"};pose.mouth="grin";}
    if(shot.action==="count-fingers"){pose.armR={target:[430,462+16*Math.sin(t*6)],hand:"open"};pose.armL={target:[205,560],hand:"open"};}
    if(shot.action==="cover-eyes"){
      const eye=ARCH_PRESETS.shocked.armL!.target[1]-58;
      pose.armL={target:[258,eye],hand:"palm"};pose.armR={target:[342,eye],hand:"palm"};pose.eyes={...face.eyes,shape:"closed"};
    }
    // real speech levels (median .37, loud passages cap at 1): open wide on the loud syllables, alternate E/O in the middle, a small O/FV when soft, closed in pauses
    if(rms>.06)pose.mouth=rms>.5?(frame%4<2?"A":"E"):rms>.22?(frame%6<3?"E":"O"):(frame%5<3?"O":"FV");
    const hop=shot.beat==="rehook"&&t<.45?.06*Math.sin(Math.PI*t/.45):0,stepY=mv.stride?.045*Math.abs(Math.sin(mv.phase??0)):0;
    card.position.y=hop+stepY+(shot.action==="sit"?-.5:shot.action==="shocked-jump"?.09*Math.sin(Math.PI*Math.min(1,t/.4)):shot.action==="laugh"?.047*Math.abs(Math.sin(t*12)):0);
    g.clearRect(0,0,600,1000);drawScientist(pen,pose,{look:"architect",glasses:true,hat:"white"});map.needsUpdate=true;
  }};
}
