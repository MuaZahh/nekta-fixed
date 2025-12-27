export type CharacterMode = 'none' | 'custom'

export interface CaptionedVideoSlideType {
  uid: string
  text: string
  characterMode: CharacterMode
  characterImageUrl?: string
  audioData?: {
    audioUrl: string
    durationMs: number
    timestamps: {
      words: string[]
      wordStartTimestampSeconds: number[]
      wordEndTimestampSeconds: number[]
    }
  }
  textHash?: string
}

export interface BackgroundVideo {
  uid: string
  name: string
  url: string
  thumbnailUrl: string
  durationMs: number
}

export interface CharacterImage {
  uid: string
  name: string
  imageUrl: string
}
