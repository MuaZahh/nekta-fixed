import { PageLayout } from '../components/PageLayout'
import { useState, useRef, useEffect } from 'react'
import {
  XIcon,
  SparkleIcon,
  PlusIcon,
  TrashIcon,
  PlayIcon,
  StopIcon,
} from '@phosphor-icons/react'
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
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { voices } from '@/providers/openai/voices'
import { ImageGenModelsData } from '@/providers/replicate/images'
import { ArtStyles, AiStoryTopics } from '@/data/contentStyles'
import { AspectRatio } from '@/type/content'

const VoiceSelect = ({
  value,
  onChange,
}: {
  value: string
  onChange: (value: string) => void
}) => {
  const [isPlaying, setIsPlaying] = useState(false)
  const audioRef = useRef<HTMLAudioElement | null>(null)

  const selectedVoice = voices.find((v) => v.id === value)

  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause()
        audioRef.current = null
      }
    }
  }, [])

  const handlePreview = () => {
    if (!selectedVoice) return

    if (isPlaying && audioRef.current) {
      audioRef.current.pause()
      audioRef.current.currentTime = 0
      setIsPlaying(false)
      return
    }

    const audio = new Audio(`/voices/${selectedVoice.previewFile}`)
    audioRef.current = audio

    audio.onended = () => {
      setIsPlaying(false)
    }

    audio.onerror = () => {
      setIsPlaying(false)
    }

    audio.play()
    setIsPlaying(true)
  }

  const handleVoiceChange = (newVoice: string) => {
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current.currentTime = 0
      setIsPlaying(false)
    }
    onChange(newVoice)
  }

  return (
    <div className="flex gap-2">
      <Select value={value} onValueChange={handleVoiceChange}>
        <SelectTrigger className="flex-1">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectGroup>
            {voices.map((v) => (
              <SelectItem key={v.id} value={v.id}>
                {v.name}
              </SelectItem>
            ))}
          </SelectGroup>
        </SelectContent>
      </Select>
      <Button
        variant="secondary"
        size="icon"
        onClick={handlePreview}
        className="shrink-0"
        title={isPlaying ? 'Stop preview' : 'Play preview'}
      >
        {isPlaying ? <StopIcon size={16} /> : <PlayIcon size={16} />}
      </Button>
    </div>
  )
}

