import { Player } from '@remotion/player'
import { StitchingState } from '@remotion/renderer'
import { useState, useEffect, useMemo } from 'react'
import { flushSync } from 'react-dom'
import {
  SparkleIcon,
  PlusIcon,
  DownloadSimpleIcon,
  VideoCameraIcon,
  CircleNotchIcon,
  FolderOpenIcon,
} from '@phosphor-icons/react'
import { useRouter } from '@/state/router'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { getModels, ModelResult, GetModelsResult } from '@/lib/modelHelpers'
import { ArtStyles } from '@/data/contentStyles'
import { VoiceSelect } from '@/components/shared/VoiceSelect'
import { ArtStyleSelect } from '@/components/shared/ArtStyleSelect'
import { PageHeader } from '@/components/shared/PageHeader'
import { AiVideoSlideType } from './ai-video/types'
import { SlideItem } from './ai-video/AIVideoSlide'
import { Section } from '@/components/shared/Section'
import { OpenAIStructuredGenProvider, OpenAITTSProvider, OpenAIImageGenProvider } from '@/lib/providers/openAI'
import { useSettingsStore } from '@/state/settings'
import { getGenerateImageDescriptionPrompt, getGenerateStoryPrompt, StoryScript, StoryWithImages, createTimelineFromSlides } from './ai-video/service'
import { AIVideo, aiVideoSchema } from '@/remotion/templates/ai-video-basic/AIVideo'
import { Timeline } from '@/remotion/templates/ai-video-basic/types'
import { FPS, INTRO_DURATION } from '@/remotion/constants'
import { TogetherAIImageGenProvider } from '@/lib/providers/togetherAI'
import { GenerateStoryModal } from './ai-video/GenerateStoryModal'
import Chrome from '@uiw/react-color-chrome'


const ASPECT_RATIO = '9:16'
const DEFAULT_ART_STYLE = 'realism'
const DEFAULT_ART_STYLE_DESC = ArtStyles.find((s) => s.uid === DEFAULT_ART_STYLE)?.description || ''

interface RenderProgress {
  renderedFrames: number
  encodedFrames: number
  encodedDoneIn: number | null
  renderedDoneIn: number | null
  renderEstimatedTime: number
  progress: number
  stitchStage: StitchingState
}

interface RenderError {
  name: string
  message: string
  stack?: string
}

const generateStory = async (
  title: string,
  topic: string
): Promise<AiVideoSlideType[]> => {
  const p = new OpenAIStructuredGenProvider()
  const storyRes = await p.generate(
    getGenerateStoryPrompt(title, topic),
    StoryScript,
  )

  const storyWithImagesRes = await p.generate(
    getGenerateImageDescriptionPrompt(storyRes.text),
    StoryWithImages,
  )

  const storySlides: AiVideoSlideType[] = []
  for (const item of storyWithImagesRes.result) {
    storySlides.push({
      uid: crypto.randomUUID(),
      text: item.text,
      imageDesc: item.imageDescription,
    })
  }

  return storySlides
}

