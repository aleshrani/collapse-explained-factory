import * as THREE from "three";
import { waterNear, waterFar } from "../videos/bridge/paint";
import { LOOK } from "../videos/bridge/lights";
import { LFB, untone } from "../videos/bridge/shade";

// world.ts keeps its river shader private. Apply the same depression-angle ramp
// and near/far painted mark channels to a sea-sized plane.
export function sea(light:"day"|"golden"){
  const palette=LOOK[light].water, near=waterNear(),far=waterFar();
  for(const t of [near,far]){t.colorSpace=THREE.NoColorSpace;t.anisotropy=16;}
  const material=new THREE.MeshLambertMaterial();
  material.onBeforeCompile=shader=>{
    for(const name of ["near","mid","far","crest","trough","glint"] as const)shader.uniforms["sea_"+name]={value:untone(palette[name])};
    shader.uniforms.nearMap={value:near};shader.uniforms.farMap={value:far};shader.uniforms.waterShade={value:new THREE.Vector3(...palette.shade)};
    shader.vertexShader=shader.vertexShader.replace("#include <common>","#include <common>\nvarying vec3 seaPos;")
      .replace("#include <project_vertex>","#include <project_vertex>\nseaPos=(modelMatrix*vec4(transformed,1.)).xyz;");
    shader.fragmentShader=shader.fragmentShader.replace("#include <common>",`#include <common>
      varying vec3 seaPos; uniform vec3 sea_near,sea_mid,sea_far,sea_crest,sea_trough,sea_glint,waterShade;
      uniform sampler2D nearMap,farMap;`)
      .replace("#include <map_fragment>",`
        vec3 ray=seaPos-cameraPosition;
        float dist=length(ray), horizon=1.-smoothstep(0.,.42,asin(clamp(-ray.y/dist,0.,1.)));
        vec3 wc=mix(mix(sea_near,sea_mid,smoothstep(0.,.55,horizon)),sea_far,smoothstep(.55,1.,horizon));
        vec3 marks=mix(texture2D(nearMap,seaPos.xz/8.).rgb,texture2D(farMap,seaPos.xz/40.+.37).rgb,smoothstep(25.,90.,dist));
        wc=mix(wc,sea_trough,marks.g*.6);wc=mix(wc,sea_crest,marks.r*.7);
        diffuseColor.rgb=mix(wc,sea_glint,marks.b*(.3+.5*horizon));`)
      .replace("#include <lights_fragment_begin>","float sunVis=1.;\n"+LFB)
      .replace("#include <lights_fragment_end>","#include <lights_fragment_end>\nreflectedLight.directDiffuse=diffuseColor.rgb*mix(waterShade,vec3(1.),sunVis);reflectedLight.indirectDiffuse=vec3(0.);");
  };
  const ocean=new THREE.Mesh(new THREE.PlaneGeometry(1400,1400).rotateX(-Math.PI/2),material);ocean.receiveShadow=true;
  return ocean;
}
