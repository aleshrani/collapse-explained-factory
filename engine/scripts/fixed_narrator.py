"""Local Chatterbox English conditioned once on the immutable synthetic F reference."""
import hashlib
import json
import sys
import time
from pathlib import Path

import numpy as np
import onnxruntime as ort
import soundfile as sf
from speaker_identity import VOICE, MODEL as VERIFY_MODEL, REFERENCE, Verifier

MODEL = VOICE / "models/chatterbox-en-q4"
# The six worst historical sentences scored 0.175–0.350 against the master.
THRESHOLD = .65  # originals drifted at median .51; first clone takes scored .75-.92
MAX_TRIES = 6


class FixedNarrator:
    def __init__(self):
        sys.path.insert(0, str(VOICE / "tools/qwen-tokenizer"))
        from tokenizers import Tokenizer
        self.tokenizer = Tokenizer.from_file(str(MODEL / "tokenizer.json"))
        opts = ort.SessionOptions()
        opts.intra_op_num_threads = 4
        opts.inter_op_num_threads = 1
        opts.add_session_config_entry("session.intra_op.allow_spinning","0")
        def session(name):
            return ort.InferenceSession(str(MODEL / (name+".onnx")),opts,providers=["CPUExecutionProvider"])
        reference, sr = sf.read(REFERENCE, dtype="float32")
        if sr != 24000 or reference.ndim!=1:raise ValueError("Reference must be mono 24 kHz")
        self.cond,self.prompt,self.speaker,self.features=session("speech_encoder").run(None,{"audio_values":reference[None]})
        self.embed=session("embed_tokens")
        self.lm=session("language_model_q4")
        self.decoder=session("conditional_decoder")

    def synthesize(self,text,seed):
        rng=np.random.default_rng(seed)
        ids=np.array([self.tokenizer.encode(text).ids],np.int64)
        pos=np.where(ids>=6561,0,np.arange(ids.shape[1],dtype=np.int64)[None]-1)
        kv={k.name:np.empty((1,16,0,64),np.float32) for k in self.lm.get_inputs() if k.name.startswith("past_key_values")}
        generated=[]
        for step in range(min(1000,110+20*len(text.split()))):
            emb=self.embed.run(None,{"input_ids":ids,"position_ids":pos,"exaggeration":np.array([.55],np.float32)})[0]
            if step==0:
                emb=np.concatenate([self.cond,emb],axis=1)
                length=emb.shape[1]
            logits,*cache=self.lm.run(None,{"inputs_embeds":emb,"attention_mask":np.ones((1,length),np.int64),**kv})
            kv=dict(zip(kv,cache));length+=1
            scores=logits[0,-1].copy()
            seen=list(set(generated+[6561]))
            scores[seen]=np.where(scores[seen]>0,scores[seen]/1.2,scores[seen]*1.2)
            scores[6563:]=-np.inf
            idx=np.argpartition(scores,-16)[-16:]
            probs=np.exp((scores[idx]-scores[idx].max())/.68)
            token=int(rng.choice(idx,p=probs/probs.sum()))
            if token==6562 and generated:break
            generated.append(token)
            ids=np.array([[token]],np.int64);pos=np.array([[step+1]],np.int64)
        else:raise ValueError("Did not reach speech end")
        codes=np.concatenate([self.prompt,np.array([generated],np.int64)],axis=1)
        wav=self.decoder.run(None,{"speech_tokens":codes,"speaker_embeddings":self.speaker,"speaker_features":self.features})[0].ravel()
        return np.clip(wav,-1,1),24000


def version():
    h=hashlib.sha256()
    for f in (REFERENCE,REFERENCE.with_suffix(".txt"),Path(__file__),Path(__file__).with_name("speaker_identity.py")):
        h.update(f.read_bytes())
    assets=[f for f in MODEL.iterdir() if f.is_file() and f.suffix in (".onnx",".onnx_data",".json")]
    for f in sorted([*assets,VERIFY_MODEL]):
        h.update(f"{f.name}:{f.stat().st_size}:{f.stat().st_mtime_ns}".encode())
    return h.hexdigest()


def clone_takes(rows,cache,ver,out):
    verify=Verifier()
    ref=verify.embedding(*sf.read(REFERENCE,dtype="float32"))
    model=None
    started=time.perf_counter()
    report={"model":"Chatterbox English Q4","embedding":"CAM++","referenceSHA256":hashlib.sha256(REFERENCE.read_bytes()).hexdigest(),"threshold":THRESHOLD,"maxTries":MAX_TRIES,"segments":[]}
    def save():
        scores=[r["cosine"] for r in report["segments"] if r["cosine"] is not None]
        report.update(min=min(scores,default=None),median=float(np.median(scores)) if scores else None,elapsedSeconds=round(time.perf_counter()-started,2))
        dest=out/"speaker-report.json";tmp=dest.with_suffix(".json.tmp")
        tmp.write_text(json.dumps(report,indent=2),encoding="utf8");tmp.replace(dest)
    for number,row in enumerate(rows,1):
        key=hashlib.sha256((ver+"\0"+row["text"]).encode()).hexdigest()
        wav=cache/(key+".wav");meta=cache/(key+".speaker.json")
        record={"number":number,"text":row["text"],"attempts":[],"tries":0,"cosine":None,"accepted":False}
        report["segments"].append(record)
        if wav.exists() and meta.exists():
            record.update(json.loads(meta.read_text()))
            record["cosine"]=float(verify.embedding(*sf.read(wav,dtype="float32"))@ref)
            record["accepted"]=record["cosine"]>=THRESHOLD
            if record["accepted"]:
                save();yield row,key,True;continue
        record.update(attempts=[],tries=0,accepted=False,cosine=None)
        if model is None:model=FixedNarrator()
        for attempt in range(1,MAX_TRIES+1):
            seed=int(key[:12],16)+attempt
            record["tries"]=attempt
            try:
                x,sr=model.synthesize(row["text"],seed)
                # Quantise before verification so the score is for the actual stored PCM.
                pcm=np.clip(np.rint(x*32768),-32768,32767).astype(np.int16)
                cosine=float(verify.embedding(pcm.astype(np.float32)/32768,sr)@ref)
            except ValueError as err:
                record["attempts"].append({"seed":seed,"error":str(err)});save();continue
            record["attempts"].append({"seed":seed,"cosine":cosine})
            record["cosine"]=cosine
            if cosine>=THRESHOLD:
                tmp=wav.with_suffix(".new.wav");sf.write(tmp,pcm,sr);tmp.replace(wav)
                record["accepted"]=True
                meta.write_text(json.dumps({k:record[k] for k in ("tries","attempts","cosine","accepted")}),encoding="utf8")
                break
        save()
        print(f"Segment {number}/{len(rows)}: {record['cosine']}, tries {record['tries']}",flush=True)
        if not record["accepted"]:raise ValueError(f"Speaker gate failed at segment {number} after {MAX_TRIES} tries")
        yield row,key,True