export const AIVideoPage = () => {
  const setRoute = useRouter((state) => state.setRoute)
  const apiKeys = useSettingsStore((state) => state.apiKeys)
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

  const [slides, setSlides] = useState<AiVideoSlideType[]>([])
  const [wizardOpen, setWizardOpen] = useState(false)
  const [isRendering, setIsRendering] = useState(false)
  const [renderProgress, setRenderProgress] = useState<RenderProgress | null>(null)
  const [renderError, setRenderError] = useState<RenderError | null>(null)

  const [voice, setVoice] = useState<string>('alloy')
  const [imageModel, setImageModel] = useState<string>('')

  useEffect(() => {
    const allModels = Object.values(enabledModelsData).flatMap(p => p.models)
    const isCurrentModelValid = allModels.some(m => m.modelId === imageModel)

    if (!isCurrentModelValid && allModels.length > 0) {
      setImageModel(allModels[0].modelId)
    }
  }, [enabledModelsData, imageModel])

  const [artStyle, setArtStyle] = useState<string>(DEFAULT_ART_STYLE)
  const [artStyleDesc, setArtStyleDesc] = useState<string>(DEFAULT_ART_STYLE_DESC)
  const [primaryColor, setPrimaryColor] = useState<string>('#ffff00')
  const [colorPickerOpen, setColorPickerOpen] = useState(false)
  const [title, setTitle] = useState('')

  const [isPreviewGenerated, setIsPreviewGenerated] = useState(false)
  const [timeline, setTimeline] = useState<Timeline | null>(null)
  const [previewGenerating, setPreviewGenerating] = useState(false)
  const [previewError, setPreviewError] = useState<string | null>(null)
  const [previewProgress, setPreviewProgress] = useState<{
    imagesTotal: number
    imagesDone: number
    audioTotal: number
    audioDone: number
  } | null>(null)

  useEffect(() => {
    window.ipcRenderer.on('RENDER_PROGRESS', (_event, progress: RenderProgress) => {
      setRenderProgress(progress)
    })
    window.ipcRenderer.on('RENDER_ERROR', (_event, error: RenderError) => {
      console.error('Render error:', error)
      setRenderError(error)
      setIsRendering(false)
    })
    return () => {
      window.ipcRenderer.removeAllListeners('RENDER_PROGRESS')
      window.ipcRenderer.removeAllListeners('RENDER_ERROR')
    }
  }, [])

  const durationInFrames = timeline && timeline.audio.length > 0
    ? Math.max(1, Math.ceil(((timeline.audio[timeline.audio.length - 1]?.endMs || 0) / 1000) * FPS) + INTRO_DURATION)
    : 1

  const renderVideo = async (timelineToRender: Timeline) => {
    setRenderError(null)
    setRenderProgress({
      renderedFrames: 0,
      encodedFrames: 0,
      encodedDoneIn: null,
      renderedDoneIn: null,
      renderEstimatedTime: 0,
      progress: 0,
      stitchStage: 'encoding',
    })
    setIsRendering(true)

    const renderDurationInFrames = timelineToRender.audio.length > 0
      ? Math.max(1, Math.ceil(((timelineToRender.audio[timelineToRender.audio.length - 1]?.endMs || 0) / 1000) * FPS) + INTRO_DURATION)
      : 1

    const inputProps = {
      timeline: timelineToRender,
      metadata: {
        durationInFrames: renderDurationInFrames,
        compositionWidth: 1080,
        compositionHeight: 1920,
        fps: FPS,
      },
    }

    const response = await window.ipcRenderer.invoke('RENDER_MEDIA', inputProps, 'AIVideo', title)

    if (response.success) {
      console.log('Video rendered successfully!')
      if (!document.hasFocus()) {
        new Notification('Video Render Complete', {
          body: title ? `"${title}" has finished rendering` : 'Your video has finished rendering',
        })
      }
    } else {
      console.error('Failed to render video.')
    }

    setIsRendering(false)
  }

  const onAddSlide = () => {
    setSlides((prev) => [
      ...prev,
      {
        uid: crypto.randomUUID(),
        text: '',
        imageDesc: '',
      },
    ])
  }

  const onDeleteSlide = (uid: string) => {
    setSlides((prev) => prev.filter((s) => s.uid !== uid))
  }

  const onTextChange = (uid: string, val: string) => {
    setSlides((prev) =>
      prev.map((s) => (s.uid === uid ? { ...s, text: val } : s))
    )
  }

  const onImageDescChange = (uid: string, val: string) => {
    setSlides((prev) =>
      prev.map((s) => (s.uid === uid ? { ...s, imageDesc: val } : s))
    )
  }

  const onImageUpload = (uid: string, imageUrl: string) => {
    setSlides((prev) =>
      prev.map((s) => (s.uid === uid ? { ...s, imageUrl, imageDescHash: undefined, isImageUploaded: true } : s))
    )
  }

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
    const slide = slides.find((s) => s.uid === uid)
    if (!slide) return

    const modelsResult = getModels({ ratios: [ASPECT_RATIO] })

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
      console.error('Model not found:', imageModel)
      return
    }

    const prompt = `${slide.imageDesc}. Style: ${artStyleDesc}`
    const hashInput = `${slide.imageDesc}. Style: ${artStyleDesc}. Model: ${imageModel}`
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
      filename: `slide_${uid}_${Date.now()}.png`,
    })

    if (!saveResult.ok) {
      console.error('Failed to save image:', saveResult.error)
      return
    }

    setSlides((prev) =>
      prev.map((s) => (s.uid === uid ? { ...s, imageUrl: saveResult.mediaUrl, imageDescHash: promptHash, isImageUploaded: false } : s))
    )
  }

  const onGenerateAudio = async (uid: string): Promise<{ audioUrl: string; isNew: boolean } | null> => {
    const slide = slides.find((s) => s.uid === uid)
    if (!slide || !slide.text) return null

    const textHash = computeHash(slide.text + voice)

    if (slide.textHash === textHash && slide.audioData?.audioUrl) {
      return { audioUrl: slide.audioData.audioUrl, isNew: false }
    }

    const tts = new OpenAITTSProvider()
    const result = await tts.generate(voice, slide.text)

    const saveResult = await window.ipcRenderer.invoke('SAVE_GENERATED_AUDIO', {
      base64Data: result.base64Data,
      filename: `tts_${uid}_${Date.now()}.mp3`,
    })

    if (!saveResult.ok) {
      console.error('Failed to save audio:', saveResult.error)
      return null
    }

    setSlides((prev) =>
      prev.map((s) =>
        s.uid === uid
          ? {
              ...s,
              audioData: { audioUrl: saveResult.mediaUrl, timestamps: result.timestamps },
              textHash,
            }
          : s
      )
    )

    return { audioUrl: saveResult.mediaUrl, isNew: true }
  }

  const onGeneratePreview = async (): Promise<Timeline | null> => {
    if (!slides.length) return null

    setPreviewGenerating(true)
    setPreviewError(null)

    const slidesNeedingImage = slides.filter((s) => {
      if (!s.imageDesc) return false
      if (s.isImageUploaded && s.imageUrl) return false
      const hash = computeHash(`${s.imageDesc}. Style: ${artStyleDesc}. Model: ${imageModel}`)
      return s.imageDescHash !== hash || !s.imageUrl
    })

    const slidesNeedingAudio = slides.filter((s) => {
      if (!s.text) return false
      const hash = computeHash(s.text + voice)
      return s.textHash !== hash || !s.audioData?.audioUrl
    })

    setPreviewProgress({
      imagesTotal: slidesNeedingImage.length,
      imagesDone: 0,
      audioTotal: slidesNeedingAudio.length,
      audioDone: 0,
    })

    try {
      for (const slide of slidesNeedingImage) {
        await onGenerateImage(slide.uid)
        setPreviewProgress((prev) =>
          prev ? { ...prev, imagesDone: prev.imagesDone + 1 } : null
        )
      }

      for (const slide of slidesNeedingAudio) {
        await onGenerateAudio(slide.uid)
        setPreviewProgress((prev) =>
          prev ? { ...prev, audioDone: prev.audioDone + 1 } : null
        )
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred'
      console.error('Preview generation failed:', err)
      setPreviewError(errorMessage)
      setPreviewGenerating(false)
      setPreviewProgress(null)
      return null
    }

    // Generate timeline from updated slides
    // We need to get the latest slides state
    let generatedTimeline: Timeline | null = null
    flushSync(() => {
      setSlides((currentSlides) => {
        generatedTimeline = createTimelineFromSlides(currentSlides, title, primaryColor)
        setTimeline(generatedTimeline)
        return currentSlides
      })
    })

    setPreviewGenerating(false)
    setPreviewProgress(null)
    setIsPreviewGenerated(true)

    return generatedTimeline
  }

  const onSaveVideo = async () => {
    if (!slides.length) return

    const generatedTimeline = await onGeneratePreview()
    if (!generatedTimeline) return

    await renderVideo(generatedTimeline)
  }

  const onGenerateStory = async (storyTitle: string, storyTopic: string) => {
    const storySlides = await generateStory(storyTitle, storyTopic)
    setSlides(storySlides)
    setTitle(storyTitle)
  }

  return (
    <div className="flex flex-col h-full w-full">
      <PageHeader title="AI Video" />

      {/* Two Column Layout */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left Column - Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-6 [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar]:bg-transparent [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-neutral-200 [&::-webkit-scrollbar-track]:my-2">
          <div className="flex flex-col gap-5 max-w-[640px] mx-auto pb-8">
            {/* Settings Section */}
            <Section title="Video Settings">
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-2">
                <Label>Voice</Label>
                <VoiceSelect value={voice} onChange={setVoice} />
              </div>

              <div className="flex flex-col gap-2">
                <Label>Primary Color</Label>
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setColorPickerOpen(!colorPickerOpen)}
                    className="w-full h-9 rounded-md border border-input cursor-pointer hover:opacity-90 transition-opacity"
                    style={{ backgroundColor: primaryColor }}
                  />
                  {colorPickerOpen && (
                    <>
                      <div
                        className="fixed inset-0 z-40"
                        onClick={() => setColorPickerOpen(false)}
                      />
                      <div className="absolute top-11 left-0 z-50">
                        <Chrome
                          color={primaryColor}
                          onChange={(color) => setPrimaryColor(color.hex)}
                        />
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <Label>Image Model</Label>
              <Select value={imageModel} onValueChange={setImageModel}>
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
                styleId={artStyle}
                styleDesc={artStyleDesc}
                onStyleChange={setArtStyle}
                onDescChange={setArtStyleDesc}
              />
            </div>
        </Section>

        {/* Video Content Section */}
        <Section
          title="Video Content"
          rightElement={
            <Button variant="default" size="sm" className='h-7' onClick={() => setWizardOpen(true)}>
              <SparkleIcon size={14} weight="fill" />
              Generate
            </Button>
          }
        >
          <div className="flex flex-col gap-2">
            <Label>Title</Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter a compelling title for your video..."
            />
          </div>

          <div className="flex flex-col gap-3 mt-2">
            <Label>Slides</Label>
            {slides.map((slide, index) => (
              <SlideItem
                key={slide.uid}
                slide={slide}
                index={index}
                onDelete={onDeleteSlide}
                onTextChange={onTextChange}
                onImageDescChange={onImageDescChange}
                onGenerateImage={onGenerateImage}
                onGenerateAudio={onGenerateAudio}
                onImageUpload={onImageUpload}
              />
            ))}
          </div>

          <Button
            variant="default"
            onClick={onAddSlide}
            className="w-full"
            size='sm'
          >
            <PlusIcon size={16} weight="bold" />
            Add Slide
          </Button>
        </Section>
          </div>
        </div>

        {/* Right Column - Video Preview */}
        <div className="w-[30%] flex-shrink-0 border-l border-neutral-100 p-3 flex flex-col items-center justify-center overflow-hidden gap-2">
          <Label>Preview</Label>
          {isPreviewGenerated && timeline && timeline.audio.length > 0 ? (
            <Player
              component={AIVideo}
              schema={aiVideoSchema}
              inputProps={{ timeline }}
              style={{
                width: '100%',
                maxHeight: '100%',
                aspectRatio: ASPECT_RATIO.replace(':', '/'),
                borderRadius: 12,
                overflow: 'hidden',
              }}
              controls
              compositionWidth={1080}
              compositionHeight={1920}
              fps={FPS}
              durationInFrames={durationInFrames}
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
              disabled={!slides.length || previewGenerating}
            >
              {previewGenerating ? (
                <CircleNotchIcon className="animate-spin" />
              ) : (
                <SparkleIcon />
              )}
              {previewGenerating ? 'Generating...' : 'Generate preview'}
            </Button>
            {previewProgress && (
              <span className="text-xs text-neutral-500">
                {previewProgress.imagesDone}/{previewProgress.imagesTotal} images, {previewProgress.audioDone}/{previewProgress.audioTotal} audio
              </span>
            )}
          </div>
          {previewError && (
            <div className="w-full bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-lg text-xs">
              <p className="font-medium">Preview generation failed</p>
              <p className="mt-1">{previewError}</p>
            </div>
          )}
          {/* Render Button & Progress */}
          {renderError && (
            <div className="w-full bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-lg text-xs">
              <p className="font-medium">Error: {renderError.name}</p>
              <p className="mt-1">{renderError.message}</p>
            </div>
          )}

          {isRendering && renderProgress ? (
            <div className="w-full bg-white rounded-xl p-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-neutral-700">
                  {renderProgress.stitchStage === 'encoding' ? 'Encoding' : 'Muxing Audio'}
                </span>
                <span className="text-xs font-medium text-neutral-900">
                  {Math.round(renderProgress.progress * 100)}%
                </span>
              </div>
              <div className="w-full h-1.5 bg-neutral-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-black rounded-full transition-all duration-300 ease-out"
                  style={{ width: `${Math.round(renderProgress.progress * 100)}%` }}
                />
              </div>
              <div className="flex items-center justify-between mt-2 text-xs text-neutral-500">
                <span>Frames: {renderProgress.renderedFrames} / {durationInFrames}</span>
              </div>
            </div>
          ) : (
            <div className="w-full flex flex-col gap-2 items-center">
              {renderProgress && !isRendering && renderProgress.progress === 1 && (
                <>
                  <p className="text-neutral-900 font-medium text-center text-sm">Render Complete!</p>
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
                disabled={!slides.length || previewGenerating || isRendering}
              >
                <DownloadSimpleIcon />
                Save video
              </Button>
            </div>
          )}
        </div>
      </div>

      <GenerateStoryModal
        open={wizardOpen}
        onClose={() => setWizardOpen(false)}
        onGenerate={onGenerateStory}
      />
    </div>
  )
}
