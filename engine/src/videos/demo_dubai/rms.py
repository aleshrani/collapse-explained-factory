import wave, numpy as np, json, sys
w = wave.open(sys.argv[1]); sr = w.getframerate()
x = np.frombuffer(w.readframes(w.getnframes()), dtype=np.int16).astype(float) / 32768
out = []
for f in range(810):
    c = int((f / 30 - 0.6) * sr); a, b = c - sr // 60, c + sr // 60
    seg = x[max(a, 0):max(b, 0)] if b > 0 else np.zeros(1)
    out.append(float(np.sqrt(np.mean(seg ** 2))) if len(seg) else 0.0)
o = np.array(out); ref = np.percentile(o[o > 0.002], 90)
o = np.clip(o / ref, 0, 1.2) ** 0.8
print(json.dumps([int(min(100, v * 100)) for v in o]), file=open("rms.json", "w"))
print(sr, ref, (o > 0.15).mean())
