# Word timings with Parakeet TDT (sherpa-onnx). usage: align.py in.wav out.json
import sys, json, glob, numpy as np, soundfile as sf, sherpa_onnx
d = glob.glob("models/sherpa-onnx-nemo-parakeet*")[0]
rec = sherpa_onnx.OfflineRecognizer.from_transducer(
    encoder=f"{d}/encoder.int8.onnx", decoder=f"{d}/decoder.int8.onnx", joiner=f"{d}/joiner.int8.onnx",
    tokens=f"{d}/tokens.txt", model_type="nemo_transducer")
a, sr = sf.read(sys.argv[1], dtype="float32")
if a.ndim > 1: a = a.mean(1)
if sr != 16000:
    from scipy.signal import resample_poly
    a = resample_poly(a, 16000, sr).astype("float32"); sr = 16000
s = rec.create_stream(); s.accept_waveform(sr, a); rec.decode_stream(s)
r = s.result
words, cur, start = [], "", None
for tok, t in zip(r.tokens, r.timestamps):
    if tok.startswith("▁") or tok.startswith(" "):
        if cur: words.append({"w": cur, "t": round(start, 3)})
        cur, start = tok.lstrip("▁ "), t
    else:
        cur += tok
        if start is None: start = t
if cur: words.append({"w": cur, "t": round(start, 3)})
json.dump({"text": r.text, "words": words}, open(sys.argv[2], "w", encoding="utf-8"), indent=1)
print(len(words), "words;", r.text[:120])
