"""Generate a shot per editorial beat and align cuts to Parakeet word starts."""
import argparse
import json
import math
import re
import subprocess
import time
import urllib.request
import runpy
from beat_sheet import count
from difflib import SequenceMatcher
from pathlib import Path
import jsonschema

ENGINE = Path(__file__).resolve().parents[1]
def read(path):
    return json.loads(path.read_text(encoding="utf-8-sig"))

SCHEMA = read(ENGINE / "src/episode/shots.schema.json")
CATALOG = read(ENGINE / "src/kit/catalog.json")
KITS = {kit["id"]:kit for kit in CATALOG["kits"]}
editorial_check=runpy.run_path(str(ENGINE/"scripts/validate-shots.py"))["evaluate"]
STOP = set("a an the this that these those it its on at by from where what when they them he she his her with in into out over for of off to is was were am be been also than as and or if would could should had has have did do does doing now can your you our who their then there so after before every why how while quite just are which through first get got still shown show shows across about someone somebody things".split())
NUMBERS = set("zero one two three four five six seven eight nine ten eleven twelve thirteen fourteen fifteen sixteen seventeen eighteen nineteen twenty thirty forty fifty sixty seventy eighty ninety hundred thousand million billion trillion".split())

def tokens(s):
    return re.findall(r"[a-z]+|\d+(?:[,.]\d+)*",s.casefold())
def key_words(s):
    return {w.removesuffix("s") for w in tokens(s) if w not in STOP}
from figures import figures
def validate(plan,start,end,previous=None,full=False):
    jsonschema.Draft202012Validator(SCHEMA).validate(plan)
    shots=plan["shots"]
    if full and (len(shots)<60 or len({(s["kit"],s["camera"],s["light"],s["action"],json.dumps(s["params"],sort_keys=True),json.dumps(s["overlay"],sort_keys=True)) for s in shots})<60):
        raise ValueError("A long-form episode requires at least sixty distinct setups")
    cursor=start
    for shot in shots:
        if abs(shot["start"]-cursor)>.002 or shot["end"]<=shot["start"]:
            raise ValueError(f"Gap, overlap or reversed shot at {cursor}")
        cursor=shot["end"]
        if previous and previous["camera"]==shot["camera"]:
            raise ValueError(f"Repeated framing at {shot['start']}")
        previous=shot
        spec=KITS[shot["kit"]]
        if shot["camera"] not in spec["cameras"]:
            raise ValueError("Camera unavailable for "+shot["kit"])
        if not key_words(shot["line"]).intersection(key_words(shot["visual_idea"])):
            raise ValueError("Visual must refer to a concrete subject in its narration: "+shot["line"])
        visible=" ".join([shot["visual_idea"],json.dumps(shot["overlay"] or {}),json.dumps(shot["params"])])
        missing=(figures(shot["line"])-{"0","1"})-figures(visible)
        if missing:raise ValueError("Missing spoken figure(s): "+", ".join(sorted(missing)))
        params=shot["params"]
        for key in spec.get("requiredParams",[]):
            if key not in params:raise ValueError("Missing episode dressing: "+key)
        if spec.get("sharedBase") and not key_words(shot["line"]).intersection(key_words(str(params["subject"])+" "+str(params["detail"]))):
            raise ValueError("Shared base needs episode-specific content from this line")
        for key,value in params.items():
            if key not in spec["params"]:raise ValueError("Unknown kit parameter: "+key)
            p=spec["params"][key]
            rules={k:v for k,v in p.items() if k not in ("min","max","maximumFrom","unit","default","description")}
            if "min" in p:rules.update(minimum=p["min"],maximum=p["max"])
            jsonschema.validate(value,rules)
            if "maximumFrom" in p and value>params.get(p["maximumFrom"],spec["params"][p["maximumFrom"]]["default"]):
                raise ValueError("Inconsistent "+key)
    if abs(cursor-end)>.035:raise ValueError(f"Plan ends at {cursor}, expected {end}")

def beats(script):
    result=[]
    beat="hook"
    for row in script.splitlines():
        if row.startswith("#"):
            label=row.casefold()
            beat=next((b for b in ("rehook","lock-in","closing","cta","hook") if b in label),"point")
            continue
        if not row.strip().startswith("|"):continue
        cells=[s.strip() for s in row.strip().strip("|").split("|")]
        if len(cells)!=2 or cells[0].lower()=="narration" or re.fullmatch(r"[-: ]+",cells[0]):continue
        visual=re.sub(r"\s*\(~?[\d.]+\s*s\)\s*$","",cells[1])
        result.append({"line":cells[0],"visual_idea":visual,"beat":beat})
        beat="point"
    return result

def align(rows,words,duration):
    spoken=[];starts=[]
    for row in rows:
        starts.append(len(spoken));spoken.extend(tokens(row["line"]))
    actual=[];times=[]
    for word in words:
        ts=tokens(word["w"]);actual.extend(ts);times.extend([word["t"]]*len(ts))
    matcher=SequenceMatcher(None,spoken,actual,autojunk=False)
    if matcher.ratio()<.68:raise ValueError("Script and aligned narration do not match")
    matches={}
    for i,j,size in matcher.get_matching_blocks():
        matches.update((i+k,times[j+k]) for k in range(size))
    cuts=[0.]
    for i in starts[1:]:
        first=next((matches[k] for k in range(i,min(i+8,len(spoken))) if k in matches),None)
        if first is None or first<=cuts[-1]:raise ValueError("Unresolved narration boundary: "+str(i))
        cuts.append(round(first,3))
    return [dict(row,start=a,end=b) for row,a,b in zip(rows,cuts,cuts[1:]+[duration])]

