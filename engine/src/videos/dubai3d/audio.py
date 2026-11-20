# Sound for "The World" (dubai3d): the claude-animated-shorts audio engine (templates/audio: dsp, instruments,
# sfx_gen, the mix limiter) driven by this short's picture timeline (story.ts frames, voice at +0.5 s).
# Synthesized SFX + an original three-part score (bright island groove -> tape-stop when the money runs out ->
# sparse minor dusk -> warm end-card resolve), music ducked under the voice (words.json spans), master to -14 LUFS
# integrated with the engine's 4x-oversampled look-ahead limiter (<= -1 dBTP). 26.000 s, 48 kHz stereo 24-bit.
# usage: python audio.py <engine_audio_dir> <episode_dir> <out.wav>
import sys, os, json, math
import numpy as np
from scipy import signal

ENGINE, EP, OUT = sys.argv[1], sys.argv[2], sys.argv[3]
sys.path.insert(0, ENGINE)
from dsp import SR, ns, tt, rng, lp, hp, bp, colored, smooth_noise, fades, phase, modal, pan, st, place, widen, dbg, integrated, true_peak, read_wav, write_wav, make_ir, convolve_st
import instruments as I
import sfx_gen as X
from mix import limiter

FPS, TOTAL, LEAD = 30, 780, 0.5
DUR = TOTAL / FPS
N = ns(DUR)
F = lambda f: f / FPS
W = lambda t: round((t + LEAD) * FPS)
from types import SimpleNamespace
EV = SimpleNamespace(SHOCK=W(3.2) - 2, CARD=W(5.52) - 2, SOLD0=W(8.8) - 3, SOLD1=W(10.24) - 2, STOP=W(11.28) - 2, DARK0=W(10.88) - 3,
          FACEPALM=W(13.92) - 3, SMOKE=W(16.08) - 3, OWN=W(17.28) - 3, OUT=W(18.8) - 2, TITLE=W(20.5) + 2, TAG=W(21.04))
CUTS = [101, 172, 245, 334, 372, 460, 530, 608]
SIGNS = [276, 280, 281, 282, 286, 288, 290, 292, 296, 298, 301, 304, 307, 311, 312, 315, 316]  # logged by world.ts (SIGNTIMES)
hh = lambda i, s=0: (math.sin(i * 127.1 + s * 311.7) * 43758.5453) % 1.0
r = rng(2008)
sfx = np.zeros((2, N)); amb = np.zeros((2, N)); mus = np.zeros((2, N))

def env_lin(n, pts):
    return np.interp(np.arange(n) / SR, [p[0] for p in pts], [p[1] for p in pts])
def seg(buf, x, t0, gain=1.0, p=0.0):
    place(buf, pan(x, p) if np.ndim(x) == 1 else x, t0, gain)

# ---------------- custom sounds (own synthesis on the engine's dsp) ----------------
def pop(f0=700, d=0.18):
    t = tt(d); y = np.sin(phase(f0 * (1 + 1.4 * np.exp(-t / 0.025)))) * np.exp(-t / 0.045)
    return fades(y + 0.3 * bp(r.standard_normal(len(t)), 1500, 6000, 1) * np.exp(-t / 0.008), 0.0005, 0.02)
def ding(f=1318.5, d=1.2, v=0.6):
    return I.glock(f, v, r, d)
def thump(d=0.5, f0=55):
    t = tt(d); return np.sin(phase(f0 * (1 + 0.8 * np.exp(-t / 0.03)))) * np.exp(-t / 0.14) + 0.4 * lp(r.standard_normal(len(t)), 300) * np.exp(-t / 0.02)
def powerdown(d=1.4, f0=620):
    t = tt(d); f = f0 * np.exp(-t * 2.6) + 30
    y = 0.6 * np.sin(phase(f)) + 0.25 * np.sign(np.sin(phase(f * 0.5))) + 0.15 * np.sin(phase(f * 2.01))
    return lp(y, 2500) * np.exp(-t / 0.55) * np.minimum(t / 0.01, 1)
