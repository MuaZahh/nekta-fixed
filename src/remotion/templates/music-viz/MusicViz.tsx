import {  CalculateMetadataFunction, Sequence, useCurrentFrame } from "remotion";
import { FPS } from "@/remotion/constants";
import { MediaUtilsAudioData, useAudioData, visualizeAudio } from "@remotion/media-utils";
import { Audio } from "@remotion/media";
import { RotatingVinyl } from "./layouts/RotatingVinyl";
import { RotatingDisk } from "./layouts/RotatingDisk";
import { MusicVizTimeline } from "./types";
import { BigCover } from "./layouts/BigCover";

const combineValues = (length: number, sources: Array<number[]>): number[] => {
  return Array.from({ length }).map((_, i) => {
    return sources.reduce((acc, source) => {
      return Math.max(acc, source[i]);
    }, 0);
  });
};

const visualizeMultipleAudio = ({
  sources,
  ...options
}: {
  frame: number;
  fps: number;
  numberOfSamples: number;
  sources: Array<MediaUtilsAudioData>;
  smoothing?: boolean | undefined;
}) => {
  const sourceValues = sources.map((source) => {
    return visualizeAudio({ ...options, audioData: source });
  });
  return combineValues(options.numberOfSamples, sourceValues);
};


export const MusicViz: React.FC<MusicVizTimeline> = ({ layout, audio, songTitle, author, waveform, textColor }) => {
  const frame = useCurrentFrame();
  const nSamples = 1024;
  const audioData = useAudioData(audio.audioUrl);

  if (!audioData) {
    return null;
  }

  const visualizationValues = visualizeMultipleAudio({
    fps: FPS,
    frame,
    sources: [audioData!],
    numberOfSamples: nSamples
  });

  // optional: use only part of the values
  const frequencyData = visualizationValues.slice(0, 0.7 * nSamples);
  const startOffsetFrames = Math.round(audio.startOffsetSeconds * FPS);
  const durationFrames = Math.round(audio.durationSeconds * FPS);

  return (
    <>
      {layout.layout === 'big-cover' && <BigCover 
        songTitle={songTitle} 
        author={author} 
        coverUrl={layout.coverUrl} 
        frequencyData={frequencyData}
        waveform={waveform}
        backgroundColor={layout.backgroundColor}
        textColor={textColor}
      />}

      {layout.layout === 'rotating-disk' && <RotatingDisk songTitle={songTitle} author={author} textColor={textColor} />}
      {layout.layout === 'rotating-vinyl' && <RotatingVinyl coverUrl={layout.coverUrl} songTitle={songTitle} author={author} textColor={textColor} />}
        
      <Audio 
        src={audio.audioUrl} 
        trimBefore={startOffsetFrames}
        trimAfter={startOffsetFrames + durationFrames}
      />
    </>
  );
};


export const calculateMusicVizMetadata: CalculateMetadataFunction<MusicVizTimeline> = async ({ props }) => {
  return {
    fps: FPS,
    durationInFrames: Math.round(props.audio.durationSeconds * FPS),
    height: 1920,
    width: 1080,
  };
};