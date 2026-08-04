export const TIMELINE_WINDOW_SIZE = 20;

const RETAINED_SECTION_COUNT = 5;

export function isTimelineSectionResident(sectionIndex: number, activeIndex: number, sectionCount: number) {
  const windowStart = Math.min(
    Math.max(0, activeIndex - RETAINED_SECTION_COUNT),
    Math.max(0, sectionCount - TIMELINE_WINDOW_SIZE),
  );

  return sectionIndex >= windowStart && sectionIndex < windowStart + TIMELINE_WINDOW_SIZE;
}
