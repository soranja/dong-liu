import type { LyricsSection, TextIllustrationKind } from "../../lyrics/types";
import { TEXT_ILLUSTRATION_KINDS, type TimelineIllustrationKind } from "../../utils/tuning/illustrationKind";

type TunerSectionSelectorProps = {
  followActive: boolean;
  illustrationKind: TimelineIllustrationKind;
  isLocked: boolean;
  selectedSection: LyricsSection;
  onFollowActiveChange: (followActive: boolean) => void;
  onIllustrationKindChange: (illustrationKind: TextIllustrationKind) => void;
  onNext: () => void;
  onPrevious: () => void;
};

const ILLUSTRATION_KIND_LABELS: Record<TimelineIllustrationKind, string> = {
  generic: "Custom",
  "kinetic-warp": "Kinetic warp",
  "word-cloud": "Word cloud",
};
const ILLUSTRATION_KIND_CONTROL_CLASS =
  "h-7 min-w-0 flex-1 border border-(--color-border-strong) bg-(--color-panel) pl-4 font-mono text-[0.65rem] uppercase text-(--color-text)";

export const TunerSectionSelector = ({
  followActive,
  illustrationKind,
  isLocked,
  onFollowActiveChange,
  onIllustrationKindChange,
  onNext,
  onPrevious,
  selectedSection,
}: TunerSectionSelectorProps) => {
  const canSwapIllustration = typeof selectedSection.illustrateWith === "string";

  return (
    <>
      <div className="border border-(--color-border-soft) bg-(--color-panel-chip) p-3">
        <div className="flex items-center gap-2 font-mono text-[0.65rem] uppercase text-(--color-text-muted)">
          <span>#{selectedSection.sectionId}</span>
          <span>/</span>
          {canSwapIllustration ? (
            <select
              aria-label="Illustration component"
              className={`${ILLUSTRATION_KIND_CONTROL_CLASS} pr-10`}
              disabled={isLocked}
              value={illustrationKind}
              onChange={(event) => onIllustrationKindChange(event.currentTarget.value as TextIllustrationKind)}
            >
              {TEXT_ILLUSTRATION_KINDS.map((kind) => (
                <option key={kind} value={kind}>
                  {ILLUSTRATION_KIND_LABELS[kind]}
                </option>
              ))}
            </select>
          ) : (
            <span className={`${ILLUSTRATION_KIND_CONTROL_CLASS} flex items-center pr-4`}>
              {ILLUSTRATION_KIND_LABELS[illustrationKind]}
            </span>
          )}
        </div>
        <p className="mt-1 max-h-16 overflow-auto text-sm leading-snug">{selectedSection.line}</p>
        {isLocked ? (
          <p className="mt-2 font-mono text-[0.65rem] uppercase text-(--color-text-muted)">
            Continuing previous illustration · time controls only
          </p>
        ) : null}
      </div>

      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          className="border border-(--color-border-strong) bg-(--color-panel-raised) px-3 py-2 font-mono text-xs uppercase"
          onClick={onPrevious}
        >
          Previous
        </button>
        <button
          type="button"
          className="border border-(--color-border-strong) bg-(--color-panel-raised) px-3 py-2 font-mono text-xs uppercase"
          onClick={onNext}
        >
          Next
        </button>
      </div>

      <label className="flex items-center gap-2 font-mono text-xs uppercase text-(--color-text-muted)">
        <input
          type="checkbox"
          checked={followActive}
          onChange={(event) => onFollowActiveChange(event.currentTarget.checked)}
        />
        Follow active section
      </label>
    </>
  );
};
