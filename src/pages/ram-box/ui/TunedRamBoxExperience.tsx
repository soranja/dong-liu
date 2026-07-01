import { IllustrationTuningProvider } from "../../../features/illustration-tuning/ui/IllustrationTuningProvider";
import { TrackExperience, type TrackExperienceProps } from "../../../widgets/track-experience/ui/TrackExperience";
import type { RamBoxIllustrationDescriptor } from "../model/types";

type TunedRamBoxExperienceProps = TrackExperienceProps<RamBoxIllustrationDescriptor>;

export const TunedRamBoxExperience = (props: TunedRamBoxExperienceProps) => (
  <IllustrationTuningProvider lyrics={props.lyrics} trackId={props.trackId}>
    {(tuningAdapter) => <TrackExperience {...props} tuningAdapter={tuningAdapter} />}
  </IllustrationTuningProvider>
);
