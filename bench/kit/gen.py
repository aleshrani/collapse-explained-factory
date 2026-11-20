# Ask the local Ollama model to write a new kit module, time it, save it.
import json, time, urllib.request, re, sys
p = open("bench/kit/prompt.txt", encoding="utf-8").read()
import os
body = {"model": os.environ.get("OLLAMA_MODEL", "qwen2.5-coder:7b"), "prompt": p, "stream": False, "options": {"temperature": 0.2, "num_ctx": 8192, "num_predict": 4096}}
t = time.time()
r = json.load(urllib.request.urlopen(urllib.request.Request("http://127.0.0.1:11434/api/generate", json.dumps(body).encode(), {"Content-Type": "application/json"}), timeout=3600))
code = re.sub(r"^```\w*\s*|```\s*$", "", r["response"].strip(), flags=re.M)
open(os.environ.get("KIT_OUT", "engine/src/kit/oilrig_ollama.ts"), "w", encoding="utf-8").write(code)
print("wall", round(time.time() - t), "s; tokens", r.get("eval_count"), "; tok/s", round(r.get("eval_count", 0) / (r.get("eval_duration", 1) / 1e9), 1), "; lines", code.count("\n"))