const ArtStyleSelect = ({
  styleId,
  styleDesc,
  onStyleChange,
  onDescChange,
}: {
  styleId: string
  styleDesc: string
  onStyleChange: (value: string) => void
  onDescChange: (value: string) => void
}) => {
  const handleStyleSelect = (newStyleId: string) => {
    onStyleChange(newStyleId)
    const style = ArtStyles.find((s) => s.uid === newStyleId)
    if (style) {
      onDescChange(style.description)
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <Select value={styleId} onValueChange={handleStyleSelect}>
        <SelectTrigger className="w-full">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectGroup>
            {ArtStyles.map((s) => (
              <SelectItem key={s.uid} value={s.uid}>
                {s.name}
              </SelectItem>
            ))}
          </SelectGroup>
        </SelectContent>
      </Select>
      <Textarea
        value={styleDesc}
        onChange={(e) => onDescChange(e.target.value)}
        className="h-[72px] resize-none"
        placeholder="Describe the art style..."
      />
    </div>
  )
}

type AiVideoSlide = {
  uid: string
  text: string
  imageDesc: string
  imageUrl?: string
}

type WizardStep = 'create-titles' | 'select-title'

const supportedRatios: AspectRatio[] = ['9:16']

const mockTitles = [
  'The Hidden River Beneath the Sea',
  'Secrets of the Deep Ocean',
  'Mysteries of Underwater Worlds',
  'The Black Sea Discovery',
  "Nature's Hidden Wonders",
]

const mockGenerateTitles = async (topic: string): Promise<string[]> => {
  await new Promise((r) => setTimeout(r, 1500))
  console.log('Generating titles for topic:', topic)
  return mockTitles
}

const mockGenerateStory = async (
  title: string,
  topic: string
): Promise<AiVideoSlide[]> => {
  await new Promise((r) => setTimeout(r, 2000))
  console.log('Generating story for:', title, topic)
  return [
    {
      uid: crypto.randomUUID(),
      text: 'In 2012, scientists discovered an underwater river at the bottom of the Black Sea.',
      imageDesc:
        'Dark underwater scene with a mysterious river flowing along the sea bed, bioluminescent particles',
    },
    {
      uid: crypto.randomUUID(),
      text: 'This river, complete with trees and leaves, snakes through the sea bed like a hidden world.',
      imageDesc:
        'Submerged trees and vegetation along an underwater riverbed, ethereal blue lighting',
    },
    {
      uid: crypto.randomUUID(),
      text: 'It is so large that if it were on land, it would be the sixth-largest river in the world.',
      imageDesc:
        'Vast underwater landscape showing the scale of the submarine river, dramatic perspective',
    },
  ]
}

const mockGenerateImage = async (
  imageDesc: string,
  style: string
): Promise<string> => {
  await new Promise((r) => setTimeout(r, 1000))
  console.log('Generating image:', imageDesc, 'Style:', style)
  return `https://picsum.photos/seed/${Math.random()}/400/711`
}

const SlideItem = ({
  slide,
  index,
  onDelete,
  onTextChange,
  onImageDescChange,
  onGenerateImage,
}: {
  slide: AiVideoSlide
  index: number
  onDelete: (uid: string) => void
  onTextChange: (uid: string, val: string) => void
  onImageDescChange: (uid: string, val: string) => void
  onGenerateImage: (uid: string) => Promise<void>
}) => {
  const [generating, setGenerating] = useState(false)

  const handleGenerate = async () => {
    setGenerating(true)
    await onGenerateImage(slide.uid)
    setGenerating(false)
  }

  return (
    <div className="group relative p-4 w-full rounded-xl bg-white border border-neutral-100 shadow-sm flex gap-4 hover:shadow-md transition-shadow">
      {/* Slide number badge */}
      <div className="absolute -left-3 -top-3 w-7 h-7 rounded-full bg-neutral-900 text-white text-xs font-medium flex items-center justify-center shadow-sm">
        {index + 1}
      </div>

      {/* Delete button */}
      <Button
        variant="ghost"
        size="icon"
        onClick={() => onDelete(slide.uid)}
        className="absolute -right-2 -top-2 w-7 h-7 rounded-full bg-white border border-neutral-200 shadow-sm opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-50 hover:text-red-600 hover:border-red-200"
      >
        <TrashIcon size={14} />
      </Button>

      {/* Text inputs */}
      <div className="flex-1 flex flex-col gap-3">
        <div className="flex flex-col gap-1.5">
          <Label className="text-xs text-muted-foreground">Narration</Label>
          <Textarea
            value={slide.text}
            onChange={(e) => onTextChange(slide.uid, e.target.value)}
            className="h-[72px] resize-none"
            placeholder="Enter the narration text for this slide..."
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label className="text-xs text-muted-foreground">Image Description</Label>
          <Textarea
            value={slide.imageDesc}
            onChange={(e) => onImageDescChange(slide.uid, e.target.value)}
            className="h-[72px] resize-none"
            placeholder="Describe the image to generate..."
          />
        </div>
      </div>

      {/* Image preview */}
      <div className="flex flex-col gap-2 shrink-0">
        <div className="w-[90px] h-[160px] bg-gradient-to-br from-neutral-100 to-neutral-200 rounded-lg overflow-hidden border border-neutral-200">
          {slide.imageUrl ? (
            <img
              src={slide.imageUrl}
              className="w-full h-full object-cover"
              alt="Generated"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <SparkleIcon size={24} className="text-neutral-300" />
            </div>
          )}
        </div>
        <Button
          variant="secondary"
          size="sm"
          onClick={handleGenerate}
          disabled={generating || !slide.imageDesc}
          className="w-full text-xs"
        >
          <SparkleIcon size={12} weight="fill" />
          {generating ? 'Generating...' : 'Generate'}
        </Button>
      </div>
    </div>
  )
}

const Section = ({
  children,
  className = '',
}: {
  children: React.ReactNode
  className?: string
}) => (
  <div
    className={`w-full max-w-[640px] p-4 rounded-xl bg-white border border-neutral-100 shadow-sm ${className}`}
  >
    {children}
  </div>
)

export const AIVideoPage = () => {
  const [slides, setSlides] = useState<AiVideoSlide[]>([])
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

  const onGenerateImage = async (uid: string) => {
    const slide = slides.find((s) => s.uid === uid)
    if (!slide) return

    const url = await mockGenerateImage(slide.imageDesc, artStyleDesc)

    setSlides((prev) =>
      prev.map((s) => (s.uid === uid ? { ...s, imageUrl: url } : s))
    )
  }

  const onGenerateTitles = async () => {
    if (!topic) return
    setGenerating(true)
    const titles = await mockGenerateTitles(topic)
    setGeneratedTitles(titles)
    setWizardStep('select-title')
    setGenerating(false)
  }

  const onGenerateStory = async () => {
    if (!selectedTitle) return
    setGenerating(true)
    const storySlides = await mockGenerateStory(selectedTitle, topic)
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
    <PageLayout title="AI Video">
      <div className="flex flex-col items-center gap-5 pb-8">
        {/* Settings Section */}
        <Section>
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-2 pb-2 border-b border-neutral-100">
              <div className="w-1.5 h-1.5 rounded-full bg-neutral-400" />
              <span className="text-sm font-medium text-neutral-700">
                Video Settings
              </span>
            </div>

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
          </div>
        </Section>

        {/* Title Section */}
        <Section>
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-2 pb-2 border-b border-neutral-100">
              <div className="w-1.5 h-1.5 rounded-full bg-neutral-400" />
              <span className="text-sm font-medium text-neutral-700">
                Video Title
              </span>
            </div>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter a compelling title for your video..."
            />
          </div>
        </Section>

        {/* Slides Section */}
        <div className="w-full max-w-[640px] flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-neutral-400" />
              <span className="text-sm font-medium text-neutral-700">
                Slides
              </span>
              {slides.length > 0 && (
                <span className="text-xs text-neutral-400">
                  ({slides.length})
                </span>
              )}
            </div>
            <Button variant='outline' size="sm" onClick={() => setWizardOpen(true)}>
              <SparkleIcon size={14} weight="fill" />
              Generate with AI
            </Button>
          </div>

          <div className="flex flex-col gap-4">
            {slides.map((slide, index) => (
              <SlideItem
                key={slide.uid}
                slide={slide}
                index={index}
                onDelete={onDeleteSlide}
                onTextChange={onTextChange}
                onImageDescChange={onImageDescChange}
                onGenerateImage={onGenerateImage}
              />
            ))}
          </div>

          <Button
            variant="outline"
            onClick={onAddSlide}
            className="w-full"
          >
            <PlusIcon size={16} weight="bold" />
            Add Slide
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
                    onClick={() => setWizardStep('create-titles')}
                  >
                    Back
                  </Button>
                  <Button
                    onClick={onGenerateStory}
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
    </PageLayout>
  )
}
