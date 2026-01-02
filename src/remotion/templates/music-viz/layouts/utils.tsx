import { WaveformType } from "../types"
import { BarsVisualization } from "../waveforms/BarsVisualization"
import { HillsVisualization } from "../waveforms/HillsVisualization"
import { RadialBarsVisualization } from "../waveforms/RadialBarsVisualization"
import { WaveVisualization } from "../waveforms/WaveVisualization"

export const renderWaveform = (wType: WaveformType, frequencyData: number[], color: string) => {
  if (wType === 'thick-bars-one-side') {
    return <BarsVisualization
      frequencyData={frequencyData}
      width={800}
      height={220}
      lineThickness={10}
      gapSize={14}
      roundness={4}
      color={color}
      placement="under"
      logScale
      sensitivity={0.5}
    />
  }

  if (wType === 'thin-bars-double-side') {
    return <BarsVisualization
      frequencyData={frequencyData}
      width={800}
      height={200}
      lineThickness={5}
      gapSize={7}
      roundness={2}
      color={color}
    />
  }

  if (wType === 'area-three-colors') {
    return <HillsVisualization
      frequencyData={frequencyData}
      width={800}
      height={300}
      fillColor={["#559B59", "#466CF6", "#E54B41"]}
      copies={3}
      blendMode="screen"
    />   
  }

  if (wType === 'area-one-color') {
    return <HillsVisualization
      frequencyData={frequencyData}
      width={800}
      height={300}
      fillColor={color}
    />
  }

  if (wType === 'area-multi') {
    return <HillsVisualization
      frequencyData={frequencyData}
      width={800}
      height={300}
      strokeWidth={2}
      strokeColor="rgb(100, 120, 250, 0.2)"
      fillColor="rgb(70, 90, 200, 0.2)"
      copies={5}
    />
  }

  if (wType === 'waves-multi') {
    return <WaveVisualization
      frequencyData={frequencyData}
      width={800}
      height={300}
      lineColor={color}
      lines={6}
      lineGap={6}
      sections={10}
      offsetPixelSpeed={-100}
    />
  }

  if (wType === 'waves-lines') {
    return <WaveVisualization
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
  }

  if (wType === 'waves-edge-lines') {
    return <HillsVisualization
      frequencyData={frequencyData}
      width={800}
      height={200}
      strokeColor={color}
    /> 
  }

  if (wType === 'thin-bars-one-side') {
    return <BarsVisualization
      frequencyData={frequencyData}
      width={800}
      height={200}
      lineThickness={6}
      gapSize={7}
      roundness={2}
      color={color}
      placement="under"
    />
  }

  if (wType === 'circle-lines') {
    return <RadialBarsVisualization
      frequencyData={frequencyData}
      diameter={400}
      innerRadius={100}
      color={color}
    />
  }
}
