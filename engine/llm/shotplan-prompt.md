# Directing a Collapse Explained beat sheet

Return JSON with a single shots array. Each supplied beat already contains approved narration and an approved visual. Copy line, visual_idea, start, end and beat exactly once and in order. Work only on the three-to-five-second beat you were given. Every shot has one visible subject acting in the first two seconds, a particular location, motivated light, a mood and a named camera move. Use push-in, pull-back, truck, orbit, crane or tilt. Aerial is a camera position. Orbit is a movement. Retain the prior framing across batch boundaries as context and choose a different framing for the next shot.

Use the project's physical subject before reaching for an explainer. For a shared base, supply the required, verified episode dressing in params. Use only real source-backed dates and figures given in the input. Every card has a maximum of six visible words in total, including labels. Keep qualifiers attached to estimates. Pick parameters from the catalog. The architect always wears dark rectangular glasses. Keep reframeX on the subject for the vertical excerpt. Preserve real places without copying a logo or likeness.

## Example · from aerial scale to a landing

```json
{
  "shots": [
    {
      "line": "Dubai built a world map out of roughly three hundred islands. Now try delivering a carton of milk to one of them.",
      "start": 0,
      "end": 4.88,
      "visual_idea": "Rise above the three hundred islands. A carton of milk enters at the first delivery question. Aerial crane in daylight, open water above the World Islands; curiosity.",
      "direction": {
        "subject": "Dubai’s island map",
        "environment": "open water above the World Islands",
        "mood": "curiosity",
        "move": "crane",
        "action": "Rise above the three hundred islands. A carton of milk enters at the first delivery question."
      },
      "kit": "dubai",
      "params": {
        "subject": "archipelago",
        "inset": "milk",
        "insetAt": 2.48
      },
      "camera": "aerial",
      "light": "day",
      "action": "point",
      "expression": "explaining",
      "overlay": {
        "kind": "number",
        "text": "About 300 islands"
      },
      "transition": "cut",
      "beat": "hook",
      "reframeX": 0.5
    },
    {
      "line": "From the air, you can pick out a continent. From the stern of a delivery boat, you need a landing, a street address,",
      "start": 4.88,
      "end": 9.12,
      "visual_idea": "Truck along the stern of the boat to the landing; its delivery address appears on the pier card. Low truck in daylight, the island pier at water level; practical.",
      "direction": {
        "subject": "delivery boat and landing",
        "environment": "the island pier at water level",
        "mood": "practical",
        "move": "truck",
        "action": "Truck along the stern of the boat to the landing; its delivery address appears on the pier card."
      },
      "kit": "dubai",
      "params": {
        "subject": "landing"
      },
      "camera": "low",
      "light": "day",
      "action": "explain",
      "expression": "explaining",
      "overlay": {
        "kind": "label",
        "text": "Landing"
      },
      "transition": "cut",
      "beat": "point",
      "reframeX": 0.5
    }
  ]
}
```

## Example · from a real map pin to the instrument

```json
{
  "shots": [
    {
      "line": "Off Dubai, in two thousand and three, the surveyors found open water.",
      "start": 10,
      "end": 14,
      "visual_idea": "The Dubai pin appears on the world chart; the 2003 survey heading locates the crew in open water. Wide daylight orbit, curious.",
      "direction": {
        "subject": "Dubai survey pin",
        "environment": "world chart at the project office",
        "mood": "curious",
        "move": "orbit",
        "action": "Move from the map edge to the labeled Dubai pin."
      },
      "kit": "map",
      "params": {
        "subject": "Survey off Dubai",
        "detail": "Dubai survey, 2003",
        "pins": [
          {
            "label": "Dubai",
            "lat": 25.2,
            "lon": 55.27
          }
        ]
      },
      "camera": "wide",
      "light": "day",
      "action": "shrug",
      "expression": "explaining",
      "overlay": null,
      "transition": "cut",
      "beat": "lock-in",
      "reframeX": 0.5
    },
    {
      "line": "Their instruments measured the water where a future beach appeared on the survey drawing.",
      "start": 14,
      "end": 18,
      "visual_idea": "The instrument stands over open water as the proposed beach appears on a survey section. Close daylight tilt, analytical.",
      "direction": {
        "subject": "surveyor’s drawing",
        "environment": "launch on open water",
        "mood": "puzzlement",
        "move": "truck",
        "action": "Follow the surveyors’ drawing of a beach; the measured waterline and proposed land sit on different layers."
      },
      "kit": "dubai",
      "params": {
        "subject": "survey",
        "inset": "depth",
        "insetAt": 0.2
      },
      "camera": "close",
      "light": "day",
      "action": "point",
      "expression": "explaining",
      "overlay": null,
      "transition": "cut",
      "beat": "point",
      "reframeX": 0.5
    }
  ]
}
```
