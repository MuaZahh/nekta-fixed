import { useState, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { ButtonGroup, ButtonGroupSeparator } from '@/components/ui/button-group'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  TrashIcon,
  ImageIcon,
  SpeakerHighIcon,
  StopIcon,
  CircleNotchIcon,
  UserIcon,
} from '@phosphor-icons/react'
import { useCaptionedVideoStore } from './store'
import { CharacterMode } from './types'
import { OpenAITTSProvider } from '@/lib/providers/openAI'

interface CaptionedVideoSlideProps {
  slideUid: string
  index: number
}

export const CaptionedVideoSlide = ({ slideUid, index }: CaptionedVideoSlideProps) => {
  const [generatingAudio, setGeneratingAudio] = useState(false)
  const [isPlaying, setIsPlaying] = useState(false)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const slide = useCaptionedVideoStore((s) => s.slides.find((sl) => sl.uid === slideUid))
  const voice = useCaptionedVideoStore((s) => s.voice)
  const deleteSlide = useCaptionedVideoStore((s) => s.deleteSlide)
  const updateSlideText = useCaptionedVideoStore((s) => s.updateSlideText)
  const updateSlideCharacterMode = useCaptionedVideoStore((s) => s.updateSlideCharacterMode)
  const openCharacterPicker = useCaptionedVideoStore((s) => s.openCharacterPicker)
  const updateSlideAudioData = useCaptionedVideoStore((s) => s.updateSlideAudioData)

  if (!slide) return null

  const computeHash = (text: string): string => {
    let hash = 0
    for (let i = 0; i < text.length; i++) {
      const char = text.charCodeAt(i)
      hash = ((hash << 5) - hash) + char
      hash = hash & hash
    }
    return hash.toString(36)
  }

  const handleAudioClick = async () => {
    if (isPlaying && audioRef.current) {
      audioRef.current.pause()
      audioRef.current.currentTime = 0
      setIsPlaying(false)
      return
    }

    if (!slide.text) return

    const textHash = computeHash(slide.text + voice)
    if (slide.textHash === textHash && slide.audioData?.audioUrl) {
      const audio = new Audio(slide.audioData.audioUrl)
      audioRef.current = audio
      audio.onended = () => setIsPlaying(false)
      audio.play()
      setIsPlaying(true)
      return
    }

    setGeneratingAudio(true)

    try {
      const tts = new OpenAITTSProvider()
      const result = await tts.generate(voice, slide.text)

      const saveResult = await window.ipcRenderer.invoke('SAVE_GENERATED_AUDIO', {
        base64Data: result.base64Data,
        filename: `tts_${slideUid}_${Date.now()}.mp3`,
      })

      if (!saveResult.ok) {
        console.error('Failed to save audio:', saveResult.error)
        setGeneratingAudio(false)
        return
      }

      const lastEndTime = result.timestamps.wordEndTimestampSeconds[result.timestamps.wordEndTimestampSeconds.length - 1] || 0
      const durationMs = Math.ceil(lastEndTime * 1000)

      updateSlideAudioData(slideUid, {
        audioUrl: saveResult.mediaUrl,
        timestamps: result.timestamps,
        durationMs
      }, textHash)

      if (audioRef.current) {
        audioRef.current.pause()
      }
      const audio = new Audio(saveResult.mediaUrl)
      audioRef.current = audio
      audio.onended = () => setIsPlaying(false)
      audio.play()
      setIsPlaying(true)
    } catch (error) {
      console.error('Failed to generate audio:', error)
    }

    setGeneratingAudio(false)
  }

  return (
    <div className="p-3 rounded-xl bg-neutral-50 border border-neutral-100 flex flex-col gap-2">
      {/* Header */}
      <div className="flex items-center gap-2">
        <ButtonGroup>
          <Button
            variant="default"
            className="h-7 disabled:opacity-100 disabled:bg-gray-100"
            disabled
          >
            Slide {index + 1}
          </Button>
          <ButtonGroupSeparator />
          <Button
            variant="default"
            size="icon"
            onClick={() => deleteSlide(slideUid)}
            className="text-xs w-fit px-2 h-7 hover:bg-red-100"
          >
            <TrashIcon size={12} weight="fill" />
          </Button>
        </ButtonGroup>
        <Button
          variant="default"
          size="icon"
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
        {/* Character mode selector */}
        <Select
          value={slide.characterMode}
          onValueChange={(v) => updateSlideCharacterMode(slideUid, v as CharacterMode)}
        >
          <SelectTrigger className="w-[100px] h-7 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              <SelectItem value="none">None</SelectItem>
              <SelectItem value="custom">Custom</SelectItem>
            </SelectGroup>
          </SelectContent>
        </Select>
      </div>

      {/* Content */}
      <div className="flex gap-3">
        {/* Text input */}
        <div className="flex-1 flex flex-col gap-1.5">
          <Label className="text-xs text-muted-foreground">Content</Label>
          <Textarea
            value={slide.text}
            onChange={(e) => updateSlideText(slideUid, e.target.value)}
            className="h-[100px] resize-none bg-white"
            placeholder="Enter the narration text for this slide..."
          />
        </div>

        {/* Character image preview - only shown when mode is 'custom' */}
        {slide.characterMode === 'custom' && (
          <div className="flex flex-col gap-1 shrink-0">
            <Label className="text-xs text-center text-muted-foreground">Character</Label>
            <button
              onClick={() => openCharacterPicker(slideUid)}
              className="relative w-[56px] h-[100px] bg-white rounded-lg overflow-hidden border border-neutral-200 group cursor-pointer hover:border-neutral-400 transition-colors"
            >
              {slide.characterImageUrl ? (
                <>
                  <img
                    src={slide.characterImageUrl}
                    className="w-full h-full object-cover"
                    alt="Character"
                  />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <UserIcon size={20} className="text-white" weight="bold" />
                  </div>
                </>
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center text-neutral-400 group-hover:text-neutral-600 transition-colors">
                  <ImageIcon size={20} />
                  <span className="text-[10px] mt-1">Select</span>
                </div>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
