import React from "react";
import OutlinedCaptions from "./OutlinedCaptions";
import { WordTimestamp } from "@/remotion/types";

interface SubtitleProps {
  text: string;
  wordTimestamps?: WordTimestamp[];
  primaryColor?: string;
}

const Subtitle: React.FC<SubtitleProps> = ({ text, wordTimestamps, primaryColor = "yellow" }) => {
  return (
    <OutlinedCaptions
      text={text}
      wordTimestamps={wordTimestamps}
      primaryColor={primaryColor}
      verticalAlign="bottom"
    />
  );
};

export default Subtitle;
