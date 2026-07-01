import { RAM_BOX_LYRICS } from "../../lyrics/ram-box-lyrics";
import type { LyricsSection, TextIllustrationKind } from "../../lyrics/types";

export type TimelineIllustrationKind = TextIllustrationKind | "generic";

export const TEXT_ILLUSTRATION_KINDS = [
  "word-cloud",
  "kinetic-warp",
] as const satisfies ReadonlyArray<TextIllustrationKind>;

const KINETIC_WARP_SECTION_IDS = new Set<number>();
const draftIllustrationKinds = new Map<number, TextIllustrationKind>();
const listeners = new Set<() => void>();
let eligibleWarpIndex = 0;
let previousWarpSectionIndex = -2;

function emit() {
  listeners.forEach((listener) => listener());
}

RAM_BOX_LYRICS.forEach((section, sectionIndex) => {
  if (typeof section.illustrateWith !== "string" || section.illustrateWith.trim().split(/\s+/).length <= 1) return;

  const isThirdEligibleSection = eligibleWarpIndex % 3 === 2;
  if (isThirdEligibleSection && sectionIndex - previousWarpSectionIndex > 1) {
    KINETIC_WARP_SECTION_IDS.add(section.sectionId);
    previousWarpSectionIndex = sectionIndex;
  }
  eligibleWarpIndex += 1;
});

function getAutomaticTimelineIllustrationKind(section: LyricsSection): TextIllustrationKind {
  return KINETIC_WARP_SECTION_IDS.has(section.sectionId) ? "kinetic-warp" : "word-cloud";
}

export function getSavedTimelineIllustrationKind(section: LyricsSection): TimelineIllustrationKind {
  if (typeof section.illustrateWith !== "string") return "generic";

  return section.illustrationKind ?? getAutomaticTimelineIllustrationKind(section);
}

export function getEffectiveTimelineIllustrationKind(section: LyricsSection): TimelineIllustrationKind {
  if (typeof section.illustrateWith !== "string") return "generic";
  if (draftIllustrationKinds.has(section.sectionId))
    return draftIllustrationKinds.get(section.sectionId) ?? "word-cloud";

  return getSavedTimelineIllustrationKind(section);
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
