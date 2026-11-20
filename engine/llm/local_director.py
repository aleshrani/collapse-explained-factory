"""Local, catalog-constrained direction for locked narration with content-addressed beat reuse."""
import hashlib,json,re,urllib.request,os
from jsonschema import ValidationError
from pathlib import Path
from beat_sheet import partition
from figures import number_card

MOVES=["push-in","truck","orbit","pull-back","tilt","crane"]
ACTIONS=["explain","point","stand","shrug","walk-in","facepalm","shocked-jump","laugh"]
MOODS=["curious","analytical","expectant","uneasy","measured","surprised"]
GAGS=[(r"supercar|sports car|car","supercar","shrug"),(r"whiteboard|scoreboard","whiteboard","point"),(r"price chart|chart","price-chart","explain"),
  (r"ruler|tape measure","ruler","shrug"),(r"deckchair|popcorn","deckchair","stand"),(r"departure board","departure-board","point"),(r"filing cabinet","filing-cabinet","facepalm"),
  (r"mirror","mirror-wall","shrug"),(r"toy model|models on a table","toy-models","explain"),(r"checkbox|form","form","point"),(r"framed document|framed","framed-document","point"),(r"hair dryer","hair-dryer","shrug")]
def gag_for(text):
    """First matching reusable prop for a [GAG: ...] direction, with the host action that suits it."""
    for pattern,prop,action in GAGS:
        if re.search(pattern,text,re.I):return prop,action
    return None,None
PLACES={"dubai":("Dubai",25.2,55.27),"caspian":("Caspian Sea",42,51),"pyramid-hotel":("Pyongyang",39,125.7),"castle-estate":("Mudurnu",40.47,31.21),"senegal-site":("Mbodiène",14.2,-16.88),"canal":("Nicaragua",12,-85),"ice-base":("Greenland",77.17,-61.13),"airport":("Berlin",52.37,13.5),"linear-city":("Tabuk region",28.2,35.4),"settlement":("San Francisco",37.79,-122.4),"midtown-tower":("New York",40.76,-73.97),"capital-road":("Naypyidaw",19.75,96.1),"borehole":("Kola Peninsula",69.4,30.6)}
def read(p):return json.loads(p.read_text(encoding="utf-8-sig"))
def stable(x):return json.dumps(x,sort_keys=True,ensure_ascii=False)
def signature(x):return hashlib.sha256(stable(x).encode()).hexdigest()
def words(s):return re.findall(r"[\w]+(?:['’-][\w]+)*",s)
def labels(line):
    """Offer only literal, speakable labels from this beat. Clause boundaries stay intact."""
    skip=set("a an the i he she they them his her of in on to from with and or was were had at for as it is by that so then there this but have did how do you we".split())
    result=[]
    for clause in re.split(r"[,.;:!?]",line):
        tokens=words(clause)
        for size in (3,2,1):
            for j in range(len(tokens)-size+1):
                span=tokens[j:j+size]
                if span[0].lower() not in skip and span[-1].lower() not in skip:
                    result.append(" ".join(span))
    return list(dict.fromkeys(result)) or [line.strip()[:55]]
def choices(catalog,ids):
    scenes=[]
    for entry in catalog["kits"]:
        id=entry["id"]
        if id not in ids:continue
        axes=("state",) if id in ("courtroom","property-office","hotel-interior") else ("station","variant","subject")
        enumerated=next((key for key in axes if entry["params"].get(key,{}).get("enum")),None)
        for selection in entry["params"][enumerated]["enum"] if enumerated else [None]:
            scenes.append((id,{enumerated:selection} if enumerated else {},selection or id,entry["description"]))
    return scenes
