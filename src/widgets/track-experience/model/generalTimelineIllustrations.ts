import { isContinuedSection } from '@entities/track/lib/continuing';
import { getTimelineSectionDuration } from '@entities/track/lib/generalTimeline';
import {
  DEFAULT_INSTANT_ANIMATION,
  SINGLE_WORD_REVEAL_END_PERCENT,
  WORD_CLOUD_REVEAL_END_PERCENT,
  resolveIllustrationAnimation,
} from '@entities/track/model/animation';
import {
  resolveIllustrationAnimation as resolveTunedIllustrationAnimation,
  resolveIllustrationFadeInMs,
  resolveIllustrationFadeOutMs,
  resolveIllustrationVisibility,
  type TrackTuningAdapter,
} from '@entities/track/model/tuning';
import type { LyricsSection } from '@entities/track/model/types';
import { pauseSyncedVideos, syncSyncedVideos } from '@shared/lib/timelineSyncedVideo';
import { setKineticWarpProgress } from '@shared/ui/illustration-animations/lib/kineticWarp';

type IllustrationProgressOptions = {
  fadeProgress?: number;
  sectionDuration?: number;
  shouldPlaySyncedVideo?: boolean;
  syncedVideoProgress?: number;
};

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function getIllustrationFadeOpacity(
  lyrics: readonly LyricsSection[],
  sectionIndex: number,
  progress: number,
  sectionDuration: number,
  disableFadeIn: boolean,
  tuningAdapter?: TrackTuningAdapter,
) {
  const section = lyrics[sectionIndex];
  const fadeInSeconds = disableFadeIn ? 0 : resolveIllustrationFadeInMs(section, tuningAdapter) / 1000;
  const fadeOutSeconds = resolveIllustrationFadeOutMs(section, tuningAdapter) / 1000;
  if (!sectionDuration || (!fadeInSeconds && !fadeOutSeconds)) return 1;

  const elapsed = progress * sectionDuration;
  const remaining = (1 - progress) * sectionDuration;
  const fadeInOpacity = fadeInSeconds ? elapsed / fadeInSeconds : 1;
  const fadeOutOpacity = fadeOutSeconds ? remaining / fadeOutSeconds : 1;

  return clamp(Math.min(fadeInOpacity, fadeOutOpacity), 0, 1);
}

function setRevealedWordCount(slide: HTMLElement, words: NodeListOf<HTMLElement>, revealedWordCount: number) {
  if (slide.dataset.revealedWordCount === String(revealedWordCount)) return;

  words.forEach((word, index) => {
    word.dataset.wordRevealed = index < revealedWordCount ? 'true' : 'false';
  });
  slide.dataset.revealedWordCount = String(revealedWordCount);
}

function clearWordCloud(slide: HTMLElement) {
  const words = slide.querySelectorAll<HTMLElement>('[data-word-cloud-word]');
  if (words.length) setRevealedWordCount(slide, words, 0);
}

function setWordCloudProgress(slide: HTMLElement, progress: number) {
  const words = slide.querySelectorAll<HTMLElement>('[data-word-cloud-word]');
  if (!words.length) return;

  if (!Array.from(words).some((word) => word.dataset.wordStartPercent !== undefined)) {
    setRevealedWordCount(slide, words, Math.min(words.length, Math.floor(progress * words.length + Number.EPSILON)));
    return;
  }

  const wordStarts = new Map(
    Array.from(words, (word) => [Number(word.dataset.wordIndex), Number(word.dataset.wordStartPercent ?? 100)]),
  );
  words.forEach((word) => {
    const start = Number(word.dataset.wordStartPercent ?? 0) / 100;
    const letterIndex = Number(word.dataset.wordLetterIndex ?? 0);
    const letterCount = Number(word.dataset.wordLetterCount ?? 1);
    const end = (wordStarts.get(Number(word.dataset.wordIndex) + 1) ?? 100) / 100;
    const threshold = start + ((end - start) * letterIndex) / Math.max(1, letterCount);
    word.dataset.wordRevealed = progress + Number.EPSILON >= threshold ? 'true' : 'false';
  });
  delete slide.dataset.revealedWordCount;
}