def click(d=0.06):
    t = tt(d); return bp(r.standard_normal(len(t)), 1500, 7000, 1) * np.exp(-t / 0.004) + np.sin(phase(np.full(len(t), 2200.0))) * np.exp(-t / 0.006) * 0.4
def engine(d, rpm=7.0, level=1.0, stop_at=None):
    """ship / generator diesel: firing pulses (rpm Hz) through a low resonant body + rattle"""
    n = ns(d); t = np.arange(n) / SR
    rate = np.full(n, rpm)
    if stop_at is not None:
        k = t > stop_at; rate[k] = rpm * np.exp(-(t[k] - stop_at) / 0.35)
    ph = np.cumsum(rate) / SR
    pulse = np.maximum(0, np.sin(2 * np.pi * ph)) ** 6
    body = lp(pulse * colored(n, r, 0.3), 220, 2) * 3 + 0.5 * lp(colored(n, r, 1.5), 90, 2)
    rat = bp(r.standard_normal(n), 900, 3000, 1) * pulse * 0.15
    e = np.ones(n) if stop_at is None else np.where(t < stop_at, 1.0, np.exp(-(t - stop_at) / 0.5))
    return (body + rat) * e * level
def hiss(d, lo=700, hi=5000):
    n = ns(d); return bp(colored(n, r, 0.3), lo, hi, 1) * (0.75 + 0.25 * smooth_noise(n, r, 3.0))
def buzz(d, f=100):
    t = tt(d); return (np.sign(np.sin(2 * np.pi * f * t)) * 0.3 + np.sin(2 * np.pi * f * 2 * t) * 0.3) * 0.5 + 0.2 * bp(r.standard_normal(len(t)), 2000, 6000, 1)
def tick(f=2600):
    return modal(0.07, [(f, 1.0, 0.012), (f * 2.7, 0.4, 0.006)], r)

# ---------------- ambience ----------------
seg(amb, X.breeze(F(372), r, 0.5, bright=700), 0.0, 0.5)
golden_sea = X.water_bed(F(372), r, close=0.3, slosh_rate=0.4)
seg(amb, golden_sea * env_lin(golden_sea.shape[1], [(0, 0), (0.6, 1), (F(372) - 0.1, 1), (F(372), 0)])[None, :], 0.0, 0.35)
dusk = X.water_bed(F(608 - 372), r, close=0.2, slosh_rate=0.3) * 0.3
seg(amb, dusk, F(372), 0.9)
cr = X.crickets(F(608 - 372), r, 3) * 0.05
seg(amb, widen(cr * env_lin(len(cr), [(0, 0), (1.0, 1), (F(EV.OUT - 372), 1), (F(EV.OUT - 372) + 0.4, 0.35), (10, 0.35)]), r, 9, 0.8), F(372), 1.0)
seg(amb, X.breeze(F(TOTAL - 608), r, 0.5, bright=800), F(608), 0.45)

# ---------------- shot 1-2 ----------------
seg(sfx, X.whoosh(2.8, r, peak=2.3, f_lo=250, f_hi=1800, width=1.0, tail=0.4), 0.2, 0.55)      # the aerial descent
seg(sfx, X.whoosh(0.5, r, peak=0.18, f_lo=600, f_hi=3500), F(101) - 0.15, 0.5)                  # cut to the sandbar
seg(sfx, thump(0.6, 60), F(EV.SHOCK + 1), 0.9)
seg(sfx, ding(1760, 0.9, 0.5), F(EV.SHOCK + 1), 0.55, 0.15)
seg(sfx, ding(2637, 0.7, 0.35), F(EV.SHOCK + 4), 0.45, -0.15)

