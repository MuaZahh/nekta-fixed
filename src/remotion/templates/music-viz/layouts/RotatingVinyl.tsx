import { AbsoluteFill, Img, useCurrentFrame, interpolate } from "remotion"
import { loadFont as loadRaleway } from "@remotion/google-fonts/Raleway";
import { FPS } from "@/remotion/constants";
import { MusicVizWaveformType } from "../types";
import { renderWaveform } from "./utils";

type RotatingVinylProps = {
  coverUrl: string
  songTitle: string
  author?: string
  textColor?: string
  waveform: MusicVizWaveformType
  frequencyData: number[]
}

const {fontFamily: ralewayFaily} = loadRaleway()

export const RotatingVinyl = ({coverUrl, songTitle, author, textColor = 'white', waveform, frequencyData}:RotatingVinylProps) => {
  const frame = useCurrentFrame();
  
  const rotation = (frame / 4500) * 360;
  const vinylRotation = (frame / 600) * 360;
  const coverSize = 254

  const titleOpacity = interpolate(frame, [0, FPS], [0, 1], {
    extrapolateRight: 'clamp'
  });
  const titleTranslateY = interpolate(frame, [0, FPS], [50, 0], {
    extrapolateRight: 'clamp'
  });

  const authorOpacity = interpolate(frame, [FPS/2, FPS], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp'
  });
  const authorTranslateY = interpolate(frame, [FPS/2, FPS], [50, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp'
  });

  return (
    <AbsoluteFill>
      <Img 
        src='https://cdn.nekta-studio.com/templates/music/music_bg_cosmos.png' 
        style={{position: 'absolute', inset: 0, zIndex: 1, transform: 'scale(1.02)'}} 
      />

      <Img 
        src='https://cdn.nekta-studio.com/templates/music/music_vinyl_rays.png' 
        style={{
          position: 'absolute', 
          inset: 0,  
          zIndex: 2, 
          left: -420, 
          top: -320,
          transform: `rotate(${rotation}deg)`,
        }} 
      />
      
      <Img 
        src='https://cdn.nekta-studio.com/templates/music/music_vinyl.png' 
        style={{position: 'absolute', zIndex: 3, left: 147, top: 235, transform: `rotate(-${vinylRotation}deg) scale(1.15)`,}} 
      />

      {coverUrl && <Img 
        src={coverUrl} 
        style={{
          position: 'absolute', 
          zIndex: 4, 
          left: (1080 - coverSize) / 2, 
          top: 502, 
          borderRadius: 1000, 
          width: coverSize, 
          height: coverSize,
          outline: '2px solid rgba(48, 52, 65, 0.8)',
          outlineOffset: '-2px',
          transform: `rotate(-${vinylRotation}deg) scale(1.15)`
        }} 
      />}

      <div style={{
        position: 'absolute',
        bottom: 0,
        left: 0, 
        right: 0,
        display: 'flex',
        flexDirection: 'column',
        gap: 70,
        padding: 90,
        zIndex: 10,
        paddingBottom: 450
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
        position: 'absolute',
        bottom: waveform.type === 'circle-lines' ? 100 : 200,
        left: 0,
        right: 0,
        display: 'flex',
        justifyContent: 'center',
        zIndex: 11
      }}>
        {renderWaveform(waveform.type, frequencyData, waveform.color)}
      </div>
    </AbsoluteFill>
  );
}