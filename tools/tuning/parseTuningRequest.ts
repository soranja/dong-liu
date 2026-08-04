import { parseLyricsTimestamp } from '../../src/entities/track/lib/timestamp';
import {
  ANIMATION_END_PERCENT_MIN,
  ANIMATION_START_PERCENT_MAX,
  DEFAULT_ANIMATION_LENGTH_PERCENT,
  FADE_TIMING_MAX_MS,
  ILLUSTRATION_VISIBILITIES,
  LYRICS_COLOR_PRESETS,
  SECTION_WIDTH_STEP_PERCENT,
  TEXT_BACKGROUND_PADDING_MAX_PX,
  TUNING_PERCENT_MAX,
  TUNING_PERCENT_MIN,
} from '../../src/shared/config/tuning';
import { TEXT_ILLUSTRATION_KINDS } from '../../src/shared/ui/illustration-animations/kinds';
import type { AnimationChange, AnimationSetting, BackgroundSetting } from './types';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function parseAnimation(value: unknown): AnimationSetting | null {
  if (value === null) return null;
  if (!isRecord(value) || typeof value.variant !== 'string') throw new Error('Invalid animation setting');
  if (value.variant === 'instant') return { variant: 'instant' };
  if (value.variant !== 'range') throw new Error('Invalid animation variant');

  const startPercent = Number(value.startPercent);
  const endPercent = Number(value.endPercent);
  const animationLengthPercent =
    value.animationLengthPercent === undefined
      ? DEFAULT_ANIMATION_LENGTH_PERCENT
      : Number(value.animationLengthPercent);
  if (
    !Number.isFinite(startPercent) ||
    startPercent < TUNING_PERCENT_MIN ||
    startPercent > ANIMATION_START_PERCENT_MAX
  ) {
    throw new Error(`startPercent must be ${TUNING_PERCENT_MIN}-${ANIMATION_START_PERCENT_MAX}`);
  }
  if (!Number.isFinite(endPercent) || endPercent < ANIMATION_END_PERCENT_MIN || endPercent > TUNING_PERCENT_MAX) {
    throw new Error(`endPercent must be ${ANIMATION_END_PERCENT_MIN}-${TUNING_PERCENT_MAX}`);
  }
  if (
    !Number.isFinite(animationLengthPercent) ||
    animationLengthPercent < TUNING_PERCENT_MIN ||
    animationLengthPercent > TUNING_PERCENT_MAX
  ) {
    throw new Error(`animationLengthPercent must be ${TUNING_PERCENT_MIN}-${TUNING_PERCENT_MAX}`);
  }

  const wordStartPercents = value.wordStartPercents;
  if (
    wordStartPercents !== undefined &&
    (!Array.isArray(wordStartPercents) ||
      wordStartPercents.some(
        (item) =>
          !Number.isFinite(Number(item)) || Number(item) < TUNING_PERCENT_MIN || Number(item) > TUNING_PERCENT_MAX,
      ))
  ) {
    throw new Error(`wordStartPercents must contain percentages from ${TUNING_PERCENT_MIN}-${TUNING_PERCENT_MAX}`);
  }

  return {
    animationLengthPercent,
    endPercent,
    startPercent,
    variant: 'range',
    wordStartPercents: wordStartPercents?.map(Number),
  };
}

function parseBackground(value: unknown): BackgroundSetting | null {
  if (value === null) return null;
  if (!isRecord(value)) throw new Error('Invalid background');

  const mediaType = value.mediaType;
  if (mediaType === 'solid') {
    return {
      mediaType,
      preset: parseEnum(value.preset, LYRICS_COLOR_PRESETS, 'Invalid background preset'),
    };
  }
  if (mediaType === 'image') {
    if (
      (value.alt !== undefined && typeof value.alt !== 'string') ||
      (value.src !== undefined && (typeof value.src !== 'string' || !value.src))
    ) {
      throw new Error('Image background accepts optional alt and src strings');
    }

    return {
      ...(value.alt ? { alt: value.alt } : {}),
      mediaType,
      ...(value.src ? { src: value.src } : {}),
    };
  }
  if (mediaType === 'video') {
    if (
      (value.src !== undefined && (typeof value.src !== 'string' || !value.src)) ||
      (value.poster !== undefined && typeof value.poster !== 'string')
    ) {
      throw new Error('Video background accepts optional src and poster strings');
    }

    return {
      mediaType,
      ...(value.poster ? { poster: value.poster } : {}),
      ...(value.src ? { src: value.src } : {}),
    };
  }

  throw new Error('Invalid background type');
}

function parseEnum<T extends string>(value: unknown, options: readonly T[], error: string): T {
  if (typeof value === 'string' && options.includes(value as T)) return value as T;

  throw new Error(error);
}

function parseFadeDuration(value: unknown, propertyName: string) {
  const duration = Number(value);
  if (!Number.isInteger(duration) || duration < 0 || duration > FADE_TIMING_MAX_MS) {
    throw new Error(`${propertyName} must be 0-${FADE_TIMING_MAX_MS}`);
  }

  return duration;
}

function parsePercent(value: unknown, propertyName: string, min: number, max: number, step = 1) {
  const percent = Number(value);
  if (!Number.isInteger(percent) || percent < min || percent > max || percent % step !== 0) {
    throw new Error(`${propertyName} must be ${min}-${max}${step > 1 ? ` in ${step}% steps` : ''}`);
  }

  return percent;
}

function parseBoolean(value: unknown, propertyName: string) {
  if (typeof value === 'boolean') return value;

  throw new Error(`${propertyName} must be a boolean`);
}

