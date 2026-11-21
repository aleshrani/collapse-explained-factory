"""Synthesize a paragraph as one performance and retain sentence timestamps for the edit."""
import difflib
import hashlib
import re
import tempfile
from pathlib import Path

import numpy as np
import soundfile as sf
from scipy.signal import resample_poly

from qwen_narrator import MODEL, QwenNarrator


def cuts_from_speech(audio, lines, recognizer, sr):
    stream = recognizer.create_stream()
    stream.accept_waveform(16000, resample_poly(audio, 2, 3).astype(np.float32))
    recognizer.decode_stream(stream)
    def words(text):
        return re.findall(r"[a-z0-9]+", text.lower().replace("’", "").replace("'", ""))
    actual = []
    times = []
    pieces = []
    starts = []
    for token, time in zip(stream.result.tokens, stream.result.timestamps):
        if token.startswith(("▁", " ")) or not pieces:
            pieces.append(token.lstrip("▁ "))
            starts.append(time)
        else:
            pieces[-1] += token
    for piece, time in zip(pieces, starts):
        for word in words(piece):
            actual.append(word)
            times.append(time)
    expected = [word for line in lines for word in words(line)]
    matches = difflib.SequenceMatcher(None, expected, actual, autojunk=False).get_matching_blocks()
    matched = {a + k: b + k for a, b, n in matches for k in range(n)}
    cuts = [0]
    boundary = 0
    for line in lines[:-1]:
        boundary += len(words(line))
        if boundary in matched:
            pos = times[matched[boundary]]
        elif boundary - 1 in matched and matched[boundary - 1] + 1 < len(times):
            pos = times[matched[boundary - 1] + 1]
        else:
            raise ValueError(f"Parakeet could not locate the sentence boundary after {line!r}")
        sample = round(pos * sr)
        if sample <= cuts[-1] or sample >= len(audio):
            raise ValueError("Invalid sentence alignment")
        cuts.append(sample)
    return cuts + [len(audio)]


def paragraph_groups(source, extract):
    for raw in re.sub(r"<!--.*?-->", "", source, flags=re.S).splitlines():
        rows = extract(raw)[0]
        lines = []
        count = 0
        for row in rows:
            text = row["text"]
            size = len(text.split())
            if lines and count + size > 45:
                yield lines
                lines, count = [], 0
            lines.append(text)
            count += size
        if lines:
            yield lines


def cached_takes(source, rows, extract, cache, version, name):
    import sherpa_onnx
    voice = None
    recognizer = None
    index = 0
    for lines in paragraph_groups(source, extract):
        signature = hashlib.sha256((version + "\0" + "\0".join(lines)).encode()).hexdigest()
        keys = [f"{signature}-{i}" for i in range(len(lines))]
        if any(not (cache / (key + ".wav")).exists() for key in keys):
            if voice is None:
                voice = QwenNarrator()
            audio, sr = voice.synthesize(" ".join(lines), name)
            cuts = [0, len(audio)]
            if len(lines) > 1:
                if recognizer is None:
                    folder = next(MODEL.parent.glob("sherpa-onnx-nemo-parakeet*"))
                    recognizer = sherpa_onnx.OfflineRecognizer.from_transducer(
                        **{p: str(folder / (p + ".int8.onnx")) for p in ("encoder", "decoder", "joiner")},
                        tokens=str(folder / "tokens.txt"), model_type="nemo_transducer", num_threads=3)
                cuts = cuts_from_speech(audio, lines, recognizer, sr)
            for key, start, end in zip(keys, cuts, cuts[1:]):
                with tempfile.NamedTemporaryFile(dir=cache, suffix=".wav", delete=False) as tmp:
                    temporary = Path(tmp.name)
                try:
                    sf.write(temporary, audio[start:end], sr, subtype="PCM_16")
                    temporary.replace(cache / (key + ".wav"))
                finally:
                    temporary.unlink(missing_ok=True)
        for i, (line, key) in enumerate(zip(lines, keys)):
            if rows[index]["text"] != line:
                raise ValueError("Paragraph and sentence texts diverged")
            yield rows[index], key, i == len(lines) - 1
            index += 1