def direct(ep,engine,validate,editorial,figures):
    info=read(ep/"narration-timing.json");full=ep.name!="proof-v2";base=ep if full else ep.parent
    narration=" ".join(row["text"] for row in info["segments"]);duration=info["duration"]
    rows=partition(narration,duration,read(ep/"words.json")["words"])
    catalog=read(engine/"src/kit/catalog.json");specs={k["id"]:k for k in catalog["kits"]}
    plan_brief=(base/"kits.md").read_text(encoding="utf-8-sig")
    match=re.search(r"(?m)^Catalog IDs:\s*([^\n]+)",plan_brief)
    ids=[x.strip().rstrip(".") for x in match[1].split(",")] if match else []
    if not ids:raise ValueError("kits.md has no catalog IDs")
    if ids[0]=="dubai":ids+=["dubai-service"]
    ids+=["courtroom","hotel-interior","property-office","money"]
    scene_options=choices(catalog,ids)
    cues_file=Path(__file__).with_name("scene-cues.json")
    motifs=read(cues_file)
    drawings=read(Path(__file__).with_name("blueprints.json"))
    directory=base/".build-cache"/"direction";directory.mkdir(parents=True,exist_ok=True)
    addresses=PLACES.get(ids[0],(base.name.partition("-")[2].replace("-"," "),None,None))
    chapters=[];prior=None
    for segment in info["segments"]:
        if segment["chapter"]!=prior:chapters.append((segment["start"],segment["chapter"]));prior=segment["chapter"]
    cues={min(range(len(rows)),key=lambda i:abs(rows[i]["start"]-t)):label for t,label in chapters}
    gags=info.get("gags",[])
    history=[];views=[];shots=[];markup=[];current="";version=signature([Path(__file__).read_text(encoding="utf8"),catalog,motifs,drawings])
    for i,row in enumerate(rows):
        line=row["line"];chapter=cues.get(i,current);new_chapter=i in cues;current=chapter
        beat=next((b for b in ("rehook","lock-in","closing","cta","hook") if b in chapter.lower()),"point") if new_chapter else "point"
        if i==0:beat="hook"
        eligible=[(j,v) for j,v in enumerate(scene_options) if (not history or history[-1][1]!=v[2]) and sum(key==v[2] and row["start"]-t<60 for t,key in history)<2]
        nearest=" ".join(r["line"] for r in rows[max(0,i-1):i+2])
        cache=directory/(signature([version,line,nearest,chapter])+".json")
        framing=[x for x in ("wide","medium","close","low","aerial","dolly") if not shots or x!=shots[-1]["camera"]]
        gag=next((g for g in gags if g["line"] and g["line"][:50] in line),None);gprop,gaction=gag_for(gag["text"]) if gag else (None,None)
        if gag:framing=[x for x in framing if x in ("wide","dolly","low")] or framing   # the prop has to be in frame
        drawing=next((d for d in drawings if re.search(d["match"],line,re.I)),None)
        options={v[0]+("/"+v[2] if v[0]!=v[2] else ""):v for j,v in eligible if v[0]!="timeline" and (v[0]!="blueprint" or drawing) and (v[0]!="map" or addresses[1] is not None)}
        def score(v,phrase):
            if v[0]=="blueprint" and drawing:return 8
            return sum(len(term.split())+1 for term in motifs.get(v[2],motifs.get(v[0],[])) if re.search(r"\b"+re.escape(term)+r"\b",phrase,re.I))
        context=line if any(score(v,line) for v in options.values()) else nearest
        strongest=max((score(v,context) for v in options.values()),default=0)
        if strongest:
            options={j:v for j,v in options.items() if score(v,context)>=strongest}
        else:
            # Return to the project or its record for connective prose. Service props
            # (milk, gauges, a fridge) require an actual matching cue in this passage.
            safe={j:v for j,v in options.items() if v[2] in (ids[0],"archipelago","documents","map","signed","model","boardroom")}
            if safe:options=safe
        kinds=", ".join(options)
        prompt=f"""Direct one three-to-five-second illustrated engineering documentary beat. English. React to the precise sentence, name an object or place from the line, depict its action. All people generic. Keep a legal allegation attributed. Select a physical set from this list, paying attention to what is already modeled. For an abstraction use an evidence desk, dated card or project map. Choose a screen label of up to five words, taken directly from the line. Choose a subject phrase of up to five words that includes a key noun from the line. Write one short visual idea containing that noun. JSON only.
Project: {base.name}. Chapter: {chapter}. Nearby voice: {nearest}
Beat: {line}
Sets: {kinds}
Framing: {", ".join(framing)}. Moves: {", ".join(MOVES)}. Host gestures: {", ".join(ACTIONS)}."""
        fields={"set":{"type":"string","enum":list(options)},"camera":{"type":"string","enum":framing},"move":{"type":"string","enum":MOVES},"gesture":{"type":"string","enum":ACTIONS},"subject":{"type":"string"},"label":{"type":"string"},"idea":{"type":"string"}}
        fields["label"]["enum"]=labels(line)
        fields["subject"]["enum"]=labels(line)
        grammar={"type":"object","additionalProperties":False,"properties":fields,"required":list(fields)}
        error="";blocked=set()
        for attempt in range(5):
            try:
                fields["camera"]["enum"]=[x for x in framing if x not in blocked] or framing
                grammar={"type":"object","additionalProperties":False,"properties":fields,"required":list(fields)}
                if attempt==0 and cache.exists():answer=read(cache)
                else:
                    req={"model":"qwen2.5-coder:7b","prompt":prompt+error,"stream":False,"format":grammar,"options":{"temperature":.18,"num_ctx":4096,"num_predict":250,"seed":17+i+attempt}}
                    request=urllib.request.Request("http://127.0.0.1:11434/api/generate",data=json.dumps(req).encode(),headers={"Content-Type":"application/json"})
                    with urllib.request.urlopen(request,timeout=600) as response:answer=json.loads(json.load(response)["response"])
                kit,defaults,place,desc=options[str(answer["set"])]
                params=dict(defaults);subject=answer["subject"].strip();label=answer["label"].strip();idea=answer["idea"].strip()
                card=number_card(line)
                if not subject or len(words(subject))>6 or len(words(label))>6:raise ValueError("Use 1–6 words for each subject or label")
                if answer["camera"] not in framing:raise ValueError("Repeated framing")
                # Same kit from the same camera looks like the same picture: keep every such pairing 90 s apart.
                if any(k==kit and c==answer["camera"] and row["start"]-t<90 for t,k,c in views):blocked.add(answer["camera"]);raise ValueError("This kit was shown from the "+answer["camera"]+" camera in the last 90 seconds; choose another camera or set")
                if kit=="map" and addresses[1] is None:raise ValueError("Geographic coordinates unavailable; choose a different physical set")
                if specs[kit].get("sharedBase"):
                    params.update(subject=subject,detail=card or label or subject)
                    if kit=="map":params["pins"]=[dict(label=addresses[0],lat=addresses[1],lon=addresses[2])]
                    if kit=="timeline":
                        dates=re.findall(r"\b(?:19|20)\d{2}\b",(base/"research.md").read_text(encoding="utf-8-sig").split("## Unverified")[0])
                        dates=list(dict.fromkeys(dates))
                        if len(dates)<2:raise ValueError("No dated pair for timeline; use another set")
                        params["events"]=[dict(date=d,label=subject) for d in sorted(dates)[:2]]
                    if kit=="blueprint":params.update(outline=drawing["outline"],subject=drawing["title"],detail=label)
                    if kit=="money":params["value"]=card or label or subject
                if "crowd" in specs[kit]["params"]:
                    count=re.search(r"\b(one|two|three|four|five|six)\s+(businessmen|buyers|judges|people|workers|investors)\b",line,re.I)
                    if count:params["crowd"]=("one","two","three","four","five","six").index(count[1].lower())+1
                if "phase" in specs[kit]["params"]:
                    params["phase"]="proposal" if re.search(r"\b(plan|proposed|design)\b",line,re.I) else "work" if re.search(r"\b(building|work|construction)\b",line,re.I) else "record"
                if gag:
                    params["gag"]=gprop if gprop else None
                    if gprop is None:params.pop("gag")
                    idea=(idea.rstrip(".")+". GAG: "+gag["text"]).strip()
                light="golden" if any(w in nearest.lower() for w in ["sunset","evening","night","dusk"]) else "day"
                mood=MOODS[3 if any(w in line.lower() for w in ("jail","court","crash","lost","cancelled")) else 0 if beat in ("hook","rehook") else 1]
                text=card or label or subject
                # The caption renderer handles each spoken figure. Include their exact values in the visual brief.
                numbers=sorted(figures(line)-{"0","1"})
                notes=(" The timed captions carry "+" and ".join(numbers)+".") if numbers else ""
                visual=f"{idea} Frame {subject} with the visible label “{label}”. {answer['camera'].capitalize()} {answer['move']} in {place.replace('-',' ')} with {light} light and a {mood} mood."+notes
                shot={**row,"kit":kit,"params":params,"camera":answer["camera"],"light":light,"visual_idea":visual,"direction":{"subject":subject,"environment":place.replace("-"," "),"mood":mood,"move":answer["move"],"action":idea},"action":gaction or answer["gesture"],"expression":"shocked" if beat=="hook" else "explaining","overlay":{"kind":"number" if numbers else "label","text":text} if text and not specs[kit].get("sharedBase") else None,"transition":"cut","beat":beat,"reframeX":.5}
                validate({"shots":[shot]},row["start"],row["end"],previous=shots[-1] if shots else None)
                errors=editorial({"shots":shots+[shot]},full=False)
                if errors:raise ValueError(errors[-1])
                # The full-episode uniqueness check runs inside the fifth-attempt limit as well.
                if i==len(rows)-1:
                    errors=editorial({"shots":shots+[shot]},duration,full)
                    if errors:raise ValueError(errors[-1])
                break
            except (KeyError,TypeError,ValueError,OSError,ValidationError) as exc:
                print(f"Beat {i+1}, attempt {attempt+1}: {exc}",flush=True)
                error="\nCorrect this rule: "+str(exc)[:350]
                if attempt==4:
                    with (base/"notes-for-script.md").open("a",encoding="utf8") as f:f.write(f"\n- Visual planning stopped at {row['start']:.2f}s. {line} — {exc}\n")
                    raise ValueError(f"Beat {i+1} failed after five attempts: {exc}") from exc
        cache.write_text(json.dumps(answer),encoding="utf8");shots.append(shot);history.append((row["start"],place));views.append((row["start"],kit,answer["camera"]))
        if new_chapter:markup.extend(["\n## "+chapter,"\n| Narration | Required on-screen visual (+ duration) |","| --- | --- |"])
        markup.append(f"| {line} | {visual} (~{row['end']-row['start']:.3f} s) |")
        print(f"Beat {i+1}/{len(rows)}: {kit}, {shot['camera']}",flush=True)
    result={"shots":shots};validate(result,0,duration,full=full)
    for name,data in (("shots.json",json.dumps(result,ensure_ascii=False,indent=2)),("script.md","\n".join(markup)+"\n")):
        tmp=ep/(name+".new");tmp.write_text(data,encoding="utf8");tmp.replace(ep/name)

