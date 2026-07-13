import { type CSSProperties } from "react";
import { getLyricDisplayText } from "./lib/lyricText";
import { usePackedWordsLayout } from "./lib/usePackedWordsLayout";
import "./styles/kinetic-warp-text-animation.css";

import type { TextIllustrationProps } from "./types";

export const KineticWarpTextAnimation = ({ onReady, sectionId, text }: TextIllustrationProps) => {
  const { containerRef, words } = usePackedWordsLayout({ onReady, sectionId, text });

  return (
    <div
      ref={containerRef}
      aria-label={getLyricDisplayText(text)}
      className="kinetic-warp-text-animation"
      data-kinetic-warp-root
      data-section-id={sectionId}
    >
      {words.map((word) => (
        <span
          key={`${sectionId}-${word.index}-${word.text}`}
          aria-hidden="true"
          className="kinetic-warp-text-animation__room"
          data-base-height={word.height}
          data-base-left={word.left}
          data-base-top={word.top}
          data-base-width={word.width}
          data-kinetic-warp-room
          data-word-rotation={word.rotation}
          style={
            {
              "--base-height": `${word.height}px`,
              "--base-left": `${word.left}px`,
              "--base-top": `${word.top}px`,
              "--base-width": `${word.width}px`,
              height: word.height,
              left: word.left,
              top: word.top,
              width: word.width,
            } as CSSProperties
          }
        >
          <span
            className="kinetic-warp-text-animation__word"
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
