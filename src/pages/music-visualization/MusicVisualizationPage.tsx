import { Player } from '@remotion/player'
import React, { useEffect, useMemo, useRef, useCallback, useState } from 'react'
import {
  DownloadSimpleIcon,
  VideoCameraIcon,
  ImageIcon,
  MusicNoteIcon,
  FolderOpenIcon,
} from '@phosphor-icons/react'
import { useRouter } from '@/state/router'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { PageHeader } from '@/components/shared/PageHeader'
import { Section } from '@/components/shared/Section'
import { FPS } from '@/remotion/constants'
import Chrome from '@uiw/react-color-chrome'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

import { useMusicVisualizationStore, isWaveformColored, layoutRequiresCover, layoutHasBackgroundColor } from './store'
import { AudioRegionSelector } from './AudioRegionSelector'
import { MusicViz } from '@/remotion/templates/music-viz/MusicViz'
import { musicVizTimelineSchema, MusicVizTimeline, MusicLayoutTypeSchema, WaveformType } from '@/remotion/templates/music-viz/types'

const ASPECT_RATIO = '9:16'

const transformMediaUrl = (url: string | undefined | null, port: number | null): string | undefined => {
  if (!url || !port) return url ?? undefined
  if (!url.startsWith('media://')) return url
  const encodedPath = url.slice('media://'.length)
  const filePath = decodeURIComponent(encodedPath)
  return `http://127.0.0.1:${port}/?path=${encodeURIComponent(filePath)}`
}

const layoutOptions: { value: MusicLayoutTypeSchema; label: string }[] = [
  { value: 'big-cover', label: 'Big Cover' },
  { value: 'rotating-vinyl', label: 'Rotating Vinyl' },
  { value: 'rotating-disk', label: 'Rotating Disk' },
]

const layoutAttributions: Record<string, { title: string; author: string; url: string }> = {
  'rotating-disk': {
    title: 'Retro Disk',
    author: 'adalpan',
    url: 'https://rive.app/marketplace/23293-43605-retro-disk/',
  },
  'rotating-vinyl': {
    title: 'Vinyl Stream App',
    author: 'Novikoff',
    url: 'https://rive.app/marketplace/10020-19118-vinyl-stream-app/',
  },
}

const waveformOptions: { value: WaveformType; label: string }[] = [
  { value: 'thick-bars-one-side', label: 'Thick Bars (One Side)' },
  { value: 'thin-bars-one-side', label: 'Thin Bars (One Side)' },
  { value: 'thin-bars-double-side', label: 'Thin Bars (Double Side)' },
  { value: 'area-one-color', label: 'Area (Single Color)' },
  { value: 'area-three-colors', label: 'Area (Three Colors)' },
  { value: 'area-multi', label: 'Area (Multi Layer)' },
  { value: 'waves-multi', label: 'Waves (Multi Line)' },
  { value: 'waves-lines', label: 'Waves (Gradient Lines)' },
  { value: 'waves-edge-lines', label: 'Waves (Edge Lines)' },
  { value: 'circle-lines', label: 'Radial Circle' },
]

const MemoizedPlayer = React.memo(({ timeline, durationInFrames }: {
  timeline: MusicVizTimeline
  durationInFrames: number
}) => {
  return (
    <Player
      component={MusicViz}
      schema={musicVizTimelineSchema}
      inputProps={timeline}
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
  )
}, (prev, next) => {
  return JSON.stringify(prev.timeline) === JSON.stringify(next.timeline)
    && prev.durationInFrames === next.durationInFrames
})

