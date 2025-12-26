import "../App.css";

import { Composition } from "remotion";
import { AIVideo, aiVideoSchema, calculateAIVideoMetadata } from "./templates/ai-video-basic/AIVideo";
import { FPS } from "./constants";
import { calculateCaptionedVideoMetadata, CaptionedVideo } from "./templates/captioned-video/CaptionedVideo";
import { captionedVideoTimelineSchema } from "./templates/captioned-video/types";

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
    </>
  );
}

export default RemotionRoot;
