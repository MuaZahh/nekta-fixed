import { Video } from "@remotion/media"
import { AbsoluteFill, useCurrentFrame, interpolate, Img } from "remotion"
import { FPS } from "@/remotion/constants";
import { loadFont } from "@remotion/google-fonts/Audiowide";
import { loadFont as loadRaleway } from "@remotion/google-fonts/Raleway";

const {fontFamily} = loadFont()
const {fontFamily: ralewayFaily} = loadRaleway()

type RotatingDiskProps = {
  songTitle: string
  author?: string
}

export const RotatingDisk = ({songTitle, author}: RotatingDiskProps) => {
  const frame = useCurrentFrame();
  
  const cycleLength = FPS * 6;
  const cycleFrame = frame % cycleLength;
  
  const scaleX = interpolate(
    cycleFrame,
    [0, FPS * 3, FPS * 6],
    [1, 0.94, 1]
  );

  const translateY = interpolate(
    cycleFrame,
    [0, FPS * 3, FPS * 6],
    [0, 60, 0]
  );


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
    <AbsoluteFill style={{backgroundColor: 'white'}}>
      <Img src='https://cdn.nekta-studio.com/templates/music/rotating_disk_bg.png' style={{
        position: 'absolute',
        inset: 0,
        zIndex: 1
      }} />
      <Video 
        src='https://cdn.nekta-studio.com/templates/music/rotating_disk.webm'
        style={{
          transform: `scaleX(${scaleX}) translateY(${translateY}px)`,
          position: 'absolute',
          zIndex: 2,
          left: 90,
          top: 160
        }}
      />

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
        paddingBottom: 250
      }}>

        <div style={{
          fontFamily,
          fontSize: 80,
          fontWeight: 'bold',
          color: 'white',
          opacity: titleOpacity,
          transform: `translateY(${titleTranslateY}px)`
        }}>
          {songTitle}
        </div>

        <div style={{
          fontFamily: ralewayFaily,
          fontSize: 60,
          fontWeight: 500,
          color: 'white',
          opacity: authorOpacity,
          transform: `translateY(${authorTranslateY}px)`
        }}>
          {author}
        </div>
        
      </div>
    </AbsoluteFill>
  );
}