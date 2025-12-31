import "../App.css";

import { Composition } from "remotion";
import { AIVideo, aiVideoSchema, calculateAIVideoMetadata } from "./templates/ai-video-basic/AIVideo";
import { FPS } from "./constants";
import { calculateCaptionedVideoMetadata, CaptionedVideo } from "./templates/captioned-video/CaptionedVideo";
import { captionedVideoTimelineSchema } from "./templates/captioned-video/types";
import { UgcAvatarHookVideo, calculateUgcAvatarHookMetadata, ugcAvatarHookTimelineSchema } from "./templates/ugc-avatar-hook/UgcAvatarHookVideo";
import { calculateVideoSlideshowMetadata, VideoSlideshow } from "./templates/video-slideshow/VideoSlideshow";
import { videoSlideshowTimelineSchema } from "./templates/video-slideshow/types";

function RemotionRoot() {
  return (
    <>
      <Composition
        id="AIVideo"
        component={AIVideo}
        schema={aiVideoSchema}
        durationInFrames={300}
        fps={FPS}
        width={1080}
        height={1920}
        defaultProps={{
          timeline: null,
        }}
        calculateMetadata={calculateAIVideoMetadata}
      />
      <Composition
        id="CaptionedVideo"
        component={CaptionedVideo}
        schema={captionedVideoTimelineSchema}
        durationInFrames={300}
        fps={FPS}
        width={1080}
        height={1920}
        defaultProps={{
          background: [
            {
              type: 'video',
              durationMs: 30000,
              fromMs: 0,
              url: 'https://cdn.nekta-studio.com/videos/minecraft_1.mp4'
            },
          ],
          dialog: [
            {
              speaker: 'system',
              message: [
                {
                  durationMs: 2100,
                  words: [
                    {
                      word: 'hey',
                      startMs: 0,
                      endMs: 1000
                    },
                     {
                      word: 'you',
                      startMs: 1100,
                      endMs: 2100
                    }
                  ]
                }
              ]
            }
          ],
          settings: {
            highlightOutlineColor: 'yellow',
            audioBasedDuration: false
          }
        }}
        calculateMetadata={calculateCaptionedVideoMetadata}
      />
      <Composition
        id="UgcAvatarHookVideo"
        component={UgcAvatarHookVideo}
        schema={ugcAvatarHookTimelineSchema}
        durationInFrames={300}
        fps={FPS}
        width={1080}
        height={1920}
        defaultProps={{
          hook: {
            backgroundVideoUrl: 'https://cdn.nekta-studio.com/videos/ugc/tmpc68t2xmj.output.mp4',
            durationMs: 5000,
            captionsAlign: 'top',
            captionsType: 'roundedTextbox',
            text: 'Just look at my boyfriend, rawdogging his essay like it is 2023. No ChatGPT, no NektaAI, no Claude.'
          },
          content: [
            {
              backgroundVideoUrl: 'https://cdn.nekta-studio.com/temp/product_mobile_1.MOV',
              durationMs: 3000,
              captionsAlign: 'bottom',
              captionsType: 'roundedTextbox',
              text: 'What a legend'
            }
          ]
        }}
        calculateMetadata={calculateUgcAvatarHookMetadata}
      />
      
      <Composition
        id="VideoSlideshow"
        component={VideoSlideshow}
        schema={videoSlideshowTimelineSchema}
        durationInFrames={300}
        fps={FPS}
        width={1080}
        height={1920}
        defaultProps={{
          captionsType: 'roundedTextbox',
          slides: [
            {
              title: 'Top 10 best cities in UK to live in 2026',
              content: '',
              backgroundImageUrl: 'https://images.pexels.com/photos/34188665/pexels-photo-34188665.jpeg',
            },
            {
              title: '1. London',
              content: 'London is by far the most vibrant and alive city in the world. It is worth living here at least for at any stage of your life.',
              backgroundImageUrl: 'https://images.pexels.com/photos/1427578/pexels-photo-1427578.jpeg',
              verticalAlign: 'top',
            }
          ]
        }}
        calculateMetadata={calculateVideoSlideshowMetadata}
      />
    </>
  );
}

export default RemotionRoot;
