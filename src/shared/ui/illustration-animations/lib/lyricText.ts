const WORD_SEGMENTER = new Intl.Segmenter(undefined, { granularity: 'word' });

export function getLyricDisplayText(text: string) {
  return text.replaceAll('_', ' ');
}

export function getLyricWords(text: string) {
  return [...WORD_SEGMENTER.segment(getLyricDisplayText(text))]
    .filter(({ isWordLike, segment }) => isWordLike || segment === '—')
    .map(({ segment }) => segment);
}
