"""Prepare, synthesize, and align Claude's locked narration using local models."""
import argparse,hashlib,json,math,re,sys,wave
from pathlib import Path
import numpy as np
import soundfile as sf

ROOT=Path(__file__).resolve().parents[2]
VOICE=ROOT/"voice"
def digest(*parts):
    return hashlib.sha256("\0".join(map(str,parts)).encode()).hexdigest()
def write(p,data):
    tmp=p.with_suffix(p.suffix+".new");tmp.write_text(json.dumps(data,ensure_ascii=False,indent=1),encoding="utf8");tmp.replace(p)
def read(p):return json.loads(p.read_text(encoding="utf-8-sig"))
def extract(source):
    clean=re.sub(r"<!--.*?-->","",source,flags=re.S)
    chapter="Hook";segments=[];markers=[];gags=[]
    for line in clean.splitlines():
        line=line.strip()
        if not line:continue
        if line.startswith("#"):chapter=line.lstrip("# ").strip();continue
        if line.startswith("["):
            if line.startswith("[SHORT "):markers.append(line)
            # [GAG: ...] is a silent visual direction; it belongs to the spoken sentence that follows it.
            m=re.match(r"\[GAG:\s*(.+?)\]\s*$",line)
            if m:gags.append({"text":m[1].strip(),"before":len(segments)})
            continue
        for sentence in re.split(r'(?<=[.!?])\s+(?=[“"A-Z])',line):
            if sentence.strip():segments.append({"text":sentence.strip(),"chapter":chapter})
    for g in gags:
        g["line"]=segments[g.pop("before")]["text"] if g["before"]<len(segments) else ""
    return segments,markers,gags
def model_version(files):
    return digest(*(f"{p.name}:{p.stat().st_size}:{p.stat().st_mtime_ns}" for p in files))

MODEL_DIRS={"supertonic":"sherpa-onnx-supertonic-3-tts-int8-2026-05-11","kitten":"kitten-mini-en-v0_8"}
PRESETS={"kokoro":"am_puck","supertonic":"M2","kitten":"Jasper"}
PRESETS.update({"qwen-c":"C", "qwen-d":"D", "qwen-e":"E", "qwen-f":"F-reference", "qwen-f-design":"F"})

def voice_version(name):
    models=VOICE/"models"
    if name=="qwen-f":
        from fixed_narrator import version
        return version()
    if name=="qwen-f-design":name="qwen-f"
    if name in ("qwen-c","qwen-d","qwen-e","qwen-f"):
        from qwen_narrator import MODEL, PROFILES
        import onnxruntime
        files=sorted(p for p in MODEL.rglob("*") if p.is_file() and p.suffix in (".npy",".onnx",".data",".json"))
        helpers=[Path(__file__).with_name(n) for n in ("qwen_narrator.py","qwen_takes.py")]
        return digest(name,PROFILES[name],onnxruntime.__version__,model_version(files+helpers))
    if name=="kokoro":
        return model_version([models/"kokoro-v1.0.onnx",models/"voices-v1.0.bin"])
    folder=models/MODEL_DIRS[name]
    if not folder.is_dir():raise FileNotFoundError(f"Missing local {name} weights: {folder}")
    import sherpa_onnx
    files=sorted(p for p in folder.iterdir() if p.suffix in (".onnx",".bin",".json") or p.name=="tokens.txt")
    return digest(name,PRESETS[name],sherpa_onnx.__version__,"cpu4-native-to-24k-v1",model_version(files))

