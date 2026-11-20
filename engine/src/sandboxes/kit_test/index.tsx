import React, { useEffect, useMemo } from "react";
import * as THREE from "three";
import { AbsoluteFill, Composition, registerRoot, useCurrentFrame } from "remotion";
import { ThreeCanvas } from "@remotion/three";
import { useThree } from "@react-three/fiber";
import { EffectComposer } from "@react-three/postprocessing";
import { BlendFunction, BloomEffect, ToneMappingEffect, ToneMappingMode } from "postprocessing";
import { InkPass } from "../../videos/bridge/ink";
import { LensBlur } from "../../videos/bridge/lensblur";
import { GradeEffect, GRADES, GRADE_STRENGTH } from "../../videos/bridge/grade";
import * as construction from "../../kit/oilrig_test";
import * as ghostcity from "../../kit/ghostcity";
import * as bunker from "../../kit/bunker";
import * as ship from "../../kit/ship";
import { setStage } from "./stage";
import schedule from "./shots.json";

const shots=schedule.places.flatMap(place=>schedule.shots.flatMap(shot=>schedule.lights.map(light=>({
  place,shot:shot as "wide"|"medium",light:light as "day"|"golden"
}))));
function World({place,shot,light}:typeof shots[number]){
  const {scene,camera}=useThree(), cam=camera as THREE.PerspectiveCamera;
  const {group,feet}=useMemo(()=>{
    const ctx={light};
    if(place==="entrance"||place==="tunnel")return {group:bunker.build({variant:place},ctx),feet:bunker.hosts[place][shot]};
    const kit=construction;
    return {group:kit.build({},ctx),feet:kit.hosts[shot]};
  },[place,shot,light]);
  const wide=shot==="wide";
  const rig=useMemo(()=>setStage(scene,cam,group.cameras[shot],feet,light,wide,place),[scene,cam,group,shot,feet,light,wide,place]);
  const fx=useMemo(()=>{
    const lens=new LensBlur({maxCoC:18,nearScale:1});
    lens.focus=new THREE.Vector3(...feet).add(new THREE.Vector3(0,1.2,0)).sub(cam.position).dot(cam.getWorldDirection(new THREE.Vector3()));
    lens.cInf=wide?2.1:7.6;
    return {ink:new InkPass(scene,cam),lens,bloom:new BloomEffect({blendFunction:BlendFunction.ADD,intensity:.28,luminanceThreshold:1,luminanceSmoothing:.2,mipmapBlur:true,levels:5,radius:.55}),
      tone:new ToneMappingEffect({mode:ToneMappingMode.NEUTRAL}),grade:new GradeEffect(GRADES[light],GRADE_STRENGTH[light])};
  },[cam,scene,rig,feet,light,wide]);
  useEffect(()=>()=>{fx.ink.dispose();fx.lens.dispose();fx.bloom.dispose();fx.tone.dispose();fx.grade.dispose();
    for(const root of [group,rig])root.traverse(o=>{if(o instanceof THREE.Mesh)o.geometry.dispose();});
  },[fx,group,rig]);
  return <><primitive object={group} dispose={null}/><primitive object={rig} dispose={null}/>
    <EffectComposer multisampling={4}>
      <primitive object={fx.ink}/><primitive object={fx.lens.pre}/><primitive object={fx.lens.main}/>
      <primitive object={fx.bloom}/><primitive object={fx.tone}/><primitive object={fx.grade}/>
    </EffectComposer></>;
}
export function KitGallery(){
  const shot=shots[Math.floor(useCurrentFrame()/schedule.hold)];
  return <AbsoluteFill><ThreeCanvas width={1080} height={1920} shadows camera={{near:.18,far:1400}}
    gl={{antialias:false,stencil:false,powerPreference:"high-performance",toneMappingExposure:1}}>
    <World {...shot}/></ThreeCanvas></AbsoluteFill>;
}
const Root=()=> <Composition id="KitGallery" component={KitGallery} durationInFrames={shots.length*schedule.hold} fps={24} width={1080} height={1920}/>;
registerRoot(Root);
