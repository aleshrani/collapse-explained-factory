// Still renderer for any catalog kit through the real Episode composition (same look as the final film).
// node scripts/kit-shot.mjs <kit> [camera,camera,...] [day|golden] ['{"param":"value"}'] [outDir]
// node scripts/kit-shot.mjs --specs specs.json [outDir]    (array of {name,kit,camera,light,params,action,expression,seconds})
// Output: out/kit-shots/<name>.jpg at 960x540 (scale .5 of 1920x1080).
import fs from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";

const engine=fileURLToPath(new URL("../",import.meta.url));
let specs,outDir=path.join(engine,"out","kit-shots");
const args=process.argv.slice(2);
if(args[0]==="--specs"){
  specs=JSON.parse(fs.readFileSync(path.resolve(args[1]),"utf8").replace(/^\uFEFF/,""));
  if(args[2])outDir=path.resolve(args[2]);
}else{
  const [kit,cams="wide,medium",light="day",params="{}",dir]=args;
  if(!kit)throw Error("Usage: node scripts/kit-shot.mjs <kit> [cameras] [day|golden] [paramsJSON] [outDir]");
  if(dir)outDir=path.resolve(dir);
  specs=cams.split(",").map(camera=>({name:kit+"-"+camera+"-"+light,kit,camera,light,params:JSON.parse(params)}));
}
fs.mkdirSync(outDir,{recursive:true});
process.chdir(engine);process.env.REMOTION_TMP="./remotion-tmp";
const base=path.resolve(process.env.REMOTION_TMP);fs.mkdirSync(base,{recursive:true});
const scratch=fs.mkdtempSync(path.join(base,"kitshot-"));process.env.TMP=process.env.TEMP=scratch;
const pub=path.join(scratch,"public");fs.mkdirSync(pub);
// 1 s of silence so <Audio src=master.wav> resolves
const wav=Buffer.alloc(44+8000*2);wav.write("RIFF",0);wav.writeUInt32LE(36+16000,4);wav.write("WAVEfmt ",8);wav.writeUInt32LE(16,16);wav.writeUInt16LE(1,20);wav.writeUInt16LE(1,22);
wav.writeUInt32LE(8000,24);wav.writeUInt32LE(16000,28);wav.writeUInt16LE(2,32);wav.writeUInt16LE(16,34);wav.write("data",36);wav.writeUInt32LE(16000,40);
fs.writeFileSync(path.join(pub,"master.wav"),wav);
const browserExecutable=(process.env.CHROME_PATH||"C:/Program Files/Google/Chrome/Application/chrome.exe"),chromiumOptions={gl:"angle"};
let browser;
try{
  const {bundle}=await import("@remotion/bundler"),{openBrowser,renderStill,selectComposition}=await import("@remotion/renderer");
  const serveUrl=await bundle({entryPoint:path.join(engine,"src","episode","index.tsx"),publicDir:pub,outDir:path.join(scratch,"bundle"),enableCaching:false});
  browser=await openBrowser("chrome",{browserExecutable,chromiumOptions});
  for(const s of specs){
    const sec=s.seconds??4,shot={start:0,end:sec,line:"",visual_idea:"",direction:{subject:"",environment:"",mood:"",move:s.move??"push-in",action:""},
      kit:s.kit,params:{subject:s.subject,...(s.params??{})},camera:s.camera??"wide",light:s.light??"day",action:s.action??"stand",expression:s.expression??"explaining",
      overlay:s.overlay??null,transition:"cut",beat:"point",reframeX:0};
    const props={shots:[shot],words:[],rms:[],duration:sec};
    const opts={serveUrl,inputProps:props,browserExecutable,chromiumOptions,puppeteerInstance:browser,timeoutInMilliseconds:180000,logLevel:"error"};
    const composition=await selectComposition({...opts,id:"Episode"});
    const errors=[];
    await renderStill({...opts,composition:{...composition,props},frame:Math.round((s.at??1.2)*24),scale:.5,output:path.join(outDir,s.name+".jpg"),imageFormat:"jpeg",jpegQuality:92,
      onBrowserLog:l=>{if(l.type==="error")errors.push(l.text);}});
    if(errors.length)console.error("ERROR in "+s.name+": "+errors[0]);
    console.log(s.name+".jpg");
  }
}finally{
  if(browser)await browser.close({silent:true});
  fs.rmSync(scratch,{recursive:true,force:true,maxRetries:4,retryDelay:300});
}
