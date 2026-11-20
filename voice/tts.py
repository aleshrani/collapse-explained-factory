"""Local Kokoro narration. Run in voice/ with script.md or a plain-text narration."""
import os
import re
import sys
from pathlib import Path
import soundfile as sf
from kokoro_onnx import Kokoro

source=Path(sys.argv[1])
raw=source.read_text(encoding="utf-8-sig")
table=[line.strip().strip("|").split("|",1)[0].strip() for line in raw.splitlines() if line.strip().startswith("|")]
if table:
    prose=[cell for cell in table if cell.casefold()!="narration" and not re.fullmatch(r"[-: ]+",cell)]
    text=" ".join(prose)
else:
    text=" ".join(row.strip() for row in raw.splitlines() if row.strip() and not row.lstrip().startswith("#"))
if not text:raise ValueError("The input has no spoken narration")
speed=float(os.environ.get("KOKORO_SPEED","1.0"))
engine=Kokoro("models/kokoro-v1.0.onnx","models/voices-v1.0.bin")
samples,sr=engine.create(text,voice="am_puck",speed=speed,lang="en-us")
sf.write(sys.argv[2],samples,sr)
print(f"{len(samples)/sr:.2f} s at speed {speed}")
