import React from "react";
import { Composition, registerRoot } from "remotion";
import { StyleA } from "../../videos/style_a/Clay";
const Root: React.FC = () => <Composition id="StyleA" component={StyleA} durationInFrames={30} fps={30} width={1080} height={1920} />;
registerRoot(Root);
