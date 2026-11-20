"""Editorial checks for Collapse Explained's seconds-based shots.json. No dependencies."""
import argparse
import json
import math
import re
import sys
from pathlib import Path

def evaluate(plan, expected_runtime=None, full=None):
    shots=plan.get("shots") if isinstance(plan,dict) else None
    if not isinstance(shots,list) or not shots:return ["The plan has no shots."]
    errors=[]
    cursor=0.0
    previous=None
    setups=set()
    recent=[]
    views=[]
    for index,s in enumerate(shots,1):
        context=f"Beat {index}"
        if not isinstance(s,dict):
            errors.append(context+" must be an object.");continue
        a,b=s.get("start"),s.get("end")
        if not all(type(t) in (int,float) and math.isfinite(t) for t in (a,b)):
            errors.append(context+" has invalid times.");continue
        if abs(a-cursor)>.002:errors.append(f"{context} starts at {a} after {cursor}.")
        cursor=b
        if not 2.999<=b-a<=5.001:errors.append(f"{context} lasts {b-a:.3f}s; allowed 3–5s.")
        if index==1 and (a!=0 or s.get("beat")!="hook" or not (s.get("line") or "").strip()):
            errors.append("Start with the narrated, visible hook at zero.")
        if s.get("camera")==previous:errors.append(context+" repeats the previous framing.")
        previous=s.get("camera")
        visual=s.get("direction") or {}
        for key in ("subject","environment","mood","move","action"):
            if not isinstance(visual.get(key),str) or not visual[key].strip():
                errors.append(context+" lacks "+key+" in its visual direction.")
        if not s.get("visual_idea") or not s.get("light"):errors.append(context+" has incomplete visual direction.")
        cards=[]
        overlay=s.get("overlay") or {}
        for k in ("text","detail"):
            if overlay.get(k):cards.append(overlay[k])
        cards.extend(n.get("label","") for n in overlay.get("nodes",[]))
        if overlay:cards.append(" ".join(cards))
        props=s.get("params",{})
        variant=props.get("state") if s.get("kit") in ("property-office","courtroom","hotel-interior","finance-wall") else None
        location=(s.get("kit"),props.get("station") or props.get("variant") or variant or (props.get("subject") if s.get("kit")=="dubai" else None))
        recent=[(t,loc) for t,loc in recent if a-t<60]
        if recent and location==recent[-1][1]:errors.append(context+" repeats the previous physical setup.")
        if sum(loc==location for _,loc in recent)>=2:errors.append(context+" uses this physical setup a third time within sixty seconds.")
        recent.append((a,location))
        view=(location,s.get("camera"))  # same place from the same camera; a multi-place kit (dubai) counts per place
        if any(v==view and a-t<90 for t,v in views):errors.append(context+" shows the same place from the same camera within ninety seconds.")
        views.append((a,view))
        for k in ("subject","detail","value"):
            if props.get(k):cards.append(props[k])
        for pin in props.get("pins",[]):cards.append(pin.get("label",""))
        for event in props.get("events",[]):cards.append(event.get("date","")+" "+event.get("label",""))
        for card in cards:
            if len(re.findall(r"\b[\w]+(?:[-’'][\w]+)*\b",card))>6:errors.append(f"{context} exceeds six screen words: {card}")
        signature={k:s.get(k) for k in ("kit","camera","params","light","action","overlay")}
        setups.add(json.dumps(signature,sort_keys=True))
    if expected_runtime is not None and abs(cursor-expected_runtime)>.035:errors.append("Plan and soundtrack durations differ.")
    if (full if full is not None else cursor>=480) and len(setups)<60:errors.append(f"Only {len(setups)} distinct setups; sixty required.")
    return errors

if __name__=="__main__":
    ap=argparse.ArgumentParser();ap.add_argument("plan",type=Path);ap.add_argument("--duration",type=float);ap.add_argument("--full",action="store_true",default=None)
    args=ap.parse_args()
    found=evaluate(json.loads(args.plan.read_text(encoding="utf-8-sig")),args.duration,args.full)
    if found:print("\n".join(found),file=sys.stderr)
    else:print("Passed timing, framing, screen text, hook and setup checks.")
    sys.exit(bool(found))

