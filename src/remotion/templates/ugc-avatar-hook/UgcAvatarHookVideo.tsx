import { AbsoluteFill, Sequence, CalculateMetadataFunction } from "remotion";
import { Audio, Video } from "@remotion/media";
import { RoundedTextBox } from "@/remotion/components/RoundedTextBox";
import OutlinedCaptions from "@/remotion/components/OutlinedCaptions";
import { UgcAvatarHookTimeline, UgcClip, ugcAvatarHookTimelineSchema } from "./types";
import { FPS } from "@/remotion/constants";
import { useMemo } from "react";

const SECONDS_PER_WORD = 0.3;
const MAX_WORDS_PER_LINE = 5;
const DEFAULT_HIGHLIGHT_COLOR = "yellow";

const calculateClipDuration = (clip: UgcClip): number => {
  if (clip.durationMs) {
    return clip.durationMs;
  }
  if (clip.message) {
    return clip.message.durationMs;
  }
  if (clip.text) {
    const wordCount = clip.text.split(/\s+/).filter(Boolean).length;
    return wordCount * SECONDS_PER_WORD * 1000;
  }
  return 3000;
};

interface ClipProps {
  clip: UgcClip;
  startFrame: number;
  durationFrames: number;
}

const Clip: React.FC<ClipProps> = ({ clip, startFrame, durationFrames }) => {
  const hasMessage = !!clip.message;
  const hasText = !!clip.text;
  const text = hasMessage
    ? clip.message!.words.map((w) => w.word).join(" ")
    : clip.text || "";

  const highlightColor = clip.highlightColor || DEFAULT_HIGHLIGHT_COLOR;
  const offsetStartFrames = clip.offsetStartMs ? Math.round((clip.offsetStartMs / 1000) * FPS) : 0;

  const wordChunks = useMemo(() => {
    if (!hasMessage || !clip.message) return [];

    const chunks: typeof clip.message.words[] = [];
    for (let i = 0; i < clip.message.words.length; i += MAX_WORDS_PER_LINE) {
      chunks.push(clip.message.words.slice(i, i + MAX_WORDS_PER_LINE));
    }
    return chunks;
  }, [hasMessage, clip.message]);

  return (
    <>
      <Sequence from={startFrame} durationInFrames={durationFrames}>
        <Video
          src={clip.backgroundVideoUrl}
          trimBefore={offsetStartFrames}
          style={{ width: "100%", height: "100%", objectFit: "cover" }}
        />
      </Sequence>

      {hasMessage && clip.message?.audioUrl && (
        <Sequence from={startFrame} durationInFrames={durationFrames}>
          <Audio src={clip.message.audioUrl} />
        </Sequence>
      )}

      {clip.captionsType === "roundedTextbox" && (
        <Sequence from={startFrame} durationInFrames={durationFrames}>
          <RoundedTextBox
            text={text}
            textAlign="center"
            borderRadius={30}
            maxLines={Math.max(1, Math.ceil(text.split(/\s+/).filter(Boolean).length / 6))}
            horizontalPadding={40}
            verticalAlign={clip.captionsAlign}
          />
        </Sequence>
      )}

      {clip.captionsType === "outlined" && hasMessage && clip.message && (
        <>
          {wordChunks.map((chunk, chunkIndex) => {
            const chunkStartMs = chunk[0].startMs;
            const chunkEndMs = chunk[chunk.length - 1].endMs;
            const chunkDurationMs = chunkEndMs - chunkStartMs;

            const chunkStartFrame = startFrame + Math.round((chunkStartMs / 1000) * FPS);
            const chunkDuration = Math.max(1, Math.round((chunkDurationMs / 1000) * FPS));

            const adjustedWords = chunk.map((w) => ({
              ...w,
              startMs: w.startMs - chunkStartMs,
              endMs: w.endMs - chunkStartMs,
            }));

            return (
              <Sequence
                key={`chunk-${chunkIndex}`}
                from={chunkStartFrame}
                durationInFrames={chunkDuration}
              >
                <OutlinedCaptions
                  text={chunk.map((w) => w.word).join(" ")}
                  wordTimestamps={adjustedWords}
                  primaryColor={highlightColor}
                  verticalAlign={clip.captionsAlign}
                />
              </Sequence>
            );
          })}
        </>
      )}

      {clip.captionsType === "outlined" && hasText && !hasMessage && (
        <Sequence from={startFrame} durationInFrames={durationFrames}>
          <OutlinedCaptions
            text={text}
            primaryColor={highlightColor}
            verticalAlign={clip.captionsAlign}
          />
        </Sequence>
      )}
    </>
  );
};

export const UgcAvatarHookVideo: React.FC<UgcAvatarHookTimeline> = ({ hook, content }) => {
  const clips = useMemo(() => {
    const allClips: UgcClip[] = [hook, ...content];
    let currentFrame = 0;

    return allClips.map((clip) => {
      const durationMs = calculateClipDuration(clip);
      const durationFrames = Math.max(1, Math.round((durationMs / 1000) * FPS));
      const startFrame = currentFrame;
      currentFrame += durationFrames;

      return {
        clip,
        startFrame,
        durationFrames,
      };
    });
  }, [hook, content]);

  return (
    <AbsoluteFill style={{ backgroundColor: "white" }}>
      {clips.map((clipData, index) => (
        <Clip
          key={`clip-${index}`}
          clip={clipData.clip}
          startFrame={clipData.startFrame}
          durationFrames={clipData.durationFrames}
        />
      ))}
    </AbsoluteFill>
  );
};

export const calculateUgcAvatarHookMetadata: CalculateMetadataFunction<UgcAvatarHookTimeline> = async ({
  props,
}) => {
  const allClips: UgcClip[] = [props.hook, ...props.content];
  const totalDurationMs = allClips.reduce((sum, clip) => sum + calculateClipDuration(clip), 0);

  return {
    fps: FPS,
    durationInFrames: Math.max(1, Math.round((totalDurationMs / 1000) * FPS)),
    height: 1920,
    width: 1080,
  };
};

export { ugcAvatarHookTimelineSchema };
