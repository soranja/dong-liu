# Dong Liu

Dong Liu is a client-rendered React Router audio timeline. Audio is the playback source of truth while GSAP coordinates scrolling, captions, synced video, and text illustrations.

The application uses React Router Framework Mode with global SPA configuration (`ssr: false`), React Compiler, Tailwind CSS, and Strict Mode.

## Commands

```bash
pnpm dev
pnpm typecheck
pnpm lint
pnpm fmt
pnpm fmt:check
pnpm build
```

Use `pnpm build` after structural or bundling changes. It complements type, lint, and format checks rather than replacing them.

## Routing

Routes are declared explicitly in `src/routes.ts`.

| Path              | Result                      |
| ----------------- | --------------------------- |
| `/`               | Track catalog               |
| `/tracks`         | Client-side redirect to `/` |
| `/tracks/`        | Client-side redirect to `/` |
| `/tracks/ram-box` | Ram Box experience          |
| `*`               | Not-found page              |

The app preserves manual scroll restoration in `src/root.tsx`.

## Architecture

```text
src/
  root.tsx                         React Router document and app shell
  routes.ts                       Explicit route table
  entry.server.tsx                SPA shell generation entry
  pages/
    home/                          Track catalog and /tracks redirect
    not-found/                     Unknown-route page
    ram-box/
      index.tsx                    Route composition
      model/                       Audio reference, lyrics, descriptors
      ui/                          Ram Box-only illustrations/composition
  widgets/
    track-experience/
      model/                       Focused playback, readiness, waveform, and timeline hooks/utilities
      ui/                          Reusable, rendering-focused track experience UI
  features/
    illustration-tuning/
      model/                       Per-track session, selection, autosave
      ui/                          Development-only F4 tuner
  entities/
    track/
      model/                       Track contracts and defaults
      lib/                         Track timing and lyric calculations
  shared/
    assets/audio/                  Audio and reference lyric assets
    lib/                           Framework-light reusable helpers
    styles/                        Global and playback styles
    ui/illustration-animations/    Selectable text animations and registry
tools/
  tuning/                          Tuning request validation, source editing, and Vite server wiring
```

The dependency direction is:

```text
app → pages → widgets/features → entities → shared
```

Pages compose lower layers. Widgets may consume features, entities, and shared code. Features consume entities and shared code. Entities consume shared code. Shared code cannot import higher layers.

### Import convention

Use relative imports inside one slice, such as from `pages/ram-box/ui` to `pages/ram-box/model`. Use aliases across slices:

- `@app/*`
- `@pages/*`
- `@widgets/*`
- `@features/*`
- `@entities/*`
- `@shared/*`

Aliases are configured in TypeScript and Vite. Oxlint prevents reverse-layer aliases, cross-page aliases, deep relative cross-slice imports, and import cycles.

## Track contracts

`entities/track` owns neutral contracts:

- `TrackSummary`: ID, title, and route.
- `LyricsSection<TCustomIllustration>`: lyric timing, layout, animation/background metadata, and serializable illustration data.
- `TrackExperienceProps<TCustomIllustration>`: track ID, audio, lyrics, custom renderer, and optional tuning adapter.
- `TextIllustrationKind`: derived from the shared animation registry.

Custom lyric illustrations must be serializable descriptors. A page supplies the renderer; lyrics must not embed React elements.

`widgets/track-experience` owns reusable playback controls, waveform behavior, captions, layout measurement, timeline rendering, loading, replay, and route cleanup. It has no Ram Box imports.

The timeline keeps every lightweight section shell mounted so layout and seeking stay stable, but mounts illustration and background content only for a moving 20-section window. Initial readiness prewarms the first window; playback retains five sections behind the active section and prepares the rest ahead.

## Illustration tuning

Tuning is development-only:

1. `pages/ram-box/index.tsx` dynamically imports its tuned page composition only when `import.meta.env.DEV` is true.
2. `IllustrationTuningProvider` creates one session for the injected track ID and lyrics.
3. The track widget receives that session through its optional tuning adapter.
4. Production renders the plain track widget without importing the tuning feature.

Press `F4` after the experience is ready to open the tuner. It supports section selection, live preview, loop ranges, line timing, animation range/length, illustration selection, backgrounds, visibility, overlays, section width, fades, continuation, reset, and register.

Text illustrations can use a preset or authored media background. Set `backgroundShared: true` to keep that background mounted through the next lyric line (including uninterrupted looping video):

