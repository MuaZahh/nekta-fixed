import { useSettingsStore } from "@/state/settings"
import { ImageGenResult } from "../types"
import { urlToBase64 } from "../utils"
import { getImageSize, ModelResult } from "../modelHelpers"

const PROVIDER_ID = 'togetherai'

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

export class TogetherAIImageGenProvider {
  provider = 'togetherai' as const

  get enabled(): boolean {
    const settings = useSettingsStore.getState()
    return settings.getConnectedProviders().includes('togetherai')
  }

  async generate(
    model: ModelResult,
    aspectRatio: string,
    prompt: string
  ): Promise<ImageGenResult> {
    const settings = useSettingsStore.getState()
    const apiKey = settings.apiKeys['togetherai']

    if (!apiKey) {
      throw new Error('Together AI API key not configured')
    }

    const sizeResult = getImageSize(1920, aspectRatio, PROVIDER_ID, model.modelId)
    if (!sizeResult) {
      throw new Error(`Unable to determine image size for model ${model.modelId} with aspect ratio ${aspectRatio}`)
    }

    const input = {
      model: model.providerModelId,
      prompt,
      width: sizeResult.width,
      height: sizeResult.height,
      response_format: 'b64_json',
    }

    const url = 'https://api.together.xyz/v1/images/generations'

    const response = await proxyFetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(input)
    })

    console.log(response)

    if (!response.ok) {
      const errorData = response.data as { error?: { message?: string } }
      const errorMessage = errorData?.error?.message || response.statusText
      throw new Error(`Image generation failed: ${errorMessage}`)
    }

    const result = response.data as { data?: Array<{ b64_json?: string; url?: string }> }

    if (!result.data || result.data.length === 0) {
      throw new Error('No image data returned from Together AI')
    }

    const imageData = result.data[0]

    if (imageData.b64_json) {
      return { base64Data: imageData.b64_json }
    }

    if (imageData.url) {
      const base64Data = await urlToBase64(imageData.url)
      return { base64Data }
    }

    throw new Error('No image data in response')
  }
}
