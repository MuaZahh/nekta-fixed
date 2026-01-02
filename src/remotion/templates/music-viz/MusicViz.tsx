import {  useCurrentFrame } from "remotion";
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


const coverUrl = 'https://cdn.nekta-studio.com/temp/cover_1.png'
const audioUrl = 'https://cdn.nekta-studio.com/temp/song_2.mp3'
const songTitle = 'Christmas Knocking to the Door'
const author = 'LesFM Prod'

const data:MusicVizTimeline = {
  layout: 'big-cover',
  audio: {
    audioUrl: audioUrl
  },
  songTitle,
  author,
  coverUrl,
  waveform: {
    type: 'thick-bars-one-side',
    color: '#fc2c03'
  },
} 

export const MusicViz: React.FC = ({ }) => {
  const {layout, audio, songTitle, author, waveform} = data
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

  return (
    <>
      {layout === 'big-cover' && <BigCover 
        songTitle={songTitle} 
        author={author} 
        coverUrl={coverUrl!} 
        frequencyData={frequencyData}
        waveform={waveform}
      />}

      {layout === 'rotating-disk' && <RotatingDisk songTitle={songTitle} author={author} />}
      {layout === 'rotating-vinyl' && <RotatingVinyl coverUrl={coverUrl} songTitle={songTitle} author={author} />}

      <Audio src={audioUrl} />
    </>
  );
};

