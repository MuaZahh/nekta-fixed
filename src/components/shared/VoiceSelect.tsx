import { useEffect, useRef, useState } from "react"
import { voices } from '@/providers/openai/voices'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import {
  PlayIcon,
  StopIcon,
} from '@phosphor-icons/react'

export const VoiceSelect = ({
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
        variant="default"
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
