import { Player } from '@remotion/player'
import React, { useEffect, useMemo } from 'react'
import { flushSync } from 'react-dom'
import {
  PlusIcon,
  DownloadSimpleIcon,
  VideoCameraIcon,
  CircleNotchIcon,
  FolderOpenIcon,
  SparkleIcon,
} from '@phosphor-icons/react'
import { useRouter } from '@/state/router'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { PageHeader } from '@/components/shared/PageHeader'
import { Section } from '@/components/shared/Section'
import { ArtStyleSelect } from '@/components/shared/ArtStyleSelect'
import { FPS } from '@/remotion/constants'
import Chrome from '@uiw/react-color-chrome'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

import { useVideoSlideshowStore } from './store'
import { SlideshowSlideType } from './types'
import { SlideCard } from './SlideCard'
import { GenerateSlidesModal } from './GenerateSlidesModal'
import { getGenerateSlideshowPrompt, SlideshowSlides } from './service'
import { VideoSlideshow } from '@/remotion/templates/video-slideshow/VideoSlideshow'
import { VideoSlideshowTimeline, videoSlideshowTimelineSchema } from '@/remotion/templates/video-slideshow/types'
import { OpenAIStructuredGenProvider, OpenAIImageGenProvider } from '@/lib/providers/openAI'
import { TogetherAIImageGenProvider } from '@/lib/providers/togetherAI'
import { useSettingsStore } from '@/state/settings'
import { getModels, ModelResult, GetModelsResult } from '@/lib/modelHelpers'
import { VerticalAlignmentType } from '@/remotion/types'

const ASPECT_RATIO = '9:16'

const transformMediaUrl = (url: string | undefined, port: number | null): string | undefined => {
  if (!url || !port) return url
  if (!url.startsWith('media://')) return url
  const encodedPath = url.slice('media://'.length)
  const filePath = decodeURIComponent(encodedPath)
  return `http://127.0.0.1:${port}/?path=${encodeURIComponent(filePath)}`
}

const MemoizedPlayer = React.memo(({ timeline, durationInFrames, aspectRatio }: {
  timeline: VideoSlideshowTimeline
  durationInFrames: number
  aspectRatio: string
}) => {
  return (
    <Player
      component={VideoSlideshow}
      schema={videoSlideshowTimelineSchema}
      inputProps={timeline}
      style={{
        width: '100%',
        maxHeight: '100%',
        aspectRatio: aspectRatio.replace(':', '/'),
        borderRadius: 12,
        overflow: 'hidden',
      }}
      controls
      compositionWidth={1080}
      compositionHeight={1920}
      fps={FPS}
      durationInFrames={durationInFrames}
    />
  )
}, (prev, next) => {
  return JSON.stringify(prev.timeline) === JSON.stringify(next.timeline)
    && prev.durationInFrames === next.durationInFrames
    && prev.aspectRatio === next.aspectRatio
})

