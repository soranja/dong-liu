import { DEFAULT_ANIMATION_LENGTH_PERCENT } from "@entities/track/model/animation";
import type { IllustrationAnimation, LyricsSection } from "@entities/track/model/types";

export type DirtyAnimation = IllustrationAnimation | null;
export type DirtyAnimations = Record<number, DirtyAnimation>;

const DEFAULT_RANGE = {
  animationLengthPercent: DEFAULT_ANIMATION_LENGTH_PERCENT,
  endPercent: 100,
  startPercent: 0,
  variant: "range",
} satisfies Extract<IllustrationAnimation, { variant: "range" }>;

export function getDirtyAnimation(dirtyAnimations: DirtyAnimations, sectionId: number) {
  return Object.hasOwn(dirtyAnimations, sectionId) ? dirtyAnimations[sectionId] : undefined;
}

export function getSavedAnimation(lyrics: readonly LyricsSection[], sectionId: number): DirtyAnimation {
  return lyrics.find((section) => section.sectionId === sectionId)?.illustrationAnimation ?? null;
}

export function getEffectiveAnimation(
  lyrics: readonly LyricsSection[],
  dirtyAnimations: DirtyAnimations,
  sectionId: number,
) {
  const dirtyAnimation = getDirtyAnimation(dirtyAnimations, sectionId);
  if (dirtyAnimation !== undefined) return dirtyAnimation ?? undefined;

  return getSavedAnimation(lyrics, sectionId) ?? undefined;
}

export function getRangeValues(animation: IllustrationAnimation | undefined) {
  return animation?.variant === "range" ? animation : DEFAULT_RANGE;
}

export function areDirtyAnimationsEqual(left: DirtyAnimation | undefined, right: DirtyAnimation | undefined) {
  const leftAnimation = left ?? null;
  const rightAnimation = right ?? null;
  if (leftAnimation === null || rightAnimation === null) return leftAnimation === rightAnimation;
  if (leftAnimation.variant !== rightAnimation.variant) return false;
  if (leftAnimation.variant !== "range" || rightAnimation.variant !== "range") return true;

  return (
    leftAnimation.startPercent === rightAnimation.startPercent &&
    leftAnimation.endPercent === rightAnimation.endPercent &&
    (leftAnimation.animationLengthPercent ?? DEFAULT_ANIMATION_LENGTH_PERCENT) ===
      (rightAnimation.animationLengthPercent ?? DEFAULT_ANIMATION_LENGTH_PERCENT)
  );
}
