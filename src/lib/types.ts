import { AspectRatio, ImagGenModelMeta } from "@/type/content"
import { z } from "zod"
export type AIProviderType = 'openai' | 'elevenlabs' | 'replicate' | 'gemini' | 'togetherai'

export const aiProviderToLabel = (provider: AIProviderType) => {
  switch (provider) {
    case 'replicate':
      return 'Replicate'
    case 'elevenlabs':
      return 'ElevenLabs'
    case 'gemini':
      return 'Gemini'
    case 'openai':
      return 'OpenAI'
  }
}

export type TimestampedTranscription = {
    words: string[];
    wordStartTimestampSeconds: number[];
    wordEndTimestampSeconds: number[];
}

export type TTSResult = {
  base64Data: string
  timestamps: TimestampedTranscription
}

export type ImageGenResult = {
  base64Data: string
}

interface BaseProvider {
  provider: AIProviderType
  enabled: boolean
}

export interface TTSProvider extends BaseProvider {
  generate(voiceId: string, text: string): Promise<TTSResult>
}

export interface ImageGenProvider extends BaseProvider {
  generate(model: ImagGenModelMeta, aspectRatio: AspectRatio, prompt: string): Promise<ImageGenResult>
}

export interface StructuredTextGenProvider extends BaseProvider {
  generate<T>(prompt: string, schema: z.ZodType<T>): Promise<T>
}