// Collision check for every shot of an episode: nobody passes through anything (people, boats, cars, paper, birds, built objects).
// Renders one tiny still per shot through the real Episode composition (the check itself runs when the shot's scene is built)
// and fails with exit code 1 if any "COLLISION ..." line shows up. node scripts/check-collisions.mjs <slug> [first-last]
import fs from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";
const engine=fileURLToPath(new URL("../",import.meta.url)),root=path.dirname(path.resolve(engine));
const [slug,range]=process.argv.slice(2);
if(!slug)throw Error("Usage: node scripts/check-collisions.mjs <slug> [first-last]");
const ep=path.join(root,"episodes",slug),read=p=>JSON.parse(fs.readFileSync(p,"utf8").replace(/^\uFEFF/,""));
process.chdir(engine);process.env.REMOTION_TMP="./remotion-tmp";
const base=path.resolve(process.env.REMOTION_TMP);fs.mkdirSync(base,{recursive:true});
const scratch=fs.mkdtempSync(path.join(base,"collide-"));process.env.TMP=process.env.TEMP=scratch;
const pub=path.join(scratch,"public");fs.mkdirSync(pub);
const wav=Buffer.alloc(44+8000*2);wav.write("RIFF",0);wav.writeUInt32LE(36+16000,4);wav.write("WAVEfmt ",8);wav.writeUInt32LE(16,16);wav.writeUInt16LE(1,20);wav.writeUInt16LE(1,22);
wav.writeUInt32LE(8000,24);wav.writeUInt32LE(16000,28);wav.writeUInt16LE(2,32);wav.writeUInt16LE(16,34);wav.write("data",36);wav.writeUInt32LE(16000,40);
fs.writeFileSync(path.join(pub,"master.wav"),wav);
const {shots}=read(path.join(ep,"shots.json"));
const list=range&&range.includes(",")?range.split(",").map(Number):null,[first,last]=list?[0,list.length-1]:range?range.split("-").map(Number):[0,shots.length-1];
const browserExecutable=process.env.CHROME_PATH||"C:/Program Files/Google/Chrome/Application/chrome.exe",chromiumOptions={gl:"angle"};
const found=[];let browser;
try{
  const {bundle}=await import("@remotion/bundler"),{openBrowser,renderStill,selectComposition}=await import("@remotion/renderer");
  const serveUrl=await bundle({entryPoint:path.join(engine,"src","episode","index.tsx"),publicDir:pub,outDir:path.join(scratch,"bundle"),enableCaching:false});
  browser=await openBrowser("chrome",{browserExecutable,chromiumOptions});
  for(let i=first;i<=last;i++){
    const shot=shots[list?list[i]:i],local={...shot,start:0,end:+(shot.end-shot.start).toFixed(5)},props={shots:[local],words:[],rms:[],duration:local.end};
    // the label carries the real start time so issues can be traced to the shot list
    local.params={...local.params};
    const opts={serveUrl,inputProps:props,browserExecutable,chromiumOptions,puppeteerInstance:browser,timeoutInMilliseconds:180000,logLevel:"error"};
    const composition=await selectComposition({...opts,id:"Episode"});
    // STILLS=<dir> saves a half-size first/middle/last frame per shot (to look at the framing), otherwise one tiny still is enough
    const keep=process.env.STILLS,frames=keep?[1,Math.round(composition.durationInFrames/2),composition.durationInFrames-2]:[1];
    for(const [k,fr] of frames.entries())await renderStill({...opts,composition:{...composition,props},frame:fr,scale:keep?.4:.1,output:keep?path.join(path.resolve(keep),"s"+(list?list[i]:i)+"_"+k+".jpg"):path.join(scratch,"s.jpg"),imageFormat:"jpeg",
      onBrowserLog:l=>{if(/COLLISION|FRAMING|FLOAT/.test(l.text)&&!found.includes("#"+(list?list[i]:i)+" "+l.text))found.push("#"+(list?list[i]:i)+" "+l.text);}});
    if(i%20===0)console.log("checked up to shot",i);
  }
}finally{
  if(browser)await browser.close({silent:true});
  fs.rmSync(scratch,{recursive:true,force:true,maxRetries:4,retryDelay:300});
}
if(found.length){console.error(found.length+" collision(s):\n"+found.join("\n"));process.exitCode=1;}else console.log("No collisions in shots "+first+"-"+last+".");
