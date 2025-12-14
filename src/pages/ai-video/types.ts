import { TimestampedTranscription } from "@/lib/types"

export type SlideTTS = {
  audioUrl?: string
  timestamps: TimestampedTranscription
}


export type AiVideoSlideType = {
  uid: string
  text: string
  imageDesc: string
  imageUrl?: string
  imageDescHash?: string
  audioData?: SlideTTS
  textHash?: string
}

export type WizardStep = 'create-titles' | 'select-title'