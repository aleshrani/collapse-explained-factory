"""Plan editorial time on locked narration without generating a full voice track."""
import re
from pathlib import Path
from beat_sheet import count,partition
def editorial_rows(ep):
    script=(ep/"narration.md").read_text(encoding="utf-8-sig")
    sections=re.split(r"(?m)^#{1,3} (.+?)\s*$",script)[1:]
    rows=[];offset=0
    for title,body in zip(sections[::2],sections[1::2]):
        text=" ".join(body.split())
        duration=round(count(text)/3.649,3)
        tag=next((b for b in ("rehook","lock-in","closing","cta","hook") if b in title.lower()),"point")
        group=partition(text,duration)
        for i,row in enumerate(group):
            rows.append(dict(row,chapter=title,beat=tag if i==0 else "point",start=round(offset+row["start"],3),end=round(offset+row["end"],3)))
        offset+=duration
    return rows
