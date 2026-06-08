import type { RefObject } from "react";

type PageTimelineProps = {
  footerHeight: number;
  hasStarted: boolean;
  headerHeight: number;
  replayPromptVisible: boolean;
  replaySequence: number | null;
  sectionHeight: number;
  timelineRef: RefObject<HTMLDivElement | null>;
  onReplay: (autoplay: boolean) => void;
};

const PAGE_SECTIONS = Array.from({ length: 12 }, (_, index) => `screen-${index + 1}`);

export const PageTimeline = (props: PageTimelineProps) => {
  const {
    footerHeight,
    hasStarted,
    headerHeight,
    onReplay,
    replayPromptVisible,
    replaySequence,
    sectionHeight,
    timelineRef,
  } = props;

  return (
    <div ref={timelineRef} data-audio-timeline>
      {!hasStarted ? (
        <div
          className="pointer-events-none fixed inset-x-0 z-10 flex items-center justify-center px-6 text-center"
          style={{ bottom: footerHeight, top: headerHeight }}
        >
          <div className="max-w-lg p-6 text-(--color-text)">
            <p className="font-mono text-xs uppercase text-(--color-text-muted)">Timeline locked</p>
            <h2 className="mt-3 font-mono text-3xl font-bold uppercase leading-tight">Press play to start</h2>
          </div>
        </div>
      ) : null}

      {PAGE_SECTIONS.map((screen, index) => (
        <section
          key={screen}
          className="relative flex items-center justify-center overflow-hidden px-6 text-center"
          data-audio-section
          style={{ backgroundColor: "var(--color-panel)", height: sectionHeight }}
        >
          <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-(--color-panel)" />

          {index === PAGE_SECTIONS.length - 1 && replayPromptVisible && replaySequence !== null ? (
            <div className="max-w-md p-6 text-(--color-text)">
              <p className="font-mono text-xs uppercase text-(--color-text-muted)">
                {replaySequence > 0 ? `Replay prompt in ${replaySequence}` : "Timeline complete"}
              </p>
              {replaySequence === 0 ? (
                <>
                  <h2 className="mt-3 font-mono text-2xl font-bold uppercase">Play again?</h2>
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