# ---------------- shot 3: dredger rainbowing ----------------
stopT = F(EV.STOP)
for (a, b, g, p) in [(F(172), F(245), 1.0, -0.3), (F(334), F(372), 1.3, 0.0)]:
    d = b - a
    e = engine(d, 7.5, 1.0, stop_at=(stopT - a) if a < stopT < b else None)
    seg(sfx, e * env_lin(len(e), [(0, 0), (0.08, 1), (d - 0.05, 1), (d, 0)]), a, 0.35 * g, p)
    hs = hiss(d, 500, 4500) * env_lin(ns(d), [(0, 0), (0.08, 1), (max(0.09, min(d, stopT - a)), 1), (max(0.1, min(d, stopT - a) + 0.25), 0), (d, 0)])
    seg(sfx, hs, a, 0.22 * g, 0.2)
    landing = lp(colored(ns(d), r, 0.8), 900, 2) * env_lin(ns(d), [(0, 0), (0.1, 1), (max(0.11, min(d, stopT - a + 0.6)), 1), (max(0.12, min(d, stopT - a + 1.4)), 0), (d, 0)])
    seg(sfx, landing, a, 0.35 * g, -0.2)
seg(sfx, X.whoosh(0.45, r, peak=0.16), F(172) - 0.12, 0.45)
seg(sfx, pop(600), F(EV.CARD), 0.6)
for k in range(12):  # counter ticks while the number runs up
    seg(sfx, tick(2400 + 140 * k), F(EV.CARD) + 0.05 + k * 0.06, 0.18, 0.1)
seg(sfx, ding(1568, 1.2, 0.55), F(EV.CARD) + 0.78, 0.5)

# ---------------- shot 4: SOLD signs ----------------
seg(sfx, X.whoosh(0.45, r, peak=0.16), F(245) - 0.12, 0.4)
for i, f in enumerate(SIGNS):
    seg(sfx, X.hammer_hit(r, 0.55 + 0.25 * (i / len(SIGNS))), F(f), 0.32 + 0.25 * (i / len(SIGNS)), (hh(i, 3) - 0.5) * 0.8)
    seg(sfx, pop(520 + 30 * i), F(f), 0.22, (hh(i, 4) - 0.5) * 0.6)
seg(sfx, ding(2093, 1.0, 0.6), F(EV.SOLD1) + 0.03, 0.5)  # "sold": cash-register-like bright ding
seg(sfx, ding(2637, 0.9, 0.5), F(EV.SOLD1) + 0.11, 0.45)

# ---------------- shot 5: money ran out ----------------
seg(sfx, powerdown(1.3, 520), stopT, 0.45)
seg(sfx, thump(0.7, 48), F(EV.STOP + 1), 1.0)
sp = X.splash_big(r)
seg(sfx, lp(sp, 1800), stopT + 0.55, 0.25, -0.1)  # the last sand thuds down

# ---------------- shot 6: resort, no power lines ----------------
seg(sfx, X.whoosh(0.5, r, peak=0.2, f_lo=300, f_hi=2000), F(372) - 0.15, 0.4)
seg(sfx, X.push_thump(r), F(EV.FACEPALM) + 0.03, 0.8)
seg(sfx, thump(0.4, 70), F(EV.FACEPALM + 2), 0.35)

# ---------------- shot 7: generator ----------------
gd = F(EV.OUT + 6) - F(400)
g = engine(gd, 11.0, 1.0, stop_at=F(EV.OUT + 2) - F(400))
heavy = np.clip((np.arange(len(g)) / SR - (F(EV.SMOKE) - F(400))) / 0.4, 0, 1)
shot_level = env_lin(len(g), [(0, 0.15), (F(460) - F(400) - 0.1, 0.15), (F(460) - F(400), 1.0), (F(530) - F(400), 1.0), (F(530) - F(400) + 0.1, 0.45), (gd, 0.45)])
seg(sfx, g * (0.7 + 0.6 * heavy) * shot_level, F(400), 0.42, 0.25)
for f in range(460, 530):  # brown-out flicker: a buzz burst on every dip
    n = f // 2
    if f % 2 == 0 and hh(n, 5) < 0.22:
        seg(sfx, buzz(0.07) * np.hanning(ns(0.07)), F(f), 0.08, -0.2)
for k, f in enumerate(range(EV.OUT - 6, EV.OUT)):
    seg(sfx, buzz(0.034) * np.hanning(ns(0.034)), F(f), 0.09 * (k % 2 + 0.5))
