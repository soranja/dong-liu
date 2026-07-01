import type { ReactNode } from "react";

import type { TextIllustrationKind } from "../../../shared/ui/illustration-animations/types";
import {
  getSavedEnterDurationMs,
  getSavedExitDurationMs,
  getSavedNoSlideBy,
  getSavedSectionWidthPercent,
} from "./layout";
import type { IllustrationAnimation, IllustrationVisibility, LyricsSection } from "./types";

export type TimelineIllustrationKind = TextIllustrationKind | "generic";

export type TimelineProgressDetail = {
  activeIndex: number;
  currentTime: number;
  duration: number;
  progress: number;
  sectionId: number;
};

export type TrackTuningPanelProps = {
  duration: number;
  isLoading: boolean;
  isPlaying: boolean;
  onSeek: (progress: number) => void;
};

export type TrackTuningAdapter = {
  getIllustrationAnimation: (section: LyricsSection) => IllustrationAnimation | undefined;
  getIllustrationFadeInMs: (section: LyricsSection) => number;
  getIllustrationFadeOutMs: (section: LyricsSection) => number;
  getIllustrationKind: (section: LyricsSection) => TimelineIllustrationKind;
  getIllustrationVisibility: (section: LyricsSection) => IllustrationVisibility;
  getSectionContinuing: (section: LyricsSection) => boolean;
  getSectionEnterDurationMs: (section: LyricsSection) => number;
  getSectionExitDurationMs: (section: LyricsSection) => number;
  getSectionNoSlideBy: (section: LyricsSection) => boolean;
  getSectionOverlay: (section: LyricsSection) => boolean;
  getSectionStart: (section: LyricsSection) => number;
  getSectionWidthPercent: (section: LyricsSection) => number;
  publishTimelineProgress: (detail: TimelineProgressDetail) => void;
  renderPanel?: (props: TrackTuningPanelProps) => ReactNode;
  subscribe: (listener: () => void) => () => void;
};

export function parseLyricsTimestamp(timestamp: string) {
  const [minutes, seconds] = timestamp.split(":").map(Number);

  return minutes * 60 + seconds;
}

export function getAutomaticTimelineIllustrationKind(
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

export function resolveIllustrationAnimation(section: LyricsSection, adapter?: TrackTuningAdapter) {
  return adapter?.getIllustrationAnimation(section) ?? section.illustrationAnimation;
}

export function resolveIllustrationFadeInMs(section: LyricsSection, adapter?: TrackTuningAdapter) {
  return adapter?.getIllustrationFadeInMs(section) ?? section.illustrationFadeInMs ?? 0;
}

export function resolveIllustrationFadeOutMs(section: LyricsSection, adapter?: TrackTuningAdapter) {
  return adapter?.getIllustrationFadeOutMs(section) ?? section.illustrationFadeOutMs ?? 0;
}

export function resolveIllustrationKind(
  lyrics: readonly LyricsSection[],
  section: LyricsSection,
  adapter?: TrackTuningAdapter,
) {
  return adapter?.getIllustrationKind(section) ?? getSavedTimelineIllustrationKind(lyrics, section);
}

export function resolveIllustrationVisibility(section: LyricsSection, adapter?: TrackTuningAdapter) {
  if (resolveSectionOverlay(section, adapter)) return "only-active";

  return adapter?.getIllustrationVisibility(section) ?? section.illustrationVisibility ?? "adjacent";
}

export function resolveSectionContinuing(section: LyricsSection, adapter?: TrackTuningAdapter) {
  return adapter?.getSectionContinuing(section) ?? Boolean(section.continuing);
}

export function resolveSectionEnterDurationMs(section: LyricsSection, adapter?: TrackTuningAdapter) {
  return adapter?.getSectionEnterDurationMs(section) ?? getSavedEnterDurationMs(section);
}

export function resolveSectionExitDurationMs(section: LyricsSection, adapter?: TrackTuningAdapter) {
  return adapter?.getSectionExitDurationMs(section) ?? getSavedExitDurationMs(section);
}

export function resolveSectionNoSlideBy(section: LyricsSection, adapter?: TrackTuningAdapter) {
  return adapter?.getSectionNoSlideBy(section) ?? getSavedNoSlideBy(section);
}

export function resolveSectionOverlay(section: LyricsSection, adapter?: TrackTuningAdapter) {
  return adapter?.getSectionOverlay(section) ?? Boolean(section.isOverlay);
}

export function resolveSectionStart(section: LyricsSection, adapter?: TrackTuningAdapter) {
  return adapter?.getSectionStart(section) ?? parseLyricsTimestamp(section.timestamp);
}

export function resolveSectionWidthPercent(section: LyricsSection, adapter?: TrackTuningAdapter) {
  return adapter?.getSectionWidthPercent(section) ?? getSavedSectionWidthPercent(section);
}
