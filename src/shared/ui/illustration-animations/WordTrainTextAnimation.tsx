import { useEffect, useMemo } from "react";
import { getLyricDisplayText } from "./lib/lyricText";

import "./styles/word-train-text-animation.css";
import type { TextIllustrationProps } from "./types";

export const WordTrainTextAnimation = ({ onReady, sectionId, text }: TextIllustrationProps) => {
  const displayText = useMemo(() => getLyricDisplayText(text), [text]);

  useEffect(() => {
    void document.fonts.ready.then(() => onReady(sectionId));
  }, [onReady, sectionId]);

  return (
    <div aria-label={displayText} className="word-train-text-animation" data-section-id={sectionId}>
      <span aria-hidden="true" className="word-train-text-animation__phrase">
        {displayText}
      </span>
    </div>
  );
};
