# Dong Liu

Dong Liu is a Vite + React audio timeline experiment. The page locks at the top until playback starts, then audio remains the source of truth while GSAP coordinates scroll position and timeline visuals. A fixed playback header renders transport controls and a canvas waveform, while lyric cues drive the central shape visual and fitted captions footer.

## Project Structure

```text
src/
  DongLiuShell.tsx        App shell component and page composition
  main.tsx                React root, StrictMode, and global style imports
  audio/                  Audio tracks and timestamped lyric data
  components/             Presentational UI components
    playback/             Playback header, buttons, and masked icons
  hooks/                  Stateful browser/audio lifecycle logic
  styles/                 Global CSS variables and wave-specific controls
  utils/                  Framework-light helpers and DOM/audio installers
public/
  fonts/                  Locally served typefaces
  icons/                  Playback control SVGs
```

## What Goes Where

`src/DongLiuShell.tsx`

Owns the top-level refs, playback/layout state wiring, and page composition. It imports the audio file, renders the hidden `<audio>` element, and wires the playback header, shape timeline, captions footer, and page timeline to the hooks. Put app-level coordination here when it is only used by this experience.

`src/components/`

Contains React UI components that receive playback data and callbacks through props.

- `CaptionsFooter.tsx` renders the active lyric cue and fits all captions to the available footer space.
- `ShapeTimeline.tsx` maps the active lyric cue to a deterministic central shape.
- `PageTimeline.tsx` renders the scroll-height sections, locked-start message, and replay prompt.
- `LyricsTimeline.tsx` contains an alternate full-screen lyric presentation that is not currently mounted.
- `playback/PlaybackHeader.tsx` renders the fixed top bar, seek and volume controls, and waveform canvas.
- `playback/PlaybackButtons.tsx` and `playback/PlaybackIcons.tsx` render the play/pause button and masked SVG icons.

Components should not install global listeners, create audio graphs, or own cross-page behavior. Move that logic into hooks or utils.

`src/hooks/`

Contains React lifecycle logic that needs state, refs, effects, or cleanup.

- `usePlaybackController.ts` owns playback state and coordinates audio time, replay, seeking, keyboard input, waveform painting, and the GSAP audio timeline.
- `useAudioGsapTimeline.ts` owns the paused GSAP timeline, ScrollTrigger page progress, manual-scroll seeking, and playback-driven scroll synchronization.
- `useWaveformAudio.ts` owns the Web Audio graph plus active, decaying, and resting canvas waveform painting.
- `useLayoutHeights.ts` measures the fixed header and footer, calculates section height, and manages scroll locking.
- `usePlaybackKeyboard.ts` installs spacebar play/pause, arrow-key seek, and arrow-key volume controls.
- `useReplayCountdown.ts` owns the replay prompt timer.
- `useSyncedRef.ts` keeps current values available inside event listeners without reinstalling them.

Hooks should exist only when React lifecycle behavior is needed. Plain formatting, math, and DOM installer functions belong in `utils/`.

`src/utils/`

Contains small helpers without React component state.

- `lyrics.ts` loads and sorts lyric cues, selects the active cue, and parses italic caption segments.
- `playback.ts` formats playback time and blurs controls after pointer interaction.
- `playbackScrollSeek.ts` installs wheel/touch seeking on the playback header.
- `textFit.ts` calculates single-line lyric and caption font sizes.
- `waveform.ts` draws the canvas waveform from analyser frequency data.
- `cssVariables.ts` reads CSS custom properties for canvas-only consumers.

`src/styles/`

Contains CSS imported once from `main.tsx`.

- `global.css` imports Tailwind, defines project color/font variables, and sets global document defaults.
- `wave.css` styles the custom range sliders used by `playback/PlaybackHeader`.

All project colors should be defined as CSS variables in `global.css`. JSX should consume them with Tailwind CSS variable shorthand classes such as `bg-(--color-panel)` and `border-(--color-border)`. Canvas code should read them through `getCssVariable`.

## Consumption Map

`main.tsx` imports:

- `styles/global.css`
- `styles/wave.css`
- `DongLiuShell`

`DongLiuShell.tsx` consumes:

- `audio/ram_box.mp3`
- `CaptionsFooter`, `PageTimeline`, `ShapeTimeline`
- `playback/PlaybackHeader`
- `useLayoutHeights`, `usePlaybackController`

`CaptionsFooter.tsx` consumes:

- lyric selection and parsing from `utils/lyrics`
- single-line fitting from `utils/textFit`

`ShapeTimeline.tsx` consumes:

- cue timing from `utils/lyrics`

`playback/PlaybackHeader.tsx` consumes:

- playback formatting and control helpers from `utils/playback`
- `PlaybackButtons`, `PlaybackIcons`
- `.wave-slider` styles from `styles/wave.css`

`usePlaybackController.ts` consumes:

- `installPlaybackScrollSeek`
- `useAudioGsapTimeline`
- `usePlaybackKeyboard`
- `useReplayCountdown`
- `useSyncedRef`
- `useWaveformAudio`

`utils/lyrics.ts` consumes:

- `audio/ram_box_lyrics.json`
- the `TextSizeLevel` type from `utils/textFit`

`useWaveformAudio.ts` consumes:

- `drawWaveform`
- `getCssVariable`
- `--color-panel` and `--color-accent` from `styles/global.css`

## Maintenance Rules

- Keep components under 200 lines.
- Keep modules grouped by their main function: presentational UI in `components/`, React lifecycle logic in `hooks/`, framework-light helpers and installers in `utils/`.
- Write React components as exported const arrow functions.
- Keep fixed local constants in `SCREAMING_SNAKE_CASE`;
- Keep runtime values such as refs, state, event data, and derived measurements camelCased.
- Export only symbols consumed by another module. Local helpers, types, and one-file components should stay local.
- Keep one-use constants in the consumer module or function, with a short comment when the value controls behavior.
- Avoid hooks unless the behavior needs React state, refs, effects, or cleanup.
- Move large or reused lifecycle behavior into `src/hooks/`.
- Keep reusable non-React logic in `src/utils/`.
- Keep color values in CSS variables, not JSX or TypeScript literals.
- Run the TypeScript project check (`tsc -b`) after structure or logic changes.
- Agent verification should stop at TypeScript checks; do not run a production build as the final validation step unless explicitly requested.

## Scripts

```bash
pnpm run dev
pnpm run build
pnpm run lint
pnpm run fmt:check
```
