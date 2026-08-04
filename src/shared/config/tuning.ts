export const TUNING_PERCENT_MIN = 0;
export const TUNING_PERCENT_MAX = 100;
export const ANIMATION_START_PERCENT_MAX = 50;
export const ANIMATION_END_PERCENT_MIN = 51;
export const DEFAULT_ANIMATION_LENGTH_PERCENT = TUNING_PERCENT_MAX;
export const DEFAULT_SECTION_WIDTH_PERCENT = TUNING_PERCENT_MAX;
export const FADE_TIMING_MAX_MS = 1000;
export const ILLUSTRATION_TUNING_ENDPOINT = '/__dong-liu/illustration-animation-settings';
export const SECTION_WIDTH_STEP_PERCENT = 5;
export const TEXT_BACKGROUND_PADDING_MAX_PX = 100;
export const LYRICS_COLOR_PRESETS = ['cream-white', 'dark-gray', 'toxic-carrot', 'arterial-red'] as const;

export const ILLUSTRATION_VISIBILITIES = ['adjacent', 'only-active', 'start-active', 'active-end'] as const;

export type IllustrationAnimation =
  | {
      variant: 'instant';
    }
  | {
      animationLengthPercent?: number;
      endPercent: number;
      startPercent: number;
      variant: 'range';
      wordStartPercents?: number[];
    };
export type IllustrationVisibility = (typeof ILLUSTRATION_VISIBILITIES)[number];
export type LyricsColorPreset = (typeof LYRICS_COLOR_PRESETS)[number];
