import type { IllustrationAnimation } from './types';
import {
  ANIMATION_END_PERCENT_MIN,
  ANIMATION_START_PERCENT_MAX,
  DEFAULT_ANIMATION_LENGTH_PERCENT,
  TUNING_PERCENT_MAX,
  TUNING_PERCENT_MIN,
} from '@shared/config/tuning';

export { DEFAULT_ANIMATION_LENGTH_PERCENT } from '@shared/config/tuning';

type IllustrationAnimationResult = {
  isObserved: boolean;
  progress: number;
};

type ResolveIllustrationAnimationOptions = {
  animation?: IllustrationAnimation;
  defaultEndPercent?: number;
  sectionProgress: number;
};

export const DEFAULT_INSTANT_ANIMATION = { variant: 'instant' } satisfies IllustrationAnimation;
export const WORD_CLOUD_REVEAL_END_PERCENT = 60;
export const SINGLE_WORD_REVEAL_END_PERCENT = 10;

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

export function getAnimationLengthPercent(animationLengthPercent = DEFAULT_ANIMATION_LENGTH_PERCENT) {
  return clamp(Math.round(animationLengthPercent), TUNING_PERCENT_MIN, TUNING_PERCENT_MAX);
}

export function getRangeAnimation(
  startPercent: number,
  endPercent: number,
  animationLengthPercent = DEFAULT_ANIMATION_LENGTH_PERCENT,
): IllustrationAnimation {
  return {
    animationLengthPercent: getAnimationLengthPercent(animationLengthPercent),
    endPercent: clamp(Math.round(endPercent), ANIMATION_END_PERCENT_MIN, TUNING_PERCENT_MAX),
    startPercent: clamp(Math.round(startPercent), TUNING_PERCENT_MIN, ANIMATION_START_PERCENT_MAX),
    variant: 'range',
  };
}

export function getRangeAnimationEndPercent(
  startPercent: number,
  endPercent: number,
  animationLengthPercent = DEFAULT_ANIMATION_LENGTH_PERCENT,
) {
  const clampedStartPercent = clamp(Math.round(startPercent), TUNING_PERCENT_MIN, ANIMATION_START_PERCENT_MAX);
  const clampedEndPercent = clamp(Math.round(endPercent), ANIMATION_END_PERCENT_MIN, TUNING_PERCENT_MAX);
  const clampedLengthPercent = getAnimationLengthPercent(animationLengthPercent);

  return clampedStartPercent + (clampedEndPercent - clampedStartPercent) * (clampedLengthPercent / TUNING_PERCENT_MAX);
}

export function resolveIllustrationAnimation({
  animation,
  defaultEndPercent = TUNING_PERCENT_MAX,
  sectionProgress,
}: ResolveIllustrationAnimationOptions): IllustrationAnimationResult {
  const normalizedProgress = clamp(sectionProgress, 0, 1);
  const progressPercent = normalizedProgress * TUNING_PERCENT_MAX;

  if (!animation || animation.variant === 'range') {
    const startPercent = animation?.variant === 'range' ? animation.startPercent : TUNING_PERCENT_MIN;
    const endPercent = animation?.variant === 'range' ? animation.endPercent : defaultEndPercent;
    const animationLengthPercent =
      animation?.variant === 'range'
        ? (animation.animationLengthPercent ?? DEFAULT_ANIMATION_LENGTH_PERCENT)
        : DEFAULT_ANIMATION_LENGTH_PERCENT;
    const animationEndPercent =
      animation?.variant === 'range'
        ? getRangeAnimationEndPercent(startPercent, endPercent, animationLengthPercent)
        : startPercent +
          (clamp(endPercent, TUNING_PERCENT_MIN, TUNING_PERCENT_MAX) - startPercent) *
            (animationLengthPercent / TUNING_PERCENT_MAX);
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
