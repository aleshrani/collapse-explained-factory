import * as THREE from "three";
import {camera, container, limit, Context, Model, painted, Point, ridge, wood} from "./shared";
import {stencil} from "./markings";

// Superdeep borehole site on the tundra: lattice derrick, drill-floor building, pipe racks,
// fuel tanks, power poles, and the bolted wellhead cap in the foreground. Ground at y = 0.
export type BoreholeParams={subject?:string;detail?:string;damage?:number;phase?:"proposal"|"work"|"record";crowd?:number;weather?:string};
export function build(p:BoreholeParams={},_ctx:Context={}){
  const m=new Model(),wear=limit(Number(p.damage)||0,0,1),abandoned=p.phase==="record"||wear>.5;
  const lattice=painted(abandoned?"#8a5a42":"#9b4f3d"),steel=painted("#5f727b"),dark=painted("#35444e"),cream=painted("#dfceb1"),wall=painted("#b4b8a8","wall"),
        roofm=painted("#6d747a","rib"),tank=painted("#8a9a98","rib"),brass=painted("#a89a77"),snow=painted("#e3eaea","snow"),pane=painted("#749aa9","glass"),
        cap=painted("#5b6b62"),gravel=painted("#9d9885","earth");
  m.box(0,-.19,0,690,.34,690,painted("#a8ad92","earth"),5);
  const distant=painted("#8a9a8c","earth");ridge(m,-78,distant,9,31);ridge(m,-119,distant,14,12);
  m.box(0,.03,2,34,.1,26,gravel,4);m.box(0,.035,18,6,.1,24,painted("#7d8284","road"),3);
  // derrick: four tapered legs, rings, X-bracing, crown block
  const base=3.4,top=1.05,H=23;
  const leg=(sx:number,sz:number,t:number):Point=>{const k=base+(top-base)*t;return [sx*k,t*H,sz*k];};
  for(const [sx,sz] of [[-1,-1],[1,-1],[1,1],[-1,1]])m.beam(leg(sx,sz,0),leg(sx,sz,1),.24,lattice);
  for(let i=0;i<=8;i++){
    const t0=i/8,t1=(i+1)/8;
    const A=(sx:number,sz:number,t:number)=>leg(sx,sz,t);
    for(const s of [[[-1,-1],[1,-1]],[[1,-1],[1,1]],[[1,1],[-1,1]],[[-1,1],[-1,-1]]] as const){
      const [a,b]=s;m.beam(A(a[0],a[1],t0),A(b[0],b[1],t0),.12,lattice);
      if(i<8){m.beam(A(a[0],a[1],t0),A(b[0],b[1],t1),.08,lattice);m.beam(A(b[0],b[1],t0),A(a[0],a[1],t1),.08,lattice);}
    }
  }
  m.box(0,H+.5,0,2.6,1.0,2.6,painted("#4d5b63"));
  for(const x of [-.7,0,.7])m.add(new THREE.CylinderGeometry(.34,.34,.3,14).rotateX(Math.PI/2).translate(x,H+1.15,0),dark);
  m.beam([0,H+1,0],[0,H+3,0],.1,lattice);m.add(new THREE.ConeGeometry(.2,.7,8).translate(0,H+3.35,0),painted("#c9553a"));
  // travelling block and cable
  m.box(0,13,0,.9,.9,.7,steel);m.pipe([0,H,0],[0,13.5,0],.04,dark);m.pipe([-.3,H,0],[-.3,13.5,0],.04,dark);
  // drill-floor building with glazed control room and roof
  m.box(0,2.0,-.2,9.4,4.0,8.4,wall,3);
  m.box(0,4.15,-.2,10,.3,9,roofm);
  m.box(0,2.6,4.1,6.5,1.5,.12,pane);
  for(const x of [-3.4,3.4])m.box(x,1.6,4.05,1.4,3.2,.12,painted("#5d7078","rib"));
  m.box(7.2,1.6,-1,5,3.2,6,wall,2.5);m.box(7.2,3.35,-1,5.4,.3,6.4,roofm);
  m.pipe([5.5,3.4,-2.5],[5.5,6.2,-2.5],.28,painted("#6a747a"));m.pipe([8.2,3.4,-3],[8.2,5.0,-3],.2,painted("#6a747a"));
  // pipe rack on trestles, drill-pipe stack, cable reels
  for(let r=0;r<3;r++)for(let k=0;k<5-r;k++)m.pipe([-14,.55+r*.62,6.2+k*.62+r*.31],[-4,.55+r*.62,6.2+k*.62+r*.31],.27,steel);
  for(const x of [-13,-9,-5])m.box(x,.2,8,.35,.4,3.6,wood());
  for(const [x,z] of [[-8,-5],[-6.2,-5.4],[-12,-4]]){m.add(new THREE.CylinderGeometry(1.1,1.1,.5,18).rotateZ(Math.PI/2).translate(x,1.1,z),painted("#8a5a42"));m.add(new THREE.CylinderGeometry(.35,.35,.62,10).rotateZ(Math.PI/2).translate(x,1.1,z),dark);}
  // fuel tanks, containers, poles
  for(const x of [13,17])m.add(new THREE.CylinderGeometry(2,2,7,18).rotateZ(Math.PI/2).translate(x,2.1,-6),tank);
  for(const x of [11,15,19])m.box(x,.4,-6,.4,.8,2.6,dark);
  container(m,-16,0,-6,6.1,2.5,"#6a7e86",true);container(m,22,0,2,6.1,2.5,"#a8905a");
  for(let x=-24;x<=26;x+=12){m.pipe([x,0,24],[x,6.6,24],.1,wood());m.beam([x-1.2,6.2,24],[x+1.2,6.2,24],.08,wood());}
  m.beam([-24,6.1,24],[26,5.8,24],.015,dark);
  // the wellhead cap: bolted plate, ring flange and short stub
  m.add(new THREE.CylinderGeometry(1.5,1.65,.4,28).translate(7.2,.2,7.4),cap);
  m.add(new THREE.CylinderGeometry(1.2,1.2,.16,28).translate(7.2,.48,7.4),painted("#6f7f75"));
  for(let i=0;i<14;i++){const a=i*Math.PI*2/14;m.add(new THREE.CylinderGeometry(.09,.09,.14,6).translate(7.2+Math.cos(a)*1.0,.6,7.4+Math.sin(a)*1.0),brass);}
  m.pipe([7.2,.5,7.4],[7.2,1.1,7.4],.18,steel);m.box(7.2,1.15,7.4,.5,.1,.5,brass);
  // fence around the cap and snow patches
  for(let i=0;i<9;i++){const x=4.9+i*.55;if(abandoned&&i>5)break;m.pipe([x,0,9.8],[x,1.1,9.8],.04,dark);}
  m.beam([4.9,.9,9.8],[abandoned?7.8:9.4,.9,9.8],.025,dark);
  for(let i=0;i<7+Math.round(wear*8);i++)m.mound(-18+(i*7%37),.02,10+(i*5%9),1.6+(i%3)*.6,.12,1.0,snow,i);
  const title=String(p.subject||"Kola borehole");
  const board=new Model();for(const x of [3.6,6.0])board.pipe([x,0,11.3],[x,1.9,11.3],.06,dark);
  m.group.add(board.assemble());
  const plate=new THREE.Mesh(new THREE.PlaneGeometry(2.6,.9),stencil(title,"#49686c"));plate.position.set(4.8,1.55,11.24);m.group.add(plate);
  const target:Point=[0,8,0];
  const group=m.finish({wide:camera([26,13,34],target,50),medium:camera([12,3.6,19.5],[1.5,6,0],46),close:camera([10.4,2.5,13.5],[7.2,.8,7.4],40)});
  group.cameras.aerial=camera([12,30,26],[0,4,2],54);
  group.cameras.low=camera([10,.9,20],[0,9,0],52);
  group.cameras.dolly=camera([19,5,22],[0,7,0],44);
  const feet:Point=[9.6,0,9.4];
  return {group,feet,place:"borehole"};
}
