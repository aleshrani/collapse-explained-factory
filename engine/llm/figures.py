"""Literal spoken quantities from the locked line. Preserve units and decimal places on cards."""
import re
SMALL=dict(zip("zero one two three four five six seven eight nine ten eleven twelve thirteen fourteen fifteen sixteen seventeen eighteen nineteen".split(),range(20)))
SMALL.update(dict(zip("twenty thirty forty fifty sixty seventy eighty ninety".split(),range(20,100,10))))
SCALE={"thousand":1000,"million":10**6,"billion":10**9,"trillion":10**12}
N="(?:"+"|".join([*SMALL,*SCALE,"hundred"])+")"
PAT=re.compile(r"\b(?:"+N+r"(?:(?:[\s-]+(?:and[\s-]+|point[\s-]+)?)"+N+r")*|\d+(?:[,.]\d+)*)(?![\w-])",re.I)
UNIT=re.compile(r"^\s+(cubic meters|square kilometers|football pitches|swimming pools|businessmen|judges|people|kilometers|meters|metres|miles|islands|hectares|dirhams|dollars|tonnes|years|months|percent|floors|rooms|boats|hours|minutes)\b",re.I)
def value(phrase):
    p=phrase.lower().replace("-"," ").split()
    if p[0][0].isdigit():return p[0].replace(",","")
    if "point" in p:
        j=p.index("point");fraction=p[j+1:]
        if fraction and all(k in SMALL and SMALL[k]<10 for k in fraction):
            return value(" ".join(p[:j]))+"."+"".join(str(SMALL[x]) for x in fraction)
    p=[x for x in p if x!="and"]
    if len(p)>=2 and p[0] in ("nineteen","twenty") and p[1] in ("twenty","thirty","forty","fifty","sixty","seventy","eighty","ninety"):
        return str(SMALL[p[0]]*100+int(value(" ".join(p[1:]))))
    total=part=0
    for token in p:
        if token in SMALL:part+=SMALL[token]
        elif token=="hundred":part=max(part,1)*100
        elif token in SCALE:total+=max(part,1)*SCALE[token];part=0
    return str(total+part)
def quantities(text):
    for m in PAT.finditer(text):
        number=value(m[0]);unit=UNIT.match(text[m.end():])
        yield number,unit[1].lower() if unit else ""
def figures(text):
    return {n for n,u in quantities(text)}
def number_card(text):
    amounts=[(v,u) for v,u in quantities(text) if v not in ("0","1")]
    if not amounts:return ""
    v,u=next(((n,unit) for n,unit in amounts if unit),amounts[0])
    display=v
    if "." not in v:
        n=int(v)
        for label,scale in reversed(list(SCALE.items())):
            if n>=scale and n%scale==0:
                display=f"{n//scale} {label}";break
        else:display=v if 1900<=n<2100 and not u else f"{n:,}"
    return (display+" "+u).strip()

