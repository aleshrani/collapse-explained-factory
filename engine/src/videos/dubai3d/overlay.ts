// Screen-space layer (1080 x 1920 Canvas2D over the graded 3D picture): 1-2 word captions in the lower third (only
// meaningful words and numbers), the "321,000,000 m3" number card, and the end card. Pure function of the frame.
import { INK } from "./toon";
import { W, EV, popE, smooth, clamp01 } from "./story";

export const DISP = "Boldonse", TXT = "BeVietnam";
type G = CanvasRenderingContext2D;

/** [voice time (s), text] - each shows from its word until the next caption (max 1.3 s) */
const CAPS: [number, string][] = [
  [0.0, "DUBAI"], [0.64, "MAP"], [0.96, "ENTIRE WORLD"], [1.76, "SAND"], [2.56, "SEA"], [3.2, "300 ISLANDS"], [4.32, "SHAPED"], [4.8, "COUNTRY"],
  [5.52, "321 MILLION"], [6.56, "CUBIC METERS"], [7.28, "SAND"], [8.08, "2008"], [8.8, "70%"], [9.44, "ISLANDS"], [10.0, "ALREADY SOLD"],
  [10.88, "MONEY"], [11.12, "RAN OUT"], [11.92, "CRAZY PART"], [12.64, "YEARS LATER"], [13.92, "NO"], [14.08, "POWER LINES"],
  [15.12, "FEW HOTELS"], [16.08, "DIESEL"], [16.4, "GENERATORS"], [17.28, "OWN"], [17.52, "WHOLE COUNTRY"], [18.4, "STILL"], [18.8, "NO ELECTRICITY"],
  [20.24, "WENT WRONG?"], [21.04, "FULL STORY"], [21.92, "CHANNEL"],
];
const HOT = new Set(["300 ISLANDS", "321 MILLION", "70%", "ALREADY SOLD", "RAN OUT", "NO", "POWER LINES", "DIESEL", "NO ELECTRICITY", "WENT WRONG?", "2008"]);

const outlined = (g: G, s: string, x: number, y: number, px: number, fam: string, fill: string, ol: number) => {
  g.font = `${fam === DISP ? 400 : 700} ${px}px ${fam}`; g.textAlign = "center"; g.textBaseline = "middle"; g.lineJoin = "round";
  g.lineWidth = ol + 10; g.strokeStyle = "rgba(20,10,24,0.35)"; g.strokeText(s, x, y + 7);
  g.lineWidth = ol; g.strokeStyle = INK; g.strokeText(s, x, y);
  g.fillStyle = fill; g.fillText(s, x, y);
};
const fit = (g: G, s: string, px: number, maxW: number, fam: string) => { g.font = `${fam === DISP ? 400 : 700} ${px}px ${fam}`; const w = g.measureText(s).width; return w > maxW ? (px * maxW) / w : px; };

const caption = (g: G, f: number) => {
  for (let i = 0; i < CAPS.length; i++) {
    const f0 = W(CAPS[i][0]) - 1, f1 = Math.min(i + 1 < CAPS.length ? W(CAPS[i + 1][0]) - 1 : 1e9, f0 + 40);
    if (f < f0 || f >= f1) continue;
    const s = CAPS[i][1], u = (f - f0) / 4, k = 0.6 + 0.4 * popE(u);
    const px = fit(g, s, 112, 940, TXT);
    g.save(); g.translate(540, 1500); g.scale(k, k);
    outlined(g, s, 0, 0, px, TXT, HOT.has(s) ? "#ffd84a" : "#ffffff", px * 0.22);
    g.restore();
  }
};

const numberCard = (g: G, f: number) => {
  const a = EV.CARD, b = 245;
  if (f < a || f >= b) return;
  const u = (f - a) / 6, out = smooth((f - (b - 6)) / 6), k = popE(u) * (1 - out);
  if (k <= 0.01) return;
  const cnt = Math.round(321 * smooth(Math.min(1, Math.floor((f - a) / 3) * 3 / 21)) ** 0.7) * 1000000;
  const s = cnt.toLocaleString("en-US");
  g.save(); g.translate(540, 360); g.scale(k, k); g.rotate(-0.02);
  const w = 900, h = 250;
  g.fillStyle = "rgba(20,10,24,0.35)"; g.beginPath(); g.roundRect(-w / 2 + 8, -h / 2 + 12, w, h, 40); g.fill();
  g.fillStyle = "#2b1c33"; g.beginPath(); g.roundRect(-w / 2, -h / 2, w, h, 40); g.fill();
  g.lineWidth = 10; g.strokeStyle = "#ffd84a"; g.stroke();
  const px = fit(g, s + " m³", 118, 800, TXT);
  g.font = `700 ${px}px ${TXT}`; g.textAlign = "center"; g.textBaseline = "middle"; g.fillStyle = "#ffffff"; g.fillText(s + " m³", 0, -22);
  g.font = `700 40px ${TXT}`; g.fillStyle = "#ffd84a"; g.fillText("CUBIC METERS OF SAND", 0, 76);
  g.restore();
};

const endCard = (g: G, f: number) => {
  if (f < EV.TITLE) return;
  const u1 = (f - EV.TITLE) / 8, u2 = (f - EV.TITLE - 4) / 8, u3 = (f - EV.TAG) / 8;
  const dim = clamp01((f - EV.TITLE) / 12) * 0.28; // soft darkening behind the title for legibility
  if (dim > 0) { const gr = g.createLinearGradient(0, 300, 0, 1100); gr.addColorStop(0, `rgba(30,16,40,${dim})`); gr.addColorStop(1, "rgba(30,16,40,0)"); g.fillStyle = gr; g.fillRect(0, 0, 1080, 1100); }
  for (const [s, y, u] of [["COLLAPSE", 600, u1], ["EXPLAINED", 760, u2]] as const) {
    if (u <= 0) continue;
    const k = popE(u), px = fit(g, s, 150, 960, DISP);
    g.save(); g.translate(540, y); g.scale(k, k); g.rotate(-0.025);
    outlined(g, s, 0, 0, px, DISP, "#ffffff", px * 0.2);
    g.restore();
  }
  if (u3 > 0) {
    const k = popE(u3), s = "Big plans. Bigger collapses.";
    g.save(); g.translate(540, 905); g.scale(k, k);
    g.font = `700 50px ${TXT}`; const w = g.measureText(s).width + 80;
    g.fillStyle = "#ffd84a"; g.beginPath(); g.roundRect(-w / 2, -44, w, 88, 44); g.fill(); g.lineWidth = 8; g.strokeStyle = INK; g.stroke();
    g.fillStyle = INK; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText(s, 0, 2);
    g.restore();
  }
};

export const drawOverlay = (g: G, f: number) => {
  g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, 1080, 1920);
  numberCard(g, f);
  endCard(g, f);
  caption(g, f);
};
