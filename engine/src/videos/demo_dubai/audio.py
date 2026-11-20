# usage: py -3 audio.py <vo.wav> <out.wav>   Synthesised music bed + SFX (numpy only), ducked under the voice, mixed with vo at +0.6 s.
import sys, wave, numpy as np
from scipy.signal import butter, lfilter
SR = 44100; DUR = 27.0; N = int(SR * DUR); LEAD = 0.6
rng = np.random.default_rng(7)
def tt(n): return np.arange(n) / SR
def env(n, a=0.005, d=0.2): x = tt(n); return np.minimum(x / a, 1) * np.exp(-x / d)
def bp(x, lo, hi): b, a = butter(2, [lo / (SR / 2), hi / (SR / 2)], "band"); return lfilter(b, a, x)
def lp(x, f): b, a = butter(2, f / (SR / 2), "low"); return lfilter(b, a, x)
def put(buf, x, t0, g=1.0):
    i = int(t0 * SR); e = min(N, i + len(x))
    if i < N: buf[i:e] += x[: e - i] * g
def pop(f=520):
    n = int(0.16 * SR); x = tt(n); fr = f * (1 + 1.6 * np.exp(-x / 0.03)); return np.sin(2 * np.pi * np.cumsum(fr) / SR) * env(n, 0.002, 0.045)
def stamp():
    n = int(0.4 * SR); x = tt(n); th = np.sin(2 * np.pi * np.cumsum(95 * (1 + 1.2 * np.exp(-x / 0.04))) / SR) * env(n, 0.001, 0.09)
    return th + lp(rng.standard_normal(n), 2500) * env(n, 0.001, 0.025) * 0.7
def whoosh(d=0.38):
    n = int(d * SR); x = tt(n); nz = rng.standard_normal(n); fc = 300 + 5000 * (x / d) ** 2
    out = np.zeros(n); k = 512
    for s in range(0, n, k):
        f = fc[min(s, n - 1)]; seg = nz[s:s + k]; out[s:s + k] = bp(np.concatenate([nz[max(0, s - 64):s], seg]), max(100, f * 0.6), min(18000, f * 1.4))[-len(seg):] if s else seg * 0
    return out * np.sin(np.pi * np.minimum(x / d, 1)) ** 1.5
def powerdown(d=1.1):
    n = int(d * SR); x = tt(n); f = 700 * np.exp(-x * 3.2) + 40
    return (np.sin(2 * np.pi * np.cumsum(f) / SR) * 0.7 + np.sign(np.sin(2 * np.pi * np.cumsum(f * 0.5) / SR)) * 0.2) * np.exp(-x / 0.5) * np.minimum(x / 0.01, 1)
def clink(f=2200):
    n = int(0.3 * SR); x = tt(n); return (np.sin(2 * np.pi * f * x) + 0.5 * np.sin(2 * np.pi * f * 2.76 * x)) * env(n, 0.001, 0.07)
def boom():
    n = int(0.9 * SR); x = tt(n); return np.sin(2 * np.pi * np.cumsum(70 * np.exp(-x * 1.5) + 40) / SR) * env(n, 0.002, 0.3)
def ding(f=1318):
    n = int(0.8 * SR); x = tt(n); return (np.sin(2 * np.pi * f * x) + 0.3 * np.sin(2 * np.pi * f * 2 * x)) * env(n, 0.002, 0.25)
