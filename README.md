# Dong Liu

Dong Liu is a Vite + React audio timeline experiment. The page locks at the top until playback starts, then audio remains the source of truth while GSAP coordinates scroll position and timeline visuals. A fixed playback dock renders transport controls and a canvas waveform.

## Project Structure

```text
src/
  DongLiuShell.tsx        App shell component and page composition
  main.tsx                React root, StrictMode, and global style imports
  audio/                  Audio assets consumed by the shell
  components/             Presentational UI components
  hooks/                  Stateful browser/audio lifecycle logic
  styles/                 Global CSS variables and wave-specific controls
  utils/                  Framework-light helpers and DOM/audio installers
```

## What Goes Where

`src/DongLiuShell.tsx`

Owns the top-level refs, playback/layout state wiring, and page composition. It imports the audio file, renders the hidden `<audio>` element, and wires the header, progress meter, timeline, and playback dock to the hooks. Put app-level coordination here when it is only used by this experience.

`src/components/`

Contains presentational React components that receive data and callbacks through props.

- `AppHeader.tsx` renders the fixed top bar.
- `PageTimeline.tsx` owns the section color sequence and renders the colored scroll sections and replay prompt.
- `PlaybackDock.tsx` renders play/pause, seek, volume, and the waveform canvas.
- `PlaybackProgressMeter.tsx` renders the large fixed percent readout while playback is active.

Components should not install global listeners, create audio graphs, or own cross-page behavior. Move that logic into hooks or utils.

`src/hooks/`

Contains React lifecycle logic that needs state, refs, effects, or cleanup.

- `usePlaybackController.ts` owns playback state and coordinates audio time, replay, seek, keyboard, waveform, and the GSAP audio timeline.
- `useAudioGsapTimeline.ts` owns the paused GSAP animation timeline, ScrollTrigger page progress, and audio-to-scroll synchronization.
- `useWaveformAudio.ts` owns the Web Audio graph and canvas animation loop.
- `useLayoutHeights.ts` measures fixed header/dock heights and manages initial scroll locking.
- `usePlaybackKeyboard.ts` installs global playback keyboard controls.
- `useReplayCountdown.ts` owns the replay prompt timer.
- `useSyncedRef.ts` keeps current values available inside event listeners without reinstalling them.

Hooks should exist only when React lifecycle behavior is needed. Plain formatting, math, and DOM installer functions belong in `utils/`.

`src/utils/`

Contains small helpers without React component state.

- `playbackScrollSeek.ts` installs wheel/touch seeking on the dock.
- `waveform.ts` draws the canvas waveform from analyser frequency data.
- `time.ts` formats seconds for UI labels.
- `cssVariables.ts` reads CSS custom properties for canvas-only consumers.

`src/styles/`

Contains CSS imported once from `main.tsx`.

- `global.css` imports Tailwind, defines project color/font variables, and sets global document defaults.
- `wave.css` styles the custom range sliders used by `PlaybackDock`.

All project colors should be defined as CSS variables in `global.css`. JSX should consume them with Tailwind CSS variable shorthand classes such as `bg-(--color-panel)` and `border-(--color-border)`. Canvas code should read them through `getCssVariable`.

## Consumption Map

`main.tsx` imports:

- `styles/global.css`
- `styles/wave.css`
- `DongLiuShell`

`DongLiuShell.tsx` consumes:

- `audio/pisse_fahrradsattel.mp3`
- `AppHeader`, `PageTimeline`, `PlaybackDock`
- `PlaybackProgressMeter`
- `useLayoutHeights`, `usePlaybackController`

`PlaybackDock.tsx` consumes:

- `formatTime`
- `.wave-slider` styles from `styles/wave.css`

`usePlaybackController.ts` consumes:

- `installPlaybackScrollSeek`
- `useAudioGsapTimeline`
- `usePlaybackKeyboard`
- `useReplayCountdown`
- `useSyncedRef`
- `useWaveformAudio`

`useWaveformAudio.ts` consumes:

- `drawWaveform`
- `getCssVariable`
- `--color-bg` and `--color-accent` from `styles/global.css`

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