seg(sfx, X.whoosh(0.4, r, peak=0.14), F(460) - 0.12, 0.35)

# ---------------- shot 8: lights out ----------------
seg(sfx, X.whoosh(0.4, r, peak=0.14, f_lo=400, f_hi=2600), F(530) - 0.12, 0.35)
seg(sfx, click(), F(EV.OUT), 0.6)
seg(sfx, powerdown(1.6, 700), F(EV.OUT), 0.55)
seg(sfx, thump(0.9, 42), F(EV.OUT), 1.0)

# ---------------- end card ----------------
seg(sfx, X.whoosh(1.0, r, peak=0.5, f_lo=200, f_hi=2400, width=1.0, tail=0.3), F(608) - 0.5, 0.5)
seg(sfx, pop(640), F(EV.TITLE), 0.5); seg(sfx, pop(760), F(EV.TITLE + 4), 0.5); seg(sfx, pop(900), F(EV.TAG), 0.45)
seg(sfx, ding(1318.5, 1.6, 0.5), F(EV.TAG) + 0.04, 0.4)

# ---------------- score ----------------
m2f = lambda m: 440.0 * 2 ** ((m - 69) / 12)
def bar_chords(t0, bpm, chords, bars, pluck_vel=0.5, arp=(0, 1, 2, 1, 2, 1, 0, 2), drums=True, bass=True, padv=0.35, glock_line=None):
    beat = 60 / bpm
    for b in range(bars):
        tb = t0 + b * 4 * beat
        ch = chords[b % len(chords)]
        seg(mus, I.pad([m2f(m) for m in ch], 4 * beat + 0.4, padv, r, att=0.3, rel=0.6, warm=1200), tb, 0.5)
        if bass:
            for k in (0, 2.5):
                seg(mus, I.pluck(m2f(ch[0] - 24), 0.7, r, 0.8, 0.25), tb + k * beat, 0.75)
        for k, i in enumerate(arp):
            seg(mus, I.pluck(m2f(ch[i] + 12), pluck_vel * (1.0 if k % 2 == 0 else 0.75), r, 0.5, 0.55), tb + k * beat / 2, 0.42, (k % 3 - 1) * 0.35)
        if drums:
            for k in range(4):
                seg(mus, I.brush(0.4 + 0.2 * (k % 2), r, 0.3, swish=(k % 2 == 1)), tb + k * beat + beat / 2, 0.35)
            seg(mus, thump(0.35, 62) * 0.8, tb, 0.35); seg(mus, thump(0.35, 62) * 0.6, tb + 2 * beat, 0.3)
        if glock_line:
            for (bb, k, m, v) in glock_line:
                if bb == b:
                    seg(mus, I.glock(m2f(m), v, r, 1.4), tb + k * beat, 0.3)
    return t0 + bars * 4 * beat

