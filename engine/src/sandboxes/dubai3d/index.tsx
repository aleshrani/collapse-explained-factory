// Sandbox entry for "The World" 3D demo (src/videos/dubai3d/). publicDir = src/videos/brand/public (the two fonts).
import React from "react";
import { Composition, registerRoot } from "remotion";
import { Dubai3D, DUBAI_FRAMES } from "../../videos/dubai3d/Dubai3D";
const Root: React.FC = () => <Composition id="Dubai3D" component={Dubai3D} durationInFrames={DUBAI_FRAMES} fps={30} width={1080} height={1920} />;
registerRoot(Root);