function parseTimestamp(value: unknown) {
  if (typeof value !== 'string' || !Number.isFinite(parseLyricsTimestamp(value))) throw new Error('Invalid timestamp');

  return value;
}

function parseChange(entry: unknown): AnimationChange {
  if (!isRecord(entry)) throw new Error('Invalid change');

  const sectionId = Number(entry.sectionId);
  if (!Number.isInteger(sectionId) || sectionId <= 0) throw new Error('Invalid sectionId');

  const hasIllustrationAnimation = Object.hasOwn(entry, 'illustrationAnimation');
  const hasBackground = Object.hasOwn(entry, 'background');
  const hasBackgroundShared = Object.hasOwn(entry, 'backgroundShared');
  const hasContinuing = Object.hasOwn(entry, 'continuing');
  const hasIllustrationFadeIn = Object.hasOwn(entry, 'illustrationFadeInMs');
  const hasIllustrationFadeOut = Object.hasOwn(entry, 'illustrationFadeOutMs');
  const hasIllustrationKind = Object.hasOwn(entry, 'illustrationKind');
  const hasIllustrationVisibility = Object.hasOwn(entry, 'illustrationVisibility');
  const hasOverlay = Object.hasOwn(entry, 'isOverlay');
  const hasSectionWidth = Object.hasOwn(entry, 'sectionWidthPercent');
  const hasTimestamp = Object.hasOwn(entry, 'timestamp');
  const hasTextBackgroundColor = Object.hasOwn(entry, 'textBackgroundColor');
  const hasTextBackgroundPaddingPx = Object.hasOwn(entry, 'textBackgroundPaddingPx');
  const hasTextColor = Object.hasOwn(entry, 'textColor');
  if (
    !hasIllustrationAnimation &&
    !hasBackground &&
    !hasBackgroundShared &&
    !hasContinuing &&
    !hasIllustrationFadeIn &&
    !hasIllustrationFadeOut &&
    !hasIllustrationKind &&
    !hasIllustrationVisibility &&
    !hasOverlay &&
    !hasSectionWidth &&
    !hasTimestamp &&
    !hasTextBackgroundColor &&
    !hasTextBackgroundPaddingPx &&
    !hasTextColor
  ) {
    throw new Error('Change must include a tuning value');
  }

  return {
    background: hasBackground ? parseBackground(entry.background) : null,
    backgroundShared: hasBackgroundShared ? parseBoolean(entry.backgroundShared, 'backgroundShared') : undefined,
    continuing: hasContinuing ? parseBoolean(entry.continuing, 'continuing') : undefined,
    hasBackground,
    hasBackgroundShared,
    hasContinuing,
    hasIllustrationAnimation,
    hasIllustrationFadeIn,
    hasIllustrationFadeOut,
    hasIllustrationKind,
    hasIllustrationVisibility,
    hasOverlay,
    hasSectionWidth,
    hasTextBackgroundColor,
    hasTextBackgroundPaddingPx,
    hasTextColor,
    illustrationAnimation: hasIllustrationAnimation ? parseAnimation(entry.illustrationAnimation) : null,
    illustrationFadeInMs: hasIllustrationFadeIn
      ? parseFadeDuration(entry.illustrationFadeInMs, 'illustrationFadeInMs')
      : undefined,
    illustrationFadeOutMs: hasIllustrationFadeOut
      ? parseFadeDuration(entry.illustrationFadeOutMs, 'illustrationFadeOutMs')
      : undefined,
    illustrationKind: hasIllustrationKind
      ? parseEnum(entry.illustrationKind, TEXT_ILLUSTRATION_KINDS, 'Invalid illustration kind')
      : undefined,
    illustrationVisibility: hasIllustrationVisibility
      ? parseEnum(entry.illustrationVisibility, ILLUSTRATION_VISIBILITIES, 'Invalid illustration visibility')
      : undefined,
    isOverlay: hasOverlay ? parseBoolean(entry.isOverlay, 'isOverlay') : undefined,
    sectionId,
    sectionWidthPercent: hasSectionWidth
      ? parsePercent(
          entry.sectionWidthPercent,
          'sectionWidthPercent',
          TUNING_PERCENT_MIN,
          TUNING_PERCENT_MAX,
          SECTION_WIDTH_STEP_PERCENT,
        )
      : undefined,
    timestamp: hasTimestamp ? parseTimestamp(entry.timestamp) : undefined,
    textBackgroundColor: hasTextBackgroundColor
      ? entry.textBackgroundColor === null
        ? null
        : parseEnum(entry.textBackgroundColor, LYRICS_COLOR_PRESETS, 'Invalid text background color')
      : undefined,
    textBackgroundPaddingPx: hasTextBackgroundPaddingPx
      ? parsePercent(entry.textBackgroundPaddingPx, 'textBackgroundPaddingPx', 0, TEXT_BACKGROUND_PADDING_MAX_PX)
      : undefined,
    textColor: hasTextColor
      ? entry.textColor === null
        ? null
        : parseEnum(entry.textColor, LYRICS_COLOR_PRESETS, 'Invalid text color')
      : undefined,
  };
}

export function parseTuningRequest(value: unknown) {
  if (!isRecord(value) || !Array.isArray(value.changes)) throw new Error('Expected changes array');
  if (typeof value.trackId !== 'string' || !value.trackId) throw new Error('Expected trackId');

  return { changes: value.changes.map(parseChange), trackId: value.trackId };
}
