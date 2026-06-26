# Dong Liu

Dong Liu is a Vite + React audio timeline experiment. The app preloads audio, waits for the local font and word layouts, prewarms the visual timeline, and shows a loading overlay until the experience is ready. The page locks at the top until playback starts, then audio remains the source of truth while GSAP coordinates scroll position and timeline visuals. A fixed playback header renders transport controls and a canvas waveform, while lyric cues drive the central visual track and fitted captions footer.

## Project Structure

```text
src/
  DongLiuShell.tsx        App shell, readiness orchestration, and page composition
  main.tsx                React root, StrictMode, and global style imports
  audio/                  Audio tracks and reference lyric JSON
  lyrics/                 Typed lyric sections and media types
  components/             Presentational UI components
    tuning/               Dev-only fixed tuning UI
    playback/             Playback header, buttons, and masked icons
    illustrations/        Timeline illustration components and local CSS imports
  hooks/                  Stateful browser/audio lifecycle logic
  styles/                 Global CSS, range slider CSS, and illustration CSS
  utils/                  Framework-light helpers and DOM/audio installers
public/
  fonts/                  Locally served typefaces
  icons/                  Playback control SVGs
```

## What Goes Where

`src/DongLiuShell.tsx`

Owns the top-level refs, readiness state, playback/layout state wiring, and page composition. It imports the audio file, preloads it with `usePreloadedAudio`, renders the hidden `<audio>` element, lazy-loads `GeneralTimeline`, and wires the playback header, captions footer, loading screen, and timeline hooks. Put app-level coordination here when it is only used by this experience.

`src/components/`

Contains React UI components that receive playback data and callbacks through props.

- `CaptionsFooter.tsx` renders the active lyric cue and fits all captions to the available footer space.
- `ExperienceLoadingScreen.tsx` renders the readiness overlay while audio, font, word layout, and timeline prewarm work finishes.
- `GeneralTimeline.tsx` owns the scroll spacer, fixed visual viewport, locked-start message, replay prompt, and timeline section lists.
- `GeneralTimelineSection.tsx` renders each flow or overlay section and delegates text illustrations to the word cloud or kinetic warp components.
- `tuning/IllustrationAnimationTuner.tsx` and related tuning components render the fixed F4 illustration timing tuner in dev only.
- `illustrations/DisclaimerIllustration.tsx` renders the first-slide disclaimer.
- `illustrations/LyricsWordCloud.tsx` and `illustrations/KineticWarpTextAnimation.tsx` render packed lyric words using `usePackedWordsLayout`.
- `playback/PlaybackHeader.tsx` renders the fixed top bar, seek and volume controls, and waveform canvas.
- `playback/PlaybackButtons.tsx` and `playback/PlaybackIcons.tsx` render the play/pause button and masked SVG icons.

Components should not install global listeners, create audio graphs, or own cross-page behavior. Move that logic into hooks or utils.

`src/hooks/`

Contains React lifecycle logic that needs state, refs, effects, or cleanup.

- `usePlaybackController.ts` owns playback state and coordinates audio time, replay, seeking, keyboard input, waveform painting, and the GSAP audio timeline.
- `useAudioGsapTimeline.ts` owns the paused GSAP timeline, ScrollTrigger page progress, manual-scroll seeking, and playback-driven scroll synchronization.
- `useGeneralTimeline.ts` measures and synchronizes the fixed visual track, resolves illustration animation progress, handles word reveal progress, kinetic warp progress, and timeline prewarming.
- `useTunerAutosave.ts` caches each selected section's original tuner snapshot, previews draft animation and line timing edits, and autosaves F4 tuner changes in dev.
- `useWaveformAudio.ts` owns the Web Audio graph plus active, decaying, and resting canvas waveform painting.
- `useLayoutHeights.ts` measures the fixed header and footer, calculates section height, and manages scroll locking.
- `usePackedWordsLayout.ts` measures text illustration containers and schedules packed word layout recalculation.
- `usePreloadedAudio.ts` fetches the audio source into an object URL before playback.
- `usePlaybackKeyboard.ts` installs spacebar play/pause, arrow-key seek, and arrow-key volume controls.
- `useReplayCountdown.ts` owns the replay prompt timer.
- `useSyncedRef.ts` keeps current values available inside event listeners without reinstalling them.

