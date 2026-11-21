// Quick preview of chosen shots of an episode (half resolution, no cache, own scratch folder): the real Episode composition,
// the episode's own captions, and the matching slices of its voice track.
// node scripts/test-clip.mjs <slug> <out.mp4> <shot,shot,...> [scale=.5]
import fs from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";
import {execFileSync} from "node:child_process";
const engine=fileURLToPath(new URL("../",import.meta.url)),root=path.dirname(path.resolve(engine));
const [slug,out,list,scaleArg]=process.argv.slice(2);
if(!slug||!out||!list)throw Error("Usage: node scripts/test-clip.mjs <slug> <out.mp4> <shot,shot,...> [scale]");
const scale=Number(scaleArg||.5),ep=path.join(root,"episodes",slug),read=p=>JSON.parse(fs.readFileSync(p,"utf8").replace(/^\uFEFF/,""));
process.chdir(engine);process.env.REMOTION_TMP="./remotion-tmp";
const base=path.resolve(process.env.REMOTION_TMP);fs.mkdirSync(base,{recursive:true});
const scratch=fs.mkdtempSync(path.join(base,"testclip-"));process.env.TMP=process.env.TEMP=scratch;
const pub=path.join(scratch,"public");fs.mkdirSync(pub);
// the real lip-sync levels of the voice, computed exactly as episode-mix.py does
const python=path.join(root,"voice",".venv","Scripts","python.exe"),levelsFile=path.join(scratch,"levels.json");
execFileSync(python,[path.join(engine,"scripts","voice-rms.py"),ep,levelsFile],{stdio:"inherit"});
const rmsAll=read(levelsFile).rms;
const idx=list.split(",").map(Number),{shots}=read(path.join(ep,"shots.json")),{words}=read(path.join(ep,"words.json"));
// silent placeholder so <Audio> resolves; the real voice is muxed afterwards
const wav=Buffer.alloc(44+8000*2);wav.write("RIFF",0);wav.writeUInt32LE(36+16000,4);wav.write("WAVEfmt ",8);wav.writeUInt32LE(16,16);wav.writeUInt16LE(1,20);wav.writeUInt16LE(1,22);
wav.writeUInt32LE(8000,24);wav.writeUInt32LE(16000,28);wav.writeUInt16LE(2,32);wav.writeUInt16LE(16,34);wav.write("data",36);wav.writeUInt32LE(16000,40);
fs.writeFileSync(path.join(pub,"master.wav"),wav);
const browserExecutable=process.env.CHROME_PATH||"C:/Program Files/Google/Chrome/Application/chrome.exe",chromiumOptions={gl:"angle"};
let browser;
try{
  const {bundle}=await import("@remotion/bundler"),{renderMedia,selectComposition,openBrowser}=await import("@remotion/renderer");
  const serveUrl=await bundle({entryPoint:path.join(engine,"src","episode","index.tsx"),publicDir:pub,outDir:path.join(scratch,"bundle"),enableCaching:false});
  browser=await openBrowser("chrome",{browserExecutable,chromiumOptions});
  const opts={serveUrl,browserExecutable,chromiumOptions,puppeteerInstance:browser,timeoutInMilliseconds:180000,logLevel:"error"};
  const clips=[],cuts=[],found=[],segs=[];let clock=0;
  for(const [n,i] of idx.entries()){
    const shot=shots[i],first=Math.ceil(shot.start*24),stop=Math.ceil(shot.end*24),offset=first/24;
    const local={...shot,start:+(shot.start-offset).toFixed(5),end:+(shot.end-offset).toFixed(5)};
    const localWords=words.filter(w=>w.t>=shot.start&&w.t<shot.end).map(w=>({...w,t:+(w.t-offset).toFixed(3)}));
    const props={shots:[local],words:localWords,rms:rmsAll.slice(first,stop),duration:(stop-first)/24};
    const composition=await selectComposition({...opts,id:"Episode",inputProps:props});
    const clip=path.join(scratch,"c"+n+".mp4");
    await renderMedia({...opts,inputProps:props,composition:{...composition,props,durationInFrames:stop-first},outputLocation:clip,codec:"h264",crf:20,muted:true,concurrency:2,scale,onBrowserLog:l=>{if(/COLLISION|FRAMING|FLOAT|OCCLUDE|SUPPORT|STAND|STYLE/.test(l.text)&&!l.text.includes("TEXT-WARN")&&!found.includes("shot "+i+": "+l.text))found.push("shot "+i+": "+l.text);}});
    segs.push({id:i,start:+clock.toFixed(3),end:+(clock+(stop-first)/24).toFixed(3)});clock+=(stop-first)/24;
    clips.push(clip);cuts.push(`[1:a]atrim=${offset}:${(stop/24).toFixed(4)},asetpts=PTS-STARTPTS[a${n}]`);
    console.log("shot",i,"done",n+1+"/"+idx.length);
  }
  const concat=path.join(scratch,"clips.txt");fs.writeFileSync(concat,clips.map(c=>"file '"+c.replaceAll("\\","/")+"'").join("\n"));
  const picture=path.join(scratch,"picture.mp4");
  execFileSync("ffmpeg",["-v","error","-y","-f","concat","-safe","0","-i",concat,"-c:v","copy",picture],{stdio:"inherit"});
  const labels=idx.map((_,n)=>`[a${n}]`).join("");
  execFileSync("ffmpeg",["-v","error","-y","-i",picture,"-i",path.join(ep,"vo.wav"),"-filter_complex",cuts.join(";")+";"+labels+`concat=n=${idx.length}:v=0:a=1[a]`,"-map","0:v","-map","[a]","-c:v","copy","-c:a","aac","-b:a","192k","-shortest","-movflags","+faststart",path.resolve(out)],{stdio:"inherit"});
  console.log("wrote",path.resolve(out));
  // STATIC gate: no shot may sit still at the contact-sheet rate
  fs.writeFileSync(path.join(scratch,"segs.json"),JSON.stringify(segs));
  try{execFileSync(python,[path.join(engine,"scripts","static-gate.py"),picture,path.join(scratch,"segs.json")],{stdio:"inherit"});}
  catch(e){found.push("STATIC gate failed (see lines above)");}
  if(found.length){console.error("COLLISIONS in the test clip:\n"+found.join("\n"));process.exitCode=1;}
}finally{
  if(browser)await browser.close({silent:true});
  fs.rmSync(scratch,{recursive:true,force:true,maxRetries:4,retryDelay:300});
}
