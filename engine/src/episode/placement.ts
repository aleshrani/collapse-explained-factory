import * as THREE from "three";
import type {Ob} from "../kit/collide";

/** SUPPORT: every sign, board or page (meshes tagged userData.text) must have something under or behind it that reaches its lower edge
 *  (a post, a wall, a table). Its own frame box does not count: the supporter has to start at least .15 m below the sign. */
export function supportIssues(root:THREE.Object3D,obs:Ob[]){
  const out:string[]=[];root.updateMatrixWorld(true);
  root.traverse(o=>{
    if(!(o instanceof THREE.Mesh)||!o.userData.text)return;
    const b=new THREE.Box3().setFromObject(o);
    const ok=obs.some(s=>s.x1>=b.min.x-.2&&s.x0<=b.max.x+.2&&s.z1>=b.min.z-.8&&s.z0<=b.max.z+.8&&s.y0<=b.min.y-.15&&s.y1>=b.min.y-.35);
    if(!ok)out.push(`SUPPORT a sign or board hangs in the air at x ${b.min.x.toFixed(1)}..${b.max.x.toFixed(1)}, y ${b.min.y.toFixed(1)}..${b.max.y.toFixed(1)}, z ${b.min.z.toFixed(1)}: nothing stands under or behind it`);
  });
  return out;
}
/** STAND: nobody stands on a surface marked nostand (road, water). */
export function standIssues(obs:Ob[],who:string,pts:[number,number][]){
  for(const [x,z] of pts)for(const o of obs)if(o.nostand&&x>=o.x0&&x<=o.x1&&z>=o.z0&&z<=o.z1)return [`STAND ${who} stands on ${o.tag??"a surface people cannot stand on"} at x ${x.toFixed(1)} z ${z.toFixed(1)}`];
  return [];
}
/** FLOAT for a side character: a ray down from his feet must reach a surface within .12 m (his walk bob is .045) and not the open water. */
export function floatIssue(root:THREE.Object3D,x:number,y:number,z:number,who:string){
  const ray=new THREE.Raycaster(new THREE.Vector3(x,y+.3,z),new THREE.Vector3(0,-1,0),0,40),hit=ray.intersectObject(root,true)[0];
  if(!hit)return [`FLOAT ${who} has no surface under his feet`];
  if(hit.object.userData.sea)return [`STAND ${who} stands on the open water`];
  const drop=y-hit.point.y;
  return drop>.12||drop<-.4?[`FLOAT ${who}'s feet are ${drop.toFixed(2)} m ${drop>0?"above":"below"} the surface under him`]:[];
}
