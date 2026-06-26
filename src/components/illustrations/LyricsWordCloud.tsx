import { type CSSProperties } from "react";
import { usePackedWordsLayout } from "../../hooks/usePackedWordsLayout";
import "../../styles/illustrations/lyrics-word-cloud.css";

type LyricsWordCloudProps = {
  onReady: (sectionId: number) => void;
  sectionId: number;
  text: string;
};

export const LyricsWordCloud = ({ onReady, sectionId, text }: LyricsWordCloudProps) => {
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
