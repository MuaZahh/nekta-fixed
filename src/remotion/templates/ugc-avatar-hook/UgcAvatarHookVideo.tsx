import { AbsoluteFill, Sequence, CalculateMetadataFunction, Loop, Img } from "remotion";
import { Video } from "@remotion/media";
import { RoundedTextBox } from "@/remotion/components/RoundedTextBox";
import { UgcAvatarHookTimeline } from "./types";
import { FPS } from "@/remotion/constants";


const data:UgcAvatarHookTimeline = {
  hook: {
    backgroundVideoUrl: 'https://cdn.nekta-studio.com/videos/ugc/tmpc68t2xmj.output.mp4',
    durationMs: 10_000,
    captionsAlign: 'top',
    captionsType: 'roundedTextbox',
    text: 'Just look at my boyfriend, rawdogging his essay like it is 2023. No ChatGPT, no NektaAI, no Claude.'
  },
  content: [
    {
      backgroundVideoUrl: 'https://cdn.nekta-studio.com/temp/product_mobile_1.MOV',
      durationMs: 10_000,
      captionsAlign: 'bottom',
      captionsType: 'roundedTextbox',
      text: 'Fcking legend'
    }
  ]
}

export const UgcAvatarHookVideo: React.FC = ({}) => {
  return <AbsoluteFill style={{ backgroundColor: "white" }}>
    <AbsoluteFill>
      <Sequence durationInFrames={150}>
        <Video
          src={'https://cdn.nekta-studio.com/videos/ugc/tmpc68t2xmj.output.mp4'} 
          style={{ width: "100%", height: "100%", objectFit: "cover" }} 
        />
      </Sequence>

       <Sequence from={150} durationInFrames={300}>
        <Video
          src={'https://cdn.nekta-studio.com/temp/product_mobile_1.MOV'} 
          style={{ width: "100%", height: "100%", objectFit: "cover" }} 
        />
      </Sequence>
    </AbsoluteFill>

    <AbsoluteFill style={{
      display: 'flex',
      alignItems: 'center',
      paddingTop: 150,
    }}>
      <RoundedTextBox 
        text="Hello World! This is me telling you about this cool product" 
        textAlign='center'
        borderRadius={30}
        maxLines={3}
        horizontalPadding={40}
        verticalAlign='top'
      />
    </AbsoluteFill>
  </AbsoluteFill>
}