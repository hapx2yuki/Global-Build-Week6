import {Composition} from 'remotion';

import {
  CriteriaForgeVideo,
  DURATION_IN_FRAMES,
  FPS,
} from './video';
import {CriteriaForgeThumbnail} from './thumbnail';

export const CriteriaForgeRoot = () => {
  return (
    <>
      <Composition
        id="CriteriaForgeRich"
        component={CriteriaForgeVideo}
        durationInFrames={DURATION_IN_FRAMES}
        fps={FPS}
        width={1920}
        height={1080}
      />
      <Composition
        id="CriteriaForgeThumbnail"
        component={CriteriaForgeThumbnail}
        durationInFrames={1}
        fps={30}
        width={1280}
        height={720}
      />
    </>
  );
};
