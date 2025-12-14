import { useSettingsStore } from "@/state/settings"
import { TTSProvider, TTSResult, TimestampedTranscription } from "../types"
import { blobToBase64 } from "../utils"

export class OpenAITTSProvider implements TTSProvider {
  provider = 'openai' as const
  
  get enabled(): boolean {
    const settings = useSettingsStore.getState()
    return settings.getConnectedProviders().includes('openai')
  }
  
  async generate(voiceId: string, text: string): Promise<TTSResult> {
    const settings = useSettingsStore.getState()
    const apiKey = settings.apiKeys['openai']
    
    if (!apiKey) {
      throw new Error('OpenAI API key not configured')
    }

    const speechResponse = await fetch('https://api.openai.com/v1/audio/speech', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini-tts',
        input: text,
        voice: voiceId
      })
    })

    if (!speechResponse.ok) {
      throw new Error(`Speech generation failed: ${speechResponse.statusText}`)
    }

    const audioBlob = await speechResponse.blob()
    const base64Data = await blobToBase64(audioBlob)
    const formData = new FormData()
    formData.append('file', audioBlob, 'speech.mp3')
    formData.append('model', 'whisper-1')
    formData.append('response_format', 'verbose_json')
    formData.append('timestamp_granularities[]', 'word')

    const transcriptionResponse = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`
      },
      body: formData
    })

    if (!transcriptionResponse.ok) {
      throw new Error(`Transcription failed: ${transcriptionResponse.statusText}`)
    }

    const transcription = await transcriptionResponse.json()
    const timestamps: TimestampedTranscription = {
      words: [],
      wordStartTimestampSeconds: [],
      wordEndTimestampSeconds: []
    }

    if (transcription.words) {
      for (const word of transcription.words) {
        timestamps.words.push(word.word)
        timestamps.wordStartTimestampSeconds.push(word.start)
        timestamps.wordEndTimestampSeconds.push(word.end)
      }
    }

    return {
      base64Data,
      timestamps
    }
  }
}