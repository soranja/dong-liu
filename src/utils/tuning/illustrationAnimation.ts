import type { IllustrationAnimation } from "../../entities/track/model/types";

type IllustrationAnimationResult = {
  isObserved: boolean;
  progress: number;
};

type ResolveIllustrationAnimationOptions = {
  animation?: IllustrationAnimation;
  defaultEndPercent?: number;
  sectionProgress: number;
};

const DEFAULT_FULL_RANGE_END_PERCENT = 100;
export const DEFAULT_ANIMATION_LENGTH_PERCENT = 100;
export const DEFAULT_INSTANT_ANIMATION = { variant: "instant" } satisfies IllustrationAnimation;
export const WORD_CLOUD_REVEAL_END_PERCENT = 60;
export const SINGLE_WORD_REVEAL_END_PERCENT = 10;

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

export function getAnimationLengthPercent(animationLengthPercent = DEFAULT_ANIMATION_LENGTH_PERCENT) {
  return clamp(Math.round(animationLengthPercent), 0, 100);
}

export function getRangeAnimation(
  startPercent: number,
  endPercent: number,
  animationLengthPercent = DEFAULT_ANIMATION_LENGTH_PERCENT,
): IllustrationAnimation {
  return {
    animationLengthPercent: getAnimationLengthPercent(animationLengthPercent),
    endPercent: clamp(Math.round(endPercent), 51, 100),
    startPercent: clamp(Math.round(startPercent), 0, 50),
    variant: "range",
  };
}

export function getRangeAnimationEndPercent(
  startPercent: number,
  endPercent: number,
  animationLengthPercent = DEFAULT_ANIMATION_LENGTH_PERCENT,
) {
  const clampedStartPercent = clamp(Math.round(startPercent), 0, 50);
  const clampedEndPercent = clamp(Math.round(endPercent), 51, 100);
  const clampedLengthPercent = getAnimationLengthPercent(animationLengthPercent);

  return clampedStartPercent + (clampedEndPercent - clampedStartPercent) * (clampedLengthPercent / 100);
}

export function resolveIllustrationAnimation({
  animation,
  defaultEndPercent = DEFAULT_FULL_RANGE_END_PERCENT,
  sectionProgress,
}: ResolveIllustrationAnimationOptions): IllustrationAnimationResult {
  const normalizedProgress = clamp(sectionProgress, 0, 1);
  const progressPercent = normalizedProgress * 100;

  if (!animation || animation.variant === "range") {
    const startPercent = animation?.variant === "range" ? animation.startPercent : 0;
    const endPercent = animation?.variant === "range" ? animation.endPercent : defaultEndPercent;
    const animationLengthPercent =
      animation?.variant === "range"
        ? (animation.animationLengthPercent ?? DEFAULT_ANIMATION_LENGTH_PERCENT)
        : DEFAULT_ANIMATION_LENGTH_PERCENT;
    const animationEndPercent =
      animation?.variant === "range"
        ? getRangeAnimationEndPercent(startPercent, endPercent, animationLengthPercent)
        : startPercent + (clamp(endPercent, 0, 100) - startPercent) * (animationLengthPercent / 100);
    const range = animationEndPercent - startPercent;
    const progress =
      range <= Number.EPSILON && progressPercent >= startPercent
        ? 1
        : clamp((progressPercent - startPercent) / Math.max(Number.EPSILON, range), 0, 1);

    return {
      isObserved: progressPercent >= startPercent,
      progress,
    };
  }

  return {
    isObserved: true,
    progress: 1,
  };
}
