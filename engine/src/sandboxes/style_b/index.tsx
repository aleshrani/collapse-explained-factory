import React from "react";
import { Composition, registerRoot } from "remotion";
import { StyleB } from "../../videos/style_b/Paper";
const Root: React.FC = () => <Composition id="StyleB" component={StyleB} durationInFrames={30} fps={30} width={1080} height={1920} />;
registerRoot(Root);
