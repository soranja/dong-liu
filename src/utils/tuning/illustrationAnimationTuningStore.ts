import type { IllustrationAnimation, IllustrationVisibility, LyricsSection } from "../../lyrics/types";

type DraftAnimation = IllustrationAnimation | null;
type TuningListener = () => void;

const draftAnimations = new Map<number, DraftAnimation>();
const draftVisibilities = new Map<number, IllustrationVisibility>();
const listeners = new Set<TuningListener>();

function emit() {
  listeners.forEach((listener) => listener());
}

export function getEffectiveIllustrationAnimation(section: LyricsSection) {
  if (!draftAnimations.has(section.sectionId)) return section.illustrationAnimation;

  return draftAnimations.get(section.sectionId) ?? undefined;
}

export function getEffectiveIllustrationVisibility(section: LyricsSection): IllustrationVisibility {
  if (section.isOverlay) return "only-active";
  if (!draftVisibilities.has(section.sectionId)) return section.illustrationVisibility ?? "adjacent";

  return draftVisibilities.get(section.sectionId) ?? "adjacent";
}

export function setDraftIllustrationAnimation(sectionId: number, animation: DraftAnimation) {
  draftAnimations.set(sectionId, animation);
  emit();
}

export function setDraftIllustrationVisibility(sectionId: number, visibility: IllustrationVisibility) {
  draftVisibilities.set(sectionId, visibility);
  emit();
}

export function subscribeIllustrationAnimationTuning(listener: TuningListener) {
  listeners.add(listener);

  return () => {
    listeners.delete(listener);
  };
}
