import { AbsoluteFill, Sequence, CalculateMetadataFunction, Loop, Img } from "remotion";
import { Video } from "@remotion/media";
import { RoundedTextBox } from "@/remotion/components/RoundedTextBox";

export const UgcAvatarHookVideo: React.FC = ({}) => {

  return <AbsoluteFill style={{ backgroundColor: "white" }}>
    <AbsoluteFill>
      <Video
      src={'https://cdn.nekta-studio.com/videos/ugc/tmpc68t2xmj.output.mp4'} 
      style={{ width: "100%", height: "100%", objectFit: "cover" }} 
    />
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