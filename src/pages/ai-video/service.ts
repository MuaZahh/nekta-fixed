import { z } from 'zod'
import { AiVideoSlideType } from './types'
import {
  Timeline,
  BackgroundElement,
  TextElement,
  ElementAnimation,
  WordTimestamp,
} from '@/remotion/templates/ai-video-basic/types'

export const TitleList = z.object({
  titles: z.array(z.string()),
})

export const StoryScript = z.object({
  text: z.string(),
})

export const StoryWithImages = z.object({
  result: z.array(
    z.object({
      text: z.string(),
      imageDescription: z.string(),
    })
  ),
})


export const getGenerateTitlesPrompt = (topic: string) => {
  const prompt = `You are a helpful assistant that generates titles for short stories.
  Generate 15 titles for a short story on topic ${topic}. Return result as json list of strings`
  return prompt
}

export const getGenerateStoryPrompt = (title: string, topic: string) => {
  const prompt = `Write a short story with title [${title}] (its topic is [${topic}]).
   You must follow best practices for great storytelling. 
   The script must be 8-10 sentences long. 
   Story events can be from anywhere in the world, but text must be translated into English language. 
   Result result without any formatting and title, as one continuous text. 
   Skip new lines.`

  return prompt
}


export const getGenerateImageDescriptionPrompt = (storyText: string) => {
  const prompt = `You are given story text.
  Generate (in English) 5-8 very detailed image descriptions  for this story. 
  Return their description as json array with story sentences matched to images. 
  Story sentences must be in the same order as in the story and their content must be preserved.
  Each image must match 1-2 sentence from the story.
  Images must show story content in a way that is visually appealing and engaging, not just characters.

  **CHARACTER CONSISTENCY REQUIREMENT**:

When generating image descriptions for video scenes that include characters:

1. **CREATE DETAILED CHARACTER PROFILES FIRST**: Before writing scene descriptions, define each character with comprehensive visual attributes:
   - Gender and approximate age
   - Ethnicity and skin tone
   - Hair (color, length, style, texture)
   - Face (eye color, facial features, expressions)
   - Body type and height
   - Clothing (specific garments, colors, patterns, accessories)
   - Any distinguishing features (scars, tattoos, glasses, etc.)

2. **REPEAT THE FULL CHARACTER DESCRIPTION IN EVERY SCENE**: Each image description will be sent to a DIFFERENT image generation system with NO memory of previous scenes. Therefore, you MUST copy-paste the COMPLETE character description into EVERY scene where that character appears. Do NOT use shortcuts like "same character as before" or "wearing the same outfit" — these references will fail because each image generator works in isolation.

3. **USE IDENTICAL WORDING**: To maximize visual consistency across scenes, use the EXACT SAME words and phrases to describe each character every time. Varying the description (even with synonyms) will produce inconsistent results.

  Give output in json format:

  [
    {
      "text": "....",
      "imageDescription": "..."
    }
  ]

  <story>
  ${storyText}
  </story>`

  return prompt
}

const MAX_WORDS_PER_SEGMENT = 4

const getBgAnimations = (durationMs: number, zoomIn: boolean): ElementAnimation[] => {
  const animations: ElementAnimation[] = []
  const startMs = 0
  const endMs = durationMs

  const scaleFrom = zoomIn ? 1.5 : 1
  const scaleTo = zoomIn ? 1 : 1.5

  animations.push({
    type: 'scale',
    from: scaleFrom,
    to: scaleTo,
    startMs,
    endMs,
  })

  return animations
}

const getTextAnimations = (): ElementAnimation[] => {
  const animations: ElementAnimation[] = []
  const durationMs = 300
  const startMs = 0
  const endMs = durationMs

  animations.push({
    type: 'scale',
    from: 0.8,
    to: 1,
    startMs,
    endMs,
  })

  return animations
}

export const createTimelineFromSlides = (
  slides: AiVideoSlideType[],
  title: string
): Timeline => {
  const timeline: Timeline = {
    elements: [],
    text: [],
    audio: [],
    shortTitle: title,
  }

  let durationMs = 0
  let zoomIn = true

  for (const slide of slides) {
    if (!slide.audioData?.timestamps || !slide.imageUrl || !slide.audioData.audioUrl) {
      continue
    }

    const { words, wordStartTimestampSeconds, wordEndTimestampSeconds } = slide.audioData.timestamps

    if (words.length === 0) continue

    const lenMs = Math.ceil(wordEndTimestampSeconds[wordEndTimestampSeconds.length - 1] * 1000)

    const bgElem: BackgroundElement = {
      startMs: durationMs,
      endMs: durationMs + lenMs,
      imageUrl: slide.imageUrl,
      enterTransition: 'blur',
      exitTransition: 'blur',
      animations: getBgAnimations(lenMs, zoomIn),
    }
    timeline.elements.push(bgElem)

    timeline.audio.push({
      startMs: durationMs,
      endMs: durationMs + lenMs,
      audioUrl: slide.audioData.audioUrl,
    })

    let currentWords: string[] = []
    let currentWordTimestamps: WordTimestamp[] = []
    let segmentStartMs = wordStartTimestampSeconds[0] * 1000 + durationMs
    let segmentEndMs = durationMs

    for (let i = 0; i < words.length; i++) {
      currentWords.push(words[i])

      // Store word timestamp relative to segment start
      const wordStartMs = wordStartTimestampSeconds[i] * 1000 + durationMs - segmentStartMs
      const wordEndMs = wordEndTimestampSeconds[i] * 1000 + durationMs - segmentStartMs
      currentWordTimestamps.push({
        word: words[i],
        startMs: wordStartMs,
        endMs: wordEndMs,
      })

      segmentEndMs = wordEndTimestampSeconds[i] * 1000 + durationMs

      if (currentWords.length >= MAX_WORDS_PER_SEGMENT || i === words.length - 1) {
        const textElem: TextElement = {
          startMs: segmentStartMs,
          endMs: segmentEndMs,
          text: currentWords.join(' '),
          position: 'center',
          animations: getTextAnimations(),
          wordTimestamps: currentWordTimestamps,
        }
        timeline.text.push(textElem)

        currentWords = []
        currentWordTimestamps = []
        if (i < words.length - 1) {
          segmentStartMs = wordStartTimestampSeconds[i + 1] * 1000 + durationMs
        }
      }
    }

    durationMs += lenMs
    zoomIn = !zoomIn
  }

  return timeline
}