import {Model,painted,wood} from "./shared";
import {addPerson} from "./extras";
import {finish,paper,RoomParams,shell,sign} from "./interior";
export function build(p:RoomParams){
  const m=new Model();shell(m,Math.max(13,Math.min(24,p.size??18)));
  const oak=wood(),brass=painted("#bc9c62"),velvet=painted("#729394"),stone=painted("#d9cdad");
  m.box(-.45,.77,-1.62,5.65,1.54,1.32,oak);m.box(-.45,1.59,-1.62,5.94,.17,1.52,stone);
  for(let j=0;j<18;j++)m.box(-3.05+j*.307,.73,-.92,.092,1.28,.09,brass);
  m.box(-.83,2.84,-4.34,4.92,2.12,.24,oak);
  for(let i=0;i<15;i++){
    const x=-2.66+(i%5)*.92,y=2.15+Math.floor(i/5)*.61;
    m.box(x,y,-4.14,.77,.5,.08,painted("#736356"));m.pipe([x,y+.1,-4.09],[x,y-.11,-4.03],.035,brass);
  }
  paper(m,-.18,1.71,-1.46);m.mound(.92,1.71,-1.56,.25,.18,.23,brass,6);
  sign(m,-1.54,2.02,-1.68,1.42,.47,p.state==="closed"?"CLOSED":"RECEPTION");
  sign(m,-.83,4.32,-4.35,4.67,.76,p.subject||"Island hotel");
  sign(m,2.95,1.74,-.52,2.01,.43,p.detail||"Guest arrivals");
  for(const x of [-5.25,4.8]){
    m.box(x,.53,1.1,2.43,.65,1.03,velvet);m.box(x,.98,.62,2.43,.94,.27,velvet);
    for(const a of [-1,1])m.box(x+a*1.04,.83,1.15,.24,.55,1.18,oak);
  }
  m.box(3.46,.29,1.35,1.18,.47,.79,painted("#8c6959","rib"));
  for(const x of [3.08,3.84])m.box(x,.56,1.35,.083,.08,.81,brass);
  addPerson(m.group,{x:-2.2,y:0,z:2.2,variant:3,carry:true,walk:{dx:4,period:10}});   // a bellboy crosses the lobby with luggage papers
  return finish(m,p.state==="closed"?[-1.55,1.96,-1.56]:[-.36,1.59,-1.35],"hotel-interior");
}

