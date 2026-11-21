"""Hand-directed shot plan for one episode (instead of the local planner).

Phase 1:  py -3 engine/scripts/direct-episode.py episodes/<slug> --chunks
          Cuts the voice track into 3–5 s chunks at sentence starts where possible, otherwise at word
          starts, and writes <ep>/chunks.txt (numbered chunks with their text) for the director.
Phase 2:  py -3 engine/scripts/direct-episode.py episodes/<slug>
          Reads <ep>/direction.txt, one line per chunk in order:
              kit | params-json | camera | light | action | expression | overlay text (optional)
          e.g.  dubai | {"subject":"archipelago"} | aerial | day | point | smug | 300 islands
          and writes <ep>/shots.json, then runs validate-shots.py on it.
"""
import json, re, subprocess, sys
from pathlib import Path

ep = Path(sys.argv[1])
timing = json.loads((ep / "narration-timing.json").read_text(encoding="utf-8"))
words = json.loads((ep / "words.json").read_text(encoding="utf-8"))["words"]
segs, total = timing["segments"], float(timing["duration"])
BEAT = {"Hook": "hook", "Lock-in": "lock-in", "Rehook": "rehook", "Closing": "closing", "CTA": "cta"}

def chunks():
    sentence = sorted({round(float(s["start"]), 3) for s in segs} | {round(total, 3)})
    word = sorted({round(float(w["t"]), 3) for w in words if 0 < float(w["t"]) < total})
    cuts, t = [0.0], 0.0
    while total - t > 5.0:
        # never leave 5-6 s at the end: that cannot be split into two legal 3-5 s chunks
        fits = lambda c: not 5.0 < total - c < 6.0
        sent = [c for c in sentence if 3.0 <= c - t <= 5.0 and fits(c)]
        if sent:
            nxt = min(sent, key=lambda c: abs(c - t - 4.2))
        else:
            cand = [c for c in word if 3.2 <= c - t <= 4.8 and fits(c)] or [c for c in word if 3.0 <= c - t <= 5.0 and fits(c)] or [t + 4.0]
            nxt = min(cand, key=lambda c: abs(c - t - 4.0))
        if total - nxt < 3.0:                      # leave room for a legal last chunk
            nxt = t + (total - t) / 2
        cuts.append(round(nxt, 3)); t = nxt
    cuts.append(round(total, 3))
    # Script words (locked narration), each placed at an estimated time inside its sentence.
    script = []
    for sg in segs:
        ws = sg["text"].split()
        for j, w in enumerate(ws):
            script.append((float(sg["start"]) + float(sg["speech"]) * (j + .5) / len(ws), w))
    out = []
    for a, b in zip(cuts, cuts[1:]):
        text = " ".join(w for t, w in script if a - .001 <= t < b - .001)
        seg = max((s for s in segs if float(s["start"]) <= a + .001), key=lambda s: float(s["start"]), default=segs[0])
        out.append((a, b, text, seg.get("chapter", "")))
    return out

C = chunks()
if "--chunks" in sys.argv:
    gags = {g["line"]: g["text"] for g in timing.get("gags", [])}
    lines = []
    for n, (a, b, text, chap) in enumerate(C, 1):
        gag = next((v for k, v in gags.items() if k.lower().rstrip(".?!") in text.lower()), "")
        lines.append(f"{n:03d} {a:7.2f}-{b:7.2f} [{chap}] {text}" + (f"   <<GAG: {gag}>>" if gag else ""))
    (ep / "chunks.txt").write_text("\n".join(lines) + "\n", encoding="utf-8")
    print(f"{len(C)} chunks over {total:.1f} s -> {ep/'chunks.txt'}")
    sys.exit(0)

rows = [r for r in (ep / "direction.txt").read_text(encoding="utf-8").splitlines() if r.strip() and not r.startswith("#")]
if len(rows) != len(C):
    sys.exit(f"direction.txt has {len(rows)} rows for {len(C)} chunks")
MOVES = ["push-in", "truck", "pull-back", "orbit", "crane", "tilt"]
shots = []
for n, ((a, b, text, chap), row) in enumerate(zip(C, rows)):
    f = [x.strip() for x in row.split("|")]
    f += [""] * (7 - len(f))
    kit, params, cam, light, action, expr, card = f[:7]
    params = json.loads(params or "{}")
    overlay = {"kind": "number" if re.search(r"\d", card) else "label", "text": card} if card else None
    subject = params.get("subject") or params.get("station") or params.get("state") or kit
    shots.append({
        "line": text, "start": a, "end": b, "kit": kit, "params": params, "camera": cam,
        "light": light or "day", "visual_idea": f"{kit} {subject} seen {cam}: {text}"[:300],
        "direction": {"subject": str(subject), "environment": kit, "mood": "curious",
                      "move": MOVES[n % len(MOVES)], "action": action or "explain"},
        "action": action or "explain", "expression": expr or "explaining", "overlay": overlay,
        "transition": "cut", "beat": BEAT.get(chap, "point") if n else "hook", "reframeX": 0.5,
    })
