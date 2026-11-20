// Sandbox entry for the Dubai demo short (src/videos/demo_dubai/). publicDir = src/videos/brand/public (the two fonts).
import React from "react";
import { Composition, registerRoot } from "remotion";
import { DemoDubai, DEMO_FRAMES } from "../../videos/demo_dubai/Demo";
const Root: React.FC = () => <Composition id="DemoDubai" component={DemoDubai} durationInFrames={DEMO_FRAMES} fps={30} width={1080} height={1920} />;
registerRoot(Root);
