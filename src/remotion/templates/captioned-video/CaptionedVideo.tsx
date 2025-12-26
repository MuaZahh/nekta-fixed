import { AbsoluteFill, Sequence, CalculateMetadataFunction, Loop, Img } from "remotion";
import { Audio, Video } from "@remotion/media";
import Subtitle from "@/remotion/components/Subtitle";
import { FPS } from "@/remotion/constants";
import { CaptionedVideoTimeline, CaptionedVideoBackground } from "./types";

const Background: React.FC<{ item: CaptionedVideoBackground }> = ({ item }) => {
  if (item.type === "image") {
    return (
      <Img 
        src={item.url} 
        style={{ width: "100%", height: "100%", objectFit: "cover" }} 
      />
    );
  }

  return (
    <Video
      src={item.url} 
      trimBefore={FPS * 2}
      style={{ width: "100%", height: "100%", objectFit: "cover" }} 
    />
  );
};

export const CaptionedVideo: React.FC<CaptionedVideoTimeline> = ({
  background, dialog, settings
}) => {
  const sortedBgs = [...background].sort((a, b) => a.fromMs - b.fromMs);
  const totalBgDurationFrames = sortedBgs.reduce(
    (sum, bg) => sum + Math.round((bg.durationMs / 1000) * FPS), 
    0
  );
  const BackgroundSequence = () => (
    <>
      {sortedBgs.map((bg, index) => {
        let cumulativeMs = 0;
        for (let i = 0; i < index; i++) {
          cumulativeMs += sortedBgs[i].durationMs;
        }
        
        const startFrame = Math.round((cumulativeMs / 1000) * FPS);
        const duration = Math.round((bg.durationMs / 1000) * FPS);

        return (
          <Sequence
            key={`bg-${index}`}
            from={startFrame}
            durationInFrames={duration}
          >
            <Background item={bg} />
          </Sequence>
        );
      })}
    </>
  );

  return (
    <AbsoluteFill style={{ backgroundColor: "white" }}>
      {settings.audioBasedDuration ? (
        <Loop durationInFrames={totalBgDurationFrames}>
          <BackgroundSequence />
        </Loop>
      ) : (
        <BackgroundSequence />
      )}

      {dialog.map((dialogMessage, dialogIndex) => {
        let messageOffsetMs = 0;
        
        for (let i = 0; i < dialogIndex; i++) {
          messageOffsetMs += dialog[i].message.reduce((sum, m) => sum + m.durationMs, 0);
        }

        return dialogMessage.message.map((segment, segmentIndex) => {
          const startMs = messageOffsetMs;
          messageOffsetMs += segment.durationMs;

          const startFrame = Math.round((startMs / 1000) * FPS);
          const duration = Math.round((segment.durationMs / 1000) * FPS);

          return (
            <Sequence
              key={`dialog-${dialogIndex}-${segmentIndex}`}
              from={startFrame}
              durationInFrames={duration}
            >
              {segment.audioUrl && <Audio src={segment.audioUrl} />}
              <Subtitle
                text={segment.words.map(w => w.word).join(' ')}
                wordTimestamps={segment.words}
                primaryColor={settings.highlightOutlineColor}
              />
            </Sequence>
          );
        });
      })}
    </AbsoluteFill>
  );
};

export const calculateCaptionedVideoMetadata: CalculateMetadataFunction<CaptionedVideoTimeline> = async ({ props }) => {
  const videoDurationMs = props.background.reduce((partialSum, a) => partialSum + a.durationMs, 0);
  const audioDurationMs = props.dialog.reduce((partialSum, a) => partialSum + a.message.reduce((pSum, m) => pSum + m.durationMs, 0), 0);

  return {
    fps: FPS,
    durationInFrames: Math.round((props.settings.audioBasedDuration ? audioDurationMs : videoDurationMs) * FPS / 1000),
    height: 1920,
    width: 1080,
  };
};