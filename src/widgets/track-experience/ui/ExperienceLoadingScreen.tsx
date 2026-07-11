import type { CSSProperties } from 'react';

type ExperienceLoadingScreenProps = {
  progress: number;
};

const LOADING_FRAME_COUNT = 10;

export const ExperienceLoadingScreen = ({ progress }: ExperienceLoadingScreenProps) => {
  const frameIndex = Math.min(LOADING_FRAME_COUNT - 1, Math.max(0, Math.floor(progress / 10)));
  const framePosition = `${(frameIndex / (LOADING_FRAME_COUNT - 1)) * 100}%`;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-primary-bg px-6 text-primary-text"
      role="status"
    >
      <div className="w-full max-w-lg font-mono flex-col flex gap-4 justify-center items-center">
        <div
          aria-label="Loading progress"
          aria-valuemax={100}
          aria-valuemin={0}
          aria-valuenow={progress}
          className="aspect-8/1 w-full bg-[url('/animations/loading/loading-sprite.png')] bg-size-[100%_1000%] bg-no-repeat"
          role="progressbar"
          style={{ backgroundPosition: `center ${framePosition}` } as CSSProperties}
        />

        <h3 className="mt-2 text-4xl font-bold uppercase">Preparing Timeline</h3>
      </div>
    </div>
  );
};
