import { useEffect, useState } from 'react';
import { Link } from 'react-router';

import { TRACKS } from '@entities/track/model/catalog';
import { DrippingTrack } from './dripping-track';

export const meta = () => [{ title: 'Dong Liu — Interactive tracks' }];

const HomeRoute = () => {
  const [activeTrackId, setActiveTrackId] = useState<string | null>(null);
  const [waterfallActive, setWaterfallActive] = useState(false);

  useEffect(() => {
    if (activeTrackId === null) {
      setWaterfallActive(false);
      return;
    }

    const timer = window.setTimeout(() => setWaterfallActive(true), 500);
    return () => window.clearTimeout(timer);
  }, [activeTrackId]);

  return (
    <main className="min-h-screen bg-dark-gray px-16 pt-16 text-cream-white">
      <div className="mx-auto flex w-full max-w-6xl flex-col text-center">
        <header className="mb-14">
          <h1 aria-label="Dong Liu" className="dong-liu-title mx-auto mt-4"></h1>
        </header>

        <ol aria-label="Track list">
          {TRACKS.map((track) => (
            <li key={track.id}>
              <Link
                className="group relative isolate flex min-h-28 items-center gap-6 overflow-hidden px-4 py-6 before:absolute before:inset-0 before:-z-10 before:bg-toxic-carrot before:[clip-path:inset(0_100%_0_0)] before:transition-[clip-path] before:duration-500 before:ease-in hover:before:[clip-path:inset(0_0_0_0)] focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-toxic-carrot focus-visible:before:[clip-path:inset(0_0_0_0)]"
                onBlur={() => setActiveTrackId(null)}
                onFocus={() => setActiveTrackId(track.id)}
                onPointerEnter={() => setActiveTrackId(track.id)}
                onPointerLeave={() => setActiveTrackId(null)}
                prefetch="intent"
                to={track.route}
              >
                <span className="font-mono text-xs text-text-muted">
                  {track.trackNo >= 10 ? track.trackNo : `0${track.trackNo}`}
                </span>

                <img
                  alt={track.cover.alt}
                  className="size-24 shrink-0 object-cover"
                  loading="lazy"
                  src={track.cover.src}
                />

                <span className="font-unbounded text-4xl font-bold uppercase">
                  {track.title}
                </span>

                <span
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-0 z-10 flex items-center gap-6 px-4 py-6 text-dark-gray [clip-path:inset(0_100%_0_0)] transition-[clip-path] duration-500 ease-in group-hover:[clip-path:inset(0_0_0_0)] group-focus-visible:[clip-path:inset(0_0_0_0)]"
                >
                  <span className="font-mono text-xs">{track.trackNo >= 10 ? track.trackNo : `0${track.trackNo}`}</span>
                  <span className="size-24 shrink-0" />
                  <span className="font-unbounded text-4xl font-bold uppercase">
                    {track.title}
                  </span>
                </span>
              </Link>
            </li>
          ))}
        </ol>

        <DrippingTrack active={waterfallActive} />
      </div>
    </main>
  );
};

export default HomeRoute;