# Required dressing per kit (catalog requiredParams), filled from the row when not given.
import math
OVAL = [[round(.5 + .45 * math.cos(t / 20 * 2 * math.pi), 3), round(.5 + .4 * math.sin(t / 20 * 2 * math.pi), 3)] for t in range(21)]
PLACES = {"caspian": (42.0, 51.0), "europe": (50.0, 10.0), "ireland": (53.2, -8.0)}
SPEC = {k["id"]: k for k in json.loads((Path(__file__).resolve().parents[1] / "src/kit/catalog.json").read_text(encoding="utf-8-sig"))["kits"]}
def dress_all():
    for s in shots:  # drop parameters the (possibly swapped) kit does not know
        known = set(SPEC.get(s["kit"], {}).get("params", {})) | {"gag", "gagSide"}
        s["params"] = {k: v for k, v in s["params"].items() if k in known}
    for s in shots:
        p, card = s["params"], (s["overlay"] or {}).get("text", "")
        if s["kit"] in ("dubai", "dubai-service"):
            continue
        p.setdefault("subject", card or s["kit"])
        p.setdefault("detail", card or p["subject"])
        if s["kit"] == "money":
            p.setdefault("value", card or p["subject"])
        if s["kit"] == "map":
            lat, lon = next((v for k, v in PLACES.items() if k in p["subject"].lower()), (25.2, 55.3))
            p["pins"] = [{"label": pin.get("label", p["subject"])[:30], "lat": pin.get("lat", lat), "lon": pin.get("lon", lon)} for pin in p.get("pins", [{}])]
        if s["kit"] == "timeline":
            ev = p.get("events", [{"date": card or "2008", "label": p["subject"]}])
            if len(ev) < 2:
                ev = ([{"date": "2003", "label": "The World announced"}] if ev[0]["date"] != "2003" else []) + ev
                if len(ev) < 2: ev.append({"date": "2008", "label": "money stops"})
            p["events"] = ev
        if s["kit"] == "blueprint":
            p.setdefault("outline", OVAL)


dress_all()
# Shared bases (desks, studio, skyline...) must name something from the spoken line.
import runpy
sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "llm"))
_sp = runpy.run_path(str(Path(__file__).resolve().parents[1] / "llm" / "make-shotplan.py"))
key_words = _sp["key_words"]
SHARED = {k["id"] for k in json.loads((Path(__file__).resolve().parents[1] / "src/kit/catalog.json").read_text(encoding="utf-8-sig"))["kits"] if k.get("sharedBase")}
def norm(x):
    return re.sub(r"[^a-z0-9]+", " ", str(x).lower()).strip()
STOP = set("but and or so that that's this these those you you'd you're you've i'm it's it there they he she we "
           "according might not couldn't can't didn't wasn't isn't imagine picture place see came gave handed main "
           "finished suddenly everyone real perfect honest one two leading expected".split())
def good(w):
    return key_words(w) and norm(w).replace(" ", "'") not in STOP and w.lower() not in STOP
def run_of(line, taken=()):
    """A readable 2-4 word run of the spoken line around its longest keyword not in `taken` (for a sign)."""
    toks = [w.strip(".,!?\"'“”:;") for w in line.split()]
    keys = [i for i, w in enumerate(toks) if good(w) and norm(w) not in taken]
    if not keys:
        return ""
    i = max(keys, key=lambda k: len(toks[k]))
    run = toks[max(0, i - 2):i + 2]
    while len(run) > 1 and not good(run[0]): run = run[1:]
    while len(run) > 1 and not good(run[-1]): run = run[:-1]
    if len(run) == 1:  # stretch to the nearest other keyword (at most 3 words away), never end on "of"/"the"
        after = [j for j in range(i + 1, min(len(toks), i + 4)) if good(toks[j])]
        before = [j for j in range(max(0, i - 3), i) if good(toks[j])]
        run = toks[i:after[0] + 1] if after else toks[before[-1]:i + 1] if before else run
    text = " ".join(run)
    return text[:1].upper() + text[1:]
def shared_all():
    for s in shots:
        p = s["params"]
        if s["kit"] in SHARED and not key_words(s["line"]) & key_words(f'{p.get("subject","")} {p.get("detail","")}'):
            p["detail"] = run_of(s["line"]) or p["detail"]


