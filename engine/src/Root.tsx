import React from "react";
import { Composition } from "remotion";
import { BridgeShort, BRIDGE_FRAMES } from "./videos/bridge/Bridge";
import { CarRiverShort, CARRIVER_FRAMES } from "./videos/carriver/CarRiver";
export const Root: React.FC = () => (
  <>
    <Composition id="BridgeShort" component={BridgeShort} durationInFrames={BRIDGE_FRAMES} fps={30} width={1080} height={1920} />
    <Composition id="CarRiver" component={CarRiverShort} durationInFrames={CARRIVER_FRAMES} fps={30} width={1080} height={1920} />
  </>
);
