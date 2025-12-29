import { AbsoluteFill, Sequence, CalculateMetadataFunction, Loop, Img } from "remotion";
import { Audio, Video } from "@remotion/media";
import { Gif } from "@remotion/gif";
import Subtitle from "@/remotion/components/Subtitle";
import { FPS } from "@/remotion/constants";
import { CaptionedVideoTimeline, CaptionedVideoBackground } from "./types";
import { useMemo } from "react";

const isGifUrl = (url: string): boolean => {
  const lowercaseUrl = url.toLowerCase();
  return lowercaseUrl.endsWith('.gif') || lowercaseUrl.includes('.gif?');
};

const MAX_WORDS_PER_LINE = 5;

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
  const sortedBgs = useMemo(() => [...background].sort((a, b) => a.fromMs - b.fromMs), [background]);
  const totalBgDurationFrames = useMemo(() => sortedBgs.reduce(
    (sum, bg) => sum + Math.round((bg.durationMs / 1000) * FPS), 
    0
  ), [sortedBgs])

  const backgroundSequence = useMemo(() => <>
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
    </>, [sortedBgs])

  return (
    <AbsoluteFill style={{ backgroundColor: "white" }}>
      {totalBgDurationFrames > 0 && (
        settings.audioBasedDuration ? (
          <Loop durationInFrames={totalBgDurationFrames}>
            {backgroundSequence}
          </Loop>
        ) : (
          backgroundSequence
        )
      )}

      {dialog.map((dialogMessage, dialogIndex) => {
        let dialogStartMs = 0;
        for (let i = 0; i < dialogIndex; i++) {
          dialogStartMs += dialog[i].message.reduce((sum, m) => sum + m.durationMs, 0);
        }

        const dialogDurationMs = dialogMessage.message.reduce((sum, m) => sum + m.durationMs, 0);
        const dialogStartFrame = Math.round((dialogStartMs / 1000) * FPS);
        const dialogDurationFrames = Math.max(1, Math.round((dialogDurationMs / 1000) * FPS));

        let messageOffsetMs = dialogStartMs;

        return (
          <>
            {dialogMessage.imageUrl && (
              <Sequence
                key={`slide-image-${dialogIndex}`}
                from={dialogStartFrame}
                durationInFrames={dialogDurationFrames}
              >
                <div style={{
                  position: 'absolute',
                  top: 100,
                  left: 150,
                  width: 780,
                  height: 600,
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                }}>
                  {isGifUrl(dialogMessage.imageUrl) ? (
                    <Gif
                      src={dialogMessage.imageUrl}
                      width={780}
                      height={600}
                      fit="contain"
                      style={{
                        borderRadius: 16,
                      }}
                    />
                  ) : (
                    <Img
                      src={dialogMessage.imageUrl}
                      style={{
                        maxWidth: 780,
                        maxHeight: 600,
                        objectFit: 'contain',
                        borderRadius: 16,
                        boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
                      }}
                    />
                  )}
                </div>
              </Sequence>
            )}

            {dialogMessage.message.map((segment, segmentIndex) => {
              const segmentStartMs = messageOffsetMs;
              messageOffsetMs += segment.durationMs;

              const segmentStartFrame = Math.round((segmentStartMs / 1000) * FPS);
              const segmentDurationFrames = Math.max(1, Math.round((segment.durationMs / 1000) * FPS));

              const wordChunks: typeof segment.words[] = [];
              for (let i = 0; i < segment.words.length; i += MAX_WORDS_PER_LINE) {
                wordChunks.push(segment.words.slice(i, i + MAX_WORDS_PER_LINE));
              }

              return (
                <>
                  {segment.audioUrl && (
                    <Sequence
                      key={`audio-${dialogIndex}-${segmentIndex}`}
                      from={segmentStartFrame}
                      durationInFrames={segmentDurationFrames}
                    >
                      <Audio src={segment.audioUrl} />
                    </Sequence>
                  )}
                  {wordChunks.map((chunk, chunkIndex) => {
                    const chunkStartMs = segmentStartMs + chunk[0].startMs;
                    const chunkEndMs = segmentStartMs + chunk[chunk.length - 1].endMs;
                    const chunkDurationMs = chunkEndMs - chunkStartMs;

                    const startFrame = Math.round((chunkStartMs / 1000) * FPS);
                    const duration = Math.max(1, Math.round((chunkDurationMs / 1000) * FPS));

                    const adjustedWords = chunk.map(w => ({
                      ...w,
                      startMs: w.startMs - chunk[0].startMs,
                      endMs: w.endMs - chunk[0].startMs,
                    }));

                    return (
                      <Sequence
                        key={`dialog-${dialogIndex}-${segmentIndex}-${chunkIndex}`}
                        from={startFrame}
                        durationInFrames={duration}
                      >
                        <Subtitle
                          text={chunk.map(w => w.word).join(' ')}
                          wordTimestamps={adjustedWords}
                          primaryColor={settings.highlightOutlineColor}
                        />
                      </Sequence>
                    );
                  })}
                </>
              );
            })}
          </>
        );
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