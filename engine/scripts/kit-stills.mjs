// node scripts/kit-stills.mjs [construction|ghostcity|entrance|tunnel|ship ...]
// A full shot name (e.g. ship-medium-day) renders only that frame.
import fs from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";

const engine=fileURLToPath(new URL("../",import.meta.url));
const out=path.join(engine,"out","kit");
fs.mkdirSync(out,{recursive:true});
process.chdir(out);
process.env.REMOTION_TMP="./remotion-tmp";
const tempRoot=path.resolve(process.env.REMOTION_TMP);
fs.mkdirSync(tempRoot,{recursive:true});
const scratch=fs.mkdtempSync(path.join(tempRoot,"gallery-"));
process.env.TEMP=process.env.TMP=process.env.TMPDIR=scratch;
const entry=path.join(engine,"src","sandboxes","kit_gallery");
const schedule=JSON.parse(fs.readFileSync(path.join(entry,"shots.json"),"utf8"));
const names=schedule.places.flatMap(place=>schedule.shots.flatMap(shot=>schedule.lights.map(light=>[place,shot,light].join("-"))));
const filters=process.argv.slice(2);
const browserExecutable="C:/Program Files/Google/Chrome/Application/chrome.exe";
const chromiumOptions={gl:"angle"};
let browser;
try{
  for(const filter of filters)if(!schedule.places.includes(filter)&&!names.includes(filter))throw new Error("Unknown shot or place: "+filter);
  const {bundle}=await import("@remotion/bundler");
  const {openBrowser,renderStill,selectComposition}=await import("@remotion/renderer");
  const serveUrl=await bundle({entryPoint:path.join(entry,"index.tsx"),rootDir:engine,outDir:path.join(scratch,"bundle"),enableCaching:false});
  browser=await openBrowser("chrome",{browserExecutable,chromiumOptions});
  const options={serveUrl,browserExecutable,chromiumOptions,puppeteerInstance:browser,timeoutInMilliseconds:180000};
  const composition=await selectComposition({...options,id:"KitGallery"});
  for(const [index,name] of names.entries()){
    if(filters.length&&!filters.includes(name)&&!filters.includes(name.split("-")[0]))continue;
    const errors=[];
    await renderStill({...options,composition,frame:index*schedule.hold+12,scale:.5,
      output:path.join(out,name+".jpg"),imageFormat:"jpeg",jpegQuality:94,
      onBrowserLog:log=>{if(log.type==="error"){errors.push(log.text);console.error(log.text);}}});
    if(errors.length)throw new Error("Browser reported an error rendering "+name);
    console.log(name+".jpg");
  }
}finally{
  if(browser)await browser.close({silent:true});
  process.chdir(engine);
  if(path.dirname(scratch)===tempRoot&&path.basename(scratch).startsWith("gallery-"))fs.rmSync(scratch,{recursive:true,force:true,maxRetries:4,retryDelay:300});
  if(fs.existsSync(tempRoot)&&!fs.readdirSync(tempRoot).length)fs.rmdirSync(tempRoot);
}
