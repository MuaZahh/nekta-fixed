import { AbsoluteFill, Sequence, Img, CalculateMetadataFunction, useCurrentFrame, interpolate } from "remotion";
import { FPS } from "@/remotion/constants";
import ImageGlow from 'react-image-glow';
import { loadFont as loadRaleway } from "@remotion/google-fonts/Raleway";
import { MusicVizWaveformType, WaveformType } from "../types";
import { renderWaveform } from "./utils";

const {fontFamily: ralewayFaily} = loadRaleway()

const TITLE_FADE_DURATION = FPS;
const TITLE_TRANSLATE_Y_START = 50;
const AUTHOR_FADE_START = FPS / 2;
const AUTHOR_FADE_DURATION = FPS;
const AUTHOR_TRANSLATE_Y_START = 50;


type BigCoverProps = {
  coverUrl: string
  songTitle: string
  author?: string
  waveform: MusicVizWaveformType
  frequencyData: number[]
  backgroundColor?: string
  textColor?: string
}

export const BigCover = ({ coverUrl, songTitle, author, waveform, frequencyData, backgroundColor='black', textColor='white' }: BigCoverProps) => {
  const frame = useCurrentFrame();

  const titleOpacity = interpolate(frame, [0, TITLE_FADE_DURATION], [0, 1], {
    extrapolateRight: 'clamp'
  });
  const titleTranslateY = interpolate(frame, [0, TITLE_FADE_DURATION], [TITLE_TRANSLATE_Y_START, 0], {
    extrapolateRight: 'clamp'
  });

  const authorOpacity = interpolate(frame, [AUTHOR_FADE_START, AUTHOR_FADE_DURATION], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp'
  });
  const authorTranslateY = interpolate(frame, [AUTHOR_FADE_START, AUTHOR_FADE_DURATION], [AUTHOR_TRANSLATE_Y_START, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp'
  });
  
  

  return <AbsoluteFill style={{ backgroundColor, display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: 100}}>
      <ImageGlow 
        radius={170}
        saturation={1.5}
        opacity={0.8}
      >
        <Img src={coverUrl} style={{
          width: 900,
          height: 900,
          borderRadius: 35,
          outline: '2px solid rgba(255, 255, 255, 0.3)',
          outlineOffset: '-2px'
        }} />
      </ImageGlow>

      <div style={{
        position: 'absolute',
        top: 0,
        left: 0, 
        right: 0,
        display: 'flex',
        flexDirection: 'column',
        gap: 30,
        padding: 90,
        zIndex: 10,
        paddingTop: 1100
      }}>

        <div style={{
          fontFamily: ralewayFaily,
          fontSize: 90,
          fontWeight: 'bold',
          color: textColor,
          opacity: titleOpacity,
          transform: `translateY(${titleTranslateY}px)`
        }}>
          {songTitle}
        </div>

        <div style={{
          fontFamily: ralewayFaily,
          fontSize: 60,
          fontWeight: 500,
          color: textColor,
          opacity: authorOpacity,
          transform: `translateY(${authorTranslateY}px)`
        }}>
          {author}
        </div>
        
      </div>

      <div style={{
        flexGrow: 1
      }} />

      <div style={{paddingBottom: 180}}>
        {renderWaveform(waveform.type, frequencyData, waveform.color)}
      </div>
    </AbsoluteFill>
}