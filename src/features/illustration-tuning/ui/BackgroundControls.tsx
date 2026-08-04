import type { LyricsBackground, LyricsBackgroundMedia } from '@entities/track/model/types';
import {
  LYRICS_COLOR_PRESETS,
  TEXT_BACKGROUND_PADDING_MAX_PX,
  type LyricsColorPreset,
} from '@shared/config/tuning';

type BackgroundControlsProps = {
  background: LyricsBackground | null;
  canShare: boolean;
  inherited: boolean;
  mediaBackground?: LyricsBackgroundMedia;
  onBackgroundChange: (background: LyricsBackground | null) => void;
  onSharedChange: (shared: boolean) => void;
  onTextBackgroundColorChange: (color: LyricsColorPreset | null) => void;
  onTextBackgroundPaddingChange: (paddingPx: number) => void;
  onTextColorChange: (textColor: LyricsColorPreset | null) => void;
  shared: boolean;
  textBackgroundColor: LyricsColorPreset | null;
  textBackgroundPaddingPx: number;
  textColor: LyricsColorPreset | null;
};

const LABELS = {
  'cream-white': 'Cream White',
  'dark-gray': 'Dark Gray',
  'toxic-carrot': 'Toxic Carrot',
  'arterial-red': 'Arterial Red',
} satisfies Record<LyricsColorPreset, string>;

export const BackgroundControls = ({
  background,
  canShare,
  inherited,
  mediaBackground,
  onBackgroundChange,
  onSharedChange,
  onTextBackgroundColorChange,
  onTextBackgroundPaddingChange,
  onTextColorChange,
  shared,
  textBackgroundColor,
  textBackgroundPaddingPx,
  textColor,
}: BackgroundControlsProps) => {
  const currentMedia = background?.mediaType === 'image' || background?.mediaType === 'video' ? background : undefined;
  const availableMedia = mediaBackground ?? currentMedia;
  const value = background?.mediaType === 'solid' ? background.preset : (background?.mediaType ?? 'none');

  return (
    <div className="space-y-2">
      <p className="font-mono text-[0.65rem] uppercase text-text-muted">Background</p>
      <div className="flex gap-2">
        <select
          aria-label="Background"
          className="h-7 min-w-0 flex-1 border border-border-strong bg-panel px-2 font-mono text-[0.65rem] uppercase text-cream-white disabled:opacity-40"
          disabled={inherited}
          value={value}
          onChange={(event) => {
            const next = event.currentTarget.value;
            if (next === 'none') onBackgroundChange(null);
            else if (next === 'image') {
              onBackgroundChange(availableMedia?.mediaType === 'image' ? availableMedia : { mediaType: 'image' });
            } else if (next === 'video') {
              onBackgroundChange(availableMedia?.mediaType === 'video' ? availableMedia : { mediaType: 'video' });
            }
            else onBackgroundChange({ mediaType: 'solid', preset: next as LyricsColorPreset });
          }}
        >
          <option value="none">None</option>
          {LYRICS_COLOR_PRESETS.map((preset) => (
            <option key={preset} value={preset}>
              {LABELS[preset]}
            </option>
          ))}
          <option value="image">IMAGE</option>
          <option value="video">VIDEO</option>
        </select>
        <label className="flex h-7 items-center gap-2 border border-border-strong px-2 font-mono text-[0.65rem] uppercase text-text-muted">
          <input
            type="checkbox"
            checked={shared}
            disabled={!canShare || !background}
            onChange={(event) => onSharedChange(event.currentTarget.checked)}
          />
          Shared
        </label>
      </div>
      {inherited ? (
        <p className="font-mono text-[0.6rem] uppercase text-text-muted">Inherited from previous line</p>
      ) : null}
      <label className="block font-mono text-[0.65rem] uppercase text-text-muted">
        <span className="mb-1 block">Text color</span>
        <select
          aria-label="Text color"
          className="h-7 w-full border border-border-strong bg-panel px-2 font-mono text-[0.65rem] uppercase text-cream-white"
          value={textColor ?? 'none'}
          onChange={(event) =>
            onTextColorChange(
              event.currentTarget.value === 'none' ? null : (event.currentTarget.value as LyricsColorPreset),
            )
          }
        >
          <option value="none">None</option>
          {LYRICS_COLOR_PRESETS.map((preset) => (
            <option key={preset} value={preset}>
              {LABELS[preset]}
            </option>
          ))}
        </select>
      </label>
      <label className="block font-mono text-[0.65rem] uppercase text-text-muted">
        <span className="mb-1 block">Text background</span>
        <select
          aria-label="Text background"
          className="h-7 w-full border border-border-strong bg-panel px-2 font-mono text-[0.65rem] uppercase text-cream-white"
          value={textBackgroundColor ?? 'none'}
          onChange={(event) =>
            onTextBackgroundColorChange(
              event.currentTarget.value === 'none' ? null : (event.currentTarget.value as LyricsColorPreset),
            )
          }
        >
          <option value="none">None</option>
          {LYRICS_COLOR_PRESETS.map((preset) => (
            <option key={preset} value={preset}>
              {LABELS[preset]}
            </option>
          ))}
        </select>
      </label>
      <label className="block font-mono text-[0.65rem] uppercase text-text-muted">
        <span className="mb-1 flex justify-between">
          <span>Text background padding</span>
          <span>{textBackgroundPaddingPx}px</span>
        </span>
        <input
          aria-label={`Text background padding ${textBackgroundPaddingPx}px`}
          className="w-full"
          disabled={!textBackgroundColor}
          max={TEXT_BACKGROUND_PADDING_MAX_PX}
          min={0}
          step={1}
          type="range"
          value={textBackgroundPaddingPx}
          onChange={(event) => onTextBackgroundPaddingChange(Number(event.currentTarget.value))}
        />
      </label>
    </div>
  );
};
