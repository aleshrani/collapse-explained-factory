"""Render deterministic, shot-scored music and foley under the approved narration."""
import json
import math
import re
import subprocess
import sys
from pathlib import Path

import numpy as np
import soundfile as sf
from scipy.ndimage import gaussian_filter1d, maximum_filter1d
from scipy.signal import butter, resample_poly, sosfilt

SR = 48000
TAU = 2 * np.pi
FADE = .20


def tone(phase):
    return np.sin(TAU * phase)


def motion(u, length):
    return np.clip(u / .012, 0, 1) * np.clip((length-u) / .05, 0, 1) * (u >= 0)


def cue_for(shot, chapter, index, new_gag):
    kit = shot["kit"]
    subject = str(shot["params"].get("subject", "")).lower()
    gag = shot["params"].get("gag")
    fx = []
    if kit == "dubai":
        fx += ["surf"]
        if subject in ("beach","ireland","archipelago","breakwater","landing","coast"):
            fx += ["gull"]
        if subject in ("landing","delivery","archipelago","coast"):
            fx += ["boat"]
        if subject in ("dredger","coast"):
            fx += ["dredger","spray"]
    if kit == "skyline" or (kit == "dubai" and subject == "coast"):
        fx += ["traffic"]
    if kit in ("documents","property-office"):
        fx += ["paper","pen"]
    if kit == "courtroom":
        fx += ["murmur"]
        if index % 3 == 0: fx += ["gavel"]
    if kit == "finance-wall" and ("crisis" in subject or "music stopped" in chapter):
        fx += ["alarm"]
    if shot.get("action") == "walk-in" or index % 2 == 0:
        fx += ["steps"]
    if gag and new_gag:
        fx.append(gag)
    beat = shot["beat"]
    dark = "music stopped" in chapter or "great britain" in chapter or kit=="courtroom"
    score = ("warm" if beat in ("closing","cta") else "dark" if dark and beat!="rehook"
             else "lift" if beat in ("hook","rehook") else "pulse" if beat=="lock-in" else "story")
    return dict(seconds=shot["start"], end=shot["end"], beat=beat, score=score,
                kit=kit,subject=subject, camera=shot["camera"], effects=fx, gag=gag, sting=bool(gag and new_gag),
                whip=False,hit=bool(gag and new_gag))


