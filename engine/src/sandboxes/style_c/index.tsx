import React from "react";
import { Composition, registerRoot } from "remotion";
import { StyleC } from "../../videos/style_c/Vinyl";
const Root: React.FC = () => <Composition id="StyleC" component={StyleC} durationInFrames={30} fps={30} width={1080} height={1920} />;
registerRoot(Root);