def load_speaker(name):
    models=VOICE/"models"
    if name=="qwen-f":raise ValueError("The fixed narrator requires the per-segment clone_takes gate")
    if name=="qwen-f-design":name="qwen-f"
    if name in ("qwen-c","qwen-d","qwen-e","qwen-f"):
        from qwen_narrator import QwenNarrator
        narrator=QwenNarrator()
        return lambda text:narrator.synthesize(text,name)
    if name=="kokoro":
        from kokoro_onnx import Kokoro
        model=Kokoro(str(models/"kokoro-v1.0.onnx"),str(models/"voices-v1.0.bin"))
        return lambda text:model.create(text,voice="am_puck",speed=1.0,lang="en-us")

    import sherpa_onnx as so
    from scipy.signal import resample_poly
    folder=models/MODEL_DIRS[name]
    generation=so.GenerationConfig()
    generation.speed=1.0
    if name=="supertonic":
        names={"duration_predictor":"duration_predictor.int8.onnx","text_encoder":"text_encoder.int8.onnx","vector_estimator":"vector_estimator.int8.onnx","vocoder":"vocoder.int8.onnx","tts_json":"tts.json","unicode_indexer":"unicode_indexer.bin","voice_style":"voice.bin"}
        backend=so.OfflineTtsSupertonicModelConfig(**{key:str(folder/file) for key,file in names.items()})
        generation.sid=6  # Sorted published styles: F1–F5, M1–M5.
        generation.num_steps=8
        generation.extra={"lang":"en"}
    else:
        from kokoro_onnx.tokenizer import Tokenizer
        phonemizer=Tokenizer()
        backend=so.OfflineTtsKittenModelConfig(model=str(folder/"model.onnx"),voices=str(folder/"voices.bin"),tokens=str(folder/"tokens.txt"))
        generation.sid=0  # expr-voice-2-m, named Jasper by KittenML.
    config=so.OfflineTtsConfig(model=so.OfflineTtsModelConfig(**{name:backend},provider="cpu",num_threads=4))
    if not config.validate():raise ValueError(f"Invalid local model configuration for {name} at {folder}")
    model=so.OfflineTts(config)
    def synthesize(text):
        if name=="kitten":
            generation.phoneme_codepoints=[[ord(c) for c in phonemizer.phonemize(text,lang="en-us")]]
            audio=model.generate("",generation)
        else:
            audio=model.generate(text,generation)
        x=np.asarray(audio.samples,dtype=np.float32);sr=audio.sample_rate
        if not x.size or not np.isfinite(x).all() or np.max(np.abs(x))<.001:
            raise ValueError(f"{name} generated empty or invalid speech for {text!r}")
        if sr!=24000:
            g=math.gcd(24000,sr);x=resample_poly(x,24000//g,sr//g).astype(np.float32)
        return x,24000
    return synthesize

def main():
    ap=argparse.ArgumentParser();ap.add_argument("source",type=Path);ap.add_argument("out",type=Path);ap.add_argument("stage",choices=["tts","align"]);ap.add_argument("--proof",action="store_true")
    ap.add_argument("--engine",choices=tuple(PRESETS),default="kokoro",help="Local narration engine (default: kokoro)")
    args=ap.parse_args()
    out=args.out;out.mkdir(parents=True,exist_ok=True)
    cache=args.source.parent/".build-cache"/"speech";cache.mkdir(parents=True,exist_ok=True)
    if args.stage=="tts":
        ver=voice_version(args.engine);speaker=None
        source=args.source.read_text(encoding="utf-8-sig")
        rows,markers,gags=extract(source)
        if not rows:raise ValueError("No spoken text in narration.md")
        count=sum(len(r["text"].split()) for r in rows)
        if not args.proof and not 1768<=count<=1954:raise ValueError(f"Claude narration contains {count} spoken words; expected 1768–1954")
        start=0;parts=[];used=[]
        grouped=args.engine in ("qwen-c","qwen-d","qwen-e","qwen-f","qwen-f-design")
        if args.engine=="qwen-f":
            from fixed_narrator import clone_takes
            takes=clone_takes(rows,cache,ver,out)
        elif grouped:
            from qwen_takes import cached_takes
            takes=cached_takes(source,rows,extract,cache,ver,"qwen-f" if args.engine=="qwen-f-design" else args.engine)
        else:
            takes=((row,digest(ver,PRESETS[args.engine],"1.0",row["text"]),True) for row in rows)
        for row,key,end_of_take in takes:
            wav=cache/(key+".wav")
            if not wav.exists():
                if speaker is None:speaker=load_speaker(args.engine)
                x,sr=speaker(row["text"])
                sf.write(str(wav)+".tmp",x,sr,format="WAV");Path(str(wav)+".tmp").replace(wav)
            x,sr=sf.read(wav,dtype="float32");length=len(x)
            target=max(length+round(.14*sr),round(len(row["text"].split())/3.649*sr))
            if grouped:
                target=length+(round(.18*sr) if end_of_take else 0)
            if not args.proof and (not grouped or end_of_take):
                # Keep subsequent sentences on a stable picture grid after a line edit.
                target=math.ceil(target/(sr/24))*round(sr/24)
            if args.proof and start+length>60*sr and parts:break
            used.append(dict(row,key=key,start=start/sr,speech=length/sr))
            parts.append((x,target));start+=target
            if args.proof and start>=60*sr:break
        if not parts:raise ValueError("Empty synthesized track")
        if args.proof:
            # Distribute the final sentence gap across natural pauses without changing speech speed.
            room=60*sr-sum(len(x) for x,n in parts)
            if room<0:raise ValueError("A sentence exceeds the proof duration")
            weights=[n-len(x) for x,n in parts];total=max(1,sum(weights))
            gaps=[int(room*w/total) for w in weights];gaps[-1]+=room-sum(gaps)
        else:gaps=[n-len(x) for x,n in parts]
        temp=out/"vo.new.wav";cursor=0
        with sf.SoundFile(temp,"w",samplerate=sr,channels=1,subtype="PCM_16") as dest:
            for row,(x,_),gap in zip(used,parts,gaps):
                row["start"]=cursor/sr;dest.write(x);dest.write(np.zeros(gap,dtype="float32"));cursor+=len(x)+gap
        temp.replace(out/"vo.wav")
        write(out/"narration-timing.json",{"segments":used,"markers":markers,"gags":gags,"duration":cursor/sr,"spokenCount":sum(len(r["text"].split()) for r in used)})
        print(f"{len(used)} sentences, {cursor/sr:.3f} seconds",flush=True)
    else:
        from scipy.signal import resample_poly
        import sherpa_onnx
        m=next((VOICE/"models").glob("sherpa-onnx-nemo-parakeet*"));models=[m/f for f in ("encoder.int8.onnx","decoder.int8.onnx","joiner.int8.onnx","tokens.txt")]
        ver=model_version(models);rec=None;allwords=[]
        for row in read(out/"narration-timing.json")["segments"]:
            p=cache/(row["key"]+"-"+ver+".json")
            if not p.exists():
                if rec is None:rec=sherpa_onnx.OfflineRecognizer.from_transducer(encoder=str(models[0]),decoder=str(models[1]),joiner=str(models[2]),tokens=str(models[3]),model_type="nemo_transducer")
                x,sr=sf.read(cache/(row["key"]+".wav"),dtype="float32")
                if sr!=16000:x=resample_poly(x,16000//math.gcd(sr,16000),sr//math.gcd(sr,16000))
                stream=rec.create_stream();stream.accept_waveform(16000,x.astype(np.float32));rec.decode_stream(stream)
                words=[]
                for tok,t in zip(stream.result.tokens,stream.result.timestamps):
                    if not words or tok.startswith(("▁"," ")):words.append({"w":tok.lstrip("▁ "),"t":round(t,3)})
                    else:words[-1]["w"]+=tok
                if not words:raise ValueError("Parakeet could not align: "+row["text"])
                write(p,words)
            allwords.extend({"w":w["w"],"t":round(w["t"]+row["start"],3)} for w in read(p))
        write(out/"words.json",{"text":" ".join(w["w"] for w in allwords),"words":allwords})
        print(f"{len(allwords)} aligned tokens",flush=True)
if __name__=="__main__":main()

