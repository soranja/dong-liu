export function getCssVariable(name: string) {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}
