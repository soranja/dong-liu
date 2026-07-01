import type { TrackSummary } from "./types";

export const TRACKS = [
  {
    id: "ram-box",
    route: "/tracks/ram-box",
    slug: "ram-box",
    title: "Ram Box",
  },
] as const satisfies readonly TrackSummary[];
