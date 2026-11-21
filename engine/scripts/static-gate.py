# STATIC gate: no shot may sit still. Samples a video at 1.5 fps (the contact-sheet rate), and for every shot segment fails when three
# consecutive sample pairs show (almost) no change: fewer than .25 % of the pixels differ by more than 20 grey levels.
# python static-gate.py <video> <segments.json>   segments = [{"id":..,"start":sec,"end":sec}, ...] ; exit 1 and "STATIC ..." lines on failure
import json,subprocess,sys
import numpy as np
video,segs=sys.argv[1],json.load(open(sys.argv[2]))
W,H,FPS=320,180,1.5
raw=subprocess.run(["ffmpeg","-v","error","-i",video,"-vf",f"fps={FPS},scale={W}:{H}","-f","rawvideo","-pix_fmt","gray","-"],capture_output=True).stdout
frames=np.frombuffer(raw,np.uint8).reshape(-1,H,W).astype(np.int16)
bad=0
for s in segs:
    a,b=int(np.ceil(s["start"]*FPS)),int(s["end"]*FPS)
    f=frames[a:b]
    if len(f)<4:continue
    moving=[(np.abs(f[i+1]-f[i])>20).mean()>=.0025 for i in range(len(f)-1)]
    run=best=0
    for m in moving:
        run=0 if m else run+1;best=max(best,run)
    if best>=3:
        bad+=1;print(f"STATIC shot {s['id']}: {best+1} samples in a row at {FPS} fps show no movement ({s['start']:.1f}-{s['end']:.1f} s)")
sys.exit(1 if bad else 0)
