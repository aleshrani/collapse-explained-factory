// Brand lab entry: "Collapse Explained" host candidates, Specs avatars, character sheet and banner (src/videos/brand/).
import React from "react";
import { Composition, registerRoot } from "remotion";
import { FiveHosts, HostAvatar } from "../../videos/brand/Brand";
import { SpecsAvatar, SpecsSheet } from "../../videos/brand/Specs";
import { Banner } from "../../videos/brand/Banner";
import { SpecsV2Options } from "../../videos/brand/SpecsV2";
import { Round3 } from "../../videos/brand/Round3";
import { Round4 } from "../../videos/brand/Round4";
import { Round5 } from "../../videos/brand/Round5";
import { ArchitectSheet } from "../../videos/brand/ArchitectSheet";
import { FinalAvatar, FinalBanner } from "../../videos/brand/Final";

const Root: React.FC = () => (
  <>
    <Composition id="FiveHosts" component={FiveHosts} durationInFrames={1} fps={30} width={3000} height={1900} />
    {[0, 1, 2, 3, 4].map((i) => <Composition key={i} id={`Avatar${i + 1}`} component={HostAvatar} durationInFrames={1} fps={30} width={1080} height={1080} defaultProps={{ i }} />)}
    {[0, 1, 2].map((i) => <Composition key={`s${i}`} id={`SpecsAvatar${i + 1}`} component={SpecsAvatar} durationInFrames={1} fps={30} width={1080} height={1080} defaultProps={{ i }} />)}
    <Composition id="SpecsV2Options" component={SpecsV2Options} durationInFrames={1} fps={30} width={1800} height={1900} />
    <Composition id="ArchitectSheet" component={ArchitectSheet} durationInFrames={1} fps={30} width={3200} height={1600} />
    <Composition id="Round5" component={Round5} durationInFrames={1} fps={30} width={3200} height={1700} />
    <Composition id="R4Scientist" component={Round4} durationInFrames={1} fps={30} width={3200} height={1560} defaultProps={{ who: "scientist" as const }} />
    <Composition id="R4Professor" component={Round4} durationInFrames={1} fps={30} width={3200} height={1560} defaultProps={{ who: "professor" as const }} />
    <Composition id="Round3" component={Round3} durationInFrames={1} fps={30} width={3200} height={1920} />
    {[0, 1].map((i) => <Composition key={`f${i}`} id={`FinalAvatar${i + 1}`} component={FinalAvatar} durationInFrames={1} fps={30} width={1080} height={1080} defaultProps={{ i }} />)}
    <Composition id="FinalBanner" component={FinalBanner} durationInFrames={1} fps={30} width={2560} height={1440} />
    <Composition id="Banner" component={Banner} durationInFrames={1} fps={30} width={2560} height={1440} />
    <Composition id="SpecsSheet" component={SpecsSheet} durationInFrames={1} fps={30} width={3200} height={1800} />
  </>
);
registerRoot(Root);