shared_all()
# Repair pass: keep the directed content, but pick a free camera and, if a physical setup is
# overused, a related setup from the same family, so the plan passes validate-shots.py.
CAMS = ["wide", "medium", "close", "low", "aerial", "dolly"]
FAMILY = {
    "dubai": [("dubai", {"subject": s}) for s in ["archipelago", "beach", "coast", "breakwater", "villa", "ireland", "delivery", "landing", "palm", "dredger"]],
    "desk": [(k, {}) for k in ["documents", "money", "timeline", "blueprint", "map", "studio", "boardroom", "skyline"]],
}
def family(kit):
    # interiors fall back to a desk kit, whose detail is then filled from the spoken line
    return "dubai" if kit in ("dubai", "dubai-service") else "desk" if kit in dict(FAMILY["desk"]) or kit in ("property-office", "courtroom", "hotel-interior") else None
def location(s):
    p = s["params"]
    variant = p.get("state") if s["kit"] in ("property-office", "courtroom", "hotel-interior") else None
    return (s["kit"], p.get("station") or p.get("variant") or variant or (p.get("subject") if s["kit"] == "dubai" else None))
placed = []
for s in shots:
    a = s["start"]
    def ok_loc(cand):
        loc = location(cand)
        recent = [location(x) for x in placed if a - x["start"] < 60]
        return not (placed and location(placed[-1]) == loc) and sum(l == loc for l in recent) < 2
    if not ok_loc(s) and family(s["kit"]):
        for kit, extra in FAMILY[family(s["kit"])]:
            cand = dict(s, kit=kit, params={**{k: v for k, v in s["params"].items() if k not in ("subject", "station")}, **(extra or {"subject": s["params"].get("subject", "")})})
            if kit == "dubai" and "gag" in s["params"]: cand["params"]["gag"] = s["params"]["gag"]
            if ok_loc(cand): s.update(kit=cand["kit"], params=cand["params"]); break
    prev = placed[-1]["camera"] if placed else None
    used = {x["camera"] for x in placed if location(x) == location(s) and a - x["start"] < 90}
    if s["camera"] == prev or s["camera"] in used:
        free = [c for c in CAMS if c != prev and c not in used]
        if free: s["camera"] = free[0]
    placed.append(s)

dress_all(); shared_all()
# One text, one place: the overlay card, the big sign (subject) and the small sign (detail) must all
# say different things. The big sign names the place or chapter, the small one carries words of the line.
PLACE_SIGN = {"property-office": "Nakheel sales gallery", "courtroom": "Dubai courts", "finance-wall": "Trading floor",
              "hotel-interior": "Island hotel"}
def board_texts(p):
    """Texts a board kit draws by itself (money value, timeline events, map pins)."""
    out = [p.get("value", "")]
    out += [f'{e.get("date","")} {e.get("label","")}' for e in p.get("events", [])] + [e.get("date", "") for e in p.get("events", [])]
    out += [pin.get("label", "") for pin in p.get("pins", [])]
    return [norm(t) for t in out if t]
def dedupe_text():
    for s in shots:
        p = s["params"]
        card = norm((s["overlay"] or {}).get("text", ""))
        # the board already shows the figure: drop the card instead of saying it twice
        if card and any(card == t or card in t for t in board_texts(p)):
            s["overlay"] = None
        # dubai draws its own place sign (IRELAND...): a card naming the same subject is dropped
        if s["kit"] in ("dubai", "dubai-service") and card and card in norm(p.get("subject", "")):
            s["overlay"] = None
        if s["kit"] in ("dubai", "dubai-service") or "subject" not in p:
            continue
        card = norm((s["overlay"] or {}).get("text", ""))
        chap = s.get("_chap", "")
        if card and (norm(p["subject"]) in (card, norm(p.get("detail", ""))) or card in norm(p["subject"])):
            p["subject"] = PLACE_SIGN.get(s["kit"]) or chap.split("·")[-1].strip() or "The World, Dubai"
        if "detail" in p and norm(p["detail"]) in (card, norm(p["subject"])) or card and card in norm(p.get("detail", "")):
            taken = set(card.split()) | set(norm(p["subject"]).split())
            p["detail"] = run_of(s["line"], taken) or p["detail"]
for s, (a, b, text, chap) in zip(shots, C):
    s["_chap"] = chap
dedupe_text()
for s in shots:
    s.pop("_chap", None)
# QUALITY-RULES row 8: card, signs and board never show the same text (hard stop, not a warning)
for i, s in enumerate(shots):
    card, p = norm((s["overlay"] or {}).get("text", "")), s["params"]
    if card and any(t and (card == t or card in t) for t in [norm(p.get("subject", "")), norm(p.get("detail", ""))] + board_texts(p)):
        sys.exit(f"DUPLICATE TEXT in shot {i}: card {card!r} is also drawn in the scene")
out = ep / "shots.json"
out.write_text(json.dumps({"shots": shots}, indent=1, ensure_ascii=False), encoding="utf-8")
print(f"{len(shots)} shots written")
validator = Path(__file__).with_name("validate-shots.py")
r = subprocess.run([sys.executable, str(validator), str(out), "--duration", str(total)], capture_output=True, text=True)
print((r.stdout + r.stderr).strip()[-4000:])