sfx = np.zeros(N)
for i in range(16): put(sfx, pop(380 + rng.random() * 380), 0.6 + i * 0.16, 0.30)
for b in [3.5, 5.9, 8.3, 11.2, 13.2, 15.4, 17.6, 20.4]: put(sfx, whoosh(), b - 0.3, 0.55)
put(sfx, pop(600), 3.65, 0.45); put(sfx, pop(780), 3.8, 0.45); put(sfx, pop(500), 9.4, 0.4)
put(sfx, lp(rng.standard_normal(int(2 * SR)), 1800) * np.hanning(int(2 * SR)) * 0.18, 5.9)  # sand spray
put(sfx, ding(), 7.9, 0.35)
for i in range(14): put(sfx, stamp(), 9.4 + i * 0.115 + 0.1, 0.55)
put(sfx, boom(), 11.95, 0.5)
for t0 in [11.55, 11.7, 11.82, 12.0, 12.1, 12.25, 12.4, 12.55, 12.7]: put(sfx, clink(1800 + rng.random() * 1400), t0, 0.22)
put(sfx, powerdown(0.9), 12.0, 0.18)
gen = lp(rng.standard_normal(int(4.0 * SR)), 140) * (0.6 + 0.4 * np.sin(2 * np.pi * 14 * tt(int(4.0 * SR)))) * 0.5  # generator rumble
put(sfx, gen * np.minimum(tt(len(gen)) / 0.3, 1) * np.minimum((4 - tt(len(gen))) / 0.8, 1), 15.4, 0.5)
for t0 in [15.75, 15.95, 16.25, 16.6, 16.9, 17.2, 19.25, 19.35]: put(sfx, bp(rng.standard_normal(int(0.07 * SR)), 800, 3500) * env(int(0.07 * SR), 0.001, 0.02), t0, 0.5)
put(sfx, powerdown(), 19.45, 0.6)
put(sfx, boom(), 21.35, 0.55); put(sfx, pop(700), 21.6, 0.4); put(sfx, ding(1568), 22.45, 0.4)
# music: Am - F - C - G, 96 bpm, soft pad + pluck arpeggio + sub pulse
bpm = 96; beat = 60 / bpm; ch = [[57, 60, 64], [53, 57, 60], [48, 52, 55], [55, 59, 62]]
mus = np.zeros(N); mf = lambda m: 440 * 2 ** ((m - 69) / 12)
for b in range(int(DUR / beat / 4) + 1):
    t0 = b * 4 * beat; notes = ch[b % 4]
    L = int(4 * beat * SR); x = tt(L)
    pad = sum(np.sin(2 * np.pi * mf(m) * x) + 0.4 * np.sin(2 * np.pi * mf(m) * 2.003 * x) for m in notes) * np.minimum(x / 0.4, 1) * np.minimum((4 * beat - x) / 0.4, 1) * 0.07
    put(mus, pad, t0)
    put(mus, np.sin(2 * np.pi * mf(notes[0] - 24) * tt(L)) * np.minimum(tt(L) / 0.05, 1) * np.minimum((4 * beat - tt(L)) / 0.2, 1) * 0.16, t0)
    for k in range(8):
        m = notes[[0, 1, 2, 1, 2, 1, 0, 1][k]] + 12; n = int(0.4 * SR); xs = tt(n)
        put(mus, (np.sin(2 * np.pi * mf(m) * xs) + 0.3 * np.sin(2 * np.pi * mf(m) * 3 * xs)) * env(n, 0.003, 0.12) * 0.06, t0 + k * beat / 2)
    for k in range(4): put(mus, np.sin(2 * np.pi * np.cumsum(120 * np.exp(-tt(int(0.2 * SR)) / 0.04) + 45) / SR) * env(int(0.2 * SR), 0.001, 0.07) * 0.28, t0 + k * beat)
mus = lp(mus, 3500)
w = wave.open(sys.argv[1]); vsr = w.getframerate(); v = np.frombuffer(w.readframes(w.getnframes()), dtype=np.int16).astype(float) / 32768
v = np.interp(np.arange(int(len(v) * SR / vsr)) / SR, np.arange(len(v)) / vsr, v)
vo = np.zeros(N); put(vo, v, LEAD)
e = np.sqrt(np.maximum(lp(vo ** 2, 12), 0)); e = np.clip(e / (np.percentile(e[e > 0.001], 90)), 0, 1); duck = 1 - 0.65 * np.minimum(1, e * 1.5)
fade = np.minimum(1, np.minimum(tt(N) / 0.5, (DUR - tt(N)) / 1.2))
mix = vo * 1.0 + mus * duck * 0.55 * fade + sfx * (1 - 0.35 * np.minimum(1, e * 1.5)) * 0.5
mix = np.tanh(mix * 0.9) / 0.72
pcm = (np.clip(mix, -1, 1) * 32000).astype(np.int16)
o = wave.open(sys.argv[2], "wb"); o.setnchannels(1); o.setsampwidth(2); o.setframerate(SR); o.writeframes(pcm.tobytes()); o.close()
print("ok", np.abs(mix).max())
