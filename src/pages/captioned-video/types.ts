export type CharacterMode = 'none' | 'custom'

export interface CaptionedVideoSlideType {
  uid: string
  text: string
  voice: string
  characterMode: CharacterMode
  characterImageUrl?: string
  imageUrl?: string
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

export interface BackgroundMedia {
  uid: string
  name: string
  url: string
  thumbnailUrl: string
  type: 'video' | 'image'
  durationMs: number
}


export type BackgroundVideo = BackgroundMedia

export interface CharacterImage {
  uid: string
  name: string
  imageUrl: string
}
