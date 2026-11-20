"""Cut five sentence-safe vertical stories from the approved master and Claude's marked copy."""
import hashlib
import json
import math
import re
import subprocess
import sys
import tempfile
import wave
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
VOICE = ROOT / "voice"
FPS = 24
CTA = "Full story's on the channel."

def read(p):
    return json.loads(p.read_text(encoding="utf-8-sig"))

def norm(text):
    return " ".join(re.findall(r"[a-z0-9]+", text.lower().replace("’", "'")))

def run(*args):
    subprocess.run(list(map(str, args)), check=True)

def ff(*args):
    run("ffmpeg", "-v", "error", "-y", *args)

def marked(raw):
    markers = []
    for line in raw:
        match = re.fullmatch(r"\[SHORT\s+(\d+)\s*\(([AB])\)\s*:\s*(.*?)\]",line,re.I)
        if not match:
            raise ValueError("Invalid SHORT marker: "+line)
        fields = dict(re.findall(r'(start|end-after|stop-before|loop|cta)\s+["“]([^"”]+)["”]', match[3]))
        variant = match[2].upper()
        if "start" not in fields or ("end-after" if variant=="A" else "stop-before") not in fields:
            raise ValueError(f"SHORT {match[1]} needs its start and ending anchors")
        if variant=="A" and not fields.get("loop"):
            raise ValueError(f"SHORT {match[1]} needs Claude's open-loop line")
        markers.append(dict(fields,number=int(match[1]),variant=variant))
    if sorted(m["number"] for m in markers)!=[1,2,3,4,5] or sum(m["variant"]=="B" for m in markers)!=1:
        raise ValueError("Expected five numbered SHORT markers, four A and one B")
    return sorted(markers,key=lambda m:m["number"])

def fallback(rows,shots):
    starts=[]
    for shot in shots:
        if shot["beat"] not in ("hook","rehook"):continue
        idx=min(range(len(rows)),key=lambda i:abs(rows[i]["start"]-shot["start"]))
        if (not starts or rows[idx]["start"]-rows[starts[-1]]["start"]>=30) and rows[-1]["start"]-rows[idx]["start"]>48:
            starts.append(idx)
    if len(starts)<5:raise ValueError("Fewer than five independent hook/rehook windows; Claude needs to supply SHORT markers")
    plans=[]
    for n,i in enumerate(starts[:5],1):
        j=next(j for j in range(i+1,len(rows)) if rows[j]["start"]>=rows[i]["start"]+36)
        item={"number":n,"variant":"B" if n==5 else "A","start":rows[i]["text"]}
        if n==5:item["stop-before"]=rows[j]["text"]
        else:
            candidates=[r["text"] for r in rows[j:] if r["text"].endswith("?") and len(r["text"].split())<=11]
            if not candidates:raise ValueError(f"SHORT {n} needs a short open question from Claude")
            item.update({"end-after":rows[j-1]["text"],"loop":candidates[0]})
        plans.append(item)
    return plans

def anchor(rows,phrase,begin=0):
    phrase=" "+norm(phrase)+" "
    for i in range(begin,len(rows)):
        if phrase in " "+norm(rows[i]["text"])+" ":return i
    raise ValueError("No whole sentence contains the marked words: "+phrase.strip())

def spoken(text,cache):
    wav=cache/(hashlib.sha256(("puck@1:"+text).encode()).hexdigest()+".wav")
    if not wav.exists():
        src=wav.with_suffix(".txt");src.write_text(text,encoding="utf8")
        subprocess.run([str(VOICE/".venv/Scripts/python.exe"),str(VOICE/"tts.py"),str(src),str(wav)],cwd=VOICE,check=True)
    with wave.open(str(wav)) as w:seconds=w.getnframes()/w.getframerate()
    if seconds>6:raise ValueError(f"Claude's loop and spoken CTA take {seconds:.2f}s; limit is six seconds: {text}")
    return wav,seconds

