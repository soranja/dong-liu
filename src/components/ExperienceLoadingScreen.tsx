import type { CSSProperties } from "react";

type ExperienceLoadingScreenProps = {
  progress: number;
};

export const ExperienceLoadingScreen = ({ progress }: ExperienceLoadingScreenProps) => (
  <div
    className="fixed inset-0 z-[60] flex items-center justify-center px-6 text-(--color-text)"
    role="status"
    style={{ backgroundColor: "var(--color-bg)" }}
  >
    <div className="w-full max-w-lg font-mono">
      <div className="mb-3 flex items-end justify-between gap-6">
        <div>
          <p className="text-xs uppercase text-(--color-text-muted)">Preparing timeline</p>
          <h1 className="mt-2 text-2xl font-bold uppercase">Loading experience</h1>
        </div>
        <span className="text-xl font-bold tabular-nums">{progress}%</span>
      </div>

      <div
        aria-label="Loading progress"
        aria-valuemax={100}
        aria-valuemin={0}
        aria-valuenow={progress}
        className="h-3 overflow-hidden border border-(--color-border-strong) bg-(--color-panel)"
        role="progressbar"
      >
        <div
          className="h-full bg-(--color-accent) transition-[width] duration-150"
          style={{ width: `${progress}%` } as CSSProperties}
        />
      </div>
    </div>
  </div>
);
