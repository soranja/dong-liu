export { TEXT_ILLUSTRATION_KINDS } from './kinds';
export type { TextIllustrationKind } from './kinds';

export type TextIllustrationProps = {
  animation?: import('@entities/track/model/types').IllustrationAnimation;
  onReady: (sectionId: number) => void;
  sectionId: number;
  text: string;
};
