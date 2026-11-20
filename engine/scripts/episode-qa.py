"""Fail closed on the upstream frame audit and on repeated local luminance reversals.
Usage: py -3 episode-qa.py video.mp4 outdir boundaries.json
boundaries: frame-based {shots:[{id,a,b}], planned?:[[first,last],...]}.
"""
import ast
import json
import re
import subprocess
import sys
import tempfile
from fractions import Fraction
from pathlib import Path
import numpy as np

AUDIT = Path(r"C:\Ales\Projekty\cizi\mromidev\claude-animated-shorts\templates\scripts\short_qa.py")
video, output, boundary = map(Path, sys.argv[1:4])
output.mkdir(parents=True, exist_ok=True)
meta = json.loads(boundary.read_text(encoding="utf-8-sig"))
def official(movie,folder,bounds):
    subprocess.run(["py","-3",str(AUDIT),str(movie),str(folder),str(bounds)],check=True,stdout=subprocess.DEVNULL)
    return (folder/"report.md").read_text(encoding="utf8")

def bounded_audit():
    stream=json.loads(subprocess.check_output(["ffprobe","-v","error","-select_streams","v:0","-show_entries","stream=r_frame_rate,nb_frames","-of","json",str(video)]))["streams"][0]
    fps=Fraction(stream["r_frame_rate"]);total=int(stream["nb_frames"])
    if total/float(fps)<=65:return official(video,output,boundary)
    # Retain 16 neighbouring frames for the official +/-8 median and >=12 freeze tests.
    # Lossless RGB at the exact resolution/area filter used by the official audit.
    blocks=[];problems={k:[] for k in ["black","white","frozen","pops"]}
    regex={"black":r"; black (\[[^\n]*?\]);","white":r"unplanned white (\[[^\n]*?\]);","frozen":r"frozen spans >=12f (\[[^\n]*?\])","pops":r"POPS [^\n]+?: (\[[^\n]*?\])"}
    size=int(fps*20)
    with tempfile.TemporaryDirectory(dir=output) as temp:
        tmp=Path(temp)
        for start in range(0,total,size):
            stop=min(total,start+size);a=max(0,start-16);b=min(total,stop+16)
            clip=tmp/"sample.mkv";folder=output/f"frames-{a:06d}";folder.mkdir(exist_ok=True)
            bounds=folder/"boundaries.json"
            bounds.write_text(json.dumps({"shots":[dict(s,a=max(0,s["a"]-a),b=min(b,s["b"])-a) for s in meta["shots"] if s["b"]>a and s["a"]<b],"planned":[[x-a,y-a] for x,y in meta.get("planned",[]) if y>=a and x<b]}))
            subprocess.run(["ffmpeg","-v","error","-y","-ss",f"{float(a/fps):.9f}","-i",str(video),"-frames:v",str(b-a),"-an","-vf","scale=180:320:flags=area,format=rgb24","-c:v","ffv1","-pix_fmt","bgr0",str(clip)],check=True)
            result=official(clip,folder,bounds)
            if f"FRAMES {b-a};" not in result:raise RuntimeError(f"Audit length mismatch near frame {a}")
            for key,pattern in regex.items():
                for hit in ast.literal_eval(re.search(pattern,result)[1]):
                    if isinstance(hit,tuple):
                        if hit[1]+a>=start and hit[0]+a<stop:problems[key].append((hit[0]+a,hit[1]+a))
                    elif start<=hit+a<stop:problems[key].append(hit+a)
            blocks.append(f"Frames {start}–{stop-1}: {folder.name}/report.md")
    measurement=subprocess.run(["ffmpeg","-hide_banner","-i",str(video),"-map","0:a:0","-af","ebur128","-f","null","-"],capture_output=True,text=True,check=True).stderr
    loudness=re.search(r"\bI:\s*([-\d.]+) LUFS",measurement.rsplit("Summary:",1)[-1])[1]
    result=(f"LOUDNESS I: {loudness} LUFS\nFRAMES {total}; black {problems['black']}; unplanned white {problems['white']}; frozen spans >=12f {problems['frozen']}\nPOPS (unplanned frame-diff spikes): {problems['pops']}\n"+"\n".join(blocks))
    (output/"report.md").write_text(result,encoding="utf8")
    return result
report=bounded_audit()
errors = []
for name, pattern in [
    ("black", r"; black (\[[^\n]*?\]);"), ("white", r"unplanned white (\[[^\n]*?\]);"),
    ("frozen", r"frozen spans >=12f (\[[^\n]*?\])"), ("pops", r"POPS [^\n]+?: (\[[^\n]*?\])")
]:
    match = re.search(pattern, report)
    if not match or match[1] != "[]":
        errors.append(name + " " + (match[1] if match else "missing measurement"))
loud = re.search(r"LOUDNESS I:\s*([-\d.]+) LUFS", report)
if not loud or not -15 <= float(loud[1]) <= -13:
    errors.append("integrated loudness outside -15 to -13 LUFS")

cuts = {s["a"] for s in meta["shots"]}
# Decode in display aspect, 320 pixels along the long edge. Detect repeated polarity
# reversals where the surrounding frame is nearly still. A steady glide produces a
# travelling edge, not the same pixels alternating light/dark over several frames.
probe = json.loads(subprocess.check_output(["ffprobe","-v","error","-select_streams","v:0",
    "-show_entries","stream=width,height","-of","json",str(video)]))["streams"][0]
w,h=(320,180) if probe["width"] >= probe["height"] else (180,320)
proc=subprocess.Popen(["ffmpeg","-v","error","-i",str(video),"-vf",f"scale={w}:{h}:flags=area",
    "-pix_fmt","gray","-f","rawvideo","-"],stdout=subprocess.PIPE)
previous = delta = None
streak=np.zeros((h,w),dtype=np.uint8)
regional=[]; still=0; trailing_freeze=None; i=0
while True:
    buf=proc.stdout.read(w*h)
    if not buf: break
    if len(buf)!=w*h: raise RuntimeError("Incomplete decoded frame")
    cur=np.frombuffer(buf,np.uint8).astype(np.int16).reshape(h,w)
    if i in cuts: delta=None;streak.fill(0);still=0
    if previous is not None and i not in cuts:
        change=cur-previous
        still=still+1 if np.abs(change).mean()<.02 else 0
        if still>=12: trailing_freeze=[i-still,i]
        if delta is not None:
            flip=(change*delta.astype(np.int32)<0)&(np.minimum(np.abs(change),np.abs(delta))>10)
            # The SAME pixels must reverse on successive pairs and return to a similar value.
            repeat=np.abs(change+delta)<np.maximum(4,np.abs(change)*.38)
            stable=np.mean(np.abs(change)>5)<.09
            streak=np.where(flip & repeat & stable,np.minimum(streak+1,9),0)
            tile=(streak>=3).reshape(h//20,20,w//20,20).mean(axis=(1,3))
            if (tile>.065).any():regional.append({"frame":i,"tiles":np.argwhere(tile>.065).tolist()})
        delta=change
    previous=cur;i+=1
if proc.wait()!=0:raise RuntimeError("Flicker decode failed")
if regional:errors.append("repeated local flicker")
if trailing_freeze:errors.append("frozen sequence")
result={"frames":i,"lufs":float(loud[1]) if loud else None,"regionalFlicker":regional,"frozen":trailing_freeze,"errors":errors}
(output/"gate.json").write_text(json.dumps(result,indent=2),encoding="utf-8")
print(json.dumps(result))
sys.exit(bool(errors))
