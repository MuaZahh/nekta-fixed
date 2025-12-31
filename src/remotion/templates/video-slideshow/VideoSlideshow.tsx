import { AbsoluteFill, Sequence, Img, CalculateMetadataFunction } from "remotion";
import { FPS } from "@/remotion/constants";
import { VideoSlideshowTimeline } from "./types";
import { getContainerStyleForVerticalAlign } from "@/remotion/utils";
import { SimpleOutlinedText } from "@/remotion/components/SimpleOutlinedText";
import { RoundedTextBox } from "@/remotion/components/RoundedTextBox";

const DEFAULT_OVERLAY_COLOR = "black"
const DEFAULT_OVERLAY_OPACITY = 0.6
const DEFAULT_SLIDE_DURATION_SECONDS = 2.0


export const VideoSlideshow: React.FC<VideoSlideshowTimeline> = ({ slides, slideDurationSeconds, backgroundMusicUrl, backgroundOverlayColor, backgroundOverlayOpacity, captionsType: ct }) => {
  const slideDurationFrames = (slideDurationSeconds || DEFAULT_SLIDE_DURATION_SECONDS) * FPS
  const captionsType = ct || 'outlined'

  return (
    <AbsoluteFill style={{ backgroundColor: "black" }}>
      {slides.map((s, index) => <Sequence from={index * slideDurationFrames} durationInFrames={slideDurationFrames}>
        <AbsoluteFill>
          <Img src={s.backgroundImageUrl} style={{ width: "100%", height: "100%", objectFit: "cover" }}  />

          <AbsoluteFill style={{
            backgroundColor: backgroundOverlayColor || DEFAULT_OVERLAY_COLOR,
            opacity: backgroundOverlayOpacity || DEFAULT_OVERLAY_OPACITY
          }}>

          </AbsoluteFill>

          <AbsoluteFill style={{...getContainerStyleForVerticalAlign(s.verticalAlign || 'center'), gap: 45, paddingLeft: 50, paddingRight: 50}}>
            {captionsType === 'outlined' && <>
              {s.title && <SimpleOutlinedText text={s.title} fontSize={80} isBold />}
              <SimpleOutlinedText text={s.content} />
            </>}

            {captionsType === 'roundedTextbox' && <>
              {s.title && <RoundedTextBox text={s.title}
                textAlign="center"
                borderRadius={30}
                maxLines={Math.max(1, Math.ceil(s.title.split(/\s+/).filter(Boolean).length / 5))}
                horizontalPadding={40}
                verticalAlign={s.verticalAlign || 'center'} />
              }
            </>}
          </AbsoluteFill>
        </AbsoluteFill>
      </Sequence>)}
    </AbsoluteFill>
  );
};

export const calculateVideoSlideshowMetadata: CalculateMetadataFunction<VideoSlideshowTimeline> = async ({
  props,
}) => {
  const totalDurationSeconds = props.slides.length * (props.slideDurationSeconds || DEFAULT_SLIDE_DURATION_SECONDS)

  return {
    fps: FPS,
    durationInFrames: Math.max(1, Math.round(totalDurationSeconds * FPS)),
    height: 1920,
    width: 1080,
  };
};
