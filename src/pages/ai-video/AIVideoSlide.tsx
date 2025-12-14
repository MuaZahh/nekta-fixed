import { useState, useRef } from "react"
import { AiVideoSlideType } from "./types"
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { ButtonGroup, ButtonGroupSeparator } from '@/components/ui/button-group'
import {
  SparkleIcon,
  TrashIcon,
  ImageIcon,
  SpeakerHighIcon,
  StopIcon,
  CircleNotchIcon,
} from '@phosphor-icons/react'

export const SlideItem = ({
  slide,
  index,
  onDelete,
  onTextChange,
  onImageDescChange,
  onGenerateImage,
  onGenerateAudio,
}: {
  slide: AiVideoSlideType
  index: number
  onDelete: (uid: string) => void
  onTextChange: (uid: string, val: string) => void
  onImageDescChange: (uid: string, val: string) => void
  onGenerateImage: (uid: string) => Promise<void>
  onGenerateAudio: (uid: string) => Promise<{ audioUrl: string; isNew: boolean } | null>
}) => {
  const [generating, setGenerating] = useState(false)
  const [generatingAudio, setGeneratingAudio] = useState(false)
  const [isPlaying, setIsPlaying] = useState(false)
  const audioRef = useRef<HTMLAudioElement | null>(null)

  const handleGenerate = async () => {
    setGenerating(true)
    await onGenerateImage(slide.uid)
    setGenerating(false)
  }

  const handleAudioClick = async () => {
    if (isPlaying && audioRef.current) {
      audioRef.current.pause()
      audioRef.current.currentTime = 0
      setIsPlaying(false)
      return
    }

    setGeneratingAudio(true)
    const result = await onGenerateAudio(slide.uid)
    setGeneratingAudio(false)

    if (!result) return

    if (audioRef.current) {
      audioRef.current.pause()
    }
    const audio = new Audio(result.audioUrl)
    audioRef.current = audio
    audio.onended = () => setIsPlaying(false)
    audio.play()
    setIsPlaying(true)
  }

  return (
    <div className="p-3 rounded-xl bg-neutral-50 border border-neutral-100 flex flex-col gap-2">
      {/* Header */}
      <div className='flex items-center gap-2'>
        <ButtonGroup>
          <Button
            variant="default"
            className='h-7 disabled:opacity-100 disabled:bg-gray-100'
            disabled
          >
              Slide {index+1}
            </Button>
            <ButtonGroupSeparator/>
          <Button
            variant='default'
            size='icon'
            onClick={() => onDelete(slide.uid)}
            className="text-xs w-fit px-2 h-7 hover:bg-red-100"
          >
            <TrashIcon size={12} weight="fill" />
          </Button>
          
        </ButtonGroup>
        <Button
            variant='default'
            size='icon'
            onClick={handleAudioClick}
            disabled={generatingAudio || !slide.text}
            className="text-xs w-fit px-2 h-7"
          >
            {generatingAudio ? (
              <CircleNotchIcon size={12} className="animate-spin" />
            ) : isPlaying ? (
              <StopIcon size={12} weight="fill" />
            ) : (
              <SpeakerHighIcon size={12} weight="fill" />
            )}
          </Button>
          <div className="grow" />
        <Button
            variant="default"
            size="sm"
            onClick={handleGenerate}
            disabled={generating}
            className="text-xs w-[101px] px-2 h-7"
          >
            {generating ? (
              <CircleNotchIcon size={12} className="animate-spin" />
            ) : (
              <SparkleIcon size={12} weight="fill" />
            )}
            {generating ? 'Generating' : 'Generate'}
          </Button>
      </div>
      {/* Content */}
      <div className="flex gap-3">
        {/* Text inputs */}
        <div className="flex-1 flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <Label className="text-xs text-muted-foreground">Content</Label>
            <Textarea
              value={slide.text}
              onChange={(e) => onTextChange(slide.uid, e.target.value)}
              className="h-[72px] resize-none bg-white"
              placeholder="Enter the narration text for this slide..."
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label className="text-xs text-muted-foreground">Image Description</Label>
            <Textarea
              value={slide.imageDesc}
              onChange={(e) => onImageDescChange(slide.uid, e.target.value)}
              className="h-[72px] resize-none bg-white"
              placeholder="Describe the image to generate..."
            />
          </div>
        </div>

        {/* Image preview */}
        <div className="flex flex-col gap-1 shrink-0">
          <Label className="text-xs text-center text-muted-foreground">Image</Label>
          
          <div className="w-[101px] h-[180px] bg-white rounded-lg overflow-hidden  border-neutral-200">
            {slide.imageUrl ? (
              <img
                src={slide.imageUrl}
                className="w-full h-full object-cover"
                alt="Generated"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <ImageIcon size={24} className="text-neutral-300" />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}