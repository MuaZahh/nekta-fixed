import { AIProviderType } from "@/lib/types"


export type VoiceDescriptor = {
  id: string
  name: string
  previewFile: string
}

export type AspectRatio =
  | '1:1'
  | '16:9'
  | '9:16'
  | '21:9'
  | '9:21'
  | '3:2'
  | '2:3'
  | '4:5'
  | '5:4'
  | '3:4'
  | '4:3'
  | '1:3'
  | '3:1'
  | '16:10'
  | '10:16'
  | '1:2'
  | '2:1'



export type ImageFormat = 'jpg' | 'png' | 'webp'

export type ImagGenModelMeta = {
  id: string
  name: string
  price: number
  aspectRatios: AspectRatio[]
  format?: ImageFormat
  args?: any
  responseTransformer?: (output: any) => any[]
}

export type ImagGenProviderMeta = {
  provider: AIProviderType
  models: ImagGenModelMeta[]
}

export type StyleDescriptor = {
  uid: string
  name: string
  description: string
}