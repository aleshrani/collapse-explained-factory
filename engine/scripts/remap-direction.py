"""Carry a hand-directed plan over to a new voice track.

    py -3 engine/scripts/remap-direction.py episodes/<slug> <old-chunks.txt> <old-direction.txt>

Run direct-episode.py --chunks on the new voice first. Every new chunk takes the direction row of
the old chunk that shares the most script words with it (chunks are consecutive spans of the same
locked narration, so word positions line up). Writes <ep>/direction.txt; the repair pass in
direct-episode.py then fixes any camera or setup repeats the new timing creates.
"""
import re, sys
from pathlib import Path

ep, old_chunks, old_dir = Path(sys.argv[1]), Path(sys.argv[2]), Path(sys.argv[3])

def spans(path):
    out, pos = [], 0
    for line in path.read_text(encoding="utf-8").splitlines():
        m = re.match(r"\d+\s+[\d.]+-\s*[\d.]+\s+\[[^\]]*\]\s?(.*?)(\s+<<GAG:.*)?$", line)
        if not m:
            continue
        n = len(m.group(1).split())
        out.append((pos, pos + n)); pos += n
    return out

old = spans(old_chunks)
new = spans(ep / "chunks.txt")
rows = [r for r in old_dir.read_text(encoding="utf-8").splitlines() if r.strip() and not r.startswith("#")]
if len(rows) != len(old):
    sys.exit(f"old direction has {len(rows)} rows for {len(old)} old chunks")
picked, last = [], -1
for a, b in new:
    # most shared words first, then nearest; never the row the previous chunk took (two cuts of one setup)
    rank = sorted(range(len(old)), key=lambda i: (-(min(b, old[i][1]) - max(a, old[i][0])), abs(i - last - 1)))
    best = next(i for i in rank if i != last)
    picked.append(rows[best]); last = best
(ep / "direction.txt").write_text("# remapped from " + old_dir.name + "\n" + "\n".join(picked) + "\n", encoding="utf-8")
print(f"{len(new)} new chunks from {len(old)} old")
