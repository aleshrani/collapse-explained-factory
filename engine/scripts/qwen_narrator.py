"""Local Qwen3 VoiceDesign adapter for the WaveKat INT4 export (CPU, 24 kHz)."""
import json
import sys
from pathlib import Path

import numpy as np
import onnxruntime as ort
from scipy.special import expit

PROFILES = {
    "qwen-c": (114, "Male voice. An American man in his forties with a warm, resonant baritone and a little grain in his speaking voice. He is chatting to a friend over coffee. Curious, relaxed and quietly amused. He tells the strange parts in his ordinary speaking voice and lets the punchline land."),
    "qwen-e": (927, "A kind American male storyteller in his early forties with a warm, mellow lower register. Energetic and genuinely excited, like he can't wait to tell you the next crazy detail. Upbeat pace, lively emphasis on numbers and surprises, a grin in his voice on the jokes."),
    "qwen-f": (927, "A warm American male storyteller in his early forties. Enthusiastic, punchy and full of energy, like a great YouTube documentary narrator. He builds suspense, hits the shocking facts hard, and delivers the punchlines with a playful, amused smile."),
    "qwen-d": (927, "A kind American male storyteller in his early forties. A warm, mellow lower register, close to the listener. Reflective, understated and intimate. He lets an unexpected detail sink in, then carries on with gentle amusement."),
}
MODEL = Path(__file__).resolve().parents[2] / "voice" / "models" / "qwen3-voicedesign"


class QwenNarrator:
    def __init__(self, directory=MODEL):
        sys.path.insert(0, str(directory.parents[1] / "tools" / "qwen-tokenizer"))
        from tokenizers import Tokenizer
        self.tokenizer = Tokenizer.from_file(str(directory / "tokenizer" / "tokenizer.json"))
        self.config = json.loads((directory / "config.json").read_text())
        self.arrays = {p.stem: np.load(p, mmap_mode="r", allow_pickle=False)
                       for p in (directory / "embeddings").glob("*.npy")}
        options = ort.SessionOptions()
        options.intra_op_num_threads = 4
        options.inter_op_num_threads = 1
        options.add_session_config_entry("session.intra_op.allow_spinning", "0")
        self.graphs = {}
        for name in ("talker_prefill", "talker_decode", "code_predictor", "vocoder"):
            self.graphs[name] = ort.InferenceSession(str(directory / "int4" / (name + ".onnx")),
                                                      options, providers=["CPUExecutionProvider"])

    def text_projection(self, ids):
        a = self.arrays
        hidden = a["text_embedding"][ids] @ a["text_projection_fc1_weight"].T + a["text_projection_fc1_bias"]
        return (hidden * expit(hidden)) @ a["text_projection_fc2_weight"].T + a["text_projection_fc2_bias"]

    def synthesize(self, text, profile):
        cfg = self.config
        seed, direction = PROFILES[profile]
        rng = np.random.default_rng(seed)
        encode = lambda value: self.tokenizer.encode(value, add_special_tokens=False).ids
        codec = self.arrays["talker_codec_embedding"]
        pad, begin, end = self.text_projection([cfg["tts_pad_token_id"], cfg["tts_bos_token_id"], cfg["tts_eos_token_id"]])
        cpad = codec[cfg["codec_pad_id"]]
        prefix = [cfg["codec_think_id"], cfg["codec_think_bos_id"], cfg["codec_language_id"]["english"], cfg["codec_think_eos_id"]]
        role = encode("<|im_start|>assistant\n")
        prompt = encode(f"<|im_start|>user\n{direction}<|im_end|>\n")
        embed = np.vstack((self.text_projection(prompt + role), pad + codec[prefix], begin + cpad,
                           self.text_projection(encode(text)) + cpad, end + cpad, pad + codec[cfg["codec_bos_id"]]))[None]
        length = embed.shape[1]
        positions = np.broadcast_to(np.arange(length, dtype=np.int64), (3, 1, length)).copy()
        logits, hidden, *kv = self.graphs["talker_prefill"].run(None, {
            "inputs_embeds": embed, "attention_mask": np.ones((1, length), np.int64), "position_ids": positions})
        keys, values = np.stack(kv[::2]), np.stack(kv[1::2])
        del kv
        cp = self.graphs["code_predictor"]
        project_cp = cp.get_inputs()[0].shape[-1] == cfg["cp_hidden_size"]
        tables = [self.arrays[f"cp_codec_embedding_{n}"] for n in range(cfg["talker_num_code_groups"] - 1)]
        empty = np.empty((cfg["cp_num_layers"], 1, cfg["cp_num_kv_heads"], 0, cfg["cp_head_dim"]), np.float32)
        codes = []
        seen = set()
        def sample(scores):
            k = min(50, len(scores))
            idx = np.argpartition(scores, -k)[-k:]
            weight = np.exp((scores[idx] - scores[idx].max()) / .85)
            return int(rng.choice(idx, p=weight / weight.sum()))

        for step in range(max(90, 40 + len(text.split()) * 12)):
            scores = logits[0, -1].copy()
            eos = cfg["codec_eos_token_id"]
            eos_score = scores[eos]
            scores[cfg["talker_vocab_size"] - 1024:] = -np.inf
            if step >= 2:
                scores[eos] = eos_score
            if seen:
                ids = list(seen)
                scores[ids] = np.where(scores[ids] > 0, scores[ids] / 1.05, scores[ids] * 1.05)
            token = sample(scores)
            if token == eos:
                break
            seen.add(token)
            frame = [token]
            acc = codec[token].copy()
            cp_input = np.vstack((hidden[0, -1], acc))[None]
            ck, cv = empty, empty
            for i, table in enumerate(tables):
                if project_cp:
                    cp_input = cp_input @ self.arrays["small_to_mtp_projection_weight"].T + self.arrays["small_to_mtp_projection_bias"]
                pred, ck, cv = cp.run(None, {"inputs_embeds": cp_input, "generation_steps": np.array([i], np.int64),
                                             "past_keys": ck, "past_values": cv})
                token = sample(pred[0, -1])
                frame.append(token)
                acc += table[token]
                cp_input = table[token].reshape(1, 1, -1)
            codes.append(frame)
            logits, hidden, keys, values = self.graphs["talker_decode"].run(None, {
                "inputs_embeds": (acc + pad).reshape(1, 1, -1),
                "attention_mask": np.ones((1, length + 1), np.int64),
                "position_ids": np.full((3, 1, 1), length, np.int64),
                "past_keys": keys, "past_values": values})
            length += 1
        else:
            raise ValueError("Qwen reached the generation limit before the end of speech")
        if not codes:
            raise ValueError("Qwen returned empty speech")
        x = self.graphs["vocoder"].run(None, {"codes": np.asarray(codes, np.int64).T[None]})[0].ravel()
        if not np.isfinite(x).all() or np.abs(x).max() < .001:
            raise ValueError("Invalid waveform")
        return x, cfg["sample_rate"]
