"""Deterministic score and foley, keyed to the shot timeline, at 48 kHz.
The music follows the local claude-animated-shorts synth-and-duck approach.
Measure and master the resulting programme using two-pass EBU R128 loudnorm.
"""
import json, math, re, subprocess, sys
from pathlib import Path
import numpy as np
import soundfile as sf
from scipy.signal import resample_poly
from scipy.ndimage import gaussian_filter1d

ep,tmp=map(Path,sys.argv[1:3])
vo,sr=sf.read(ep/"vo.wav",always_2d=True,dtype="float32")
voice=vo.mean(axis=1);SR=48000
voice=resample_poly(voice,SR//math.gcd(sr,SR),sr//math.gcd(sr,SR)).astype(np.float32)
duration=len(voice)/SR
plan=json.loads((ep/"shots.json").read_text(encoding="utf-8-sig"))
rms=[]
for i in range(math.ceil(duration*24)):
    chunk=voice[i*2000:(i+1)*2000]
    rms.append(round(float(min(1,np.sqrt(np.mean(chunk**2))*5.6)),3) if len(chunk) else 0)
(tmp/"levels.json").write_text(json.dumps({"duration":duration,"rms":rms}))
# Render one short block at a time so ten-minute mixes have bounded working memory.
env=gaussian_filter1d(np.minimum(1,np.array(rms)*5),1.8)
chords=[[146.83,174.61,220],[116.54,146.83,174.61],[130.81,164.81,196],[110,138.59,164.81]]
shots=plan["shots"]; raw=tmp/"mix.wav"
cue_table=[{"seconds":s["start"],"beat":s["beat"],"whip":s["transition"]=="whip",
            "hit":bool(s["overlay"]) or s["beat"] in ("hook","rehook")} for s in shots]
(tmp/"cues.json").write_text(json.dumps(cue_table,indent=2),encoding="utf-8")
# All action cues share a quiet, short room return, carried across audio block boundaries.
tail_size=int(SR*.126)
room_tail=np.zeros(tail_size)
with sf.SoundFile(raw,"w",samplerate=SR,channels=2,subtype="FLOAT") as file:
    for offset in range(0,len(voice),SR):
        v=voice[offset:offset+SR];t=(offset+np.arange(len(v)))/SR
        duck=.34+.66*(1-np.interp(t*24,np.arange(len(env)),env))
        beat=np.floor(t/.48).astype(int); phase=t%(.48)
        table=np.asarray(chords)
        hz=table[(beat//16)%4,beat%3]
        pluck=np.sin(2*np.pi*phase*hz)*np.exp(-phase*8)*np.minimum(1,phase*120)
        bass=np.sin(2*np.pi*(t%1.92)*table[(beat//16)%4,0]/2)*np.exp(-(t%1.92)*3)
        bed=(.038*pluck+.029*bass)*duck*np.minimum(1,t*2)*np.minimum(1,(duration-t)*1.8)
        sfx=np.zeros(len(v))
        for index,cue in enumerate(cue_table):
            onset=cue["seconds"]
            if onset>t[-1] or onset+.46<t[0]:continue
            u=t-onset;mask=(u>=0)&(u<.46);q=u[mask]
            if cue["whip"]:
                rnd=np.random.default_rng(index+37);noise=rnd.normal(size=22081)
                sfx[mask]+=.043*noise[np.minimum(22080,(q*SR).astype(int))]*np.sin(np.pi*q/.46)**3
            if cue["hit"]:
                sfx[mask]+=.076*np.sin(2*np.pi*(q*196+3*(1-np.exp(-q*20))))*np.exp(-q*13)
        wet=np.zeros(len(v)+tail_size);wet[:tail_size]=room_tail
        for delay,gain in ((.037,.09),(.073,.05),(.126,.024)):
            start=int(delay*SR);wet[start:start+len(v)]+=sfx*gain
        room_tail=wet[len(v):].copy()
        file.write(np.stack([v+bed+sfx*.9+wet[:len(v)],v+bed*.95+sfx+wet[:len(v)]],axis=1))
base=["ffmpeg","-hide_banner","-nostats","-y","-i",str(raw)]
target="loudnorm=I=-14:TP=-1.3:LRA=8"
probe=subprocess.run(base+["-af",target+":print_format=json","-f","null","-"],capture_output=True,text=True,check=True)
m=json.loads(re.findall(r'\{[^{}]*"input_i"[^{}]*\}',probe.stderr)[-1])
args=":".join(k+"="+m[v] for k,v in {"measured_I":"input_i","measured_TP":"input_tp","measured_LRA":"input_lra","measured_thresh":"input_thresh","offset":"target_offset"}.items())
subprocess.run(base+["-loglevel","error","-af",target+":"+args+":linear=true","-ar","48000","-c:a","pcm_s24le",str(tmp/"master.wav")],check=True)
