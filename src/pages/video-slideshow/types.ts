import { CaptionsType, VerticalAlignmentType } from "@/remotion/types"

export interface SlideshowSlideType {
  uid: string
  title: string
  content: string
  imageDesc: string
  imageUrl?: string
  imageDescHash?: string
  isImageUploaded?: boolean
  verticalAlign: VerticalAlignmentType
}

export interface SlideshowSettings {
  slideDurationSeconds: number
  backgroundOverlayColor: string
  backgroundOverlayOpacity: number
  captionsType: CaptionsType
  imageModel: string
  artStyle: string
  artStyleDesc: string
}

export type WizardStep = 'enter-description' | 'generating'
