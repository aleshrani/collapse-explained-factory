"""Fixed-reference speaker verification using 3D-Speaker CAM++ on CPU."""
import math
from pathlib import Path
import numpy as np
from scipy.signal import resample_poly
import sherpa_onnx

VOICE = Path(__file__).resolve().parents[2] / "voice"
MODEL = VOICE / "models/3dspeaker_speech_campplus_sv_zh_en_16k-common_advanced.onnx"
REFERENCE = VOICE / "narrator/F-reference.wav"


class Verifier:
    def __init__(self):
        config = sherpa_onnx.SpeakerEmbeddingExtractorConfig(model=str(MODEL), num_threads=3, provider="cpu")
        self.extractor = sherpa_onnx.SpeakerEmbeddingExtractor(config)

    def embedding(self, audio, sr):
        if sr != 16000:
            g = math.gcd(sr, 16000)
            audio = resample_poly(audio, 16000//g, sr//g)
        if not len(audio) or not np.isfinite(audio).all() or np.max(np.abs(audio)) < .001:
            raise ValueError("Missing speech for speaker verification")
        stream = self.extractor.create_stream()
        stream.accept_waveform(16000, np.asarray(audio, dtype=np.float32))
        stream.input_finished()
        embedding = np.asarray(self.extractor.compute(stream), dtype=np.float64)
        norm = np.linalg.norm(embedding)
        if not np.isfinite(norm) or norm < 1e-8:
            raise ValueError("Invalid speaker embedding")
        return embedding/norm
