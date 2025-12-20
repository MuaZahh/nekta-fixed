import React from "react";
import {
  AbsoluteFill,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { fitText } from "@remotion/layout-utils";
import { loadFont } from "@remotion/google-fonts/Figtree";
import { WordTimestamp } from "@/remotion/templates/ai-video-basic/types";

interface SubtitleProps {
  text: string;
  wordTimestamps?: WordTimestamp[];
  primaryColor?: string;
}

const Subtitle: React.FC<SubtitleProps> = ({ text, wordTimestamps, primaryColor = "yellow" }) => {
  const frame = useCurrentFrame();
  const { fps, width } = useVideoConfig();
  const { fontFamily } = loadFont();

  const enter = spring({
    frame,
    fps,
    config: {
      damping: 200,
    },
    durationInFrames: 5,
  });

  const currentTimeMs = (frame / fps) * 1000;

  const activeWordIndex = wordTimestamps?.findIndex(
    (wt) => currentTimeMs >= wt.startMs && currentTimeMs < wt.endMs
  ) ?? -1;

  const desiredFontSize = 120;

  const fittedText = fitText({
    fontFamily,
    text,
    withinWidth: width * 0.8,
    fontWeight: 700
  });

  const fontSize = Math.min(desiredFontSize, fittedText.fontSize);

  if (!wordTimestamps || wordTimestamps.length === 0) {
    return (
      <AbsoluteFill>
        <AbsoluteFill
          style={{
            justifyContent: "center",
            alignItems: "center",
            top: undefined,
            bottom: 350,
            height: 150,
          }}
        >
          <div
            style={{
              fontSize,
              color: "white",
              WebkitTextStroke: "20px black",
              fontFamily,
              textTransform: "uppercase",
              textAlign: "center",
              fontWeight: 700,
              transform: `scale(${0.8 + 0.2 * enter}) translateY(${50 * (1 - enter)}px)`,
            }}
          >
            {text}
          </div>
        </AbsoluteFill>
        <AbsoluteFill
          style={{
            justifyContent: "center",
            alignItems: "center",
            top: undefined,
            bottom: 350,
            height: 150,
          }}
        >
          <div
            style={{
              fontSize,
              color: "white",
              fontFamily,
              fontWeight: 700,
              textTransform: "uppercase",
              textAlign: "center",
              transform: `scale(${0.8 + 0.2 * enter}) translateY(${50 * (1 - enter)}px)`,
            }}
          >
            {text}
          </div>
        </AbsoluteFill>
      </AbsoluteFill>
    );
  }

  return (
    <AbsoluteFill>
      <AbsoluteFill
        style={{
          justifyContent: "center",
          alignItems: "center",
          top: undefined,
          bottom: 350,
          height: 150,
          paddingLeft: 50,
          paddingRight: 50
        }}
      >
        <div
          style={{
            fontSize,
            fontFamily,
            fontWeight: 700,
            textTransform: "uppercase",
            textAlign: "center",
            transform: `scale(${0.8 + 0.2 * enter}) translateY(${50 * (1 - enter)}px)`,
            display: "flex",
            flexWrap: "wrap",
            justifyContent: "center",
            gap: fontSize * 0.25,
          }}
        >
          {wordTimestamps.map((wt, index) => (
            <span
              key={index}
              style={{
                color: index === activeWordIndex ? primaryColor : "white",
                WebkitTextStroke: "20px black",
              }}
            >
              {wt.word}
            </span>
          ))}
        </div>
      </AbsoluteFill>
      <AbsoluteFill
        style={{
          justifyContent: "center",
          alignItems: "center",
          top: undefined,
          bottom: 350,
          height: 150,
          paddingLeft: 50,
          paddingRight: 50
        }}
      >
        <div
          style={{
            fontSize,
            fontFamily,
            fontWeight: 700,
            textTransform: "uppercase",
            textAlign: "center",
            transform: `scale(${0.8 + 0.2 * enter}) translateY(${50 * (1 - enter)}px)`,
            display: "flex",
            flexWrap: "wrap",
            justifyContent: "center",
            gap: fontSize * 0.25,
          }}
        >
          {wordTimestamps.map((wt, index) => (
            <span
              key={index}
              style={{
                color: index === activeWordIndex ? primaryColor : "white",
              }}
            >
              {wt.word}
            </span>
          ))}
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

export default Subtitle;
