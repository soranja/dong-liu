export function getLyricDisplayText(text: string) {
  return text.replaceAll("_", " ");
}

export function getLyricWords(text: string) {
  return text.trim().split(/\s+/u).filter(Boolean).map(getLyricDisplayText);
}
