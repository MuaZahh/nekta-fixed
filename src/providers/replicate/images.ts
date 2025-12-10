import { ImagGenProviderMeta } from "@/type/content"


export const ReplicateDefaultOutputTransformer = (output: any) => Object.values(output)
export const ReplicateSingleImageOutputTransformer = (output: any) => output

export const ImageGenModelsData: ImagGenProviderMeta[] = [
  {
    provider: 'replicate',
    models: [
      {
        id: 'black-forest-labs/flux-schnell',
        name: 'FLUX Schnell',
        price: 0.3,
        aspectRatios: [
          '1:1',
          '16:9',
          '9:16',
          '21:9',
          '9:21',
          '3:2',
          '2:3',
          '3:4',
          '4:3',
          '5:4',
          '4:5',
        ],
      },
      {
        id: 'black-forest-labs/flux-dev',
        name: 'FLUX Dev',
        price: 2.5,
        aspectRatios: [
          '1:1',
          '16:9',
          '9:16',
          '21:9',
          '9:21',
          '3:2',
          '2:3',
          '3:4',
          '4:3',
          '5:4',
          '4:5',
        ],
      },
      {
        id: 'black-forest-labs/flux-pro',
        name: 'FLUX Pro',
        price: 5.5,
        aspectRatios: [
          '1:1',
          '16:9',
          '9:16',
          '3:2',
          '2:3',
          '3:4',
          '4:3',
          '5:4',
          '4:5',
        ],
        responseTransformer: ReplicateSingleImageOutputTransformer
      },
      {
        id: 'black-forest-labs/flux-1.1-pro',
        name: 'FLUX 1.1 Pro',
        price: 4,
        aspectRatios: [
          '1:1',
          '16:9',
          '9:16',
          '3:2',
          '2:3',
          '3:4',
          '4:3',
          '5:4',
          '4:5',
        ],
        responseTransformer: ReplicateSingleImageOutputTransformer
      },
      {
        id: 'google/imagen-4',
        name: 'Imagen 4',
        price: 4,
        aspectRatios: ['1:1', '16:9', '9:16', '3:4', '4:3'],
        format: 'jpg',
        responseTransformer: ReplicateSingleImageOutputTransformer
      },
      {
        id: 'google/imagen-4-fast',
        name: 'Imagen 4 Fast',
        price: 2,
        aspectRatios: ['1:1', '16:9', '9:16', '3:4', '4:3'],
        responseTransformer: ReplicateSingleImageOutputTransformer
      },
      {
        id: 'google/imagen-4-ultra',
        name: 'Imagen 4 Ultra',
        price: 6,
        aspectRatios: ['1:1', '16:9', '9:16', '3:4', '4:3'],
        responseTransformer: ReplicateSingleImageOutputTransformer
      },
      {
        id: 'google/imagen-3',
        name: 'Imagen 3',
        price: 5,
        aspectRatios: ['1:1', '16:9', '9:16', '3:4', '4:3'],
        responseTransformer: ReplicateSingleImageOutputTransformer
      },
      {
        id: 'google/imagen-3-fast',
        name: 'Imagen 3 Fast',
        price: 2.5,
        aspectRatios: ['1:1', '16:9', '9:16', '3:4', '4:3'],
        responseTransformer: ReplicateSingleImageOutputTransformer
      },
      {
        id: 'ideogram-ai/ideogram-v3-balanced',
        name: 'Ideogram v3',
        price: 6,
        aspectRatios: [
          '1:1',
          '16:9',
          '9:16',
          '3:4',
          '4:3',
          '5:4',
          '4:5',
          '3:2',
          '2:3',
          '16:10',
          '10:16',
          '1:2',
          '2:1',
          '1:3',
          '3:1',
        ],
        responseTransformer: ReplicateSingleImageOutputTransformer
      },
      {
        id: 'ideogram-ai/ideogram-v3-quality',
        name: 'Ideogram v3 Quality',
        price: 9,
        aspectRatios: [
          '1:1',
          '16:9',
          '9:16',
          '3:4',
          '4:3',
          '5:4',
          '4:5',
          '3:2',
          '2:3',
          '16:10',
          '10:16',
          '1:2',
          '2:1',
          '1:3',
          '3:1',
        ],
        responseTransformer: ReplicateSingleImageOutputTransformer
      },
      {
        id: 'ideogram-ai/ideogram-v3-turbo',
        name: 'Ideogram v3 Turbo',
        price: 3,
        aspectRatios: [
          '1:1',
          '16:9',
          '9:16',
          '3:4',
          '4:3',
          '5:4',
          '4:5',
          '3:2',
          '2:3',
          '16:10',
          '10:16',
          '1:2',
          '2:1',
          '1:3',
          '3:1',
        ],
        responseTransformer: ReplicateSingleImageOutputTransformer
      },
      {
        id: 'bytedance/seedream-3',
        name: 'Seedream 3.0',
        price: 3,
        aspectRatios: ['1:1', '16:9', '9:16', '3:4', '4:3', '3:2', '2:3'],
        responseTransformer: ReplicateSingleImageOutputTransformer
      },
      {
        id: 'bytedance/sdxl-lightning-4step:6f7a773af6fc3e8de9d5a3c00be77c17308914bf67772726aff83496ba1e3bbe',
        name: 'SDXL-Lightning',
        price: 0.14,
        aspectRatios: [
          '1:1',
          '16:9',
          '9:16',
          '3:4',
          '4:3',
          '5:4',
          '4:5',
          '3:2',
          '2:3',
          '16:10',
          '10:16',
          '1:2',
          '2:1',
          '1:3',
          '3:1',
        ],
        format: 'png'
      },
      {
        id: 'minimax/image-01',
        name: 'Image 01',
        price: 1,
        aspectRatios: ['1:1', '16:9', '9:16', '3:4', '4:3', '3:2', '2:3'],
        format: 'jpg',
      },
    ],
  },
]