export function clearIllustrationProgress(slide: HTMLElement | null) {
  if (!slide) return;

  slide.dataset.illustrationObserved = 'false';
  slide.style.setProperty('--illustration-progress', '0');
  slide.style.setProperty('--illustration-fade-opacity', '0');
  clearWordCloud(slide);
  pauseSyncedVideos(slide);
}

export function setIllustrationProgress(
  lyrics: readonly LyricsSection[],
  slide: HTMLElement | null,
  sectionIndex: number,
  sectionProgress: number,
  options: IllustrationProgressOptions = {},
  tuningAdapter?: TrackTuningAdapter,
) {
  if (!slide) return;

  const section = lyrics[sectionIndex];
  const animation = resolveTunedIllustrationAnimation(section, tuningAdapter);
  const fadeProgress = options.fadeProgress ?? sectionProgress;
  const sectionDuration = options.sectionDuration ?? 0;
  const words = slide.querySelectorAll<HTMLElement>('[data-word-cloud-word]');
  const hasKineticWarp = Boolean(slide.querySelector('[data-kinetic-warp-root]'));
  const defaultEndPercent = words.length
    ? words.length === 1
      ? SINGLE_WORD_REVEAL_END_PERCENT
      : WORD_CLOUD_REVEAL_END_PERCENT
    : undefined;
  const result =
    words.length && slide.dataset.overlay === 'true' && !animation
      ? { isObserved: true, progress: 1 }
      : resolveIllustrationAnimation({
          animation: animation ?? (!words.length && !hasKineticWarp ? DEFAULT_INSTANT_ANIMATION : undefined),
          defaultEndPercent,
          sectionProgress,
        });

  slide.dataset.illustrationObserved = result.isObserved ? 'true' : 'false';
  slide.style.setProperty('--illustration-progress', String(result.progress));
  slide.style.setProperty(
    '--illustration-fade-opacity',
    String(
      getIllustrationFadeOpacity(
        lyrics,
        sectionIndex,
        fadeProgress,
        sectionDuration,
        Boolean(slide.querySelector('[data-timeline-synced-video]')),
        tuningAdapter,
      ),
    ),
  );
  if (words.length === 1) setRevealedWordCount(slide, words, result.isObserved ? 1 : 0);
  else if (words.length) setWordCloudProgress(slide, result.progress);
  if (hasKineticWarp) setKineticWarpProgress(slide, result.progress);
  syncSyncedVideos(slide, {
    progress: options.syncedVideoProgress ?? sectionProgress,
    sectionDuration,
    shouldPlay: Boolean(options.shouldPlaySyncedVideo),
  });
}

export function syncInactiveIllustrations(
  lyrics: readonly LyricsSection[],
  slides: Array<HTMLElement | null>,
  activeIndex: number,
  duration: number,
  tuningAdapter?: TrackTuningAdapter,
) {
  slides.forEach((slide, index) => {
    if (
      !slide ||
      slide.dataset.resident !== 'true' ||
      index === activeIndex ||
      isContinuedSection(lyrics, index, tuningAdapter)
    )
      return;

    const visibility = resolveIllustrationVisibility(lyrics[index], tuningAdapter);
    slide.dataset.illustrationVisibility = visibility;
    if (
      visibility === 'adjacent' ||
      (visibility === 'start-active' && index > activeIndex) ||
      (visibility === 'active-end' && index < activeIndex)
    ) {
      const inactiveProgress = index < activeIndex ? 1 : 0;
      setIllustrationProgress(
        lyrics,
        slide,
        index,
        1,
        {
          fadeProgress: inactiveProgress,
          sectionDuration: getTimelineSectionDuration(lyrics, index, duration, tuningAdapter),
          syncedVideoProgress: inactiveProgress,
        },
        tuningAdapter,
      );
      return;
    }

    clearIllustrationProgress(slide);
  });
}
