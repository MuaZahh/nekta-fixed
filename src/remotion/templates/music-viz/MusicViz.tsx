import { AbsoluteFill, Sequence, Img, CalculateMetadataFunction, useCurrentFrame, interpolate } from "remotion";
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
import { loadFont as loadRaleway } from "@remotion/google-fonts/Raleway";

const {fontFamily: ralewayFaily} = loadRaleway()


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
const songTitle = 'Christmas Knocking to the Door'
const author = 'LesFM Prod'

const TITLE_FADE_DURATION = FPS;
const TITLE_TRANSLATE_Y_START = 50;
const AUTHOR_FADE_START = FPS / 2;
const AUTHOR_FADE_DURATION = FPS;
const AUTHOR_TRANSLATE_Y_START = 50;

export const MusicViz: React.FC = ({ }) => {
  const frame = useCurrentFrame();
  const nSamples = 512;
  const audioData = useAudioData(audioUrl);


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
    <AbsoluteFill style={{ backgroundColor: "black", display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: 100}}>
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

      <div style={{
        flexGrow: 1
      }} />

      <div style={{paddingBottom: 130}}>
        {/* 
        <WaveVisualization
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
        /> */}

        {/* <WaveVisualization
          frequencyData={frequencyData}
          width={800}
          height={300}
          lineColor="#EE8482"
          lines={6}
          lineGap={6}
          sections={10}
          offsetPixelSpeed={-100}
        /> */}

        {/* <HillsVisualization
          frequencyData={frequencyData}
          width={800}
          height={300}
          strokeWidth={2}
          strokeColor="rgb(100, 120, 250, 0.2)"
          fillColor="rgb(70, 90, 200, 0.2)"
          copies={5}
        /> */}

        {/* <HillsVisualization
          frequencyData={frequencyData}
          width={800}
          height={300}
          fillColor="#92E1B0"
        /> */}

        {/* <HillsVisualization
          frequencyData={frequencyData}
          width={800}
          height={200}
          fillColor={["#559B59", "#466CF6", "#E54B41"]}
          copies={3}
          blendMode="screen"
        /> */}
{/* 
        <BarsVisualization
          frequencyData={frequencyData}
          width={800}
          height={200}
          lineThickness={5}
          gapSize={7}
          roundness={2}
          color="#F3B3DC"
        /> */}

        <BarsVisualization
          frequencyData={frequencyData}
          width={800}
          height={200}
          lineThickness={5}
          gapSize={8}
          roundness={4}
          color="#EB6A65"
          placement="under"
        />

      </div>
   

      
      {/* 

      

      

      

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

      {/* 

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
        lineThickness={16}
        gapSize={0}
        roundness={0}
        color="#A9B6C9"
      /> */}

      {/* <div style={{paddingBottom: 60}}>
        <RadialBarsVisualization
          frequencyData={frequencyData}
          diameter={400}
          innerRadius={100}
          color="red"
        />
     </div> */}

      <Audio src={audioUrl} />
      
    </AbsoluteFill>
  );
};

