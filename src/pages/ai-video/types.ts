export type AiVideoSlideType = {
  uid: string
  text: string
  imageDesc: string
  imageUrl?: string
}

export type WizardStep = 'create-titles' | 'select-title'