"""Fill the cloned-voice cache in parallel shards before the normal episode-voice.py run.

    voice/.venv/Scripts/python.exe engine/scripts/prefill_clone.py episodes/<slug>/narration.md <shard> <shards>

Each shard clones every <shards>-th sentence through the same gated clone_takes() (same cache keys,
same speaker check), so `episode-voice.py ... tts --engine qwen-f` afterwards only assembles.
"""
import runpy, sys
from pathlib import Path

here = Path(__file__).resolve().parent
sys.path.insert(0, str(here))
voice = runpy.run_path(str(here / "episode-voice.py"))  # main() is guarded, nothing runs
from fixed_narrator import clone_takes

source, shard, shards = Path(sys.argv[1]), int(sys.argv[2]), int(sys.argv[3])
rows, _, _ = voice["extract"](source.read_text(encoding="utf-8-sig"))
cache = source.parent / ".build-cache" / "speech"
out = source.parent / ".build-cache" / f"clone-shard-{shard}"
out.mkdir(parents=True, exist_ok=True)
for _ in clone_takes(rows[shard::shards], cache, voice["voice_version"]("qwen-f"), out):
    pass
print(f"shard {shard}/{shards} done")
