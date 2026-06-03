import type { RefObject } from "react";

type PageTimelineProps = {
  hasStarted: boolean;
  replayPromptVisible: boolean;
  replaySequence: number | null;
  sectionHeight: number;
  timelineRef: RefObject<HTMLDivElement | null>;
  onReplay: (autoplay: boolean) => void;
};

export const PageTimeline = (props: PageTimelineProps) => {
  const { hasStarted, onReplay, replayPromptVisible, replaySequence, sectionHeight, timelineRef } = props;
  // Maps the audio timeline across the vertically stacked page sections.
  const PAGE_SECTIONS = [
    "var(--color-section-coral)",
    "var(--color-section-teal)",
    "var(--color-section-gold)",
    "var(--color-section-violet)",
    "var(--color-section-green)",
    "var(--color-section-pink)",
  ];

  return (
    <div ref={timelineRef} data-audio-timeline>
      {PAGE_SECTIONS.map((color, index) => (
        <section
          key={color}
          className="relative flex items-center justify-center overflow-hidden px-6 text-center"
          data-audio-section
          style={{ backgroundColor: color, height: sectionHeight }}
        >
          <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-(--color-panel)" />

          {index === 0 && !hasStarted ? (
            <div className="max-w-lg border border-(--color-panel) bg-(--color-panel) p-6 text-(--color-text)">
              <p className="font-mono text-xs uppercase text-(--color-text-muted)">Scroll locked</p>
              <h2 className="mt-3 font-mono text-3xl font-bold uppercase leading-tight">Press play to start the page timeline</h2>
            </div>
          ) : null}

          {index === PAGE_SECTIONS.length - 1 && replayPromptVisible && replaySequence !== null ? (
            <div className="max-w-md border border-(--color-panel) bg-(--color-panel) p-6 text-(--color-text)">
              <p className="font-mono text-xs uppercase text-(--color-text-muted)">
                {replaySequence > 0 ? `Replay prompt in ${replaySequence}` : "Timeline complete"}
              </p>
              {replaySequence === 0 ? (
                <>
                  <h2 className="mt-3 font-mono text-2xl font-bold uppercase">Do you want to play again?</h2>
                  <div className="mt-5 flex justify-center gap-3">
                    <button
                      type="button"
                      onClick={() => onReplay(true)}
                      className="h-11 border border-(--color-control) bg-(--color-control) px-6 font-mono text-sm font-bold uppercase text-(--color-panel) transition hover:bg-(--color-control-hover)"
                    >
                      Yes
                    </button>
                    <button
                      type="button"
                      onClick={() => onReplay(false)}
                      className="h-11 border border-(--color-border-strong) bg-(--color-panel-raised) px-6 font-mono text-sm font-bold uppercase text-(--color-text) transition hover:bg-(--color-panel-hover)"
                    >
                      No
                    </button>
                  </div>
                </>
              ) : null}
            </div>
          ) : null}
        </section>
      ))}
    </div>
  );
};
