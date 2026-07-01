import { Link } from "react-router";

import { DongLiuShell } from "../../DongLiuShell";

export const meta = () => [{ title: "Ram Box — Dong Liu" }];

const RamBoxRoute = () => (
  <DongLiuShell
    headerTrailingContent={
      <Link
        aria-label="Back to track list"
        className="flex h-full shrink-0 items-center bg-(--color-panel-raised) px-5 font-mono text-xs font-bold uppercase text-(--color-text) transition-colors hover:text-(--color-accent) focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-(--color-accent)"
        to="/"
      >
        Tracks
      </Link>
    }
  />
);

export default RamBoxRoute;