export const MusicVisualizationPage = () => {
  const setRoute = useRouter((state) => state.setRoute)
  const store = useMusicVisualizationStore()
  const mediaServerPortRef = useRef<number | null>(null)
  const audioInputRef = useRef<HTMLInputElement>(null)
  const coverInputRef = useRef<HTMLInputElement>(null)
  const [audioFileName, setAudioFileName] = useState<string | null>(null)

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

  // Get timeline for preview
  const timeline = useMemo(() => {
    const t = store.getTimeline()
    if (!t) return null

    // Transform media URLs for preview
    return {
      ...t,
      audio: {
        ...t.audio,
        audioUrl: transformMediaUrl(t.audio.audioUrl, mediaServerPortRef.current) ?? t.audio.audioUrl,
      },
      layout: t.layout.layout === 'rotating-vinyl' || t.layout.layout === 'big-cover'
        ? {
            ...t.layout,
            coverUrl: transformMediaUrl(t.layout.coverUrl, mediaServerPortRef.current) ?? t.layout.coverUrl,
          }
        : t.layout,
    } as MusicVizTimeline
  }, [
    store.audioUrl,
    store.regionStart,
    store.regionEnd,
    store.layoutType,
    store.coverUrl,
    store.backgroundColor,
    store.songTitle,
    store.author,
    store.textColor,
    store.waveformType,
    store.waveformColor,
  ])

  const durationInFrames = useMemo(() => {
    return Math.max(1, Math.round(store.getRegionDuration() * FPS))
  }, [store.regionStart, store.regionEnd])

  const handleAudioFileSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = async () => {
      const base64Data = (reader.result as string).split(',')[1]
      const result = await window.ipcRenderer.invoke('SAVE_GENERATED_IMAGE', {
        base64Data,
        filename: `music_audio_${Date.now()}.${file.name.split('.').pop()}`,
      })

      if (result.ok) {
        store.setAudioUrl(result.mediaUrl)
        setAudioFileName(file.name)
      }
    }
    reader.readAsDataURL(file)

    if (audioInputRef.current) {
      audioInputRef.current.value = ''
    }
  }, [])

  const handleCoverFileSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = async () => {
      const base64Data = (reader.result as string).split(',')[1]
      const result = await window.ipcRenderer.invoke('SAVE_GENERATED_IMAGE', {
        base64Data,
        filename: `music_cover_${Date.now()}.${file.name.split('.').pop()}`,
      })

      if (result.ok) {
        store.setCoverUrl(result.mediaUrl)
      }
    }
    reader.readAsDataURL(file)

    if (coverInputRef.current) {
      coverInputRef.current.value = ''
    }
  }, [])

  const handleExport = useCallback(async () => {
    const exportTimeline = store.getTimeline()
    if (!exportTimeline) return

    store.setIsRendering(true)
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

    const renderDurationInFrames = Math.max(1, Math.round(store.getRegionDuration() * FPS))

    const inputProps = {
      ...exportTimeline,
      metadata: {
        durationInFrames: renderDurationInFrames,
        compositionWidth: 1080,
        compositionHeight: 1920,
        fps: FPS,
      },
    }

    try {
      const response = await window.ipcRenderer.invoke(
        'RENDER_MEDIA',
        inputProps,
        'MusicViz',
        store.songTitle || 'Music Video'
      )

      if (response.success) {
        console.log('Video rendered successfully!')
        if (!document.hasFocus()) {
          new Notification('Video Render Complete', {
            body: 'Your music video has finished rendering',
          })
        }
      } else {
        console.error('Failed to render video.')
      }
    } catch (error: unknown) {
      const err = error as Error
      store.setRenderError({ name: err.name, message: err.message, stack: err.stack })
    }

    store.setIsRendering(false)
  }, [store.songTitle])

  const canPreview = !!timeline
  const canExport = canPreview && !store.isRendering

  const showCoverUpload = layoutRequiresCover(store.layoutType)
  const showBackgroundColor = layoutHasBackgroundColor(store.layoutType)
  const showWaveformColor = isWaveformColored(store.waveformType)

  const audioUrlForSelector = transformMediaUrl(store.audioUrl, mediaServerPortRef.current)

  return (
    <div className="flex flex-col h-full w-full bg-[#F3F3EE] -m-6">
      <PageHeader title="Music Visualization" />

      <div className="flex flex-1 overflow-hidden">
        {/* Left panel - Settings */}
        <div className="flex-1 overflow-y-auto p-6 [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar]:bg-transparent [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-neutral-200 [&::-webkit-scrollbar-track]:my-2">
          <div className="flex flex-col gap-5 max-w-[640px] mx-auto pb-8">
            {/* Audio Section */}
            <Section title="Audio">
              <div className="flex flex-col gap-4">
                <div className="flex flex-col gap-2">
                  <Label>Audio File</Label>
                  <Button
                    onClick={() => audioInputRef.current?.click()}
                    className="w-full justify-start gap-2"
                  >
                    <MusicNoteIcon size={18} />
                    {audioFileName || (store.audioUrl ? 'Change Audio File' : 'Upload Audio File')}
                  </Button>
                  <input
                    ref={audioInputRef}
                    type="file"
                    accept="audio/*"
                    onChange={handleAudioFileSelect}
                    className="hidden"
                  />
                </div>

                {store.audioUrl && audioUrlForSelector && (
                  <div className="flex flex-col gap-2">
                    <Label>Select Region</Label>
                    <AudioRegionSelector
                      audioUrl={audioUrlForSelector}
                      duration={store.audioDuration}
                      regionStart={store.regionStart}
                      regionEnd={store.regionEnd}
                      isPlaying={store.isPlaying}
                      onRegionStartChange={store.setRegionStart}
                      onRegionEndChange={store.setRegionEnd}
                      onPlayPause={() => store.setIsPlaying(!store.isPlaying)}
                      onDurationLoaded={store.setAudioDuration}
                    />
                  </div>
                )}
              </div>
            </Section>

            {/* Content Section */}
            <Section title="Song Info">
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-2">
                  <Label>Song Title *</Label>
                  <Input
                    value={store.songTitle}
                    onChange={(e) => store.setSongTitle(e.target.value)}
                    placeholder="Enter song title"
                  />
                </div>

                <div className="flex flex-col gap-2">
                  <Label>Artist</Label>
                  <Input
                    value={store.author}
                    onChange={(e) => store.setAuthor(e.target.value)}
                    placeholder="Enter artist name"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <Label>Text Color</Label>
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => store.setColorPickerOpen(store.colorPickerOpen === 'text' ? null : 'text')}
                    className="w-full h-9 rounded-md border border-input cursor-pointer hover:opacity-90 transition-opacity flex items-center gap-2 px-3"
                  >
                    <div
                      className="w-5 h-5 rounded border border-neutral-200"
                      style={{ backgroundColor: store.textColor }}
                    />
                    <span className="text-sm text-neutral-600">{store.textColor}</span>
                  </button>
                  {store.colorPickerOpen === 'text' && (
                    <>
                      <div
                        className="fixed inset-0 z-40"
                        onClick={() => store.setColorPickerOpen(null)}
                      />
                      <div className="absolute top-11 left-0 z-50">
                        <Chrome
                          color={store.textColor}
                          onChange={(color) => store.setTextColor(color.hex)}
                        />
                      </div>
                    </>
                  )}
                </div>
              </div>
            </Section>

            {/* Layout Section */}
            <Section title="Layout">
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-2">
                  <Label>Layout Style</Label>
                  <Select
                    value={store.layoutType}
                    onValueChange={(v) => store.setLayoutType(v as MusicLayoutTypeSchema)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        {layoutOptions.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value}>
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                </div>

                {showBackgroundColor && (
                  <div className="flex flex-col gap-2">
                    <Label>Background Color</Label>
                    <div className="relative">
                      <button
                        type="button"
                        onClick={() => store.setColorPickerOpen(store.colorPickerOpen === 'background' ? null : 'background')}
                        className="w-full h-9 rounded-md border border-input cursor-pointer hover:opacity-90 transition-opacity flex items-center gap-2 px-3"
                      >
                        <div
                          className="w-5 h-5 rounded border border-neutral-200"
                          style={{ backgroundColor: store.backgroundColor }}
                        />
                        <span className="text-sm text-neutral-600">{store.backgroundColor}</span>
                      </button>
                      {store.colorPickerOpen === 'background' && (
                        <>
                          <div
                            className="fixed inset-0 z-40"
                            onClick={() => store.setColorPickerOpen(null)}
                          />
                          <div className="absolute top-11 left-0 z-50">
                            <Chrome
                              color={store.backgroundColor}
                              onChange={(color) => store.setBackgroundColor(color.hex)}
                            />
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {showCoverUpload && (
                <div className="flex flex-col gap-2">
                  <Label>Cover Image *</Label>
                  {store.coverUrl ? (
                    <div className="relative">
                      <img
                        src={transformMediaUrl(store.coverUrl, mediaServerPortRef.current)}
                        alt="Cover"
                        className="w-32 h-32 object-cover rounded-lg border"
                      />
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => coverInputRef.current?.click()}
                        className="absolute bottom-2 right-2"
                      >
                        Change
                      </Button>
                    </div>
                  ) : (
                    <Button
                      variant="outline"
                      onClick={() => coverInputRef.current?.click()}
                      className="w-full justify-start gap-2"
                    >
                      <ImageIcon size={18} />
                      Upload Cover Image
                    </Button>
                  )}
                  <input
                    ref={coverInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleCoverFileSelect}
                    className="hidden"
                  />
                </div>
              )}

              {layoutAttributions[store.layoutType] && (
                <div className="flex items-center gap-2 px-3 py-2 bg-neutral-100 rounded-lg text-xs text-neutral-500">
                  <span>
                    Based on{' '}
                    <a
                      href={layoutAttributions[store.layoutType].url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="underline hover:text-neutral-700"
                    >
                      {layoutAttributions[store.layoutType].title}
                    </a>{' '}
                    by {layoutAttributions[store.layoutType].author} (CC BY 4.0), modified.
                  </span>
                </div>
              )}
            </Section>

            {/* Waveform Section */}
            <Section title="Waveform">
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-2">
                  <Label>Waveform Style</Label>
                  <Select
                    value={store.waveformType}
                    onValueChange={(v) => store.setWaveformType(v as WaveformType)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        {waveformOptions.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value}>
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                </div>

                {showWaveformColor && (
                  <div className="flex flex-col gap-2">
                    <Label>Waveform Color</Label>
                    <div className="relative">
                      <button
                        type="button"
                        onClick={() => store.setColorPickerOpen(store.colorPickerOpen === 'waveform' ? null : 'waveform')}
                        className="w-full h-9 rounded-md border border-input cursor-pointer hover:opacity-90 transition-opacity flex items-center gap-2 px-3"
                      >
                        <div
                          className="w-5 h-5 rounded border border-neutral-200"
                          style={{ backgroundColor: store.waveformColor }}
                        />
                        <span className="text-sm text-neutral-600">{store.waveformColor}</span>
                      </button>
                      {store.colorPickerOpen === 'waveform' && (
                        <>
                          <div
                            className="fixed inset-0 z-40"
                            onClick={() => store.setColorPickerOpen(null)}
                          />
                          <div className="absolute top-11 left-0 z-50">
                            <Chrome
                              color={store.waveformColor}
                              onChange={(color) => store.setWaveformColor(color.hex)}
                            />
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </Section>
          </div>
        </div>

        {/* Right panel - Preview */}
        <div className="w-[30%] flex-shrink-0 border-l border-neutral-100 p-3 flex flex-col items-center justify-start overflow-y-auto gap-2">
          <Label>Preview</Label>
          {canPreview && timeline ? (
            <MemoizedPlayer
              timeline={timeline}
              durationInFrames={durationInFrames}
            />
          ) : (
            <div
              className="w-full bg-neutral-100 border rounded-xl flex flex-col items-center justify-center gap-2"
              style={{
                maxHeight: '100%',
                aspectRatio: ASPECT_RATIO.replace(':', '/'),
              }}
            >
              <VideoCameraIcon size={48} className="text-neutral-300" />
              <span className="text-xs text-neutral-400 text-center px-4">
                {!store.audioUrl && 'Upload an audio file to start'}
                {store.audioUrl && !store.songTitle && 'Enter a song title'}
                {store.audioUrl && store.songTitle && showCoverUpload && !store.coverUrl && 'Upload a cover image'}
              </span>
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
                onClick={handleExport}
                disabled={!canExport}
              >
                <DownloadSimpleIcon />
                Export Video
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