# A: bright island groove in D major, 104 bpm, D - A - Bm - G, from 0 to the tape stop
D, A_, Bm, G_ = [62, 66, 69], [61, 64, 69], [59, 62, 66], [55, 59, 62]
melA = [(1, 0, 78, 0.5), (1, 1.5, 81, 0.45), (1, 3, 83, 0.4), (3, 0, 81, 0.5), (3, 2, 78, 0.45), (5, 0, 74, 0.5), (5, 1.5, 76, 0.45), (5, 3, 78, 0.5)]
tmp = np.zeros_like(mus); mus_keep = mus; mus = tmp
bar_chords(0.25, 104, [D, A_, Bm, G_], 6, glock_line=melA)
A_part = mus; mus = mus_keep
# tape stop: the groove slows and sinks in pitch over 0.5 s when the money runs out
cut = ns(stopT); ts = ns(0.55)
tail = A_part[:, cut: cut + ts * 2]
spd = np.linspace(1.0, 0.15, ts)
pos = np.cumsum(spd); pos = pos[pos < tail.shape[1] - 1]
stop = np.stack([np.interp(pos, np.arange(tail.shape[1]), tail[c]) for c in range(2)]) * np.linspace(1, 0, len(pos))[None, :] ** 1.5
A_part[:, cut:] = 0
A_part[:, cut: cut + stop.shape[1]] += stop
mus += A_part
# B: sparse minor dusk, 80 bpm, Bm - G - Em - F#, entering on the resort cut, thinning out before the lights go
Bm2, G2, Em2, Fs2 = [59, 62, 66], [55, 59, 62], [52, 55, 59], [54, 58, 61]
tmp = np.zeros_like(mus); keep = mus; mus = tmp
bar_chords(F(372) - 0.05, 80, [Bm2, G2, Em2, Fs2], 3, pluck_vel=0.35, arp=(0, 2, 1, 2, 0, 2, 1, 2), drums=False, padv=0.4)
B_part = mus * env_lin(N, [(0, 0), (F(372) - 0.06, 0), (F(372) + 0.3, 1), (F(EV.OUT) - 0.1, 1), (F(EV.OUT) + 0.25, 0), (DUR, 0)])[None, :]
mus = keep + B_part
# C: warm resolve for the end card, 92 bpm, D - G - D/F# - A with a glock answer
D3, G3, Dfs, A3 = [62, 66, 69], [59, 62, 67], [54, 62, 66], [57, 61, 64]
tmp = np.zeros_like(mus); keep = mus; mus = tmp
seg(mus, I.timpani(m2f(38), 0.8, r, 2.4), F(608) - 0.02, 0.6)
seg(mus, I.cymbal(0.45, r, 2.6), F(608) - 0.02, 0.25)
bar_chords(F(608), 92, [D3, G3, Dfs, A3], 3, pluck_vel=0.45, glock_line=[(0, 2, 81, 0.5), (0, 3, 83, 0.45), (1, 0, 86, 0.55), (2, 0, 85, 0.5), (2, 2, 81, 0.45)])
C_part = mus * env_lin(N, [(0, 0), (F(608) - 0.05, 0), (F(608), 1), (DUR - 1.4, 1), (DUR, 0)])[None, :]
mus = keep + C_part
mus = convolve_st(mus, make_ir(1.1, 7)) * 0.35 + mus * 0.8 if 'convolve_st' in globals() else mus

# ---------------- voice + mix ----------------
v, vsr = read_wav(os.path.join(EP, "vo.wav"))
v = signal.resample_poly(v, SR, vsr, axis=-1)
vo = np.zeros((2, N)); place(vo, st(v[0]), LEAD, 1.0)
words = json.load(open(os.path.join(EP, "words.json"), encoding="utf8"))["words"]
spans = []
for i, w in enumerate(words):
    a = w["t"] + LEAD; b = (words[i + 1]["t"] + LEAD) if i + 1 < len(words) else a + 0.6
    b = min(b, a + 0.7)
    if spans and a - spans[-1][1] < 0.3: spans[-1][1] = b
    else: spans.append([a, b])
duck = np.zeros(N)
for a, b in spans: duck[ns(max(0, a - 0.08)): ns(min(DUR, b + 0.12))] = 1
k = max(1, ns(0.12)); duck = np.convolve(duck, np.ones(k) / k, mode="same")
dk = dbg(-5.0 * duck)
music = mus * dk[None, :]; effects = sfx + amb * dbg(-3.0 * duck)[None, :]
# levels relative to the voice (the house standard: music audible as a bed, SFX under the voice)
Lv = integrated(vo)
music *= dbg((Lv - 11.0) - integrated(music))
effects *= dbg((Lv - 9.0) - integrated(effects))
mix = vo + music + effects
mix *= dbg(-14.0 - integrated(mix))
mix, _ = limiter(mix, -1.2)
mix *= dbg(-14.0 - integrated(mix))
mix, _ = limiter(mix, -1.2)
fo = ns(0.6); mix[:, -fo:] *= np.linspace(1, 0, fo)[None, :]
write_wav(OUT, mix, 24)
print("LUFS %.2f  TP %.2f dBTP  dur %.3f s" % (integrated(mix), true_peak(mix), mix.shape[1] / SR))
