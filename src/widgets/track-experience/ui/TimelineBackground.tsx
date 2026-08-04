import type { RefObject } from 'react';

import type { LyricsBackground } from '@entities/track/model/types';

type TimelineBackgroundProps = {
  background?: LyricsBackground;
  index: number;
  backgroundRefs: RefObject<Array<HTMLElement | null>>;
  revision: number;
};

export const TimelineBackground = ({ background, backgroundRefs, index, revision }: TimelineBackgroundProps) => (
  <div
    ref={(element) => {
      backgroundRefs.current[index] = element;
    }}
    className="absolute inset-0 opacity-0"
    data-active="false"
    data-background-preset={background?.mediaType === 'solid' ? background.preset : undefined}
    data-background-type={background?.mediaType}
    data-timeline-background
    data-tuning-version={revision || undefined}
  >
    {(background?.mediaType === 'image' || background?.mediaType === 'video') && !background.src ? (
      <div
        className="flex h-full w-full items-center justify-center bg-(--color-arterial-red) p-8 text-center font-mono text-4xl font-black uppercase text-(--color-cream-white)"
        data-missing-background-path
      >
        No {background.mediaType} path present
      </div>
    ) : null}
    {background?.mediaType === 'image' && background.src ? (
      <img alt={background.alt} className="h-full w-full object-cover" src={background.src} />
    ) : null}
    {background?.mediaType === 'video' && background.src ? (
      <video
        className="pointer-events-none h-full w-full object-cover"
        loop
        muted
        playsInline
        poster={background.poster}
        src={background.src}
      />
    ) : null}
  </div>
);
