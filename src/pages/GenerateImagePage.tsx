import { useState, useMemo, useEffect } from 'react'
import {
  SparkleIcon,
  CircleNotchIcon,
  ImageIcon,
  DownloadSimpleIcon,
} from '@phosphor-icons/react'
import { PageHeader } from '@/components/shared/PageHeader'
import { Section } from '@/components/shared/Section'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { MediaPreview } from '@/components/shared/MediaPreview'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useSettingsStore } from '@/state/settings'
import { getModels, getAspectRatios, ModelResult, GetModelsResult } from '@/lib/modelHelpers'
import { OpenAIImageGenProvider } from '@/lib/providers/openAI'
import { TogetherAIImageGenProvider } from '@/lib/providers/togetherAI'

const DEFAULT_ASPECT_RATIO = '1:1'

const transformMediaUrl = (url: string | undefined, port: number | null): string | undefined => {
  if (!url || !port) return url
  if (!url.startsWith('media://')) return url
  const encodedPath = url.slice('media://'.length)
  const filePath = decodeURIComponent(encodedPath)
  return `http://127.0.0.1:${port}/?path=${encodeURIComponent(filePath)}`
}

export const GenerateImagePage = () => {
  const apiKeys = useSettingsStore((state) => state.apiKeys)
  const [mediaServerPort, setMediaServerPort] = useState<number | null>(null)

  const [prompt, setPrompt] = useState('')
  const [aspectRatio, setAspectRatio] = useState(DEFAULT_ASPECT_RATIO)
  const [imageModel, setImageModel] = useState('')
  const [isGenerating, setIsGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [generatedImageUrl, setGeneratedImageUrl] = useState<string | null>(null)
  const [previewOpen, setPreviewOpen] = useState(false)

  // Get available aspect ratios
  const aspectRatios = useMemo(() => getAspectRatios(), [])

  // Get connected providers based on API keys
  const connectedProviders = useMemo(() => {
    return Object.entries(apiKeys)
      .filter(([, value]) => value && value.length > 0)
      .map(([key]) => key)
  }, [apiKeys])

  // Filter available models by connected providers and aspect ratio
  const enabledModelsData = useMemo(() => {
    const allModelsData = getModels({ ratios: [aspectRatio] })
    const result: GetModelsResult = {}
    for (const [providerId, providerData] of Object.entries(allModelsData)) {
      if (connectedProviders.includes(providerId)) {
        result[providerId] = providerData
      }
    }
    return result
  }, [connectedProviders, aspectRatio])

  // Validate and set default model when providers change
  useEffect(() => {
    const allModels = Object.values(enabledModelsData).flatMap(p => p.models)
    const isCurrentModelValid = allModels.some(m => m.modelId === imageModel)

    if (!isCurrentModelValid && allModels.length > 0) {
      setImageModel(allModels[0].modelId)
    }
  }, [enabledModelsData, imageModel])

  // Get media server port
  useEffect(() => {
    window.ipcRenderer.invoke('GET_MEDIA_SERVER_PORT').then((port) => {
      setMediaServerPort(port)
    })
  }, [])

  const handleGenerate = async () => {
    if (!prompt.trim() || !imageModel) return

    setIsGenerating(true)
    setError(null)

    try {
      const modelsResult = getModels({ ratios: [aspectRatio] })
      let selectedModel: ModelResult | undefined
      let selectedProviderId: string | undefined

      for (const [providerId, providerData] of Object.entries(modelsResult)) {
        const model = providerData.models.find(m => m.modelId === imageModel)
        if (model) {
          selectedModel = model
          selectedProviderId = providerId
          break
        }
      }

      if (!selectedModel || !selectedProviderId) {
        throw new Error('Selected model not found')
      }

      let img
      if (selectedProviderId === 'openai') {
        const p = new OpenAIImageGenProvider()
        img = await p.generate(selectedModel, aspectRatio, prompt)
      } else if (selectedProviderId === 'togetherai') {
        const p = new TogetherAIImageGenProvider()
        img = await p.generate(selectedModel, aspectRatio, prompt)
      } else {
        throw new Error(`Unknown provider: ${selectedProviderId}`)
      }

      const saveResult = await window.ipcRenderer.invoke('SAVE_GENERATED_IMAGE', {
        base64Data: img.base64Data,
        filename: `generated_${Date.now()}.png`,
      })

      if (!saveResult.ok) {
        throw new Error(saveResult.error || 'Failed to save image')
      }

      setGeneratedImageUrl(saveResult.mediaUrl)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred'
      setError(errorMessage)
    } finally {
      setIsGenerating(false)
    }
  }

  const handleDownload = async () => {
    if (!generatedImageUrl) return

    await window.ipcRenderer.invoke('EXPORT_IMAGE', {
      mediaUrl: generatedImageUrl,
      defaultName: `generated_image_${Date.now()}`,
    })
  }

  const canGenerate = prompt.trim().length > 0 && imageModel && !isGenerating
  const displayImageUrl = transformMediaUrl(generatedImageUrl ?? undefined, mediaServerPort)

  return (
    <div className="flex flex-col h-full w-full bg-[#F3F3EE] -m-6">
      <PageHeader title="Generate Image" />

      <div className="flex-1 overflow-y-auto p-6 [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar]:bg-transparent [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-neutral-200 [&::-webkit-scrollbar-track]:my-2">
        <div className="flex flex-col gap-5 max-w-[640px] mx-auto pb-8">
          {/* Settings Section */}
          <Section title="Image Settings">
            <div className="flex flex-col gap-2">
              <Label>Prompt *</Label>
              <Textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Describe the image you want to generate..."
                rows={4}
                className="resize-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-2">
                <Label>Aspect Ratio</Label>
                <Select value={aspectRatio} onValueChange={setAspectRatio}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      {Object.entries(aspectRatios).map(([ratio, info]) => (
                        <SelectItem key={ratio} value={ratio}>
                          {info.label} ({ratio})
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex flex-col gap-2">
                <Label>Image Model</Label>
                <Select value={imageModel} onValueChange={setImageModel}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a model" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(enabledModelsData).map(([providerId, providerData]) => (
                      <SelectGroup key={providerId}>
                        <SelectLabel>{providerData.providerName}</SelectLabel>
                        {providerData.models.map((m) => (
                          <SelectItem key={m.modelId} value={m.modelId}>
                            {m.name}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    ))}
                    {Object.keys(enabledModelsData).length === 0 && (
                      <SelectGroup>
                        <SelectLabel className="text-neutral-400">No providers configured</SelectLabel>
                      </SelectGroup>
                    )}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Button
              onClick={handleGenerate}
              disabled={!canGenerate}
              className="w-full"
            >
              {isGenerating ? (
                <CircleNotchIcon className="animate-spin" size={18} />
              ) : (
                <SparkleIcon size={18} />
              )}
              {isGenerating ? 'Generating...' : 'Generate Image'}
            </Button>
          </Section>

          {/* Error Display */}
          {error && (
            <div className="w-full bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">
              <p className="font-medium">Error</p>
              <p className="mt-1">{error}</p>
            </div>
          )}

          {/* Image Preview */}
          {displayImageUrl ? (
            <div className="flex flex-col gap-3">
              <div
                className="w-full bg-white border border-neutral-100 rounded-xl p-4 cursor-pointer hover:shadow-lg transition-shadow"
                onClick={() => setPreviewOpen(true)}
              >
                <img
                  src={displayImageUrl}
                  alt="Generated image"
                  className="w-full h-auto rounded-lg"
                />
              </div>
              <Button
                variant="outline"
                onClick={handleDownload}
                className="w-full"
              >
                <DownloadSimpleIcon size={18} />
                Download Image
              </Button>
            </div>
          ) : (
            <div className="w-full bg-white border border-neutral-100 rounded-xl p-8 flex flex-col items-center justify-center gap-3">
              <ImageIcon size={48} className="text-neutral-300" />
              <p className="text-sm text-neutral-400 text-center">
                Your generated image will appear here
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Fullscreen Preview Modal */}
      <MediaPreview
        open={previewOpen}
        onClose={() => setPreviewOpen(false)}
        mediaUrl={displayImageUrl || ''}
        mediaType="image"
        title="Generated Image"
      />
    </div>
  )
}
