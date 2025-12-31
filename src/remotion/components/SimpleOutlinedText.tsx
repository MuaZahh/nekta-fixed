import React from "react";
import { loadFont } from "@remotion/google-fonts/Figtree";

interface OutlinedTextProps {
  text: string;
  color?: string;
  outlineColor?: string;
  fontSize?: number
  isBold?: boolean
}

const {fontFamily} = loadFont()

export const SimpleOutlinedText: React.FC<OutlinedTextProps> = ({
  text,
  isBold,
  color = "white",
  outlineColor = "black",
  fontSize = 60
}) => {
  
  return (
    <div style={{ position: "relative", display: "inline-block", fontSize, textAlign: 'center', fontFamily, fontWeight: isBold ? 700 : 400 }}>
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          WebkitTextStroke: `4px ${outlineColor}`,
          color: "transparent",
        }}
      >
        {text}
      </div>
      <div style={{ position: "relative", color }}>
        {text}
      </div>
    </div>
  );
};

