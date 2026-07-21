import {Composition} from 'remotion';

import {
  CriteriaForgeVideo,
  DURATION_IN_FRAMES,
  FPS,
} from './video';

export const CriteriaForgeRoot = () => {
  return (
    <Composition
      id="CriteriaForgeRich"
      component={CriteriaForgeVideo}
      durationInFrames={DURATION_IN_FRAMES}
      fps={FPS}
      width={1920}
      height={1080}
    />
  );
};
