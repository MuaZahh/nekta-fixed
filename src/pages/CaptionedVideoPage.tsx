import { Player } from '@remotion/player'
import React, { useEffect, useRef, useState } from 'react'
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
import { Label } from '@/components/ui/label'
import { PageHeader } from '@/components/shared/PageHeader'
import { Section } from '@/components/shared/Section'
import { FPS } from '@/remotion/constants'
import Chrome from '@uiw/react-color-chrome'

import { CaptionedVideoSlide } from './captioned-video/CaptionedVideoSlide'
import { CharacterPickerModal } from './captioned-video/CharacterPickerModal'
import { BackgroundPicker } from './captioned-video/BackgroundPicker'
import { GenerateContentModal } from './captioned-video/GenerateContentModal'
import { CaptionedVideo } from '@/remotion/templates/captioned-video/CaptionedVideo'
import { CaptionedVideoTimeline, CaptionedVideoBackground, captionedVideoTimelineSchema } from '@/remotion/templates/captioned-video/types'
import { OpenAITTSProvider } from '@/lib/providers/openAI'
import { useCaptionedVideoStore } from './captioned-video/store'

const transformMediaUrl = (url: string | undefined, port: number | null): string | undefined => {
  if (!url || !port) return url
  if (!url.startsWith('media://')) return url
  const encodedPath = url.slice('media://'.length)
  const filePath = decodeURIComponent(encodedPath)
  return `http://127.0.0.1:${port}/?path=${encodeURIComponent(filePath)}`
}

const MemoizedPlayer = React.memo(({ timeline, durationInFrames, aspectRatio }: {
  timeline: CaptionedVideoTimeline
  durationInFrames: number
  aspectRatio: string
}) => {

  return <Player
    component={CaptionedVideo}
    schema={captionedVideoTimelineSchema}
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
}, (prev, next) => {
  return JSON.stringify(prev.timeline) === JSON.stringify(next.timeline)
    && prev.durationInFrames === next.durationInFrames
    && prev.aspectRatio === next.aspectRatio
})

