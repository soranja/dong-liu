import { type CSSProperties } from "react";
import { usePackedWordsLayout } from "./lib/usePackedWordsLayout";
import "./styles/lyrics-word-cloud.css";

import type { TextIllustrationProps } from "./types";

export const LyricsWordCloud = ({ animation, onReady, sectionId, text }: TextIllustrationProps) => {
  const { containerRef, words } = usePackedWordsLayout({ onReady, sectionId, text });

  return (
    <div ref={containerRef} className="lyrics-word-cloud">
      {words.map((word) => (
        <span
          key={`${sectionId}-${word.index}-${word.text}`}
          className="lyrics-word-cloud__room"
          style={
            {
              height: word.height,
              left: word.left,
              top: word.top,
              width: word.width,
            } as CSSProperties
          }
        >
          <span
            className="lyrics-word-cloud__word"
            data-word-cloud-word
            data-word-start-percent={
              animation?.variant === "range" ? animation.wordStartPercents?.[word.index] : undefined
            }
            style={
              {
                "--word-rotation": `${word.rotation}deg`,
                "--word-scale-x": word.scaleX,
                "--word-scale-y": word.scaleY,
                fontSize: word.fontSize,
                fontWeight: word.fontWeight,
              } as CSSProperties
            }
          >
            {word.text}
          </span>
        </span>
      ))}
    </div>
  );
};