def sound(cue, index, t, q, rng):
    # Time is global for music. Foley is placed relative to the shot.
    n=len(t)
    beat_len, roots, third, pace = {
        "lift": (.41,[146.83,174.61,130.81,164.81],1.189, .041),
        "dark": (.64,[98,92.50,103.83,87.31],1.189,.026),
        "pulse": (.47,[130.81,146.83,116.54,130.81],1.189,.037),
        "story": (.52,[130.81,98,116.54,103.83],1.189,.030),
        "warm": (.56,[146.83,110,123.47,98],1.26,.038)
    }[cue["score"]]
    beat=np.floor(t/beat_len).astype(int)
    phase=t%beat_len
    root=np.take(roots,(beat//8)%4)
    freq=root*np.take([1,1.5,third,2,1.5,third,2,1.5],beat%8)
    pluck=(tone(freq*phase)+.18*tone(2*freq*phase))*np.exp(-9*phase)*np.minimum(1,phase*110)
    bassphase=t%(beat_len*2)
    bass=tone(root*.5*bassphase)*np.exp(-2.7*bassphase)*np.minimum(1,bassphase*75)
    padphase=t%(8*beat_len)
    pad=(tone(root*padphase)+.6*tone(root*third*padphase)+.4*tone(root*1.5*padphase))
    pad*=np.minimum(1,padphase*4)*np.minimum(1,(8*beat_len-padphase)*3)
    bed=pace*(pluck+.85*bass+(.42 if cue["score"]=="warm" else .18)*pad)
    noise=rng.standard_normal(n)
    def band(low,high):
        return sosfilt(butter(2,[low,high],fs=SR,btype="bandpass",output="sos"),noise)
    air=band(650,6500)
    low=band(40,320)
    if cue["score"]=="lift":
        bed+=.020*air*np.exp(-31*phase)*np.minimum(1,phase*200)
    if cue["sting"]:
        bed*=np.clip((q-.68)/.42,0,1)
    fx=np.zeros(n)
    def event(at,length):
        u=np.maximum(0,q-at)
        return u,motion(q-at,length)
    for effect in cue["effects"]:
        if effect=="surf": fx+=.062*air*(.63+.32*np.sin(.95*t+.4*np.sin(.27*t)))
        elif effect=="boat": fx+=.014*(tone(57*t+.55*tone(1.7*t))+.35*tone(114*t))
        elif effect=="gull":
            u,e=event(min(1.3,.45*(cue["end"]-cue["seconds"])),.64)
            fx+=.026*e*np.sin(np.pi*np.clip(u/.64,0,1))**2*tone(1300*u-300*u*u+4*np.sin(9*u))
        elif effect=="dredger": fx+=.041*low+.016*tone(43*t+1.8*tone(3*t))
        elif effect=="spray": fx+=.055*air*(.7+.3*tone(.55*t))
        elif effect=="traffic": fx+=.080*low*(.65+.35*tone(.24*t))
        elif effect=="murmur": fx+=.065*band(170,780)*(.62+.38*tone(2.7*t)*tone(1.4*t))
        elif effect in ("paper","pen"):
            u,e=event(.28 if effect=="paper" else 1.05,.62)
            fx+=e*(.09*air*(.5+.5*tone(11*u))**2 if effect=="paper" else .033*band(2200,7500)*(.5+.5*tone(17*u))**2)
        elif effect in ("steps","gavel"):
            for at in ((.16,.59,1.01) if effect=="steps" else (.48,)):
                u,e=event(at,.23);fx+=e*np.exp(-u*(23 if effect=="steps" else 30))*(.08*tone((65 if effect=="steps" else 240)*u)+.055*air)
        elif effect=="alarm":
            u,e=event(.1,1.36);fx+=.036*e*(tone(740*u-170*u*u)+.42*tone(1240*u))*(.55+.45*tone(3*u))
        elif effect=="supercar":
            u,e=event(.13,1.7);p=66*u+48*u*u
            fx+=.060*e*np.sin(np.pi*np.clip(u/1.7,0,1))*(tone(p)+.45*tone(p*2)+.3*tone(p*4))
        elif effect=="hair-dryer":
            u,e=event(.12,1.65);fx+=e*np.minimum(1,u*6)*(.12*air+.024*tone(310*u-6*np.exp(-u*8)))
        elif effect=="price-chart":
            for at,hz in ((.1,659),(.22,830),(.35,1109)):
                u,e=event(at,.35);fx+=.061*e*np.exp(-u*10)*tone(hz*u)
    perspective=.82 if cue["camera"] in ("wide","aerial") else 1
    pan=.10*np.sin(index*2.4)
    return np.column_stack((bed+fx*perspective*(1-pan),bed*.96+fx*perspective*(1+pan)))


ep,tmp=map(Path,sys.argv[1:3])
tmp.mkdir(parents=True,exist_ok=True)
vo,sr=sf.read(ep/"vo.wav",always_2d=True,dtype="float32")
voice=resample_poly(vo.mean(axis=1),SR//math.gcd(sr,SR),sr//math.gcd(sr,SR)).astype(np.float32)
duration=len(voice)/SR
def read(name):
    return json.loads((ep/name).read_text(encoding="utf-8-sig"))
shots=read("shots.json")["shots"]
rms=np.array([min(1,np.sqrt(np.mean(voice[i:i+2000]**2))*5.6) for i in range(0,len(voice),2000)])
(tmp/"levels.json").write_text(json.dumps({"duration":duration,"rms":rms.round(3).tolist()}))
raw=tmp/"mix.wav"
if ep.name=="01-dubai-world-islands":
    rows=read("narration-timing.json")["segments"]
    starts=[r["start"] for r in rows]
    env=gaussian_filter1d(maximum_filter1d(np.clip(rms*4,0,1),5),1.3)
    cues=[]
    for i,s in enumerate(shots):
        chapter=rows[max(0,np.searchsorted(starts,s["start"]+.025,side="right")-1)]["chapter"].lower()
        cues.append(cue_for(s,chapter,i,i==0 or shots[i-1]["params"].get("gag")!=s["params"].get("gag")))
    (tmp/"cues.json").write_text(json.dumps(cues,indent=2))
    raw=tmp/"mix.wav"
    # Overlap adjacent sound beds with complementary cosine ramps centred on the cut.
    with sf.SoundFile(raw,"w",samplerate=SR,channels=2,subtype="FLOAT") as file:
        tail=np.zeros((0,2));cursor=0
        for i,cue in enumerate(cues):
            start=max(0,round((cue["seconds"]-FADE/2)*SR))
            stop=min(len(voice),round((cue["end"]+FADE/2)*SR))
            if stop<=start:continue
            t=np.arange(start,stop)/SR;q=t-cue["seconds"]
            smooth=lambda z:.5-.5*np.cos(np.pi*np.clip(z,0,1))
            weight=smooth((q+FADE/2)/FADE)*smooth((cue["end"]+FADE/2-t)/FADE)
            bed=sound(cue,i,t,q,np.random.default_rng(942+i))*weight[:,None]
            if start<cursor:raise ValueError("Overlapping shot starts")
            if start>cursor:
                gap=np.zeros((start-cursor,2));gap[:min(len(gap),len(tail))]=tail[:len(gap)]
                file.write(voice[cursor:start,None]+gap);tail=tail[len(gap):]
            overlap=min(len(tail),len(bed));bed[:overlap]+=tail[:overlap]
            next_start=max(start,min(len(voice),round((cues[i+1]["seconds"]-FADE/2)*SR))) if i+1<len(cues) else len(voice)
            cut=min(stop,next_start)-start
            gain=.30+.70*(1-np.interp(t[:cut]*24,np.arange(len(env)),env))
            file.write(voice[start:start+cut,None]+bed[:cut]*gain[:,None]);tail=bed[cut:];cursor=start+cut
        if cursor<len(voice):file.write(np.repeat(voice[cursor:,None],2,axis=1))
else:
    env=gaussian_filter1d(np.minimum(1,np.round(rms,3)*5),1.8)
    chords=[[146.83,174.61,220],[116.54,146.83,174.61],[130.81,164.81,196],[110,138.59,164.81]]
    raw=tmp/"mix.wav"
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
