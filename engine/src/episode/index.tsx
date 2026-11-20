import React,{useEffect,useMemo} from "react";
import * as THREE from "three";
import {AbsoluteFill,Audio,Composition,registerRoot,staticFile,useCurrentFrame,useVideoConfig} from "remotion";
import {ThreeCanvas} from "@remotion/three";
import {useThree} from "@react-three/fiber";
import {EffectComposer} from "@react-three/postprocessing";
import {ToneMappingEffect,ToneMappingMode} from "postprocessing";
import {InkPass} from "../videos/dubai3d/ink";
import {LensBlur} from "../videos/dubai3d/lensblur";
import {GradeEffect,GRADES,GRADE_STRENGTH} from "../videos/dubai3d/grade";
import {setStage} from "../sandboxes/kit_gallery/stage";
import {scenery} from "./registry";
import {dress} from "./dress";
import {animateArchitect} from "./host";
import {caption,Graphic,Inset} from "./overlay";
import {Episode,Shot} from "./types";

function World({shot,age,frame,amp}:{shot:Shot;age:number;frame:number;amp:number}){
  const {scene,camera}=useThree(),cam=camera as THREE.PerspectiveCamera;
  const state=useMemo(()=>{
    const {group,feet,place}=scenery(shot),view=group.cameras[shot.camera];
    dress(group,feet,view.pos,shot.params,["construction","bunker","ghostcity","ship"].includes(shot.kit));
    const stage=setStage(scene,cam,view,feet,shot.light,shot.camera==="wide",place);
    if(place==="dubai"&&scene.fog instanceof THREE.Fog){
      scene.fog.near=120;scene.fog.far=950;
    }
    if(shot.params.weather==="haze"&&scene.fog instanceof THREE.Fog){
      scene.fog.near*=.65;scene.fog.far*=.64;
    }
    if(shot.params.weather==="overcast"){
      stage.traverse(o=>{if(o instanceof THREE.DirectionalLight)o.intensity*=.56;});
    }
    const actor=stage.children[stage.children.length-1],card=actor.children[0] as THREE.Mesh<THREE.PlaneGeometry,THREE.MeshLambertMaterial>;
    const host=animateArchitect(card),look=new THREE.Vector3(...view.look),eye=new THREE.Vector3(...view.pos);
    const right=new THREE.Vector3().setFromMatrixColumn(cam.matrixWorld,0);
    return {group,stage,actor,card,host,view,look,eye,right,feet};
  },[shot,cam,scene]);
  const fx=useMemo(()=>({ink:new InkPass(scene,cam),lens:new LensBlur({maxCoC:13,nearScale:1}),
    tone:new ToneMappingEffect({mode:ToneMappingMode.NEUTRAL}),grade:new GradeEffect(GRADES[shot.light],GRADE_STRENGTH[shot.light])}),[cam,scene,shot.light]);
  const {group,stage,actor,card,host,view,look,eye,right,feet}=state;
  const u=age/(shot.end-shot.start),whip=shot.transition==="whip"?Math.pow(Math.max(0,1-age/.24),3):0;
  const impact=shot.beat==="rehook"?Math.exp(-age*7)*Math.sin(age*15)*Math.min(1,age*6):0;
  const move=shot.direction?.move??"push-in", eased=u*u*(3-2*u),distance=eye.distanceTo(look);
  const travel=.007*u+.037*eased;
  cam.position.copy(eye).lerp(look,move==="pull-back"?-travel:travel);
  if(move==="truck")cam.position.addScaledVector(right,distance*(eased-.5)*.11);
  if(move==="orbit")cam.position.sub(look).applyAxisAngle(new THREE.Vector3(0,1,0),(eased-.5)*.16).add(look);
  if(move==="crane")cam.position.y+=distance*travel*1.4;
  cam.position.addScaledVector(right,impact*.10);
  const target=look.clone().addScaledVector(right,whip*distance*.38);
  if(move==="tilt")target.y+=distance*(eased-.5)*.05;
  cam.lookAt(target);cam.fov=view.fov-impact*.9;cam.updateProjectionMatrix();cam.updateMatrixWorld();
  const walk=shot.action==="walk-in"?Math.pow(1-Math.min(1,age/.95),2):0;
  actor.position.set(...feet).addScaledVector(right,-walk*1.25);card.rotation.y=Math.atan2(cam.position.x-actor.position.x,cam.position.z-actor.position.z);
  host.draw(shot,age,frame,amp);fx.lens.focus=Math.max(.5,new THREE.Vector3(...feet).add(new THREE.Vector3(0,1.45,0)).sub(cam.position).dot(cam.getWorldDirection(new THREE.Vector3())));
  if(shot.kit==="dubai")fx.lens.focus=cam.position.distanceTo(look);
  fx.lens.cInf=shot.camera==="wide"||shot.camera==="aerial"?1.6:4.1;
  useEffect(()=>()=>{state.host.dispose();for(const root of [state.group,state.stage])root.traverse(o=>{if(o instanceof THREE.Mesh)o.geometry.dispose();});},[state]);
  useEffect(()=>()=>{fx.ink.dispose();fx.lens.dispose();fx.grade.dispose();fx.tone.dispose();},[fx]);
  return <><primitive object={group} dispose={null}/><primitive object={stage} dispose={null}/>
    <EffectComposer multisampling={2}><primitive object={fx.ink}/><primitive object={fx.lens.pre}/><primitive object={fx.lens.main}/><primitive object={fx.tone}/><primitive object={fx.grade}/></EffectComposer></>;
}
function Film(data:Episode){
  const f=useCurrentFrame(),{fps}=useVideoConfig(),time=f/fps;
  const shot=data.shots.find(s=>time>=s.start&&time<s.end)??data.shots[data.shots.length-1];
  if(!shot)return <AbsoluteFill style={{background:"#26343b"}}/>;
  const age=Math.max(0,time-shot.start);
  const word=caption(data.words,time);
  return <AbsoluteFill style={{background:"#aabac8"}}>
    <ThreeCanvas width={1920} height={1080} shadows camera={{near:.18,far:1400}} gl={{antialias:false,stencil:false,powerPreference:"high-performance"}}>
      <World shot={shot} age={age} frame={f} amp={data.rms[f]??0}/>
    </ThreeCanvas>
    {shot.overlay&&<Graphic item={shot.overlay} age={age}/>}
    {typeof shot.params.inset==="string"&&age>=Number(shot.params.insetAt??0)&&<Inset kind={shot.params.inset} age={age-Number(shot.params.insetAt??0)}/>}
    {word&&<div style={{position:"absolute",bottom:55,alignSelf:"center",font:"bold 55px Arial",color:"#fff2d6",WebkitTextStroke:"6px #262235",paintOrder:"stroke fill",textShadow:"2px 4px 1px #292238"}}>{word}</div>}
    <Audio src={staticFile("master.wav")}/>
  </AbsoluteFill>;
}
const empty:Episode={shots:[],words:[],rms:[],duration:1};
const Root=()=> <Composition id="Episode" component={Film} defaultProps={empty} fps={24} width={1920} height={1080} durationInFrames={24}
 calculateMetadata={({props})=>({durationInFrames:Math.max(1,Math.ceil(props.duration*24))})}/>;
registerRoot(Root);
