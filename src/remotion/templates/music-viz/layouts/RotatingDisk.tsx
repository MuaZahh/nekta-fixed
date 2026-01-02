import { Video } from "@remotion/media"
import { AbsoluteFill, useCurrentFrame, interpolate, Img, random } from "remotion"
import { FPS } from "@/remotion/constants";
import { loadFont as loadRaleway } from "@remotion/google-fonts/Raleway";

const {fontFamily: ralewayFaily} = loadRaleway()

const DISK_LEFT = 90;
const DISK_TOP = 160;
const DISK_SIZE = 900;

const SPARK_COUNT = 4;
const SPARK_MIN_SCALE = 0.8;
const SPARK_MAX_SCALE = 1;
const SPARK_ANIMATION_DURATION = FPS * 1.5;
const SPARK_AREA = {
  left: DISK_LEFT,
  top: DISK_TOP,
  width: DISK_SIZE,
  height: DISK_SIZE
};
const SPARK_URL = 'https://cdn.nekta-studio.com/templates/music/spark.png';

const DISK_CYCLE_DURATION = FPS * 6;
const DISK_SCALE_X_MIN = 0.94;
const DISK_TRANSLATE_Y_MAX = 60;

const TITLE_FADE_DURATION = FPS;
const TITLE_TRANSLATE_Y_START = 50;
const AUTHOR_FADE_START = FPS / 2;
const AUTHOR_FADE_DURATION = FPS;
const AUTHOR_TRANSLATE_Y_START = 50;

type RotatingDiskProps = {
  songTitle: string
  author?: string
}

export const RotatingDisk = ({songTitle, author}: RotatingDiskProps) => {
  const frame = useCurrentFrame();
  
  const cycleFrame = frame % DISK_CYCLE_DURATION;
  
  const scaleX = interpolate(
    cycleFrame,
    [0, DISK_CYCLE_DURATION / 2, DISK_CYCLE_DURATION],
    [1, DISK_SCALE_X_MIN, 1]
  );

  const translateY = interpolate(
    cycleFrame,
    [0, DISK_CYCLE_DURATION / 2, DISK_CYCLE_DURATION],
    [0, DISK_TRANSLATE_Y_MAX, 0]
  );

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

  const getSparkProps = (sparkIndex: number) => {
    const sparkCycleLength = SPARK_ANIMATION_DURATION * 2;
    const startOffset = Math.floor(random(`spark-start-${sparkIndex}`) * sparkCycleLength);
    const adjustedFrame = frame + startOffset;
    const cycleNumber = Math.floor(adjustedFrame / sparkCycleLength);
    const sparkFrame = adjustedFrame % sparkCycleLength;
    
    const x = SPARK_AREA.left + random(`spark-x-${sparkIndex}-${cycleNumber}`) * SPARK_AREA.width;
    const y = SPARK_AREA.top + random(`spark-y-${sparkIndex}-${cycleNumber}`) * SPARK_AREA.height;
    const maxScale = SPARK_MIN_SCALE + random(`spark-scale-${sparkIndex}-${cycleNumber}`) * (SPARK_MAX_SCALE - SPARK_MIN_SCALE);
    
    const scale = interpolate(
      sparkFrame,
      [0, SPARK_ANIMATION_DURATION, sparkCycleLength],
      [0, maxScale, 0]
    );

    return { x, y, scale };
  };

  return (
    <AbsoluteFill style={{backgroundColor: 'white'}}>
      <Img src='https://cdn.nekta-studio.com/templates/music/rotating_disk_bg.png' style={{
        position: 'absolute',
        inset: 0,
        zIndex: 1,
        transform: 'scale(1.02)'
      }} />
      <Video 
        src='https://cdn.nekta-studio.com/templates/music/rotating_disk.webm'
        style={{
          transform: `scaleX(${scaleX}) translateY(${translateY}px)`,
          position: 'absolute',
          zIndex: 2,
          left: DISK_LEFT,
          top: DISK_TOP
        }}
      />

      {Array.from({ length: SPARK_COUNT }, (_, i) => {
        const { x, y, scale } = getSparkProps(i);
        return (
          <Img
            key={i}
            src={SPARK_URL}
            style={{
              position: 'absolute',
              zIndex: 3,
              left: x,
              top: y,
              transform: `translate(-50%, -50%) scale(${scale})`,
              pointerEvents: 'none'
            }}
          />
        );
      })}

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
          fontFamily: ralewayFaily,
          fontSize: 90,
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