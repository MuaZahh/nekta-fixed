export type AIProviderType = 'openai' | 'elevenlabs' | 'replicate' | 'gemini'

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


export interface TTSProvider {
  provider: AIProviderType
  enabled: boolean
  generate(voiceId: string, text: string): Promise<TTSResult>
}