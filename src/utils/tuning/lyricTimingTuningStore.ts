type TuningListener = () => void;

const draftStartTimes = new Map<number, number>();
const listeners = new Set<TuningListener>();

function emit() {
  listeners.forEach((listener) => listener());
}

export function getDraftLyricSectionStart(sectionId: number) {
  return draftStartTimes.get(sectionId);
}

export function setDraftLyricSectionStart(sectionId: number, startTime: number) {
  draftStartTimes.set(sectionId, startTime);
  emit();
}

export function subscribeLyricTimingTuning(listener: TuningListener) {
  listeners.add(listener);

  return () => {
    listeners.delete(listener);
  };
}
