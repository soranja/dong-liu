import { useMemo, type ReactNode } from "react";

import type { TrackTuningAdapter } from "@entities/track/model/tuning";
import type { LyricsSection } from "@entities/track/model/types";
import { createIllustrationTuningSession } from "../model/session";
import { IllustrationAnimationTuner } from "./IllustrationAnimationTuner";

type IllustrationTuningProviderProps = {
  children: (tuningAdapter: TrackTuningAdapter) => ReactNode;
  lyrics: readonly LyricsSection[];
  trackId: string;
};

export const IllustrationTuningProvider = ({ children, lyrics, trackId }: IllustrationTuningProviderProps) => {
  const session = useMemo(() => createIllustrationTuningSession(trackId, lyrics), [lyrics, trackId]);
  const tuningAdapter = useMemo<TrackTuningAdapter>(
    () => ({
      ...session,
      renderPanel: (panelProps) => <IllustrationAnimationTuner {...panelProps} session={session} />,
    }),
    [session],
  );

  return children(tuningAdapter);
};
