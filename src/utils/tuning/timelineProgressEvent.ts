export const TIMELINE_PROGRESS_EVENT = "dong-liu:timeline-progress";

export type TimelineProgressDetail = {
  activeIndex: number;
  currentTime: number;
  duration: number;
  progress: number;
  sectionId: number;
};
