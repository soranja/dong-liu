import type { AnimationChange, AnimationSetting, IllustrationVisibility, TextIllustrationKind } from './types';

const FADE_TIMING_MAX_MS = 1000;
const ILLUSTRATION_KINDS = [
  'blinking-words',
  'kinetic-warp',
  'vertical-typewriter',
  'word-cloud',
  'word-train',
] as const satisfies readonly TextIllustrationKind[];
const ILLUSTRATION_VISIBILITIES = [
  'adjacent',
  'only-active',
  'start-active',
  'active-end',
] as const satisfies readonly IllustrationVisibility[];

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
    value.animationLengthPercent === undefined ? 100 : Number(value.animationLengthPercent);
  if (!Number.isFinite(startPercent) || startPercent < 0 || startPercent > 50) {
    throw new Error('startPercent must be 0-50');
  }
  if (!Number.isFinite(endPercent) || endPercent < 51 || endPercent > 100) {
    throw new Error('endPercent must be 51-100');
  }
  if (!Number.isFinite(animationLengthPercent) || animationLengthPercent < 0 || animationLengthPercent > 100) {
    throw new Error('animationLengthPercent must be 0-100');
  }

  const wordStartPercents = value.wordStartPercents;
  if (
    wordStartPercents !== undefined &&
    (!Array.isArray(wordStartPercents) ||
      wordStartPercents.some((item) => !Number.isFinite(Number(item)) || Number(item) < 0 || Number(item) > 100))
  ) {
    throw new Error('wordStartPercents must contain percentages from 0-100');
  }

  return {
    animationLengthPercent,
    endPercent,
    startPercent,
    variant: 'range',
    wordStartPercents: wordStartPercents?.map(Number),
  };
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
  if (typeof value !== 'string') throw new Error('timestamp must be a string');

  const [minutes, seconds] = value.split(':').map(Number);
  if (!Number.isFinite(minutes) || !Number.isFinite(seconds) || minutes < 0 || seconds < 0 || seconds >= 60) {
    throw new Error('Invalid timestamp');
  }

  return value;
}

function parseChange(entry: unknown): AnimationChange {
  if (!isRecord(entry)) throw new Error('Invalid change');

  const sectionId = Number(entry.sectionId);
  if (!Number.isInteger(sectionId) || sectionId <= 0) throw new Error('Invalid sectionId');

  const hasIllustrationAnimation = Object.hasOwn(entry, 'illustrationAnimation');
  const hasContinuing = Object.hasOwn(entry, 'continuing');
  const hasIllustrationFadeIn = Object.hasOwn(entry, 'illustrationFadeInMs');
  const hasIllustrationFadeOut = Object.hasOwn(entry, 'illustrationFadeOutMs');
  const hasIllustrationKind = Object.hasOwn(entry, 'illustrationKind');
  const hasIllustrationVisibility = Object.hasOwn(entry, 'illustrationVisibility');
  const hasOverlay = Object.hasOwn(entry, 'isOverlay');
  const hasSectionWidth = Object.hasOwn(entry, 'sectionWidthPercent');
  const hasTimestamp = Object.hasOwn(entry, 'timestamp');
  if (
    !hasIllustrationAnimation &&
    !hasContinuing &&
    !hasIllustrationFadeIn &&
    !hasIllustrationFadeOut &&
    !hasIllustrationKind &&
    !hasIllustrationVisibility &&
    !hasOverlay &&
    !hasSectionWidth &&
    !hasTimestamp
  ) {
    throw new Error('Change must include a tuning value');
  }

  return {
    continuing: hasContinuing ? parseBoolean(entry.continuing, 'continuing') : undefined,
    hasContinuing,
    hasIllustrationAnimation,
    hasIllustrationFadeIn,
    hasIllustrationFadeOut,
    hasIllustrationKind,
    hasIllustrationVisibility,
    hasOverlay,
    hasSectionWidth,
    illustrationAnimation: hasIllustrationAnimation ? parseAnimation(entry.illustrationAnimation) : null,
    illustrationFadeInMs: hasIllustrationFadeIn
      ? parseFadeDuration(entry.illustrationFadeInMs, 'illustrationFadeInMs')
      : undefined,
    illustrationFadeOutMs: hasIllustrationFadeOut
      ? parseFadeDuration(entry.illustrationFadeOutMs, 'illustrationFadeOutMs')
      : undefined,
    illustrationKind: hasIllustrationKind
      ? parseEnum(entry.illustrationKind, ILLUSTRATION_KINDS, 'Invalid illustration kind')
      : undefined,
    illustrationVisibility: hasIllustrationVisibility
      ? parseEnum(entry.illustrationVisibility, ILLUSTRATION_VISIBILITIES, 'Invalid illustration visibility')
      : undefined,
    isOverlay: hasOverlay ? parseBoolean(entry.isOverlay, 'isOverlay') : undefined,
    sectionId,
    sectionWidthPercent: hasSectionWidth
      ? parsePercent(entry.sectionWidthPercent, 'sectionWidthPercent', 0, 100, 5)
      : undefined,
    timestamp: hasTimestamp ? parseTimestamp(entry.timestamp) : undefined,
  };
}

export function parseTuningRequest(value: unknown) {
  if (!isRecord(value) || !Array.isArray(value.changes)) throw new Error('Expected changes array');
  if (typeof value.trackId !== 'string' || !value.trackId) throw new Error('Expected trackId');

  return { changes: value.changes.map(parseChange), trackId: value.trackId };
}
