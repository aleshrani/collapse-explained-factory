"""Partition a locked narration into 3–5 s beats. Exact source tokens are preserved."""
import re,math
from functools import lru_cache
from difflib import SequenceMatcher

def count(text):return len(re.findall(r"\b[\w]+(?:[-’'][\w]+)*\b",text))

def partition(text,duration,words=None):
    source=text.split()
    if not source:raise ValueError("Empty narration")
    if words is None:
        starts={i:i*duration/len(source) for i in range(len(source))}
    else:
        normalize=lambda token:re.sub(r"[^a-z0-9]","",token.lower())
        a=[normalize(t) for t in source];b=[normalize(w["w"]) for w in words]
        matcher=SequenceMatcher(None,a,b,autojunk=False)
        if matcher.ratio()<.68:raise ValueError("Narration differs from the voice track")
        starts={i+k:words[j+k]["t"] for i,j,size in matcher.get_matching_blocks() for k in range(size)}
    starts[0]=0.;starts[len(source)]=duration
    # Optimize over whole paragraphs so the last line never becomes an orphan.
    best={len(source):(0,None)}
    for i in sorted(starts,reverse=True):
        if i==len(source):continue
        candidates=[]
        for j in range(i+1,len(source)+1):
            if j not in starts:continue
            d=starts[j]-starts[i]
            if d>5.0005:break
            if d<2.9995 or j not in best:continue
            punctuation=source[j-1].rstrip('"”')[-1]
            quality=0 if punctuation in ".?!" else .7 if punctuation in ",;" else 1.75 if j<len(source) and source[j].lower() in {"and","but","where","because","before","which","when","from","you","your"} else 3.8
            candidates.append((best[j][0]+quality+.32*(d-4.2)**2,j))
        if candidates:best[i]=min(candidates)
    if 0 not in best:raise ValueError("No complete timing solution. Adjust the narration or phrase pauses.")
    rows=[];i=0
    while i<len(source):
        j=best[i][1];rows.append({"line":" ".join(source[i:j]),"start":round(starts[i],3),"end":round(starts[j],3)});i=j
    return rows
