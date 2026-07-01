import audioSrc from "@shared/assets/audio/ram_box.mp3";
import { RAM_BOX_LYRICS } from "./lyrics";

export const RAM_BOX_TRACK = {
  audioSrc,
  id: "ram-box",
  lyrics: RAM_BOX_LYRICS,
} as const;
