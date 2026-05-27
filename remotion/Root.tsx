import React from 'react';
import { Composition } from 'remotion';
import { DashboardVideo } from './DashboardVideo';

export const RemotionRoot: React.FC = () => {
  return (
    <Composition
      id="DashboardDemo"
      component={DashboardVideo}
      durationInFrames={300}
      fps={30}
      width={720}
      height={480}
    />
  );
};