def edit(marker,rows,total,voice_duration):
    first=anchor(rows,marker["start"])
    is_b=marker["variant"]=="B"
    end=anchor(rows,marker["stop-before" if is_b else "end-after"],first) - int(is_b)
    if end<=first:raise ValueError("SHORT ending must follow its opening sentence")
    frame=lambda t:math.ceil((t-1e-7)*FPS)
    def interval(i):
        return frame(rows[i]["start"]),frame(rows[i+1]["start"] if i+1<len(rows) else total)
    def length(i):
        a,b=interval(i);return b-a
    maximum=55*FPS-math.ceil(voice_duration*FPS)
    selected=list(range(first,end+1))
    if sum(map(length,selected))>maximum:
        # Keep the entire opening and payoff; alternate adding their neighbouring sentences.
        selected={first,end};left,right=first+1,end-1
        used=length(first)+length(end)
        while left<=right:
            for which in ("end","begin"):
                if left>right:break
                j=right if which=="end" else left
                if which=="end":right-=1
                else:left+=1
                if used+length(j)<=maximum:
                    selected.add(j);used+=length(j)
        selected=sorted(selected)
    ranges=[]
    for i in selected:
        a,b=interval(i)
        if ranges and ranges[-1][1]==a:ranges[-1][1]=b
        else:ranges.append([a,b])
    endcard=max(math.ceil(voice_duration*FPS),30*FPS-sum(b-a for a,b in ranges))
    if endcard>6*FPS:raise ValueError(f"SHORT {marker['number']} cannot reach 30s inside the marked story and six-second ending")
    return first,end,ranges,endcard

def card_image(out):
    from PIL import Image,ImageDraw,ImageFont
    image=Image.new("RGBA",(1080,1920));d=ImageDraw.Draw(image)
    ink="#302d3c";paper="#f8e9cd"
    d.rounded_rectangle((110,1310,965,1545),radius=24,fill=ink)
    d.rounded_rectangle((99,1298,954,1533),radius=24,fill=paper,outline=ink,width=8)
    font=ImageFont.truetype("C:/Windows/Fonts/arialbd.ttf",63)
    d.text((526,1376),"Full story on the channel",font=font,anchor="mm",fill=ink,stroke_width=0)
    d.polygon([(502,1430),(548,1430),(548,1463),(583,1463),(525,1510),(467,1463),(502,1463)],fill="#507e7d",outline=ink,width=5)
    image.save(out)

def segment(master,path,a,b,shots,card=None,voice=None):
    length=b-a
    covered=[s for s in shots if s["end"]>a/FPS and s["start"]<b/FPS]
    focus="0.5"
    for s in reversed(covered):
        focus=f"if(lt(t,{s['end']-a/FPS:.5f}),{s['reframeX']},{focus})"
    crop=f"crop=ih*9/16:ih:x='max(0,min(iw-ow,iw*({focus})-ow/2))':y=0,scale=1080:1920,setsar=1"
    inputs=["-ss",f"{a/FPS:.9f}","-i",master]
    if card:
        inputs += ["-loop","1","-framerate","24","-i",card,"-i",voice]
        # Remove the source subtitles while the new spoken ending plays.
        filters=f"[0:v]crop=iw:ih*0.85:0:0,{crop}[portrait];[portrait][1:v]overlay=0:0[v];[2:a]aresample=48000,apad[a]"
    else:
        filters=f"[0:v]{crop}[v];[0:a]aresample=48000[a]"
    ff(*inputs,"-filter_complex",filters,"-map","[v]","-map","[a]","-t",f"{length/FPS:.9f}","-r","24","-c:v","libx264","-preset","veryfast","-crf","18","-pix_fmt","yuv420p","-c:a","pcm_s16le","-ar","48000","-ac","2",path)
    return [math.ceil(s["start"]*FPS)-a for s in covered if a<math.ceil(s["start"]*FPS)<b]

