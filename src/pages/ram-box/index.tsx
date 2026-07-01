import { lazy, Suspense } from "react";
import { Link } from "react-router";

import { TrackExperience } from "@widgets/track-experience/ui/TrackExperience";
import { RAM_BOX_TRACK } from "./model/track";
import type { RamBoxIllustrationDescriptor } from "./model/types";
import { RamBoxIllustration } from "./ui/RamBoxIllustration";

export const meta = () => [{ title: "Ram Box — Dong Liu" }];

const renderRamBoxIllustration = (descriptor: RamBoxIllustrationDescriptor) => (
  <RamBoxIllustration descriptor={descriptor} />
);

const TunedRamBoxExperience = import.meta.env.DEV
  ? lazy(() =>
      import("./ui/TunedRamBoxExperience").then((module) => ({
        default: module.TunedRamBoxExperience,
      })),
    )
  : null;

const headerTrailingContent = (
  <Link
    aria-label="Back to track list"
    className="flex h-full shrink-0 items-center bg-(--color-panel-raised) px-5 font-mono text-xs font-bold uppercase text-(--color-text) transition-colors hover:text-(--color-accent) focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-(--color-accent)"
    to="/"
  >
    Tracks
  </Link>
);

const trackExperienceProps = {
  audioSrc: RAM_BOX_TRACK.audioSrc,
  headerTrailingContent,
  lyrics: RAM_BOX_TRACK.lyrics,
  renderCustomIllustration: renderRamBoxIllustration,
  trackId: RAM_BOX_TRACK.id,
};

const RamBoxRoute = () =>
  TunedRamBoxExperience ? (
    <Suspense fallback={null}>
      <TunedRamBoxExperience {...trackExperienceProps} />
    </Suspense>
  ) : (
    <TrackExperience {...trackExperienceProps} />
  );

export default RamBoxRoute;
