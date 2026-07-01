import { Link } from "react-router";

import { TRACKS } from "../../entities/track/model/catalog";

export const meta = () => [{ title: "Dong Liu — Interactive tracks" }];

const HomeRoute = () => (
  <main className="min-h-screen bg-(--color-bg) px-6 py-16 text-(--color-text) sm:px-10 lg:px-16">
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-14">
      <header>
        <p className="font-mono text-xs uppercase tracking-[0.22em] text-(--color-accent)">Interactive tracks</p>
        <h1 className="mt-4 [font-family:var(--font-unbounded)] text-4xl font-bold uppercase leading-none sm:text-6xl">
          Dong Liu
        </h1>
      </header>

      <ol aria-label="Track list" className="border-t border-(--color-border-strong)">
        {TRACKS.map((track, index) => (
          <li key={track.id} className="border-b border-(--color-border-strong)">
            <Link
              className="group flex min-h-28 items-center gap-6 px-1 py-6 transition-colors hover:text-(--color-accent) focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-(--color-accent)"
              prefetch="intent"
              to={track.route}
            >
              <span className="font-mono text-xs text-(--color-text-muted)">{String(index + 1).padStart(2, "0")}</span>
              <span className="[font-family:var(--font-unbounded)] text-2xl font-bold uppercase sm:text-4xl">
                {track.title}
              </span>
              <span
                aria-hidden="true"
                className="ml-auto font-mono text-xl transition-transform group-hover:translate-x-1"
              >
                →
              </span>
            </Link>
          </li>
        ))}
      </ol>
    </div>
  </main>
);

export default HomeRoute;
