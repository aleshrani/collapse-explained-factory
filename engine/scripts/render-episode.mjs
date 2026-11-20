import fs from "node:fs";
import os from "node:os";
import crypto from "node:crypto";
import path from "node:path";
import {fileURLToPath} from "node:url";
import {execFileSync} from "node:child_process";
const engine=fileURLToPath(new URL("../",import.meta.url)), root=path.dirname(path.resolve(engine));
const [slug,option]=process.argv.slice(2);
if(!slug||!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)||(option&&!["--proof","--proof-v2"].includes(option)))throw Error("Usage: node scripts/render-episode.mjs <slug> [--proof|--proof-v2]");
const ep=path.join(root,"episodes",slug,option?option.slice(2):""), read=p=>JSON.parse(fs.readFileSync(p,"utf8").replace(/^\uFEFF/,""));
const python=path.join(root,"voice",".venv","Scripts","python.exe");
process.chdir(engine);process.env.REMOTION_TMP="./remotion-tmp";
const base=path.resolve(process.env.REMOTION_TMP);fs.mkdirSync(base,{recursive:true});
const scratch=fs.mkdtempSync(path.join(base,"episode-"));process.env.TMP=process.env.TEMP=scratch;
const pub=path.join(scratch,"public");fs.mkdirSync(pub);
const run=(exe,args)=>{
  try{return execFileSync(exe,args,{stdio:"inherit",windowsHide:true});}
  catch(e){
    if(args.some(a=>String(a).endsWith("episode-qa.py"))){
      const gate=path.join(args.at(-2),"gate.json");
      if(fs.existsSync(gate))throw Error("QA gate: "+read(gate).errors.join(", "));
    }
    throw e;
  }
};
const audio=path.join(ep,"vo.wav"),raw=path.join(scratch,"picture.mp4"),pending=path.join(ep,"episode.pending.mp4");
const start=Date.now();
try{
  const duration=Number(execFileSync("ffprobe",["-v","error","-show_entries","format=duration","-of","csv=p=0",audio],{encoding:"utf8"}).trim());
  run(python,[path.join(engine,"llm","make-shotplan.py"),ep,"--check","--duration",String(duration)]);
  run(python,[path.join(engine,"scripts","episode-mix.py"),ep,scratch]);
  fs.copyFileSync(path.join(scratch,"master.wav"),path.join(pub,"master.wav"));
  const {shots}=read(path.join(ep,"shots.json")),{words}=read(path.join(ep,"words.json"));
  const inputProps={...read(path.join(scratch,"levels.json")),shots,words};
  const {bundle}=await import("@remotion/bundler"),{renderMedia,selectComposition,openBrowser}=await import("@remotion/renderer");
  const serveUrl=await bundle({entryPoint:path.join(engine,"src","episode","index.tsx"),publicDir:pub,outDir:path.join(scratch,"bundle"),enableCaching:false});
  const opts={serveUrl,inputProps,browserExecutable:"C:/Program Files/Google/Chrome/Application/chrome.exe",chromiumOptions:{gl:"angle"},timeoutInMilliseconds:180000,logLevel:"error"};
  const composition=await selectComposition({...opts,id:"Episode"});
  const pictureStart=Date.now();let reused=0,rendered=0;
  if(fs.existsSync(path.join(ep,"narration-timing.json"))){
    const clipDir=path.join(root,"episodes",slug,".build-cache","picture");fs.mkdirSync(clipDir,{recursive:true});
    const buildHash=crypto.createHash("sha256").update("resolved-shot-props-v2:24:h264:crf17");
    function hashSource(file){
      if(!fs.existsSync(file))return;
      if(fs.statSync(file).isDirectory()){for(const n of fs.readdirSync(file).sort())hashSource(path.join(file,n));return;}
      buildHash.update(path.relative(engine,file));buildHash.update(fs.readFileSync(file));
    }
    for(const name of ["src/kit","src/episode","src/videos/bridge","src/videos/dubai3d","src/videos/brand","src/sandboxes/kit_gallery/stage.ts","package-lock.json"])hashSource(path.join(engine,name));
    const version=buildHash.digest("hex");
    const browser=await openBrowser("chrome",{browserExecutable:opts.browserExecutable,chromiumOptions:opts.chromiumOptions});
    const list=[];
    try{
      for(const shot of shots){
        const first=Math.ceil(shot.start*24),stop=Math.ceil(shot.end*24),offset=first/24;
        const local={...shot,start:+(shot.start-offset).toFixed(5),end:+(shot.end-offset).toFixed(5)};
        const localWords=words.filter(w=>w.t>=shot.start&&w.t<shot.end).map(w=>({...w,t:+(w.t-offset).toFixed(3)}));
        const props={shots:[local],words:localWords,rms:inputProps.rms.slice(first,stop),duration:(stop-first)/24};
        const hash=crypto.createHash("sha256").update(version).update(JSON.stringify(props)).digest("hex");
        const clip=path.join(clipDir,hash+".mp4");
        if(!fs.existsSync(clip)){
          const tmp=path.join(clipDir,hash+"-"+process.pid+".mp4");
          await renderMedia({...opts,inputProps:props,composition:{...composition,props,durationInFrames:stop-first},puppeteerInstance:browser,outputLocation:tmp,codec:"h264",crf:17,muted:true,concurrency:2,onBrowserLog:log=>{if(log.type==="error")console.error(log.text);}});
          fs.renameSync(tmp,clip);rendered++;
        }else reused++;
        list.push("file '"+clip.replaceAll("\\","/").replaceAll("'","'\\''")+"'");
        console.log("Picture beat",list.length,"/",shots.length);
      }
    }finally{await browser.close({silent:true});}
    const concat=path.join(scratch,"clips.txt");fs.writeFileSync(concat,list.join("\n"));
    run("ffmpeg",["-v","error","-y","-f","concat","-safe","0","-i",concat,"-c:v","copy",raw]);
  }else{
  let reported=-1;
  await renderMedia({...opts,composition,outputLocation:raw,codec:"h264",crf:17,muted:true,concurrency:2,
    onProgress:p=>{const step=Math.floor(p.renderedFrames/120);if(step!==reported){reported=step;console.log("frames",p.renderedFrames,"/",composition.durationInFrames);}}});
  rendered=shots.length;
  }
  const pictureSeconds=(Date.now()-pictureStart)/1000;
  run("ffmpeg",["-v","error","-y","-i",raw,"-i",path.join(scratch,"master.wav"),"-map","0:v:0","-map","1:a:0","-c:v","copy","-c:a","aac","-b:a","256k","-movflags","+faststart",pending]);
  const qa=path.join(ep,"qa");fs.mkdirSync(qa,{recursive:true});
  fs.copyFileSync(path.join(scratch,"cues.json"),path.join(qa,"cues.json"));
  const boundaries=path.join(qa,"shots.json");
  fs.writeFileSync(boundaries,JSON.stringify({shots:shots.map((s,i)=>({id:i+1,a:Math.ceil(s.start*24),b:Math.ceil(s.end*24)}))}));
  run("py",["-3",path.join(engine,"scripts","episode-qa.py"),pending,qa,boundaries]);
  fs.renameSync(pending,path.join(ep,"episode.mp4"));
  fs.writeFileSync(path.join(qa,"runtime.json"),JSON.stringify({seconds:(Date.now()-start)/1000,pictureSeconds,reused,rendered,duration,frames:composition.durationInFrames,host:os.hostname()},null,2));
  run("ffmpeg",["-v","error","-y","-i",path.join(ep,"episode.mp4"),"-vf",`fps=12/${duration},scale=384:216,tile=4x3`,"-frames:v","1",path.join(ep,"contact.jpg")]);
}catch(error){console.error("Render failed: "+error.message);process.exitCode=1;}finally{
  if(path.dirname(scratch)===base&&path.basename(scratch).startsWith("episode-"))fs.rmSync(scratch,{recursive:true,force:true,maxRetries:4,retryDelay:300});
}
