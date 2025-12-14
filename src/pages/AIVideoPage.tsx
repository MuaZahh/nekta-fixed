import { Player } from '@remotion/player'
import { useState } from 'react'
import {
  SparkleIcon,
  PlusIcon,
  DownloadSimpleIcon,
  VideoCameraIcon,
  XIcon,
  CircleNotchIcon,
} from '@phosphor-icons/react'
import { HelloWorld, myCompSchema } from '../remotion/templates/demo/HelloWorld'
import { z } from 'zod'
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
import { ImageGenModelsData } from '@/providers/replicate/images'
import { ArtStyles, AiStoryTopics } from '@/data/contentStyles'
import { AspectRatio } from '@/type/content'
import { VoiceSelect } from '@/components/shared/VoiceSelect'
import { ArtStyleSelect } from '@/components/shared/ArtStyleSelect'
import { PageHeader } from '@/components/shared/PageHeader'
import { AiVideoSlideType, WizardStep } from './ai-video/types'
import { SlideItem } from './ai-video/AIVideoSlide'
import { Section } from '@/components/shared/Section'
import { OpenAIStructuredGenProvider, OpenAITTSProvider } from '@/lib/providers/openAI'
import { getGenerateImageDescriptionPrompt, getGenerateStoryPrompt, getGenerateTitlesPrompt, StoryScript, StoryWithImages, TitleList } from './ai-video/service'
import { ReplicateImageGenProvider } from '@/lib/providers/replicate'


const supportedRatios: AspectRatio[] = ['9:16']

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

const defaultPlayerProps: z.infer<typeof myCompSchema> = {
  titleText: 'AI Video Preview',
  titleColor: '#000000',
  logoColor1: '#91EAE4',
  logoColor2: '#86A8E7',
  metadata: {
    durationInFrames: 150,
    compositionWidth: 1080,
    compositionHeight: 1920,
    fps: 30,
  },
}



