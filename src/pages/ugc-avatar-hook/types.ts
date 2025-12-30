import { CaptionsType, VerticalAlignmentType } from "@/remotion/types"

export interface BackgroundMedia {
  uid: string
  name: string
  url: string
  thumbnailUrl: string
  type: 'video'
  durationMs: number
}

export interface AudioData {
  audioUrl: string
  durationMs: number
  timestamps: {
    words: string[]
    wordStartTimestampSeconds: number[]
    wordEndTimestampSeconds: number[]
  }
}

export interface HookClipState {
  backgroundVideo: BackgroundMedia | null
  text: string
  voice: string
  generateVoice: boolean
  captionsType: CaptionsType
  captionsAlign: VerticalAlignmentType
  highlightColor: string
  durationMs?: number
  offsetStartMs?: number
  audioData?: AudioData
  textHash?: string
}

export interface ContentClipState {
  uid: string
  backgroundVideo: BackgroundMedia | null
  text: string
  voice: string
  generateVoice: boolean
  captionsType: CaptionsType
  captionsAlign: VerticalAlignmentType
  highlightColor: string
  durationMs?: number
  offsetStartMs?: number
  audioData?: AudioData
  textHash?: string
}
