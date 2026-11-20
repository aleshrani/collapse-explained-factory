import { lam } from "../videos/bridge/build";
import { ctex } from "../videos/bridge/paint";
export function stencil(text:string, base:string, ink="#f6e6bb"){
  const key="kit-stencil-"+text+base;
  return lam(key,()=>({map:ctex(key,512,192,(g,r)=>{
    g.fillStyle=base;g.fillRect(0,0,512,192);
    g.strokeStyle=ink;g.lineWidth=3;g.strokeRect(10,10,492,172);
    g.fillStyle=ink;g.textAlign="center";g.textBaseline="middle";
    g.font="bold 112px Arial";g.fillText(text,256,100,460);
    for(let i=0;i<280;i++){
      g.fillStyle=i%3?base:"rgba(245,227,195,.28)";
      g.fillRect(r()*512,r()*192,1+r()*9,1+r()*2);
    }
  })}));
}
