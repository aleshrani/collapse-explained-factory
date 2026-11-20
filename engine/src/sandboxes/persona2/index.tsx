// Persona 2 lab entry: Yolbo + Krevvo, style A (clay) / C (vinyl), calm / panic, plus square avatars.
import React from "react";
import { Composition, registerRoot } from "remotion";
import { Persona2 } from "../../videos/persona2/Lab";
const WHO = ["yolbo", "krevvo"] as const, LOOK = ["A", "C"] as const;
const Root: React.FC = () => (
  <>
    {WHO.flatMap((who) => LOOK.flatMap((look) => [false, true].map((panic) => (
      <Composition key={`${who}-${look}-${panic}`} id={`${who}-${look}-${panic ? "panic" : "calm"}`} component={Persona2} durationInFrames={30} fps={30} width={1080} height={1920}
        defaultProps={{ who, look, panic, w: 1080, h: 1920 }} />
    ))))}
    {WHO.flatMap((who) => LOOK.map((look) => (
      <Composition key={`${who}-${look}-av`} id={`${who}-${look}-avatar`} component={Persona2} durationInFrames={1} fps={30} width={1080} height={1080}
        defaultProps={{ who, look, panic: false, avatar: true, w: 1080, h: 1080 }} />
    )))}
  </>
);
registerRoot(Root);