Hooks should exist only when React lifecycle behavior is needed. Plain formatting, math, and DOM installer functions belong in `utils/`.

`src/utils/`

Contains small helpers without React component state.

- `lyrics.ts` selects the active typed lyric section and parses italic caption segments.
- `generalTimeline.ts` calculates visual track timing and position.
- `tuning/illustrationAnimation.ts` resolves per-section illustration animation settings into normalized progress.
- `tuning/illustrationAnimationTuningStore.ts` holds dev-only draft animation settings for live preview.
- `tuning/illustrationKind.ts` maps lyric metadata to the timeline illustration renderer.
- `tuning/lyricTimingTuningStore.ts` holds dev-only draft line start times for live timeline preview.
- `tuning/looping.ts` calculates dev-only tuner playback loop bounds around the selected lyric section.
- `kineticWarp.ts` calculates and writes kinetic warp CSS variables for active text sections.
- `tuning/timelineProgressEvent.ts` defines the dev-only active timeline progress event consumed by the tuner.
- `wordCloudLayout.ts` packs lyric words into measured illustration containers.
- `playback.ts` formats playback time and blurs controls after pointer interaction.
- `playbackScrollSeek.ts` installs wheel/touch seeking on the playback header.
- `textFit.ts` calculates single-line caption font sizes.
- `waveform.ts` draws the canvas waveform from analyser frequency data.
- `cssVariables.ts` reads CSS custom properties for canvas-only consumers.

`src/styles/`

Contains CSS imported once from `main.tsx` or by the owning illustration component.

- `global.css` imports Tailwind, defines project color/font variables, sets global document defaults, and defines timeline layout CSS.
- `wave.css` styles the custom range sliders used by `playback/PlaybackHeader`.
- `illustrations/disclaimer.css`, `illustrations/lyrics-word-cloud.css`, and `illustrations/kinetic-warp-text-animation.css` style their matching illustration components.

All project colors should be defined as CSS variables in `global.css`. JSX should consume them with Tailwind CSS variable shorthand classes such as `bg-(--color-panel)` and `border-(--color-border)`. Canvas code should read them through `getCssVariable`.

## Consumption Map

`main.tsx` imports:

- `styles/global.css`
- `styles/wave.css`
- `DongLiuShell`

`DongLiuShell.tsx` consumes:

- `audio/ram_box.mp3`
- `CaptionsFooter`, `ExperienceLoadingScreen`
- lazy `GeneralTimeline`
- lazy dev-only `IllustrationAnimationTuner`
- `playback/PlaybackHeader`
- `useLayoutHeights`, `usePlaybackController`, `usePreloadedAudio`
- `RAM_BOX_LYRICS` for word-layout readiness counts

`GeneralTimeline.tsx` consumes:

- `GeneralTimelineSection`
- `useGeneralTimeline`
- `RAM_BOX_LYRICS`

`GeneralTimelineSection.tsx` consumes:

- `KineticWarpTextAnimation`, `LyricsWordCloud`
- typed media definitions from `lyrics/types`
- illustration kind selection from `utils/tuning/illustrationKind`

`CaptionsFooter.tsx` consumes:

- lyric selection and parsing from `utils/lyrics`
- single-line fitting from `utils/textFit`

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

`useGeneralTimeline.ts` consumes:

- track timing from `utils/generalTimeline`
- animation timing from `utils/tuning/illustrationAnimation`
- dev draft settings from `utils/tuning/illustrationAnimationTuningStore`
- kinetic text progress from `utils/kineticWarp`
- dev timeline progress event metadata from `utils/tuning/timelineProgressEvent`

