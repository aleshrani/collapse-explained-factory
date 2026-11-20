import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import {spawn} from "node:child_process";
import {fileURLToPath} from "node:url";

const engine=fileURLToPath(new URL("../",import.meta.url));
const root=path.dirname(path.resolve(engine)),[slug,mode,...extra]=process.argv.slice(2);
if(!slug||!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)||extra.length||(mode&&mode!=="--proof"))throw Error("Usage: node scripts/make-episode.mjs <slug> [--proof]");
const ep=path.join(root,"episodes",slug),out=mode?path.join(ep,"proof-v2"):ep;
const source=path.join(ep,"narration.md"),python=path.join(root,"voice/.venv/Scripts/python.exe");
const logPath=path.join(ep,"build.log"),cache=path.join(out,".build-cache");
if(!fs.existsSync(source))throw Error("Missing "+source);
fs.mkdirSync(cache,{recursive:true});
const log=line=>{fs.appendFileSync(logPath,new Date().toISOString()+" "+line+"\n");console.log(line);};
const lock=path.join(cache,"build.lock");
function acquire(){
  try{fs.writeFileSync(lock,String(process.pid),{flag:"wx"});}
  catch(e){
    if(e.code!=="EEXIST")throw e;
    const pid=Number(fs.readFileSync(lock,"utf8"));
    if(!Number.isInteger(pid)||pid<=0)throw Error("Invalid build lock in "+cache);
    try{process.kill(pid,0);}catch(check){
      if(check.code==="ESRCH"){fs.unlinkSync(lock);return acquire();}throw check;
    }
    throw Error("Another build is already running for "+out);
  }
}
function hash(files){
  const h=crypto.createHash("sha256");
  function visit(f){
    if(!fs.existsSync(f)){h.update("absent:"+f);return;}
    if(fs.statSync(f).isDirectory()){for(const n of fs.readdirSync(f).filter(n=>n!=="__pycache__"&&!n.endsWith(".pyc")).sort())visit(path.join(f,n));return;}
    h.update(f);const fd=fs.openSync(f,"r"),b=Buffer.alloc(1024*1024);
    try{let n;while((n=fs.readSync(fd,b,0,b.length,null))>0)h.update(b.subarray(0,n));}finally{fs.closeSync(fd);}
  }
  for(const f of files)visit(f);return h.digest("hex");
}
async function run(cmd,args){
  return new Promise((resolve,reject)=>{
    const child=spawn(cmd,args,{cwd:engine,windowsHide:true,env:{...process.env,KOKORO_SPEED:"1.0",REMOTION_TMP:"./remotion-tmp",PYTHONUTF8:"1",PYTHONUNBUFFERED:"1"},stdio:["ignore","pipe","pipe"]});
    let tail="";
    for(const stream of [child.stdout,child.stderr])stream.on("data",data=>{
      const s=data.toString();tail=(tail+s).slice(-5500);fs.appendFileSync(logPath,s);
    });
    child.on("error",reject);
    child.on("close",code=>code===0?resolve():reject(Error(tail.trim().split(/\r?\n/).filter(s=>s.trim()&&!/^Node\.js|^\s*at |^\s*\}$/.test(s)).at(-1)||cmd+" exited "+code)));
  });
}
const code=s=>path.join(engine,s),file=s=>path.join(out,s);
async function stage(name,inputs,outputs,cmd,args){
  const key=hash(inputs),receipt=path.join(cache,name+".json");
  const old=fs.existsSync(receipt)?JSON.parse(fs.readFileSync(receipt,"utf8")):{};
  if(old.input===key&&outputs.every(fs.existsSync)&&old.output===hash(outputs)){log("Reused "+name);return;}
  log("Starting "+name);await run(cmd,args);
  if(!outputs.every(fs.existsSync))throw Error(name+" did not produce every output");
  fs.writeFileSync(receipt+".new",JSON.stringify({input:key,output:hash(outputs)}));fs.renameSync(receipt+".new",receipt);log("Finished "+name);
}
let locked=false;
try{
  acquire();locked=true;
  const voice=code("scripts/episode-voice.py"),plan=code("llm/make-shotplan.py"),render=code("scripts/render-episode.mjs");
  const models=path.join(root,"voice/models"),alignModel=fs.readdirSync(models).find(n=>n.startsWith("sherpa-onnx-nemo-parakeet"));
  await stage("tts",[source,voice,path.join(models,"kokoro-v1.0.onnx"),path.join(models,"voices-v1.0.bin")],[file("vo.wav"),file("narration-timing.json")],python,[voice,source,out,"tts",...(mode?[mode]:[])]);
  await stage("align",[file("vo.wav"),file("narration-timing.json"),voice,path.join(models,alignModel)],[file("words.json")],python,[voice,source,out,"align"]);
  const catalog=code("src/kit/catalog.json"),validator=code("scripts/validate-shots.py");
  await stage("plan",[file("words.json"),file("narration-timing.json"),path.join(ep,"kits.md"),path.join(ep,"research.md"),catalog,code("llm"),validator,code("src/episode/shots.schema.json")],[file("shots.json"),file("script.md")],python,[plan,out,"--from-narration"]);
  await stage("render",[file("shots.json"),file("words.json"),file("vo.wav"),code("src/kit"),code("src/episode"),code("src/videos/bridge"),code("src/videos/brand"),code("src/videos/dubai3d"),code("src/sandboxes/kit_gallery/stage.ts"),render,code("scripts/episode-mix.py"),code("scripts/episode-qa.py")],[file("episode.mp4"),file("qa/gate.json"),file("contact.jpg")],process.execPath,[render,slug,...(mode?["--proof-v2"]:[])]);
  if(!mode){
    const shorts=code("scripts/cut-shorts.mjs");
    await stage("shorts",[file("episode.mp4"),file("shots.json"),file("narration-timing.json"),shorts,code("scripts/short-clips.py"),code("scripts/episode-qa.py")],[file("shorts/manifest.json"),...Array.from({length:5},(_,i)=>file("shorts/teaser-"+(i+1)+".mp4"))],process.execPath,[shorts,slug]);
  }
  log("Build complete for "+out);
}catch(e){const msg=String(e.message).replace(/\s+/g," ");fs.appendFileSync(logPath,"FAILED "+msg+"\n");console.error("Build stopped: "+msg);process.exitCode=1;}
finally{if(locked)fs.unlinkSync(lock);}

