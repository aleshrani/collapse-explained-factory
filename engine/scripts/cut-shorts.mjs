import {spawnSync} from "node:child_process";
import {fileURLToPath} from "node:url";
const slug=process.argv[2];
const flags=process.argv.slice(3);
if((flags.length && (flags.length!==1 || flags[0]!=="--dry-run"))||!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug??"")){
  console.error("Usage: node scripts/cut-shorts.mjs <slug> [--dry-run]");
  process.exit(2);
}
const local=relative=>fileURLToPath(new URL(relative,import.meta.url));
const result=spawnSync(local("../../voice/.venv/Scripts/python.exe"),[local("./short-clips.py"),local("../../episodes/"+slug+"/"),...flags],{stdio:"inherit",windowsHide:true,env:{...process.env,PYTHONUTF8:"1",KOKORO_SPEED:"1.0"}});
if(result.error)console.error(result.error.message);
process.exit(result.status??1);
