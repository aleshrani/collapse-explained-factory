// Persona lab entry: mascot concepts drawn with the bridge character engine (copy in src/videos/persona/).
import React from "react";
import { Composition, registerRoot } from "remotion";
import { PersonaLab, PERSONA_LAB_FRAMES } from "../../videos/persona/Bridge";
import { PersonaAvatar, CelebAvatar } from "../../videos/persona/Avatar";
const Root: React.FC = () => (
  <>
    <Composition id="PersonaLab" component={PersonaLab} durationInFrames={PERSONA_LAB_FRAMES} fps={30} width={1080} height={1920} />
    <Composition id="CelebAvatarV1" component={CelebAvatar} durationInFrames={1} fps={30} width={1080} height={1080} defaultProps={{ v: 1 as const }} />
    <Composition id="CelebAvatarV2" component={CelebAvatar} durationInFrames={1} fps={30} width={1080} height={1080} defaultProps={{ v: 2 as const }} />
    <Composition id="DummyAvatar" component={PersonaAvatar} durationInFrames={1} fps={30} width={1080} height={1080} defaultProps={{ kind: "dummy" as const }} />
  </>
);
registerRoot(Root);
