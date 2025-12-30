import React from "react";
import {
  AbsoluteFill,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { fitText } from "@remotion/layout-utils";
import { loadFont } from "@remotion/google-fonts/Figtree";
import { WordTimestamp, VerticalAlignmentType } from "@/remotion/types";

interface OutlinedCaptionsProps {
  text: string;
  wordTimestamps?: WordTimestamp[];
  primaryColor?: string;
  verticalAlign?: VerticalAlignmentType;
}

interface SplitResult {
  lines: string[];
  splitIndex: number;
}

function splitTextByCharCount(text: string): SplitResult {
  const words = text.split(" ");

  if (words.length <= 3) {
    return { lines: [text], splitIndex: -1 };
  }

  const totalChars = text.length;
  const targetChars = totalChars / 2;

  let bestSplitIndex = 1;
  let bestDiff = Infinity;

  for (let i = 1; i < words.length; i++) {
    const firstLineChars = words.slice(0, i).join(" ").length;
    const diff = Math.abs(firstLineChars - targetChars);

    if (diff < bestDiff) {
      bestDiff = diff;
      bestSplitIndex = i;
    }
  }

  return {
    lines: [
      words.slice(0, bestSplitIndex).join(" "),
      words.slice(bestSplitIndex).join(" ")
    ],
    splitIndex: bestSplitIndex
  };
}

const OutlinedCaptions: React.FC<OutlinedCaptionsProps> = ({
  text,
  wordTimestamps,
  primaryColor = "yellow",
  verticalAlign = "bottom"
}) => {
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

  const activeWordIndex = (() => {
    if (!wordTimestamps || wordTimestamps.length === 0) return -1;

    const exactMatch = wordTimestamps.findIndex(
      (wt) => currentTimeMs >= wt.startMs && currentTimeMs < wt.endMs
    );
    if (exactMatch !== -1) return exactMatch;

    for (let i = wordTimestamps.length - 1; i >= 0; i--) {
      const wt = wordTimestamps[i];
      const nextWord = wordTimestamps[i + 1];

      if (currentTimeMs >= wt.startMs && (!nextWord || currentTimeMs < nextWord.startMs)) {
        return i;
      }
    }

    return -1;
  })();

  const desiredFontSize = 120;
  const { lines, splitIndex } = splitTextByCharCount(text);
  const longestLine = lines.reduce((a, b) => a.length > b.length ? a : b);
  const isTwoLines = lines.length === 2;
  const longestLineWordCount = longestLine.split(" ").length;
  const wordGap = 0.25;

  const padding = 100;
  const strokeWidth = 40;
  const safetyMargin = 20;
  const baseAvailableWidth = width - padding - strokeWidth - safetyMargin;
  const gapFactor = 1 + (longestLineWordCount - 1) * wordGap * 0.8;
  const availableWidth = baseAvailableWidth / gapFactor;

  const fittedText = fitText({
    fontFamily,
    text: longestLine,
    withinWidth: availableWidth,
    fontWeight: 700
  });

  const fontSize = Math.min(desiredFontSize, fittedText.fontSize);
  const lineHeight = fontSize * 1.15;

  const getVerticalPosition = () => {
    const style: React.CSSProperties = {
      justifyContent: "center",
      alignItems: "center",
      height: isTwoLines ? lineHeight * 2 + 20 : lineHeight,
      paddingLeft: 50,
      paddingRight: 50
    };

    if (verticalAlign === "top") {
      style.top = 150;
      style.bottom = undefined;
    } else if (verticalAlign === "center") {
      style.top = "50%";
      style.transform = `translateY(-50%)`;
    } else {
      style.top = undefined;
      style.bottom = 350;
    }

    return style;
  };

  const positionStyle = getVerticalPosition();

  if (!wordTimestamps || wordTimestamps.length === 0) {
    return (
      <AbsoluteFill>
        <AbsoluteFill style={positionStyle}>
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
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 10,
            }}
          >
            {lines.map((line, i) => (
              <div key={i}>{line}</div>
            ))}
          </div>
        </AbsoluteFill>
        <AbsoluteFill style={positionStyle}>
          <div
            style={{
              fontSize,
              color: "white",
              fontFamily,
              fontWeight: 700,
              textTransform: "uppercase",
              textAlign: "center",
              transform: `scale(${0.8 + 0.2 * enter}) translateY(${50 * (1 - enter)}px)`,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 10,
            }}
          >
            {lines.map((line, i) => (
              <div key={i}>{line}</div>
            ))}
          </div>
        </AbsoluteFill>
      </AbsoluteFill>
    );
  }

  const line1Words = isTwoLines ? wordTimestamps.slice(0, splitIndex) : wordTimestamps;
  const line2Words = isTwoLines ? wordTimestamps.slice(splitIndex) : [];

  const renderLine = (words: WordTimestamp[], lineOffset: number, isStroke: boolean) => (
    <div
      style={{
        display: "flex",
        justifyContent: "center",
        gap: fontSize * 0.25,
      }}
    >
      {words.map((wt, index) => {
        const globalIndex = index + lineOffset;
        return (
          <span
            key={index}
            style={{
              color: globalIndex === activeWordIndex ? primaryColor : "white",
              ...(isStroke ? { WebkitTextStroke: "20px black" } : {}),
            }}
          >
            {wt.word}
          </span>
        );
      })}
    </div>
  );

  return (
    <AbsoluteFill>
      <AbsoluteFill style={positionStyle}>
        <div
          style={{
            fontSize,
            fontFamily,
            fontWeight: 700,
            textTransform: "uppercase",
            textAlign: "center",
            transform: `scale(${0.8 + 0.2 * enter}) translateY(${50 * (1 - enter)}px)`,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 10,
          }}
        >
          {renderLine(line1Words, 0, true)}
          {isTwoLines && renderLine(line2Words, splitIndex, true)}
        </div>
      </AbsoluteFill>
      <AbsoluteFill style={positionStyle}>
        <div
          style={{
            fontSize,
            fontFamily,
            fontWeight: 700,
            textTransform: "uppercase",
            textAlign: "center",
            transform: `scale(${0.8 + 0.2 * enter}) translateY(${50 * (1 - enter)}px)`,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 10,
          }}
        >
          {renderLine(line1Words, 0, false)}
          {isTwoLines && renderLine(line2Words, splitIndex, false)}
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

export default OutlinedCaptions;
