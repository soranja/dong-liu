export type RamBoxIllustrationDescriptor = {
  kind: "looping-video" | "synced-video";
  loopStartTimeSeconds?: number;
  src: string;
};
