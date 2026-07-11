import { Link } from "react-router";

export const meta = () => [{ title: "Not found — Dong Liu" }];

const NotFoundRoute = () => (
  <main className="flex min-h-screen items-center justify-center bg-(--color-bg) px-6 text-center text-primary-text">
    <div>
      <p className="font-mono text-xs uppercase tracking-[0.22em] text-(--color-accent)">404</p>
      <h1 className="mt-4 [font-family:var(--font-unbounded)] text-4xl font-bold uppercase">Track not found</h1>
      <Link
        className="mt-8 inline-flex border border-(--color-border-strong) px-5 py-3 font-mono text-sm font-bold uppercase transition-colors hover:border-(--color-accent) hover:text-(--color-accent) focus-visible:ring-2 focus-visible:ring-(--color-accent)"
        to="/"
      >
        View tracks
      </Link>
    </div>
  </main>
);

export default NotFoundRoute;
