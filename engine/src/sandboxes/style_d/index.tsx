import React from "react";
import { Composition, registerRoot } from "remotion";
import { StyleD } from "../../videos/style_d/Comic";
const Root: React.FC = () => <Composition id="StyleD" component={StyleD} durationInFrames={30} fps={30} width={1080} height={1920} />;
registerRoot(Root);