```ts
const backgroundExamples: LyricsBackground[] = [
  { mediaType: 'solid', preset: 'toxic-carrot' },
  { alt: 'Boxing ring', mediaType: 'image', src: '/images/ring.webp' },
  { mediaType: 'video', poster: '/images/ring.webp', src: '/videos/ring.mp4' },
];
```

Assign one to a section's `background` and set `backgroundShared: true` when it should continue. `IMAGE` and `VIDEO` are media markers; when their lyric object has no `src`, the timeline shows a loud missing-path placeholder. Background, `textColor`, and `textBackgroundColor` presets are `cream-white`, `dark-gray`, `toxic-carrot`, and `arterial-red`, backed by the CSS variables of the same names. `textBackgroundPaddingPx` adds 0–100px of square padding directly behind the text. With no override, the background is Dark Gray and text is Cream White. `None` removes the override, and these controls are disabled for custom illustrations.

Drafts, progress subscriptions, and panel state are scoped to the track session. Drafts are kept only in memory and are discarded on refresh. No global progress events or global draft maps are used.

### Register protocol

The tuner posts to:

```text
POST /__dong-liu/illustration-animation-settings
```

The JSON body contains:

```json
{
  "trackId": "ram-box",
  "changes": [
    {
      "sectionId": 1,
      "illustrationAnimation": { "variant": "instant" }
    }
  ]
}
```

The request never contains a file path. `vite.config.ts` supplies an allowlisted map from track ID to lyrics source and export name. Unknown track IDs are rejected. Request parsing, TypeScript source editing, and Vite server wiring are separate modules under `tools/tuning/`. The plugin is active only while serving development.

Edits update the live preview but do not write to the lyrics source. Register writes every changed section in one request. Reset discards every unregistered change across all sections. Refreshing the page has the same effect as Reset.

## Adding a track page

Add tracks explicitly:

1. Put audio and any reference data under `src/shared/assets/audio/`.
2. Add a `TrackSummary` to `src/entities/track/model/catalog.ts`.
3. Create `src/pages/<track-slug>/`.
4. Put serializable lyrics, audio reference, and descriptors in `model/`.
5. Put track-only renderers and illustrations in `ui/`.
6. Compose `TrackExperience` in `index.tsx`.
7. Add `/tracks/<track-slug>` to `src/routes.ts`.
8. If the track is tunable, add its fixed source/export mapping to the Vite plugin allowlist and dynamically compose `IllustrationTuningProvider` in development.
9. Verify direct navigation, catalog navigation, route exit/re-entry, playback, captions, timeline, illustrations, loading, and replay.

Do not create a catch-all data-driven track route while track pages have distinct model or UI requirements.

## Maintenance rules

- Keep components focused on rendering and light local UI state. Move substantial lifecycle/state coordination into hooks and pure calculations or DOM transformations into model/lib utilities.
- Aim to keep implementation files below roughly 200–300 lines when responsibilities can be separated cleanly. Keep cohesive, field-oriented modules together when splitting would obscure the model; `pages/ram-box/model/lyrics.ts` is intentionally one such module.
- Shorten logic with the platform or standard library first. Reuse an installed dependency or extract a shared helper only when logic is repeated or one self-contained block is large enough to justify ownership.
- Prefer cohesion over arbitrary line limits: split mixed responsibilities, not files that are merely data-heavy.
- Keep page-specific data and UI inside its page slice.
- Keep reusable playback composition in widgets, user-facing capabilities in features, domain contracts/calculations in entities, and dependency-free reuse in shared.
- Use relative imports within a slice and aliases across slices.
- Do not bypass layer restrictions with deep relative imports.
- Keep custom illustration descriptors serializable.
- Keep the F4 tuner development-only and detached from page-specific data.
- Scope tuning state, storage, progress, and autosave by track ID.
- Keep source rewriting behind the Vite plugin’s fixed allowlist; never accept request-provided paths.
- Remove assets and UI once import/reference tracing proves they are unreachable.
- Keep project colors in CSS variables rather than JSX or TypeScript literals.
- Use hooks only for React state, refs, effects, or cleanup. Keep pure calculations outside hooks.
- Export only symbols consumed by another module.
- Run React Router type generation, TypeScript, Oxlint, cycle checks, and `oxfmt --check` after structural changes.
- Run a production build when module boundaries, Vite tooling, routes, or bundling behavior change.

## Validation checklist

```bash
pnpm typecheck
pnpm lint
pnpm fmt:check
pnpm build
```

Also smoke-test `/`, `/tracks/`, `/tracks/ram-box`, and an unknown path. For tuning changes, verify F4 opening, selection, preview, per-track state, autosave, reset/register, allowlist rejection, and a clean source diff after restoration.
