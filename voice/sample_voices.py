# Generates short narrator samples for several American male Kokoro voices.
import sys, numpy as np, soundfile as sf
from kokoro_onnx import Kokoro
k = Kokoro("models/kokoro-v1.0.onnx", "models/voices-v1.0.bin")
text = ("In 1980, a drilling crew punched a hole fourteen inches wide into the bottom of a Louisiana lake. "
        "Three days later, the lake was gone. Not drained. Swallowed. And the strangest part? Nobody died.")
for v in sys.argv[1:]:
    audio, sr = k.create(text, voice=v, speed=1.0, lang="en-us")
    sf.write(f"samples/{v}.wav", audio, sr)
    print(v, round(len(audio)/sr, 1), "s")