export const VideoSlideshowPage = () => {
  const setRoute = useRouter((state) => state.setRoute)
  const store = useVideoSlideshowStore()
  const apiKeys = useSettingsStore((state) => state.apiKeys)
  const mediaServerPortRef = React.useRef<number | null>(null)

  const connectedProviders = useMemo(() => {
    return Object.entries(apiKeys)
      .filter(([, value]) => value && value.length > 0)
      .map(([key]) => key)
  }, [apiKeys])

  const enabledModelsData = useMemo(() => {
    const allModelsData = getModels({ ratios: [ASPECT_RATIO] })
    const result: GetModelsResult = {}
    for (const [providerId, providerData] of Object.entries(allModelsData)) {
      if (connectedProviders.includes(providerId)) {
        result[providerId] = providerData
      }
    }
    return result
  }, [connectedProviders])

  useEffect(() => {
    const allModels = Object.values(enabledModelsData).flatMap(p => p.models)
    const isCurrentModelValid = allModels.some(m => m.modelId === store.settings.imageModel)

    if (!isCurrentModelValid && allModels.length > 0) {
      store.setImageModel(allModels[0].modelId)
    }
  }, [enabledModelsData, store.settings.imageModel])

  useEffect(() => {
    return () => store.reset()
  }, [])

  useEffect(() => {
    window.ipcRenderer.invoke('GET_MEDIA_SERVER_PORT').then((port) => {
      mediaServerPortRef.current = port
    })

    window.ipcRenderer.on('RENDER_PROGRESS', (_event, progress) => {
      store.setRenderProgress(progress)
    })
    window.ipcRenderer.on('RENDER_ERROR', (_event, error) => {
      console.error('Render error:', error)
      store.setRenderError(error)
      store.setIsRendering(false)
    })
    return () => {
      window.ipcRenderer.removeAllListeners('RENDER_PROGRESS')
      window.ipcRenderer.removeAllListeners('RENDER_ERROR')
    }
  }, [])

  const durationInFrames = store.timeline
    ? Math.max(1, Math.round(store.slides.length * store.settings.slideDurationSeconds * FPS))
    : 1

  const computeHash = (text: string): string => {
    let hash = 0
    for (let i = 0; i < text.length; i++) {
      const char = text.charCodeAt(i)
      hash = ((hash << 5) - hash) + char
      hash = hash & hash
    }
    return hash.toString(36)
  }

  const onGenerateImage = async (uid: string) => {
    const slide = store.getSlide(uid)
    if (!slide || !slide.imageDesc) return

    const modelsResult = getModels({ ratios: [ASPECT_RATIO] })
    let selectedModel: ModelResult | undefined
    let selectedProviderId: string | undefined

    for (const [providerId, providerData] of Object.entries(modelsResult)) {
      const model = providerData.models.find(m => m.modelId === store.settings.imageModel)
      if (model) {
        selectedModel = model
        selectedProviderId = providerId
        break
      }
    }

    if (!selectedModel || !selectedProviderId) {
      console.error('Model not found:', store.settings.imageModel)
      return
    }

    const prompt = `${slide.imageDesc}. Style: ${store.settings.artStyleDesc}`
    const hashInput = `${slide.imageDesc}. Style: ${store.settings.artStyleDesc}. Model: ${store.settings.imageModel}`
    const promptHash = computeHash(hashInput)

    if (slide.imageDescHash === promptHash && slide.imageUrl) {
      return
    }

    let img
    if (selectedProviderId === 'openai') {
      const p = new OpenAIImageGenProvider()
      img = await p.generate(selectedModel, ASPECT_RATIO, prompt)
    } else if (selectedProviderId === 'togetherai') {
      const p = new TogetherAIImageGenProvider()
      img = await p.generate(selectedModel, ASPECT_RATIO, prompt)
    } else {
      console.error('Unknown provider:', selectedProviderId)
      return
    }

    const saveResult = await window.ipcRenderer.invoke('SAVE_GENERATED_IMAGE', {
      base64Data: img.base64Data,
      filename: `slideshow_${uid}_${Date.now()}.png`,
    })

    if (!saveResult.ok) {
      console.error('Failed to save image:', saveResult.error)
      return
    }

    store.updateSlideImageUrl(uid, saveResult.mediaUrl, promptHash, false)
  }

  const onImageUpload = (uid: string, imageUrl: string) => {
    store.updateSlideImageUrl(uid, imageUrl, undefined, true)
  }

  const createTimelineFromSlides = (): VideoSlideshowTimeline | null => {
    const currentState = useVideoSlideshowStore.getState()
    const port = mediaServerPortRef.current

    const validSlides = currentState.slides.filter(s => s.imageUrl)
    if (validSlides.length === 0) return null

    return {
      slides: validSlides.map(s => ({
        title: s.title || undefined,
        content: s.content || undefined,
        backgroundImageUrl: transformMediaUrl(s.imageUrl, port) || s.imageUrl!,
        verticalAlign: s.verticalAlign,
      })),
      slideDurationSeconds: currentState.settings.slideDurationSeconds,
      backgroundOverlayColor: currentState.settings.backgroundOverlayColor,
      backgroundOverlayOpacity: currentState.settings.backgroundOverlayOpacity,
      captionsType: currentState.settings.captionsType,
    }
  }

  const onGeneratePreview = async (): Promise<VideoSlideshowTimeline | null> => {
    if (!store.slides.length) return null

    store.setPreviewGenerating(true)
    store.setPreviewError(null)

    const slidesNeedingImage = store.slides.filter((s) => {
      if (!s.imageDesc) return false
      if (s.isImageUploaded && s.imageUrl) return false
      const hash = computeHash(`${s.imageDesc}. Style: ${store.settings.artStyleDesc}. Model: ${store.settings.imageModel}`)
      return s.imageDescHash !== hash || !s.imageUrl
    })

    store.setPreviewProgress({
      imagesTotal: slidesNeedingImage.length,
      imagesDone: 0,
    })

    try {
      for (const slide of slidesNeedingImage) {
        await onGenerateImage(slide.uid)
        store.incrementPreviewProgress()
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred'
      console.error('Preview generation failed:', err)
      store.setPreviewError(errorMessage)
      store.setPreviewGenerating(false)
      store.setPreviewProgress(null)
      return null
    }

    let generatedTimeline: VideoSlideshowTimeline | null = null
    flushSync(() => {
      generatedTimeline = createTimelineFromSlides()
      store.setTimeline(generatedTimeline)
    })

    store.setPreviewGenerating(false)
    store.setPreviewProgress(null)
    store.setIsPreviewGenerated(true)

    return generatedTimeline
  }

  const renderVideo = async (timelineToRender: VideoSlideshowTimeline) => {
    store.setRenderError(null)
    store.setRenderProgress({
      renderedFrames: 0,
      encodedFrames: 0,
      encodedDoneIn: null,
      renderedDoneIn: null,
      renderEstimatedTime: 0,
      progress: 0,
      stitchStage: 'encoding',
    })
    store.setIsRendering(true)

    const renderDurationInFrames = Math.max(1, Math.round(timelineToRender.slides.length * (timelineToRender.slideDurationSeconds || 3) * FPS))

    const inputProps = {
      ...timelineToRender,
      metadata: {
        durationInFrames: renderDurationInFrames,
        compositionWidth: 1080,
        compositionHeight: 1920,
        fps: FPS,
      },
    }

    const response = await window.ipcRenderer.invoke(
      'RENDER_MEDIA',
      inputProps,
      'VideoSlideshow',
      'Video Slideshow'
    )

    if (response.success) {
      console.log('Video rendered successfully!')
      if (!document.hasFocus()) {
        new Notification('Video Render Complete', {
          body: 'Your slideshow video has finished rendering',
        })
      }
    } else {
      console.error('Failed to render video.')
    }

    store.setIsRendering(false)
  }

  const onSaveVideo = async () => {
    if (!store.slides.length) return

    const generatedTimeline = await onGeneratePreview()
    if (!generatedTimeline) return

    await renderVideo(generatedTimeline)
  }

  const onGenerateSlides = async (description: string) => {
    const p = new OpenAIStructuredGenProvider()
    const result = await p.generate(
      getGenerateSlideshowPrompt(description),
      SlideshowSlides,
    )

    const newSlides: SlideshowSlideType[] = result.slides.map((s) => ({
      uid: crypto.randomUUID(),
      title: s.title,
      content: s.content,
      imageDesc: s.imageDescription,
      verticalAlign: 'center' as VerticalAlignmentType,
    }))

    store.setSlides(newSlides)
  }

  const canGeneratePreview = store.slides.length > 0 && store.slides.some(s => s.imageDesc || s.imageUrl)

  return (
    <div className="flex flex-col h-full w-full">
      <PageHeader title="Video Slideshow" />

      <div className="flex flex-1 overflow-hidden">
        <div className="flex-1 overflow-y-auto p-6 [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar]:bg-transparent [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-neutral-200 [&::-webkit-scrollbar-track]:my-2">
          <div className="flex flex-col gap-5 max-w-[640px] mx-auto pb-8">
            {/* Settings Section */}
            <Section title="Slideshow Settings">
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-2">
                  <Label>Slide Duration (seconds)</Label>
                  <Input
                    type="number"
                    min={1}
                    max={30}
                    step={0.5}
                    value={store.settings.slideDurationSeconds}
                    onChange={(e) => store.setSlideDuration(parseFloat(e.target.value) || 3)}
                  />
                </div>

                <div className="flex flex-col gap-2">
                  <Label>Overlay Opacity</Label>
                  <Input
                    type="number"
                    min={0}
                    max={1}
                    step={0.1}
                    value={store.settings.backgroundOverlayOpacity}
                    onChange={(e) => store.setOverlayOpacity(parseFloat(e.target.value) || 0.5)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-2">
                  <Label>Overlay Color</Label>
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => store.setColorPickerOpen(!store.colorPickerOpen)}
                      className="w-full h-9 rounded-md border border-input cursor-pointer hover:opacity-90 transition-opacity"
                      style={{ backgroundColor: store.settings.backgroundOverlayColor }}
                    />
                    {store.colorPickerOpen && (
                      <>
                        <div
                          className="fixed inset-0 z-40"
                          onClick={() => store.setColorPickerOpen(false)}
                        />
                        <div className="absolute top-11 left-0 z-50">
                          <Chrome
                            color={store.settings.backgroundOverlayColor}
                            onChange={(color) => store.setOverlayColor(color.hex)}
                          />
                        </div>
                      </>
                    )}
                  </div>
                </div>

                <div className="flex flex-col gap-2">
                  <Label>Captions Style</Label>
                  <Select
                    value={store.settings.captionsType}
                    onValueChange={store.setCaptionsType}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        <SelectItem value="outlined">Outlined Text</SelectItem>
                        <SelectItem value="roundedTextbox">Rounded Textbox</SelectItem>
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <Label>Image Model</Label>
                <Select value={store.settings.imageModel} onValueChange={store.setImageModel}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
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

              <div className="flex flex-col gap-2">
                <Label>Art Style</Label>
                <ArtStyleSelect
                  styleId={store.settings.artStyle}
                  styleDesc={store.settings.artStyleDesc}
                  onStyleChange={(id) => {
                    const style = require('@/data/contentStyles').ArtStyles.find((s: { uid: string }) => s.uid === id)
                    store.setArtStyle(id, style?.description || '')
                  }}
                  onDescChange={(desc) => store.setArtStyle(store.settings.artStyle, desc)}
                />
              </div>
            </Section>

            {/* Slides Section */}
            <Section
              title="Slides"
              rightElement={
                <Button variant="default" size="sm" className='h-7' onClick={() => store.setGenerateModalOpen(true)}>
                  <SparkleIcon size={14} weight="fill" />
                  Generate
                </Button>
              }
            >
              <div className="flex flex-col gap-3">
                {store.slides.map((slide, index) => (
                  <SlideCard
                    key={slide.uid}
                    slide={slide}
                    index={index}
                    onDelete={store.deleteSlide}
                    onTitleChange={store.updateSlideTitle}
                    onContentChange={store.updateSlideContent}
                    onImageDescChange={store.updateSlideImageDesc}
                    onVerticalAlignChange={store.updateSlideVerticalAlign}
                    onGenerateImage={onGenerateImage}
                    onImageUpload={onImageUpload}
                  />
                ))}
              </div>

              <Button variant="default" onClick={store.addSlide} className="w-full" size="sm">
                <PlusIcon size={16} weight="bold" />
                Add Slide
              </Button>
            </Section>
          </div>
        </div>

        {/* Preview Panel */}
        <div className="w-[30%] flex-shrink-0 border-l border-neutral-100 p-3 flex flex-col items-center justify-center overflow-hidden gap-2">
          <Label>Preview</Label>
          {store.isPreviewGenerated && store.timeline && store.timeline.slides.length > 0 ? (
            <MemoizedPlayer
              timeline={store.timeline}
              durationInFrames={durationInFrames}
              aspectRatio={ASPECT_RATIO}
            />
          ) : (
            <div
              className="w-full bg-neutral-100 border rounded-xl flex items-center justify-center"
              style={{
                maxHeight: '100%',
                aspectRatio: ASPECT_RATIO.replace(':', '/'),
              }}
            >
              <VideoCameraIcon size={48} className="text-neutral-300" />
            </div>
          )}
          <div className="flex flex-col items-center gap-1 w-full max-w-[180px]">
            <Button
              variant="default"
              className="border w-full max-w-[180px]"
              size="sm"
              onClick={onGeneratePreview}
              disabled={!canGeneratePreview || store.previewGenerating}
            >
              {store.previewGenerating ? (
                <CircleNotchIcon className="animate-spin" />
              ) : (
                <SparkleIcon />
              )}
              {store.previewGenerating ? 'Generating...' : 'Generate preview'}
            </Button>
            {store.previewProgress && (
              <span className="text-xs text-neutral-500">
                {store.previewProgress.imagesDone}/{store.previewProgress.imagesTotal} images
              </span>
            )}
          </div>

          {store.previewError && (
            <div className="w-full bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-lg text-xs">
              <p className="font-medium">Preview generation failed</p>
              <p className="mt-1">{store.previewError}</p>
            </div>
          )}

          {store.renderError && (
            <div className="w-full bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-lg text-xs">
              <p className="font-medium">Error: {store.renderError.name}</p>
              <p className="mt-1">{store.renderError.message}</p>
            </div>
          )}

          {store.isRendering && store.renderProgress ? (
            <div className="w-full bg-white rounded-xl p-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-neutral-700">
                  {store.renderProgress.stitchStage === 'encoding' ? 'Encoding' : 'Muxing Audio'}
                </span>
                <span className="text-xs font-medium text-neutral-900">
                  {Math.round(store.renderProgress.progress * 100)}%
                </span>
              </div>
              <div className="w-full h-1.5 bg-neutral-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-black rounded-full transition-all duration-300 ease-out"
                  style={{ width: `${Math.round(store.renderProgress.progress * 100)}%` }}
                />
              </div>
              <div className="flex items-center justify-between mt-2 text-xs text-neutral-500">
                <span>
                  Frames: {store.renderProgress.renderedFrames} / {durationInFrames}
                </span>
              </div>
            </div>
          ) : (
            <div className="w-full flex flex-col gap-2 items-center">
              {store.renderProgress && !store.isRendering && store.renderProgress.progress === 1 && (
                <>
                  <p className="text-neutral-900 font-medium text-center text-sm">
                    Render Complete!
                  </p>
                  <Button
                    variant="default"
                    className="border w-full max-w-[180px]"
                    size="sm"
                    onClick={() => setRoute('library')}
                  >
                    <FolderOpenIcon />
                    Open Library
                  </Button>
                </>
              )}
              <Button
                variant="default"
                className="border w-full max-w-[180px]"
                size="sm"
                onClick={onSaveVideo}
                disabled={!canGeneratePreview || store.previewGenerating || store.isRendering}
              >
                <DownloadSimpleIcon />
                Save video
              </Button>
            </div>
          )}
        </div>
      </div>

      <GenerateSlidesModal
        open={store.generateModalOpen}
        onClose={() => store.setGenerateModalOpen(false)}
        onGenerate={onGenerateSlides}
      />
    </div>
  )
}