export const CaptionedVideoPage = () => {
  const setRoute = useRouter((state) => state.setRoute)
  const store = useCaptionedVideoStore()
  const mediaServerPortRef = useRef<number | null>(null)
  const [generateModalOpen, setGenerateModalOpen] = useState(false)

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
    ? Math.max(
        1,
        Math.ceil(
          (store.timeline.dialog.reduce(
            (sum, d) => sum + d.message.reduce((s, m) => s + m.durationMs, 0),
            0
          ) /
            1000) *
            FPS
        )
      )
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

  const generateAudioForSlide = async (uid: string): Promise<{ audioUrl: string; isNew: boolean } | null> => {
    const slide = store.getSlide(uid)
    if (!slide || !slide.text) return null

    const textHash = computeHash(slide.text + slide.voice)

    if (slide.textHash === textHash && slide.audioData?.audioUrl) {
      return { audioUrl: slide.audioData.audioUrl, isNew: false }
    }

    const tts = new OpenAITTSProvider()
    const result = await tts.generate(slide.voice, slide.text)

    const saveResult = await window.ipcRenderer.invoke('SAVE_GENERATED_AUDIO', {
      base64Data: result.base64Data,
      filename: `tts_${uid}_${Date.now()}.mp3`,
    })

    if (!saveResult.ok) {
      console.error('Failed to save audio:', saveResult.error)
      return null
    }

    const lastEndTime = result.timestamps.wordEndTimestampSeconds[result.timestamps.wordEndTimestampSeconds.length - 1] || 0
    const durationMs = Math.ceil(lastEndTime * 1000)

    store.updateSlideAudioData(uid, {
      audioUrl: saveResult.mediaUrl,
      timestamps: result.timestamps,
      durationMs
    }, textHash)

    return { audioUrl: saveResult.mediaUrl, isNew: true }
  }

  const createTimelineFromSlides = (): CaptionedVideoTimeline => {
    const currentSlides = useCaptionedVideoStore.getState().slides
    const currentBackground = useCaptionedVideoStore.getState().selectedBackground
    const currentPrimaryColor = useCaptionedVideoStore.getState().primaryColor
    const port = mediaServerPortRef.current

    const backgrounds: CaptionedVideoBackground[] = currentBackground
      ? [{
          type: currentBackground.type || 'video',
          url: currentBackground.url,
          fromMs: 0,
          durationMs: currentBackground.durationMs,
        }]
      : []

    const dialog = currentSlides
      .filter((s) => s.text.trim())
      .map((slide) => {
        const slideImageUrl = transformMediaUrl(slide.imageUrl, port)

        if (slide.audioData?.timestamps) {
          const { words, wordStartTimestampSeconds, wordEndTimestampSeconds } = slide.audioData.timestamps
          return {
            speaker: 'system' as const,
            imageUrl: slideImageUrl,
            message: [
              {
                words: words.map((word, i) => ({
                  word,
                  startMs: Math.round(wordStartTimestampSeconds[i] * 1000),
                  endMs: Math.round(wordEndTimestampSeconds[i] * 1000),
                })),
                audioUrl: transformMediaUrl(slide.audioData.audioUrl, port),
                durationMs: slide.audioData.durationMs,
              },
            ],
          }
        }

        return {
          speaker: 'system' as const,
          imageUrl: slideImageUrl,
          message: [
            {
              words: slide.text.split(' ').map((word, i, arr) => ({
                word,
                startMs: Math.round((i / arr.length) * 3000),
                endMs: Math.round(((i + 1) / arr.length) * 3000),
              })),
              audioUrl: undefined,
              durationMs: 3000,
            },
          ],
        }
      })

    return {
      background: backgrounds,
      dialog,
      settings: {
        highlightOutlineColor: currentPrimaryColor,
        audioBasedDuration: true,
      },
    }
  }

  const onGeneratePreview = async () => {
    if (!store.slides.length) return

    store.setPreviewGenerating(true)
    store.setPreviewError(null)

    const slidesNeedingAudio = store.slides.filter((s) => {
      if (!s.text) return false
      const hash = computeHash(s.text + s.voice)
      return s.textHash !== hash || !s.audioData?.audioUrl
    })

    store.setPreviewProgress({
      audioTotal: slidesNeedingAudio.length,
      audioDone: 0,
    })

    try {
      for (const slide of slidesNeedingAudio) {
        await generateAudioForSlide(slide.uid)
        store.incrementPreviewProgress()
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred'
      console.error('Preview generation failed:', err)
      store.setPreviewError(errorMessage)
      store.setPreviewGenerating(false)
      store.setPreviewProgress(null)
      return
    }

    const generatedTimeline = createTimelineFromSlides()
    store.setTimeline(generatedTimeline)

    store.setPreviewGenerating(false)
    store.setPreviewProgress(null)
    store.setIsPreviewGenerated(true)
  }

  const renderVideo = async (timelineToRender: CaptionedVideoTimeline) => {
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

    const renderDurationInFrames = Math.max(
      1,
      Math.ceil(
        (timelineToRender.dialog.reduce(
          (sum, d) => sum + d.message.reduce((s, m) => s + m.durationMs, 0),
          0
        ) /
          1000) *
          FPS
      )
    )

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
      'CaptionedVideo',
      'Captioned Video'
    )

    if (response.success) {
      console.log('Video rendered successfully!')
      if (!document.hasFocus()) {
        new Notification('Video Render Complete', {
          body: 'Your captioned video has finished rendering',
        })
      }
    } else {
      console.error('Failed to render video.')
    }

    store.setIsRendering(false)
  }

  const onSaveVideo = async () => {
    if (!store.slides.length) return

    await onGeneratePreview()
    const generatedTimeline = createTimelineFromSlides()
    await renderVideo(generatedTimeline)
  }

  return (
    <div className="flex flex-col h-full w-full">
      <PageHeader title="Captioned Video" />

      <div className="flex flex-1 overflow-hidden">
        <div className="flex-1 overflow-y-auto p-6 [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar]:bg-transparent [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-neutral-200 [&::-webkit-scrollbar-track]:my-2">
          <div className="flex flex-col gap-5 max-w-[640px] mx-auto pb-8">
            <Section title="Video Settings">
              <div className="flex flex-col gap-2">
                <Label>Primary Color</Label>
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => store.setColorPickerOpen(!store.colorPickerOpen)}
                    className="w-full h-9 rounded-md border border-input cursor-pointer hover:opacity-90 transition-opacity"
                    style={{ backgroundColor: store.primaryColor }}
                  />
                  {store.colorPickerOpen && (
                    <>
                      <div
                        className="fixed inset-0 z-40"
                        onClick={() => store.setColorPickerOpen(false)}
                      />
                      <div className="absolute top-11 left-0 z-50">
                        <Chrome
                          color={store.primaryColor}
                          onChange={(color) => store.setPrimaryColor(color.hex)}
                        />
                      </div>
                    </>
                  )}
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <Label>Background Videos</Label>
                <BackgroundPicker />
              </div>
            </Section>

            <Section
              title="Video Content"
              rightElement={
                <Button variant="default" size="sm" className="h-7" onClick={() => setGenerateModalOpen(true)}>
                  <SparkleIcon size={14} weight="fill" />
                  Generate
                </Button>
              }
            >
              <div className="flex flex-col gap-3">
                <Label>Slides</Label>
                {store.slides.map((slide, index) => (
                  <CaptionedVideoSlide
                    key={slide.uid}
                    slideUid={slide.uid}
                    index={index}
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

        <div className="w-[30%] flex-shrink-0 border-l border-neutral-100 p-3 flex flex-col items-center justify-center overflow-hidden gap-2">
          <Label>Preview</Label>
          {store.isPreviewGenerated && store.timeline && store.timeline.dialog.length > 0 ? (
            <MemoizedPlayer
              timeline={store.timeline}
              durationInFrames={durationInFrames}
              aspectRatio={store.aspectRatio}
            />
          ) : (
            <div
              className="w-full bg-neutral-100 border rounded-xl flex items-center justify-center"
              style={{
                maxHeight: '100%',
                aspectRatio: store.aspectRatio.replace(':', '/'),
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
              disabled={!store.slides.length || store.previewGenerating}
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
                {store.previewProgress.audioDone}/{store.previewProgress.audioTotal} audio
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
                disabled={!store.slides.length || store.previewGenerating || store.isRendering}
              >
                <DownloadSimpleIcon />
                Save video
              </Button>
            </div>
          )}
        </div>
      </div>

      <CharacterPickerModal />
      <GenerateContentModal
        open={generateModalOpen}
        onClose={() => setGenerateModalOpen(false)}
      />
    </div>
  )
}
