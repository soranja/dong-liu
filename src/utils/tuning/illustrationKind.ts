import type { LyricsSection } from "../../entities/track/model/types";
import { TEXT_ILLUSTRATION_KINDS, type TextIllustrationKind } from "../../shared/ui/illustration-animations/types";

export type TimelineIllustrationKind = TextIllustrationKind | "generic";

export { TEXT_ILLUSTRATION_KINDS };

const draftIllustrationKinds = new Map<number, TextIllustrationKind>();
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((listener) => listener());
}

function getAutomaticTimelineIllustrationKind(
  lyrics: readonly LyricsSection[],
  targetSection: LyricsSection,
): TextIllustrationKind {
  const kineticWarpSectionIds = new Set<number>();
  let eligibleWarpIndex = 0;
  let previousWarpSectionIndex = -2;

  lyrics.forEach((section, sectionIndex) => {
    if (typeof section.illustrateWith !== "string" || section.illustrateWith.trim().split(/\s+/).length <= 1) return;

    const isThirdEligibleSection = eligibleWarpIndex % 3 === 2;
    if (isThirdEligibleSection && sectionIndex - previousWarpSectionIndex > 1) {
      kineticWarpSectionIds.add(section.sectionId);
      previousWarpSectionIndex = sectionIndex;
    }
    eligibleWarpIndex += 1;
  });

  return kineticWarpSectionIds.has(targetSection.sectionId) ? "kinetic-warp" : "word-cloud";
}

export function getSavedTimelineIllustrationKind(
  lyrics: readonly LyricsSection[],
  section: LyricsSection,
): TimelineIllustrationKind {
  if (typeof section.illustrateWith !== "string") return "generic";

  return section.illustrationKind ?? getAutomaticTimelineIllustrationKind(lyrics, section);
}

export function getEffectiveTimelineIllustrationKind(
  lyrics: readonly LyricsSection[],
  section: LyricsSection,
): TimelineIllustrationKind {
  if (typeof section.illustrateWith !== "string") return "generic";
  if (draftIllustrationKinds.has(section.sectionId))
    return draftIllustrationKinds.get(section.sectionId) ?? "word-cloud";

  return getSavedTimelineIllustrationKind(lyrics, section);
}

export function setDraftTimelineIllustrationKind(sectionId: number, illustrationKind: TextIllustrationKind) {
  draftIllustrationKinds.set(sectionId, illustrationKind);
  emit();
}

export function subscribeIllustrationKindTuning(listener: () => void) {
  listeners.add(listener);

  return () => {
    listeners.delete(listener);
  };
}
