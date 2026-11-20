# Narrator energy test: one voice at several speeds.
import sys, soundfile as sf
from kokoro_onnx import Kokoro
k = Kokoro("models/kokoro-v1.0.onnx", "models/voices-v1.0.bin")
text = ("In 1980, a drilling crew punched a hole fourteen inches wide into the bottom of a Louisiana lake. "
        "Three days later, the lake was gone! Not drained. Swallowed. And the strangest part? Nobody died.")
v = sys.argv[1]
for s in sys.argv[2:]:
    audio, sr = k.create(text, voice=v, speed=float(s), lang="en-us")
    sf.write(f"samples/{v}_x{s}.wav", audio, sr)
    print(v, s, round(len(audio)/sr, 1), "s")
