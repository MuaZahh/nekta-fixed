import { AbsoluteFill, Sequence, Img, CalculateMetadataFunction, useCurrentFrame } from "remotion";
import { FPS } from "@/remotion/constants";
import { getContainerStyleForVerticalAlign } from "@/remotion/utils";
import { SimpleOutlinedText } from "@/remotion/components/SimpleOutlinedText";
import { RoundedTextBox } from "@/remotion/components/RoundedTextBox";
import ImageGlow from 'react-image-glow';
import { MediaUtilsAudioData, useAudioData, useWindowedAudioData, visualizeAudio } from "@remotion/media-utils";
import { WaveVisualization } from "./waveforms/WaveVisualization";
import { Audio } from "@remotion/media";
import { HillsVisualization } from "./waveforms/HillsVisualization";
import { BarsVisualization } from "./waveforms/BarsVisualization";
import { RadialBarsVisualization } from "./waveforms/RadialBarsVisualization";
import { RotatingVinyl } from "./layouts/RotatingVinyl";
import { RotatingDisk } from "./layouts/RotatingDisk";


const combineValues = (length: number, sources: Array<number[]>): number[] => {
  return Array.from({ length }).map((_, i) => {
    return sources.reduce((acc, source) => {
      // pick the loudest value for each frequency bin
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
const audioName = 'Christmas Knocking to the Door'
const author = 'LesFM Prod'

export const MusicViz: React.FC = ({ }) => {
  const frame = useCurrentFrame();
  const nSamples = 512;
  const audioData = useAudioData(audioUrl);


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

  // return <RotatingDisk songTitle={audioName} author={author} />

  // return <RotatingVinyl coverUrl={coverUrl} songTitle={audioName} author={author} />

  return (
    <AbsoluteFill style={{ backgroundColor: "black", display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: 100, paddingBottom: 100 }}>
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
        flexGrow: 1
      }} />

      {/* <WaveVisualization
        frequencyData={frequencyData}
        width={800}
        height={300}
        offsetPixelSpeed={200}
        lineColor={["red", "orange"]}
        lineGap={(2 * 280) / 8}
        topRoundness={0.2}
        bottomRoundness={0.4}
        sections={8}
        lineThickness={4}
      />

      <WaveVisualization
        frequencyData={frequencyData}
        width={800}
        height={300}
        lineColor="#EE8482"
        lines={6}
        lineGap={6}
        sections={10}
        offsetPixelSpeed={-100}
      />

      <HillsVisualization
        frequencyData={frequencyData}
        width={800}
        height={300}
        strokeWidth={2}
        strokeColor="rgb(100, 120, 250, 0.2)"
        fillColor="rgb(70, 90, 200, 0.2)"
        copies={5}
      />

      <HillsVisualization
        frequencyData={frequencyData}
        width={800}
        height={300}
        fillColor="#92E1B0"
      />

      <HillsVisualization
        frequencyData={frequencyData}
        width={800}
        height={200}
        fillColor={["#559B59", "#466CF6", "#E54B41"]}
        copies={3}
        blendMode="screen"
      />

      <HillsVisualization
        frequencyData={frequencyData}
        width={800}
        height={100}
        strokeColor="#E9AB6C"
      /> */}

      {/* <BarsVisualization
        frequencyData={frequencyData}
        width={800}
        height={200}
        lineThickness={5}
        gapSize={7}
        roundness={2}
        color="#F3B3DC"
      />

      <BarsVisualization
        frequencyData={frequencyData}
        width={800}
        height={200}
        lineThickness={2}
        gapSize={4}
        roundness={2}
        color="#A687DF"
      />

      <BarsVisualization
        frequencyData={frequencyData}
        width={800}
        height={200}
        lineThickness={6}
        gapSize={7}
        roundness={2}
        color="#8DD2DE"
        placement="under"
      />

      <BarsVisualization
        frequencyData={frequencyData}
        width={800}
        height={200}
        lineThickness={3}
        gapSize={4}
        roundness={2}
        color="#EB6A65"
        placement="under"
      />

      <BarsVisualization
        frequencyData={frequencyData}
        width={800}
        height={200}
        lineThickness={16}
        gapSize={0}
        roundness={0}
        color="#A9B6C9"
      /> */}

      <RadialBarsVisualization
        frequencyData={frequencyData}
        diameter={600}
        innerRadius={150}
        color="red"
      />

      <Audio src={audioUrl} />
      
    </AbsoluteFill>
  );
};