def produce(ep):
    info=read(ep/"narration-timing.json");rows=info["segments"];shots=read(ep/"shots.json")["shots"]
    markers=marked(info["markers"]) if info["markers"] else fallback(rows,shots)
    master=ep/"episode.mp4";out=ep/"shorts";out.mkdir(exist_ok=True)
    cache=ep/".build-cache"/"teaser-speech";cache.mkdir(parents=True,exist_ok=True)
    manifest=[]
    with tempfile.TemporaryDirectory(dir=out) as work:
        temp=Path(work);card=temp/"card.png";card_image(card)
        for marker in markers:
            n=marker["number"];cta=marker.get("cta",CTA);loop=marker.get("loop","")
            speech=" ".join(x for x in (loop,cta) if x)
            voice,seconds=spoken(speech,cache)
            first,last,ranges,tail=edit(marker,rows,info["duration"],seconds)
            cue=min(last+1,len(rows)-1) if marker["variant"]=="B" else last
            chapter=cue
            while chapter>0 and rows[chapter-1]["chapter"]==rows[cue]["chapter"]:chapter-=1
            cuts=[];pos=0;paths=[]
            # Reuse the closing picture beneath the card. Never show a stop-before reveal.
            end=max(0,ranges[-1][1]-tail)
            for j,(a,b) in enumerate(ranges+[[end,end+tail]]):
                final=j==len(ranges);p=temp/f"{n}-{j}.mkv";paths.append(p);cuts.append(pos)
                cuts.extend(pos+x for x in segment(master,p,a,b,shots,card if final else None,voice if final else None))
                pos+=b-a
            listing=temp/f"{n}.txt";listing.write_text("\n".join("file '"+p.as_posix().replace("'","'\\''")+"'" for p in paths),encoding="utf8")
            pending=temp/f"teaser-{n}.mp4"
            ff("-f","concat","-safe","0","-i",listing,"-c:v","copy","-af","loudnorm=I=-14:TP=-1.3:LRA=8","-ar","48000","-c:a","aac","-b:a","192k","-movflags","+faststart",pending)
            qa=out/f"qa-{n}";qa.mkdir(exist_ok=True);bounds=qa/"shots.json"
            cuts=sorted(set(cuts+[pos]));bounds.write_text(json.dumps({"shots":[{"id":j+1,"a":a,"b":b} for j,(a,b) in enumerate(zip(cuts,cuts[1:]))]}))
            run(sys.executable,Path(__file__).with_name("episode-qa.py"),pending,qa,bounds)
            chapter_time=rows[chapter]["start"];promised_time=rows[cue]["start"]
            manifest.append({"file":pending.name,"variant":marker["variant"],"start":ranges[0][0]/FPS,"stop":ranges[-1][1]/FPS,"sourceRanges":[[a/FPS,b/FPS] for a,b in ranges],"duration":pos/FPS,"firstLine":rows[first]["text"],"payoffLine":rows[last]["text"] if marker["variant"]=="A" else None,"stoppedBefore":rows[cue]["text"] if marker["variant"]=="B" else None,"loopLine":loop,"ctaLine":cta,"spokenEndingSeconds":round(seconds,3),"matchingChapter":rows[cue]["chapter"],"chapterStart":chapter_time,"matchingMoment":promised_time,"relatedVideoCue":max(chapter_time,promised_time-6)})
        for item in manifest:(temp/item["file"]).replace(out/item["file"])
        p=temp/"manifest.json";p.write_text(json.dumps(manifest,indent=2,ensure_ascii=False),encoding="utf8");p.replace(out/p.name)

if __name__=="__main__":
    ep=Path(sys.argv[1])
    try:produce(ep)
    except (ValueError,OSError,subprocess.CalledProcessError) as exc:
        with (ep/"notes-for-script.md").open("a",encoding="utf8") as f:f.write("\n- Shorts build: "+str(exc)+"\n")
        sys.exit("Shorts build stopped: "+str(exc))

