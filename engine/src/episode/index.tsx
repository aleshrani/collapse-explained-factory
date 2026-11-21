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
import type {Point} from "../kit/shared";
import {dress,gagSpot,landUnder} from "./dress";
import {runAnims} from "../kit/motion";
import {BODY,freeRun,issue,Ob,relocate,report,verifyTracks,firstHit,bandFor} from "../kit/collide";
import {animateArchitect} from "./host";
import {floatIssue,standIssues,supportIssues} from "./placement";
import {boxPoints,MAX_PITCH,occludes,textSurfaces,pitchOf,cameraAt,checkFraming,fitView,hideCutCards,rightOf,screenLimits} from "./framing";
import {caption,Graphic,HOLD,Inset} from "./overlay";
import {Episode,Shot} from "./types";

function World({shot:raw,age,frame,amp}:{shot:Shot;age:number;frame:number;amp:number}){
  const shot=raw;
  const {scene,camera}=useThree(),cam=camera as THREE.PerspectiveCamera;
  const state=useMemo(()=>{
    const {group,feet:feetDefault,place}=scenery(shot),view0=group.cameras[shot.camera],feet0=(group.userData.hostSpots?.[shot.camera]??feetDefault) as Point;
    // the host steps to the nearest free spot if the kit's default spot is inside furniture or beside a seated person
    const crowdOb=((group.userData.people??[]) as {x:number;y?:number;z:number}[]).map(q=>({x0:q.x-BODY,x1:q.x+BODY,z0:q.z-BODY,z1:q.z+BODY,y0:q.y??0,y1:(q.y??0)+2.1}));
    const solidsAll=()=>[...((group.userData.obstacles??[]) as Ob[]),...crowdOb];
    const spot=relocate(solidsAll(),feet0[0],feet0[2],feet0[1]);let feet:Point=spot?[spot[0],feet0[1],spot[1]]:feet0;
    // overview shots (aerial, whole-archipelago views) deliberately keep the host tiny or out of the plan; everything else is framed around him
    const subject=String(shot.params.subject??""),overview=shot.camera==="aerial"||(shot.kit==="dubai"&&["archipelago","coast","palm"].includes(subject));
    const allObs=(group.userData.obstacles??[]) as Ob[],obs=shot.kit==="dubai"?[]:allObs,keep=Number(group.userData.keep_subject??0);   // foreground cap is for rooms; outdoors the whole island is 'in front'
    const texts0=textSurfaces(group);   // board titles, signs, pages: the framing keeps them whole
    // the gag prop stands beside him along the final camera's right axis, so framing is two passes: host first, then host + prop
    const mustFor=(v:{pos:number[];look:number[]}):THREE.Vector3[]=>{const gs=gagSpot(shot.params,feet,v.pos as Point,(v as {look?:number[]}).look as Point,allObs,(x,y,z)=>landUnder(group,x,y,z));return gs?[-1,1].flatMap(sg=>[.35,1.2].map(y=>new THREE.Vector3(gs.pos[0]+gs.rx*sg*gs.r*1.08,gs.pos[1]+y,gs.pos[2]+gs.rz*sg*gs.r*1.08))):[];};
    let view=overview?view0:fitView(view0,shot,feet,obs,keep,[],texts0);
    let must=overview?[]:mustFor(view);
    if(must.length){view=fitView(view0,shot,feet,obs,keep,must,texts0);must=mustFor(view);}
    // when moving the camera is not enough (host far from where the camera looks), he walks toward the camera's target a quarter at a time
    for(let k=0;!overview&&k<5&&checkFraming(view,shot,()=>feet,obs,must,texts0).length;k++){
      const to=relocate(solidsAll(),feet[0]+(view0.look[0]-feet[0])*.25,feet[2]+(view0.look[2]-feet[2])*.25,feet[1]);
      if(!to)break;
      feet=[to[0],feet[1],to[1]];view=fitView(view0,shot,feet,obs,keep,[],texts0);must=mustFor(view);if(must.length){view=fitView(view0,shot,feet,obs,keep,must,texts0);must=mustFor(view);}
    }
    // nobody stands in front of text (board titles, signs, screens): the host steps sideways until nothing is hidden behind him
    const texts=textSurfaces(group);
    if(!overview&&texts.length&&occludes(view,shot,texts,[{pos:feet}])){
      const rt0=rightOf(new THREE.Vector3(...view.pos),new THREE.Vector3(...view.look));
      for(const off of [2,-2,3.5,-3.5,5,-5,7,-7]){
        const cand=relocate(solidsAll(),feet[0]+rt0.x*off,feet[2]+rt0.z*off,feet[1]);if(!cand)continue;
        const f2:Point=[cand[0],feet[1],cand[1]],v2=fitView(view0,shot,f2,obs,keep,must,texts0);
        if(!checkFraming(v2,shot,()=>f2,obs,must,texts0).length&&!occludes(v2,shot,texts,[{pos:f2}])){feet=f2;view=v2;break;}
      }
    }
    // the host stands ON something: cast a ray down from his feet and snap him to the surface; no surface, or one far away, is a FLOAT failure
    const ray=new THREE.Raycaster(new THREE.Vector3(feet[0],feet[1]+.3,feet[2]),new THREE.Vector3(0,-1,0),0,40);
    group.updateMatrixWorld(true);
    const under=ray.intersectObject(group,true)[0],drop=under?feet[1]-under.point.y:Infinity;
    if(under?.object.userData.sea)issue(group,"FLOAT the host would stand on the open water");
    else if(under&&drop>.05&&drop<.6)feet[1]=under.point.y;
    else if(!(under&&drop<=.05&&drop>=-.4))issue(group,under?`FLOAT the host's feet are ${drop.toFixed(2)} m ${drop>0?"above":"below"} the surface under him`:"FLOAT there is no surface under the host's feet");
    dress(group,feet,view.pos,shot.params,["construction","bunker","ghostcity","ship"].includes(shot.kit),view.look as Point);
    const label="t="+shot.start.toFixed(1)+" "+shot.kit+"/"+String(shot.params.subject||shot.params.station||shot.params.state||"")+" "+shot.camera;
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
    // a steep overview (more than 25 degrees down) would show the flat people cards lying on the ground: nobody is in the plan there
    if(overview&&[0,.5,1].some(u=>pitchOf(cameraAt(view,shot,u))>MAX_PITCH)){actor.visible=false;for(const c of (group.userData.cards??[]) as THREE.Mesh[])c.visible=false;}
    const host=animateArchitect(card),look=new THREE.Vector3(...view.look),eye=new THREE.Vector3(...view.pos);
    const right=rightOf(eye,look);
    // walking lines: the host paces along the camera's right axis, only as far as the free space and the frame allow
    const dx=right.x,dz=right.z,solids=[...((group.userData.obstacles??[]) as Ob[]),...((group.userData.people_ob??[]) as Ob[]).slice(1)];
    const [hy0,hy1]=bandFor(feet[1]),start=firstHit(solids,feet[0],feet[2],BODY,hy0,hy1);
    if(start)issue(group,`the host stands inside ${start.tag??"an object"} (${start.x0.toFixed(1)}..${start.x1.toFixed(1)}, ${start.z0.toFixed(1)}..${start.z1.toFixed(1)})`);
    const need=Math.min(5,Math.max(1.5,eye.distanceTo(look)*.09)),maxLen=need+Math.min(.55,need*.16)+.1;
    const lim={pos:freeRun(solids,feet[0],feet[2],dx,dz,feet[1],maxLen),neg:freeRun(solids,feet[0],feet[2],-dx,-dz,feet[1],maxLen)};
    if(!overview){const sl=screenLimits(view,shot,feet,dx,dz,maxLen);lim.pos=Math.min(lim.pos,sl.pos);lim.neg=Math.min(lim.neg,sl.neg);}
    if(!overview&&texts.length){
      for(const sg of [1,-1]){const key=sg>0?"pos":"neg";
        for(let s=.25;s<=lim[key];s+=.25)if(occludes(view,shot,texts,[{pos:[feet[0]+dx*s*sg,feet[1],feet[2]+dz*s*sg]}])){lim[key]=Math.max(0,s-.25);break;}
      }
      if(occludes(view,shot,texts,[{pos:feet}]))issue(group,"TEXT-WARN the host stands in front of text on a board, sign or screen");
    }
    // placement gates: signs stand on something, nobody stands on the road or the water, side characters have floor under their feet
    for(const t of supportIssues(group,(group.userData.obstacles??[]) as Ob[]))issue(group,t);
    for(const t of standIssues((group.userData.obstacles??[]) as Ob[],"the host",[[feet[0],feet[2]],[feet[0]-dx*lim.neg,feet[2]-dz*lim.neg],[feet[0]+dx*lim.pos,feet[2]+dz*lim.pos]]))issue(group,t);
    for(const cardX of (group.userData.cards??[]) as THREE.Mesh[]){
      if(cardX.userData.seated)continue;
      const r=Number(cardX.userData.reach??0),y=Number(cardX.userData.baseY??0);
      for(const o of [-r,0,r]){
        for(const t of standIssues((group.userData.obstacles??[]) as Ob[],"a side character",[[cardX.position.x+o,cardX.position.z]]))issue(group,t);
        for(const t of floatIssue(group,cardX.position.x+o,y,cardX.position.z,"a side character"))issue(group,t);
      }
    }
    // side characters never hide text either: one that would (anywhere on its walk) is taken out
    for(const cardX of (group.userData.cards??[]) as THREE.Mesh[]){
      const r=Number(cardX.userData.reach??0),sc=Number(cardX.userData.scale??1);
      if(occludes(view,shot,texts,[-r,0,r].map(o=>({pos:[cardX.position.x+o,cardX.position.y,cardX.position.z] as [number,number,number],scale:sc}))))cardX.visible=false;
    }
    const hostOb:Ob={x0:Math.min(feet[0]-dx*lim.neg,feet[0]+dx*lim.pos)-BODY,x1:Math.max(feet[0]-dx*lim.neg,feet[0]+dx*lim.pos)+BODY,z0:Math.min(feet[2]-dz*lim.neg,feet[2]+dz*lim.pos)-BODY,z1:Math.max(feet[2]-dz*lim.neg,feet[2]+dz*lim.pos)+BODY,y0:feet[1],y1:feet[1]+2.1,tag:"the host"};
    verifyTracks(group,[...solids,hostOb],shot.end-shot.start);
    // side characters are wholly inside the frame or hidden; the host's own framing is gated below, once his walk is known
    hideCutCards(view,shot,(group.userData.cards??[]) as THREE.Mesh[]);
    return {group,stage,actor,card,host,view,look,eye,right,feet,lim,dir:[dx,dz] as [number,number],overview,label,must,texts0};
  },[shot,cam,scene]);
  const fx=useMemo(()=>({ink:new InkPass(scene,cam),lens:new LensBlur({maxCoC:13,nearScale:1}),
    tone:new ToneMappingEffect({mode:ToneMappingMode.NEUTRAL}),grade:new GradeEffect(GRADES[shot.light],GRADE_STRENGTH[shot.light])}),[cam,scene,shot.light]);
  const {group,stage,actor,card,host,view,look,eye,right,feet,lim,dir,overview,label,must,texts0}=state;
  const u=age/(shot.end-shot.start),whip=shot.transition==="whip"?Math.pow(Math.max(0,1-age/.24),3):0;
  const impact=shot.beat==="rehook"?Math.exp(-age*7)*Math.sin(age*15)*Math.min(1,age*6):0;
  const distance=eye.distanceTo(look),c=cameraAt(view,shot,u,impact,whip);
  cam.position.copy(c.pos);cam.lookAt(c.target);cam.fov=c.fov;cam.updateProjectionMatrix();cam.updateMatrixWorld();
  // The host is never frozen: about half the shots start with a walk-in from the side, then he paces a little, and the arm on the
  // side of the discussed object points at it while he leans toward it.
  const special=["shocked-jump","facepalm","laugh","sit","cover-eyes"].includes(shot.action);
  const key=Math.abs(Math.floor(shot.start*131)),enter=shot.action==="walk-in"||(!special&&key%2===0);
  const reach=Math.min(5,Math.max(1.5,distance*.09)),dur=1.6,natural=key%4<2?-1:1,entrySide=(natural>0?lim.pos:lim.neg)>=Math.min(reach,1)?natural:-natural;
  const offRaw=(a:number)=>(enter?Math.pow(1-Math.min(1,a/dur),2)*reach*entrySide:0)+(special?0:Math.min(.55,reach*.16)*Math.sin(a*.8+shot.start)*Math.min(1,a/dur)),offAt=(a:number)=>Math.max(-lim.neg,Math.min(lim.pos,offRaw(a)));
  useMemo(()=>{
    const at=(a:number):[number,number,number]=>[feet[0]+dir[0]*offAt(a),feet[1],feet[2]+dir[1]*offAt(a)];
    if(!overview)for(const text of checkFraming(view,shot,at,shot.kit==="dubai"?[]:((group.userData.obstacles??[]) as Ob[]),must,texts0))issue(group,text);
    report(group,label);
  },[state]);
  const vel=(offAt(age+.04)-offAt(Math.max(0,age-.04)))/.08,stride=Math.abs(vel)>.22;
  actor.position.set(feet[0]+dir[0]*offAt(age),feet[1],feet[2]+dir[1]*offAt(age));card.rotation.y=Math.atan2(cam.position.x-actor.position.x,cam.position.z-actor.position.z);
  const toObject=new THREE.Vector3(look.x-feet[0],0,look.z-feet[2]).dot(right),side=Math.abs(toObject)<.4?(key%2?1:-1):Math.sign(toObject);
  runAnims(group,age);
  let walked=0;for(let a=0;a<age;a+=.04)walked+=Math.abs(offAt(Math.min(age,a+.04))-offAt(a));   // distance travelled so far: one step per .5 m keeps the feet from sliding
  host.draw(shot,age,frame,amp,{stride,side,phase:walked/.5*Math.PI});fx.lens.focus=Math.max(.5,new THREE.Vector3(...feet).add(new THREE.Vector3(0,1.45,0)).sub(cam.position).dot(cam.getWorldDirection(new THREE.Vector3())));
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
  const cap=caption(data.words,time,shot.overlay?.text??""),word=cap.text;
  // fade/scale in over 0.12 s, out over the last 0.2 s of the hold; position never moves
  const capIn=Math.min(1,cap.age/.12),capOut=Math.min(1,Math.max(0,(HOLD-cap.age)/.2)),capV=Math.min(capIn,capOut);
  return <AbsoluteFill style={{background:"#aabac8"}}>
    <ThreeCanvas width={1920} height={1080} shadows camera={{near:.18,far:1400}} gl={{antialias:false,stencil:false,powerPreference:"high-performance"}}>
      <World shot={shot} age={age} frame={f} amp={data.rms[f]??0}/>
    </ThreeCanvas>
    {shot.overlay&&<Graphic item={shot.overlay} age={age}/>}
    {typeof shot.params.inset==="string"&&age>=Number(shot.params.insetAt??0)&&<Inset kind={shot.params.inset} age={age-Number(shot.params.insetAt??0)}/>}
    {word&&<div style={{position:"absolute",bottom:55,left:0,right:0,textAlign:"center",opacity:capV,transform:`scale(${.88+.12*capV})`,font:"bold 55px Arial",color:"#fff2d6",WebkitTextStroke:"6px #262235",paintOrder:"stroke fill",textShadow:"2px 4px 1px #292238"}}>{word}</div>}
    <Audio src={staticFile("master.wav")}/>
  </AbsoluteFill>;
}
const empty:Episode={shots:[],words:[],rms:[],duration:1};
const Root=()=> <Composition id="Episode" component={Film} defaultProps={empty} fps={24} width={1920} height={1080} durationInFrames={24}
 calculateMetadata={({props})=>({durationInFrames:Math.max(1,Math.ceil(props.duration*24))})}/>;
registerRoot(Root);
