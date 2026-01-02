import React, { useRef, useEffect, useCallback, useState } from 'react'
import { PlayIcon, PauseIcon } from '@phosphor-icons/react'
import { Button } from '@/components/ui/button'

interface AudioRegionSelectorProps {
  audioUrl: string
  duration: number
  regionStart: number
  regionEnd: number
  isPlaying: boolean
  onRegionStartChange: (start: number) => void
  onRegionEndChange: (end: number) => void
  onPlayPause: () => void
  onDurationLoaded: (duration: number) => void
}

const formatTime = (seconds: number): string => {
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  const ms = Math.floor((seconds % 1) * 10)
  return `${mins}:${secs.toString().padStart(2, '0')}.${ms}`
}

export const AudioRegionSelector: React.FC<AudioRegionSelectorProps> = ({
  audioUrl,
  duration,
  regionStart,
  regionEnd,
  isPlaying,
  onRegionStartChange,
  onRegionEndChange,
  onPlayPause,
  onDurationLoaded,
}) => {
  const containerRef = useRef<HTMLDivElement>(null)
  const audioRef = useRef<HTMLAudioElement>(null)
  const [dragging, setDragging] = useState<'start' | 'end' | 'region' | null>(null)
  const dragStartX = useRef<number>(0)
  const dragStartValues = useRef<{ start: number; end: number }>({ start: 0, end: 0 })
  const [playbackPosition, setPlaybackPosition] = useState<number>(0)

  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return

    const handleLoadedMetadata = () => {
      onDurationLoaded(audio.duration)
    }

    audio.addEventListener('loadedmetadata', handleLoadedMetadata)
    return () => audio.removeEventListener('loadedmetadata', handleLoadedMetadata)
  }, [audioUrl, onDurationLoaded])

  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return

    if (isPlaying) {
      audio.currentTime = regionStart
      audio.play()
    } else {
      audio.pause()
    }
  }, [isPlaying, regionStart])

  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return

    const handleTimeUpdate = () => {
      setPlaybackPosition(audio.currentTime)
      if (audio.currentTime >= regionEnd) {
        audio.pause()
        audio.currentTime = regionStart
        onPlayPause()
      }
    }

    audio.addEventListener('timeupdate', handleTimeUpdate)
    return () => audio.removeEventListener('timeupdate', handleTimeUpdate)
  }, [regionEnd, regionStart, onPlayPause])

  const getPositionFromX = useCallback((clientX: number): number => {
    if (!containerRef.current || duration === 0) return 0
    const rect = containerRef.current.getBoundingClientRect()
    const x = clientX - rect.left
    const ratio = Math.max(0, Math.min(1, x / rect.width))
    return ratio * duration
  }, [duration])

  const handleMouseDown = useCallback((e: React.MouseEvent, type: 'start' | 'end' | 'region') => {
    e.preventDefault()
    setDragging(type)
    dragStartX.current = e.clientX
    dragStartValues.current = { start: regionStart, end: regionEnd }
  }, [regionStart, regionEnd])

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!dragging || !containerRef.current || duration === 0) return

    const rect = containerRef.current.getBoundingClientRect()
    const deltaX = e.clientX - dragStartX.current
    const deltaTime = (deltaX / rect.width) * duration

    if (dragging === 'start') {
      const newStart = Math.max(0, Math.min(regionEnd - 0.5, dragStartValues.current.start + deltaTime))
      onRegionStartChange(newStart)
    } else if (dragging === 'end') {
      const newEnd = Math.min(duration, Math.max(regionStart + 0.5, dragStartValues.current.end + deltaTime))
      onRegionEndChange(newEnd)
    } else if (dragging === 'region') {
      const regionDuration = dragStartValues.current.end - dragStartValues.current.start
      let newStart = dragStartValues.current.start + deltaTime
      let newEnd = dragStartValues.current.end + deltaTime

      if (newStart < 0) {
        newStart = 0
        newEnd = regionDuration
      }
      if (newEnd > duration) {
        newEnd = duration
        newStart = duration - regionDuration
      }

      onRegionStartChange(newStart)
      onRegionEndChange(newEnd)
    }
  }, [dragging, duration, regionStart, regionEnd, onRegionStartChange, onRegionEndChange])

  const handleMouseUp = useCallback(() => {
    setDragging(null)
  }, [])

  useEffect(() => {
    if (dragging) {
      window.addEventListener('mousemove', handleMouseMove)
      window.addEventListener('mouseup', handleMouseUp)
      return () => {
        window.removeEventListener('mousemove', handleMouseMove)
        window.removeEventListener('mouseup', handleMouseUp)
      }
    }
  }, [dragging, handleMouseMove, handleMouseUp])

  const startPercent = duration > 0 ? (regionStart / duration) * 100 : 0
  const endPercent = duration > 0 ? (regionEnd / duration) * 100 : 100
  const playbackPercent = duration > 0 ? (playbackPosition / duration) * 100 : 0

  const regionDuration = regionEnd - regionStart

  // Generate fake waveform bars
  const barCount = 80
  const bars = Array.from({ length: barCount }, (_, i) => {
    const seed = i * 7919 + 104729
    const height = 20 + (Math.sin(seed) * 0.5 + 0.5) * 60
    return height
  })

  return (
    <div className="flex flex-col gap-3">
      <audio ref={audioRef} src={audioUrl} preload="metadata" />

      {/* Waveform container */}
      <div
        ref={containerRef}
        className="relative h-20 bg-neutral-100 rounded-xl overflow-hidden cursor-pointer select-none"
      >
        {/* Fake waveform visualization */}
        <div className="absolute inset-0 flex items-center justify-center gap-[2px] px-2">
          {bars.map((height, i) => {
            const barPercent = (i / barCount) * 100
            const isInRegion = barPercent >= startPercent && barPercent <= endPercent
            return (
              <div
                key={i}
                className="flex-1 rounded-full transition-colors duration-150"
                style={{
                  height: `${height}%`,
                  backgroundColor: isInRegion ? '#3b82f6' : '#d1d5db',
                  opacity: isInRegion ? 1 : 0.5,
                }}
              />
            )
          })}
        </div>

        {/* Dimmed regions outside selection */}
        <div
          className="absolute inset-y-0 left-0 bg-white/60 pointer-events-none"
          style={{ width: `${startPercent}%` }}
        />
        <div
          className="absolute inset-y-0 right-0 bg-white/60 pointer-events-none"
          style={{ width: `${100 - endPercent}%` }}
        />

        {/* Draggable region (middle area) */}
        <div
          className="absolute inset-y-0 cursor-grab active:cursor-grabbing"
          style={{
            left: `${startPercent}%`,
            right: `${100 - endPercent}%`,
          }}
          onMouseDown={(e) => handleMouseDown(e, 'region')}
        />

        {/* Playback position indicator */}
        {isPlaying && playbackPosition >= regionStart && playbackPosition <= regionEnd && (
          <div
            className="absolute top-0 bottom-0 w-0.5 bg-red-500 pointer-events-none z-20"
            style={{ left: `${playbackPercent}%` }}
          />
        )}

        {/* Start handle */}
        <div
          className="absolute top-0 bottom-0 w-3 cursor-ew-resize z-10 flex items-center justify-center group"
          style={{ left: `calc(${startPercent}% - 6px)` }}
          onMouseDown={(e) => handleMouseDown(e, 'start')}
        >
          <div className="w-1.5 h-10 bg-blue-600 rounded-full group-hover:bg-blue-700 group-active:bg-blue-800 shadow-md" />
        </div>

        {/* End handle */}
        <div
          className="absolute top-0 bottom-0 w-3 cursor-ew-resize z-10 flex items-center justify-center group"
          style={{ left: `calc(${endPercent}% - 6px)` }}
          onMouseDown={(e) => handleMouseDown(e, 'end')}
        >
          <div className="w-1.5 h-10 bg-blue-600 rounded-full group-hover:bg-blue-700 group-active:bg-blue-800 shadow-md" />
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center justify-between">
        <Button
          variant="outline"
          size="sm"
          onClick={onPlayPause}
          disabled={duration === 0}
          className="gap-1.5"
        >
          {isPlaying ? <PauseIcon size={16} weight="fill" /> : <PlayIcon size={16} weight="fill" />}
          {isPlaying ? 'Pause' : 'Play Region'}
        </Button>

        <div className="flex items-center gap-4 text-sm text-neutral-600">
          <span>
            <span className="text-neutral-400">Offset:</span>{' '}
            <span className="font-medium text-neutral-900">{formatTime(regionStart)}</span>
          </span>
          <span>
            <span className="text-neutral-400">Duration:</span>{' '}
            <span className="font-medium text-neutral-900">{formatTime(regionDuration)}</span>
          </span>
        </div>
      </div>
    </div>
  )
}
