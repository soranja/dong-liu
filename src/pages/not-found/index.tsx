import { Link } from "react-router";

export const meta = () => [{ title: "Not found — Dong Liu" }];

const NotFoundRoute = () => (
  <main className="flex min-h-screen items-center justify-center bg-dark-gray px-6 text-center text-cream-white">
    <div>
      <p className="font-mono text-xs uppercase tracking-[0.22em] text-toxic-carrot">404</p>
      <h1 className="mt-4 font-unbounded text-4xl font-bold uppercase">Track not found</h1>
      <Link
        className="mt-8 inline-flex border border-border-strong px-5 py-3 font-mono text-sm font-bold uppercase transition-colors hover:border-toxic-carrot hover:text-toxic-carrot focus-visible:ring-2 focus-visible:ring-toxic-carrot"
        to="/"
      >
        View tracks
      </Link>
    </div>
  </main>
);

export default NotFoundRoute;
