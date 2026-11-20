import React from "react";
import { Overlay } from "./types";
const ink="#262235",cream="#fff0cd",teal="#4d9693";
export function Graphic({item,age}:{item:Overlay;age:number}){
  const visible=1,scale=1;
  const style:React.CSSProperties={position:"absolute",top:66,left:84,maxWidth:710,padding:"14px 25px",background:cream,color:ink,
    border:"5px solid "+ink,borderRadius:14,boxShadow:"7px 8px 0 #29263bb0",transformOrigin:"top left",
    transform:"scale("+scale+")",opacity:visible,fontFamily:"Arial, sans-serif",fontWeight:800};
  return <div style={style}><div style={{fontSize:item.kind==="number"?62:42,letterSpacing:-1.4,whiteSpace:item.kind==="number"?"nowrap":undefined}}>{item.text}</div>
    {item.nodes&&<svg width="560" height="220" viewBox="0 0 560 220">
      <defs><pattern id="grid" width="34" height="34" patternUnits="userSpaceOnUse"><path d="M34 0H0V34" fill="none" stroke="#97bbb1" strokeWidth="1.5"/></pattern></defs>
      <rect width="560" height="220" rx="9" fill={item.kind==="map"?"#afd2cc":"#ece4c8"}/>
      <rect width="560" height="220" fill="url(#grid)"/>
      <polyline points={item.nodes.map(n=>[32+n.x*485,25+n.y*135].join(",")).join(" ")} fill="none" stroke={ink} strokeWidth="6" strokeDasharray={item.kind==="map"?"12 7":undefined}/>
      {item.nodes.map((n,i)=><g key={i} transform={`translate(${32+n.x*485} ${25+n.y*135})`}>
        {item.kind==="map"?<path d="M0 8Q-23 -15 -10 -23Q1 -31 12 -22Q22 -14 0 8Z" fill="#dc8459" stroke={ink} strokeWidth="3"/>:<rect x="-14" y="-12" width="28" height="24" rx="4" fill={teal} stroke={ink} strokeWidth="3"/>}
        <text y="36" textAnchor={n.x<.2?"start":n.x>.8?"end":"middle"} fontSize="21" fill={ink}>{n.label}</text></g>)}</svg>}
    {item.detail&&<div style={{fontSize:26,fontWeight:650,marginTop:3}}>{item.detail}</div>}
  </div>;
}
export function Inset({kind,age}:{kind:string;age:number}){
  const blue="#70b5be",sand="#d9b57a",stroke="#35434a";
  const progress=Math.min(1,Math.max(0,age*2.4));
  return <svg viewBox="0 0 260 175" width="290" height="195" style={{position:"absolute",right:70,bottom:125,opacity:progress}}>
    <rect x="5" y="6" width="250" height="162" rx="12" fill="#ede2c9" stroke={stroke} strokeWidth="4"/>
    {kind==="milk"?<g stroke={stroke} strokeWidth="4" strokeLinejoin="round">
      <path fill="#bc8d5b" d="M30 106L109 74 221 97 155 142Z"/><path fill="#a17045" d="M30 106L155 142 155 158 30 123Z"/>
      <path fill="#f4eee0" d="M80 97V55L89 39H127L137 52V108L109 119Z"/><path fill="#568b8c" d="M80 72L109 84 137 71V88L109 102 80 89Z"/>
      <path fill="#f4eee0" d="M144 96V55L153 38H184L195 54V98L172 113Z"/><path fill="#60999a" d="M144 70L172 80 195 68V83L172 95 144 86Z"/>
      <path fill="none" d="M89 39L110 52 127 39M110 52V78M153 38L172 51 184 38M172 51V77"/>
    </g>:<g stroke={stroke} strokeWidth="3" strokeLinejoin="round">
      <path fill={blue} d="M20 78Q60 68 91 77T155 78T238 76V145H20Z"/>
      <path fill={sand} d="M20 135Q79 151 116 125T195 122L238 115V151H20Z"/>
      <path fill="none" stroke="#fcf4d7" strokeWidth="4" strokeDasharray="8 6" d="M30 76L92 50Q115 43 141 49L228 78"/>
      <path fill="#9e6348" d="M126 45H134V129H126Z"/>{[63,77,91,105,119].map(y=><path key={y} d={`M127 ${y}H138`} stroke="#f0dbab"/>)}
      <path fill="#b56b4a" d="M35 67H75L68 78H43Z"/><path fill="#fff3d8" d="M45 53H63V66H45Z"/>
    </g>}
  </svg>;
}
const filler=new Set("a an and are as at be been but by did do for from had has have he her him his i in is it its of on or she so than that the their them then there they this to was we were will with you your how rise now try might can could would should some somebody something also where when what why which who whom quite just still before after get got doing does then off up out above far below indeed frankly much good those these need needs way every other enough one".split(" "));
const clean=(s:string)=>s.replace(/(\d)\.(?=\d)/g,"$1 point ").replace(/[’]/g,"'").replace(/[^\p{L}\p{N} ']/gu,"").replace(/(^|\s)'+|'+(?=\s|$)/g,"$1").trim();
export function caption(words:{w:string;t:number}[],time:number){
  let lo=0,hi=words.length;
  while(lo<hi){const j=(lo+hi)>>1;if(words[j].t<=time)lo=j+1;else hi=j;}
  for(let j=lo-1;j>=0&&time-words[j].t<.7;j--){
    const w=clean(words[j].w);
    if(!w||filler.has(w.toLowerCase()))continue;
    const phrase=[w];
    for(let k=j-1;k>=0&&phrase.length<3&&words[j].t-words[k].t<.72;k--){
      const prior=clean(words[k].w);
      if(!prior||filler.has(prior.toLowerCase())||/[.!?,]$/.test(words[k].w))break;
      phrase.unshift(prior);
    }
    return phrase.join(" ").split(/\s+/).slice(-3).join(" ");
  }
  return "";
}