def main():
    ap=argparse.ArgumentParser()
    ap.add_argument("episode",type=Path);ap.add_argument("--check",action="store_true");ap.add_argument("--duration",type=float);ap.add_argument("--from-narration",action="store_true")
    args=ap.parse_args();ep=args.episode.resolve()
    duration=args.duration or float(subprocess.check_output(["ffprobe","-v","error","-show_entries","format=duration","-of","csv=p=0",str(ep/"vo.wav")]))
    if not math.isfinite(duration) or duration<=0:raise ValueError("Invalid audio duration")
    words=read(ep/"words.json")["words"]
    if not words or any(not 0<=w["t"]<=duration or (i and w["t"]<words[i-1]["t"]) for i,w in enumerate(words)):raise ValueError("Invalid word timings")
    if args.from_narration:
        from local_director import direct
        direct(ep,ENGINE,validate,editorial_check,figures)
        return
    if args.check and (ep/"narration-timing.json").exists():
        plan=read(ep/"shots.json");full=ep.name!="proof-v2"
        actual=" ".join(s["line"] for s in plan["shots"]).split()
        expected=" ".join(r["text"] for r in read(ep/"narration-timing.json")["segments"]).split()
        if actual!=expected:raise ValueError("Shots omit or alter locked narration")
        validate(plan,0,duration,full=full)
        errors=editorial_check(plan,duration,full)
        if errors:raise ValueError("\n".join(errors))
        return
    script=(ep/"script.md").read_text(encoding="utf-8-sig")
    rows=beats(script);full=ep.name!="proof"
    if not rows and full:raise ValueError("Provide a two-column beat sheet")
    spoken_path=ep/("narration.md" if full else "narration.txt")
    if spoken_path.exists():
        spoken=" ".join(l.strip() for l in spoken_path.read_text(encoding="utf-8-sig").splitlines() if l.strip() and not l.startswith("#"))
        if " ".join(spoken.split())!=" ".join(" ".join(row["line"].split()) for row in rows):
            raise ValueError("The beat sheet must preserve every narration word and punctuation mark in order")
        if full and not 1768<=count(spoken)<=1954:
            raise ValueError("Narration outside the 1,861-word target ±5%")
    expected=align(rows,words,duration) if rows else []
    out=ep/"shots.json"
    def compare(shots,group):
        if len(shots)!=len(group):raise ValueError("Expected one setup per beat")
        for s,w in zip(shots,group):
            if any(s[k]!=w[k] for k in ("line","visual_idea","beat","start","end")):raise ValueError("Preserve the exact beat, visual and word timing")
    if args.check:
        plan=read(out);validate(plan,0,duration,full=full)
        if expected:compare(plan["shots"],expected)
        errors=editorial_check(plan,duration,full)
        if errors:raise ValueError("\n".join(errors))
        return
    if not expected:raise ValueError("Shot generation requires a two-column beat sheet")
    prompt=(ENGINE/"llm/shotplan-prompt.md").read_text(encoding="utf-8")
    brief_path=ep/"kits.md" if full else ep.parent/"kits.md"
    brief=brief_path.read_text(encoding="utf-8-sig")
    names=re.search(r"(?m)^Catalog IDs:\s*([^\n]+)",brief)
    if not names:raise ValueError("kits.md needs the episode's Catalog IDs")
    permitted={s.strip().strip(".") for s in names.group(1).split(",")}
    scoped=[{k:v for k,v in kit.items() if k not in ("hostPositions","module")} for kit in CATALOG["kits"] if kit["id"] in permitted]
    shots=[]
    for i in range(0,len(expected),4):
        group=expected[i:i+4];error=""
        context=prompt+"\nCATALOG "+json.dumps(scoped)+"\nSCHEMA "+json.dumps(SCHEMA)+"\nPrevious framing: "+str(shots[-1]["camera"] if shots else None)+"\nBeats: "+json.dumps(group)
        for attempt in range(4):
            payload={"model":"qwen2.5-coder:7b","stream":False,"format":"json","prompt":context+error,"options":{"temperature":.17,"num_ctx":16384,"num_predict":3900}}
            try:
                req=urllib.request.Request("http://127.0.0.1:11434/api/generate",data=json.dumps(payload).encode(),headers={"Content-Type":"application/json"})
                with urllib.request.urlopen(req,timeout=450) as res:candidate=json.loads(json.load(res)["response"])
                validate(candidate,group[0]["start"],group[-1]["end"],previous=shots[-1] if shots else None)
                compare(candidate["shots"],group)
                if any(s["kit"] not in permitted for s in candidate["shots"]):raise ValueError("Use a kit from this episode")
                # The same editorial gate also validates individual batches before accepting them.
                batch=[dict(s,start=s["start"]-group[0]["start"],end=s["end"]-group[0]["start"]) for s in candidate["shots"]]
                batch[0]=dict(batch[0],beat="hook")
                errors=editorial_check({"shots":batch},full=False)
                if errors:raise ValueError("\n".join(errors))
                shots.extend(candidate["shots"]);break
            except (ValueError,KeyError,TypeError,OSError,jsonschema.ValidationError) as e:
                if attempt==3:raise
                error="\nCorrect the previous response: "+str(e)[:650];time.sleep(1)
        print(f"{len(shots)}/{len(expected)} setups",flush=True)
    plan={"shots":shots};validate(plan,0,duration,full=full)
    errors=editorial_check(plan,duration,full)
    if errors:raise ValueError("\n".join(errors))
    tmp=out.with_suffix(".pending.json");tmp.write_text(json.dumps(plan,indent=2),encoding="utf-8");tmp.replace(out)
if __name__=="__main__":main()
