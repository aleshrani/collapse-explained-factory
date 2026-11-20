import * as THREE from "three";
import { cloudHD, ctex } from "../../videos/bridge/paint";
import { GOLDEN, LOOK_GOLDEN } from "../../videos/dubai3d/lights";
import { LIGHTS, LOOK } from "../../videos/bridge/lights";
import { CHAR, TONE, untone } from "../../videos/bridge/shade";
import { blobMaterial, cardShade } from "../../videos/bridge/cardshade";
import { NOINK } from "../../videos/bridge/ink";
import { Pen } from "../../videos/persona/toon";
import { ARCH_PRESETS, drawScientist } from "../../videos/brand/scientist";
import { Point, Shot } from "../../kit/shared";

function architect(feet:Point,eye:THREE.Vector3,wide:boolean){
  const actor=new THREE.Group();
  const map=ctex("kit-architect-"+wide,600,1000,g=>drawScientist(new Pen(g),wide?ARCH_PRESETS.neutral:ARCH_PRESETS.explaining,{look:"architect"}));
  map.wrapS=map.wrapT=THREE.ClampToEdgeWrapping;
  const card=new THREE.Mesh(new THREE.PlaneGeometry(1.38,2.30).translate(0,2.30*.475,0),
    cardShade(new THREE.MeshLambertMaterial({map,alphaTest:.4,side:THREE.DoubleSide})));
  card.layers.set(NOINK);card.receiveShadow=true;card.castShadow=true;
  card.customDepthMaterial=new THREE.MeshDepthMaterial({map,alphaTest:.4,depthPacking:THREE.RGBADepthPacking});
  card.rotation.y=Math.atan2(eye.x-feet[0],eye.z-feet[2]);actor.add(card);
  const shade=ctex("kit-contact",128,128,g=>{
    const grad=g.createRadialGradient(64,64,3,64,64,62);
    grad.addColorStop(0,"#89858a");grad.addColorStop(.48,"#b2aeb2");grad.addColorStop(1,"white");
    g.fillStyle=grad;g.fillRect(0,0,128,128);
  });
  const blob=new THREE.Mesh(new THREE.PlaneGeometry(1.25,.66).rotateX(-Math.PI/2),blobMaterial(shade));
  blob.layers.set(NOINK);blob.position.y=.009;actor.add(blob);actor.position.set(...feet);return actor;
}
export function setStage(scene:THREE.Scene,cam:THREE.PerspectiveCamera,shot:Shot,feet:Point,light:"day"|"golden",wide:boolean,place:string){
  const rig=new THREE.Group(), look=light==="golden"?{...LOOK.golden,...LOOK_GOLDEN}:LOOK.day,l=light==="golden"?{...LIGHTS.golden,...GOLDEN}:LIGHTS.day, inside=place==="tunnel", desert=place==="ghostcity";
  cam.position.set(...shot.pos);cam.lookAt(...shot.look);cam.fov=shot.fov;cam.updateProjectionMatrix();cam.updateMatrixWorld();cam.layers.enable(NOINK);
  const forward=cam.getWorldDirection(new THREE.Vector3());forward.y=0;forward.normalize();
  const right=forward.clone().cross(new THREE.Vector3(0,1,0));
  const angle=THREE.MathUtils.degToRad(desert?(light==="day"?-9:8):l.az+(light==="day"?48:49)),el=THREE.MathUtils.degToRad(desert?(light==="day"?13:8):l.el);
  const dir=forward.clone().multiplyScalar(Math.cos(angle)*Math.cos(el)).addScaledVector(right,Math.sin(angle)*Math.cos(el));dir.y=Math.sin(el);
  const hemi=new THREE.HemisphereLight(inside?(light==="day"?"#badcf4":"#dbc0be"):l.sky,inside?"#9298a7":l.ground,inside?(light==="day"?1.32:.77):l.hemiI);
  const sun=new THREE.DirectionalLight(l.sunCol,inside?.23:l.sunI);sun.castShadow=true;
  sun.target.position.set(...shot.look);sun.position.copy(sun.target.position).addScaledVector(dir,155);
  const range=Math.max(25,Math.min(75,cam.position.distanceTo(sun.target.position)+10));
  Object.assign(sun.shadow.camera,{left:-range,right:range,top:range,bottom:-range,near:1,far:320});
  sun.shadow.camera.updateProjectionMatrix();sun.shadow.mapSize.set(2048,2048);sun.shadow.bias=l.bias;sun.shadow.normalBias=l.normalBias;
  sun.shadow.camera.layers.enable(NOINK);rig.add(hemi,sun,sun.target);
  TONE.uLitCol.value.set(...l.lit);TONE.uShadeCol.value.set(...l.shade);TONE.uShadeLift.value.set(...l.lift);
  TONE.uLambert.value=l.lambert;TONE.uSideK.value=l.sideK;TONE.uTerm.value=l.term;
  TONE.uBounce.value.set(...look.bounce);TONE.uSat.value=look.sat;
  CHAR.uCharTint.value.set(...l.charTint);CHAR.uCharShade.value=l.charShade;CHAR.uGrad.value=l.charGrad;CHAR.uBodyGrad.value=l.bodyGrad;CHAR.uSideTint.value.set(...l.sideTint);
  const horizon=inside?"#384656":desert?(light==="day"?"#e4d2b5":"#f3bd85"):look.sky.c[0];
  scene.fog=new THREE.Fog(untone(horizon),inside?12:desert?15:l.fogNear,inside?87:desert?155:l.fogFar);
  if(!inside){
    const stops=look.sky.c.map((c,i)=>untone(i?c:horizon));
    const sky=new THREE.Mesh(new THREE.SphereGeometry(950,48,24),new THREE.ShaderMaterial({
      uniforms:{colors:{value:stops},e:{value:new THREE.Vector4(...look.sky.e.slice(1).map(THREE.MathUtils.degToRad))}},
      vertexShader:"varying vec3 ray;void main(){ray=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}",
      fragmentShader:`varying vec3 ray;uniform vec3 colors[5];uniform vec4 e;void main(){
        float h=asin(normalize(ray).y);vec3 c=mix(colors[0],colors[1],smoothstep(0.,e.x,h));
        c=mix(c,colors[2],smoothstep(e.x,e.y,h));c=mix(c,colors[3],smoothstep(e.y,e.z,h));
        gl_FragColor=vec4(mix(c,colors[4],smoothstep(e.z,e.w,h)),1.);}`,side:THREE.BackSide,depthWrite:false,fog:false
    }));
    sky.position.copy(cam.position);sky.layers.set(NOINK);sky.renderOrder=-10;rig.add(sky);
    for(const [i,dx,y,w] of [[0,-87,51,91],[1,95,101,110],[2,24,29,61],[3,-65,177,82]]){
      const cloud=new THREE.Sprite(new THREE.SpriteMaterial({map:cloudHD(i,look.cloud),transparent:true,depthWrite:false,fog:false}));
      cloud.position.copy(cam.position).addScaledVector(forward,430).addScaledVector(right,dx);
      cloud.position.y+=y;cloud.scale.set(w,w/2,1);cloud.layers.set(NOINK);rig.add(cloud);
    }
    if(light==="golden" || desert){
      const sunMap=ctex("kit-sun-haze",256,256,g=>{
        const grad=g.createRadialGradient(128,128,0,128,128,128);
        for(const [k,c] of [[0,"#fff5c8"],[.122,"#fff7d4"],[.137,"rgba(255,223,157,.52)"],[.36,"rgba(255,218,157,.25)"],[1,"rgba(255,221,167,0)"]] as const)grad.addColorStop(k,c);
        g.fillStyle=grad;g.fillRect(0,0,256,256);
      });
      const disc=new THREE.Sprite(new THREE.SpriteMaterial({map:sunMap,transparent:true,depthWrite:false,fog:false}));
      disc.position.copy(cam.position).addScaledVector(dir,600);
      disc.scale.set(219,219,1);disc.layers.set(NOINK);rig.add(disc);
    }
  }
  rig.add(architect(feet,cam.position,wide));return rig;
}