`usePackedWordsLayout.ts` consumes:

- packed word layout scheduling and measurement helpers from `utils/wordCloudLayout`

`useWaveformAudio.ts` consumes:

- `drawWaveform`
- `getCssVariable`
- `--color-panel` and `--color-accent` from `styles/global.css`

`lyrics/ram-box-lyrics.ts` is the canonical Ram Box section source. Each section directly exposes its timestamp, explicit enter/exit timing, slide behavior, overlay behavior, size level, illustration content, and optional `illustrationAnimation` timing.

`audio/ram_box_lyrics.json` remains as the original reference data, but the application no longer imports it.

## Illustration Tuning

`illustrationAnimation` is the per-section source for illustration animation timing:

- `{ variant: "instant" }` uses the full `0-100%` appearance span at full speed and completes as soon as the section is observed.
- `{ variant: "range", startPercent, endPercent, animationLengthPercent }` maps visual section progress into illustration progress. `startPercent` is `0-50`; `endPercent` is `51-100`; `animationLengthPercent` defaults to `100` and runs inside the selected appearance range.
`illustrationVisibility` controls inactive section visibility. `"adjacent"` is the default and keeps non-active section edges visible; `"only-active"` clears the illustration until its section is active.

In dev, press `F4` to open the fixed-position illustration animation tuner. The tuner is detached from rendered illustrations and reads only lyric metadata, active visual progress, playback loop selection, saved or draft `illustrationAnimation` settings, and line timestamps. Line start edits rewrite the selected section timestamp; line end edits rewrite the next section timestamp. Timing inputs step by `0.005` seconds and also accept direct numeric input. Edits autosave through the dev-only Vite endpoint registered from `tools/tuning/illustrationAnimationTuningPlugin.ts`, which rewrites `src/lyrics/ram-box-lyrics.ts` and suppresses lyrics-file HMR to avoid panel flicker. The panel keeps its open state and cached reset snapshots through dev reloads. Reset restores the cached snapshot for that selected section, including animation, line start, and line end boundary, and autosaves that restoration when needed. Register promotes the current selected-section snapshot to the reset baseline without writing the lyrics file by itself. The status chip reports cached, pending, saving, saved, resetting, and failure states.

## Maintenance Rules

- Keep components under 200 lines.
- Keep modules grouped by their main function: presentational UI in `components/`, React lifecycle logic in `hooks/`, framework-light helpers and installers in `utils/`.
- Write React components as exported const arrow functions.
- Avoid excessive prop drilling. If state is not shared, move it to the direct consumer.
- Keep fixed local constants in `SCREAMING_SNAKE_CASE`;
- Keep runtime values such as refs, state, event data, and derived measurements camelCased.
- Export only symbols consumed by another module. Local helpers, types, and one-file components should stay local.
- Inline types that only describe one value.
- Keep one-use constants in the consumer module or function, with a short comment when the value controls behavior.
- Avoid hooks unless the behavior needs React state, refs, effects, or cleanup.
- Move large or reused lifecycle behavior into `src/hooks/`.
- Keep reusable non-React logic in `src/utils/`.
- Keep color values in CSS variables, not JSX or TypeScript literals.
- Illustration animation components must consume resolved progress/settings and must not hardcode per-lyric timing or range math.
- Keep the F4 tuner dev-only, fixed-position, and detached from illustration DOM; wire it only to lyric metadata, active progress, playback loop selection, line timestamps, and animation settings.
- Run the TypeScript project check (`tsc -b`) after structure or logic changes.
- Agent verification should stop at TypeScript checks; do not run a production build as the final validation step unless explicitly requested.

## Scripts

```bash
pnpm run dev
pnpm run build
pnpm run lint
pnpm run fmt:check
```