export const AIVideoPage = () => {
  const [slides, setSlides] = useState<AiVideoSlideType[]>([])
  const [wizardOpen, setWizardOpen] = useState(false)
  const [wizardStep, setWizardStep] = useState<WizardStep>('create-titles')
  const [generating, setGenerating] = useState(false)

  const [voice, setVoice] = useState<string>('alloy')
  const [aspectRatio, setAspectRatio] = useState<string>('9:16')
  const [imageModel, setImageModel] = useState<string>(
    'black-forest-labs/flux-schnell'
  )
  const [artStyle, setArtStyle] = useState<string>('realism')
  const [artStyleDesc, setArtStyleDesc] = useState<string>(
    ArtStyles.find((s) => s.uid === 'realism')?.description || ''
  )
  const [title, setTitle] = useState('')

  const [topic, setTopic] = useState<string>('')
  const [generatedTitles, setGeneratedTitles] = useState<string[]>([])
  const [selectedTitle, setSelectedTitle] = useState<string>('')
  const [isPreviewGenerated, setIsPreviewGenerated] = useState(false)
  const [previewGenerating, setPreviewGenerating] = useState(false)
  const [previewProgress, setPreviewProgress] = useState<{
    imagesTotal: number
    imagesDone: number
    audioTotal: number
    audioDone: number
  } | null>(null)

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

    const selectedModel = ImageGenModelsData.map(g => g.models).flat().find(m => m.id === imageModel)
    if (!selectedModel) {
      return
    }

    const prompt = `${slide.imageDesc}. Style: ${artStyleDesc}`
    const promptHash = computeHash(prompt)

    if (slide.imageDescHash === promptHash && slide.imageUrl) {
      return
    }

    const p = new ReplicateImageGenProvider()
    const img = await p.generate(selectedModel, '9:16', prompt)

    const saveResult = await window.ipcRenderer.invoke('SAVE_GENERATED_IMAGE', {
      base64Data: img.base64Data,
      filename: `slide_${uid}_${Date.now()}.png`,
    })

    if (!saveResult.ok) {
      console.error('Failed to save image:', saveResult.error)
      return
    }

    setSlides((prev) =>
      prev.map((s) => (s.uid === uid ? { ...s, imageUrl: saveResult.mediaUrl, imageDescHash: promptHash } : s))
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

  const onGeneratePreview = async () => {
    if (!slides.length) return

    setPreviewGenerating(true)

    const slidesNeedingImage = slides.filter((s) => {
      if (!s.imageDesc) return false
      const hash = computeHash(`${s.imageDesc}. Style: ${artStyleDesc}`)
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

    setPreviewGenerating(false)
    setPreviewProgress(null)
    setIsPreviewGenerated(true)
  }

  const onGenerateTitles = async () => {
    if (!topic) return
    setGenerating(true)
    const p = new OpenAIStructuredGenProvider()

    const titles = await p.generate(
      getGenerateTitlesPrompt(topic),
      TitleList,
    )

    setGeneratedTitles(titles.titles)
    setWizardStep('select-title')
    setGenerating(false)
  }

  const onGenerateStory = async () => {
    if (!selectedTitle) return
    setGenerating(true)
    const storySlides = await generateStory(selectedTitle, topic)
    setSlides(storySlides)
    setTitle(selectedTitle)
    closeWizard()
    setGenerating(false)
  }

  const closeWizard = () => {
    setWizardOpen(false)
    setWizardStep('create-titles')
    setGeneratedTitles([])
    setSelectedTitle('')
  }

  const filteredModels = ImageGenModelsData.flatMap((provider) =>
    provider.models.filter((model) =>
      supportedRatios.every((ratio) => model.aspectRatios.includes(ratio))
    )
  )

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
                <Label>Aspect Ratio</Label>
                <Select value={aspectRatio} onValueChange={setAspectRatio}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      {supportedRatios.map((r) => (
                        <SelectItem key={r} value={r}>
                          {r}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <Label>Image Model</Label>
              <Select value={imageModel} onValueChange={setImageModel}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectLabel>Replicate</SelectLabel>
                    {filteredModels.map((m) => (
                      <SelectItem key={m.id} value={m.id}>
                        {m.name} (${(m.price / 100).toFixed(3)})
                      </SelectItem>
                    ))}
                  </SelectGroup>
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
          {isPreviewGenerated ? (
            <Player
              component={HelloWorld}
              inputProps={defaultPlayerProps}
              style={{
                width: '100%',
                maxHeight: '100%',
                aspectRatio: aspectRatio.replace(':', '/'),
                borderRadius: 12,
                overflow: 'hidden',
              }}
              controls
              {...defaultPlayerProps.metadata}
            />
          ) : (
            <div
              className="w-full bg-neutral-100 border rounded-xl flex items-center justify-center"
              style={{
                maxHeight: '100%',
                aspectRatio: aspectRatio.replace(':', '/'),
              }}
            >
              <VideoCameraIcon size={48} className="text-neutral-300" />
            </div>
          )}
          <div className="flex flex-col items-center gap-1">
            <Button
              variant="default"
              className="border"
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
          <Button variant="default" className="border" size="sm" disabled={!isPreviewGenerated}>
            <DownloadSimpleIcon />
            Save video
          </Button>
        </div>
      </div>

      {/* Wizard Modal */}
      {wizardOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="relative bg-white rounded-2xl p-6 w-[480px] flex flex-col gap-5 shadow-2xl">
            <Button
              variant="ghost"
              size="icon"
              onClick={closeWizard}
              className="absolute right-3 top-3"
            >
              <XIcon size={18} />
            </Button>

            <div className="flex flex-col gap-1">
              <h2 className="text-lg font-semibold text-neutral-900">
                Generate Story with AI
              </h2>
              <p className="text-sm text-neutral-500">
                {wizardStep === 'create-titles'
                  ? 'Choose a topic to generate story titles'
                  : 'Select a title to generate your story'}
              </p>
            </div>

            {/* Step indicator */}
            <div className="flex items-center gap-2">
              <div
                className={`h-1 flex-1 rounded-full transition-colors ${
                  wizardStep === 'create-titles'
                    ? 'bg-neutral-900'
                    : 'bg-neutral-200'
                }`}
              />
              <div
                className={`h-1 flex-1 rounded-full transition-colors ${
                  wizardStep === 'select-title'
                    ? 'bg-neutral-900'
                    : 'bg-neutral-200'
                }`}
              />
            </div>

            {wizardStep === 'create-titles' && (
              <>
                <div className="flex flex-col gap-2">
                  <Label>Script Topic</Label>
                  <Select value={topic} onValueChange={setTopic}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select a topic..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        {AiStoryTopics.map((t) => (
                          <SelectItem key={t.uid} value={t.uid}>
                            {t.name}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex justify-end pt-2">
                  <Button
                    onClick={onGenerateTitles}
                    disabled={generating || !topic}
                    size='sm'
                  >
                    {generating ? (
                      <>Generating...</>
                    ) : (
                      <>
                        <SparkleIcon size={14} weight="fill" />
                        Generate Titles
                      </>
                    )}
                  </Button>
                </div>
              </>
            )}

            {wizardStep === 'select-title' && (
              <>
                <div className="flex flex-col gap-2">
                  <Label>Select a Title</Label>
                  <Select
                    value={selectedTitle}
                    onValueChange={setSelectedTitle}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Choose a title..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        {generatedTitles.map((t) => (
                          <SelectItem key={t} value={t}>
                            {t}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex justify-between pt-2">
                  <Button
                    variant="ghost"
                    size='sm'
                    onClick={() => setWizardStep('create-titles')}
                  >
                    Back
                  </Button>
                  <Button
                    onClick={onGenerateStory}
                    size='sm'
                    disabled={generating || !selectedTitle}
                  >
                    {generating ? (
                      <>Generating...</>
                    ) : (
                      <>
                        <SparkleIcon size={14} weight="fill" />
                        Generate Story
                      </>
                    )}
                  </Button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
