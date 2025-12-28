import { useSettingsStore } from "@/state/settings"
import { ImageGenProvider, ImageGenResult } from "../types"
import { AspectRatio, ImagGenModelMeta } from "@/type/content"
import { delay, urlToBase64 } from "../utils"

const ReplicateDefaultOutputTransformer = (output: unknown) => Object.values(output as object)

type FetchProxyResponse = {
  ok: boolean
  status: number
  statusText: string
  data: unknown
}

async function proxyFetch(
  url: string,
  options: { method: string; headers: Record<string, string>; body?: string }
): Promise<FetchProxyResponse> {
  return window.ipcRenderer.invoke('FETCH_PROXY', { url, ...options })
}

export class ReplicateImageGenProvider implements ImageGenProvider {
  provider = 'replicate' as const

  get enabled(): boolean {
    const settings = useSettingsStore.getState()
    return settings.getConnectedProviders().includes('replicate')
  }

  async generate(model: ImagGenModelMeta, aspectRatio: AspectRatio, prompt: string): Promise<ImageGenResult> {
    const settings = useSettingsStore.getState()
    const apiKey = settings.apiKeys['replicate']

    if (!apiKey) {
      throw new Error('Replicate API key not configured')
    }

    if (!model.aspectRatios.includes(aspectRatio)) {
      throw new Error('Aspect ratio not supported')
    }

    const input = {
      prompt,
      aspect_ratio: aspectRatio,
      output_format: "png"
    }

    const url = `https://api.replicate.com/v1/models/${model.id}/predictions`

    const response = await proxyFetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'Prefer': 'wait'
      },
      body: JSON.stringify({ input })
    })

    if (!response.ok) {
      throw new Error(`Image generation failed: ${response.statusText}`)
    }

    const prediction = response.data as Record<string, unknown>
    const urls = prediction['urls'] as Record<string, string>
    const getUrl = urls['get']
    let status = prediction['status'] as string
    let output = prediction['output']

    if (this.isStatusFailed(status)) {
      throw new Error('Image generation failed')
    }

    while (!this.isStatusFailed(status) && !this.isStatusOk(status)) {
      await delay(1_000)

      const res = await proxyFetch(getUrl, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        }
      })

      const data = res.data as Record<string, unknown>
      status = data['status'] as string
      output = data['output']
    }

    if (this.isStatusFailed(status)) {
      throw new Error('Image generation failed')
    }

    const transformer = model.responseTransformer ?? ReplicateDefaultOutputTransformer
    const imageUrls = transformer(output)
    let imageUrl = null

    if (Array.isArray(imageUrls)) {
      imageUrl = imageUrls[0]
    } else {
      imageUrl = imageUrls
    }

    if (!imageUrl) {
      throw new Error('No image URL returned')
    }

    const base64Data = await urlToBase64(imageUrl)

    return {
      base64Data
    }
  }

  private isStatusOk(status: string): boolean {
    return status === 'succeeded'
  }

  private isStatusFailed(status: string): boolean {
    return status === 'failed' || status === 'canceled'
  }
}