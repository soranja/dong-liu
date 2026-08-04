export type SectionNavigationDirection = -1 | 1;

const SECTION_RESTART_THRESHOLD = 0.1;

export function getSectionNavigationTime(
  sectionStarts: readonly number[],
  currentTime: number,
  duration: number,
  direction: SectionNavigationDirection,
) {
  if (!sectionStarts.length) return currentTime;

  let currentIndex = 0;
  for (let index = sectionStarts.length - 1; index >= 0; index -= 1) {
    if (currentTime >= sectionStarts[index]) {
      currentIndex = index;
      break;
    }
  }

  if (direction === 1) return Math.min(duration, sectionStarts[currentIndex + 1] ?? duration);

  const sectionStart = sectionStarts[currentIndex];
  const sectionEnd = Math.min(duration, sectionStarts[currentIndex + 1] ?? duration);
  const targetIndex =
    currentTime >= sectionStart + (sectionEnd - sectionStart) * SECTION_RESTART_THRESHOLD
      ? currentIndex
      : Math.max(0, currentIndex - 1);

  return Math.min(duration, Math.max(0, sectionStarts[targetIndex]));
}
