import { Player } from '@remotion/player'
import React, { useEffect, useRef, useMemo } from 'react'
import {
  PlusIcon,
  DownloadSimpleIcon,
  VideoCameraIcon,
  CircleNotchIcon,
  FolderOpenIcon,
  SparkleIcon,
  TrashIcon,
  UploadIcon,
} from '@phosphor-icons/react'
import { useRouter } from '@/state/router'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { PageHeader } from '@/components/shared/PageHeader'
import { Section } from '@/components/shared/Section'
import { VoiceSelect } from '@/components/shared/VoiceSelect'
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

import { useUgcAvatarHookStore } from './store'
import { BackgroundMedia, ContentClipState } from './types'
import { UgcAvatarHookVideo } from '@/remotion/templates/ugc-avatar-hook/UgcAvatarHookVideo'
import { UgcAvatarHookTimeline, ugcAvatarHookTimelineSchema, UgcClip } from '@/remotion/templates/ugc-avatar-hook/types'
import { OpenAITTSProvider } from '@/lib/providers/openAI'
import { useContentStore } from '@/lib/contentManager'
import { useSettingsStore } from '@/state/settings'
import { ApiKeysModal } from '@/components/shared/ApiKeysModal'
import { CaptionsType, VerticalAlignmentType } from '@/remotion/types'

const SECONDS_PER_WORD = 0.3

const getHttpUrl = (localPath: string | null, port: number | null): string => {
  if (!localPath || !port) return ''
  return `http://127.0.0.1:${port}/?path=${encodeURIComponent(localPath)}`
}

const transformMediaUrl = (url: string | undefined, port: number | null): string | undefined => {
  if (!url || !port) return url
  if (!url.startsWith('media://')) return url
  const encodedPath = url.slice('media://'.length)
  const filePath = decodeURIComponent(encodedPath)
  return `http://127.0.0.1:${port}/?path=${encodeURIComponent(filePath)}`
}

const HookBackgroundPicker: React.FC = () => {
  const store = useUgcAvatarHookStore()
  const items = useContentStore((s) => s.items)
  const [mediaServerPort, setMediaServerPort] = React.useState<number | null>(null)
  const [uploadedVideos, setUploadedVideos] = React.useState<BackgroundMedia[]>([])

  useEffect(() => {
    window.ipcRenderer.invoke('GET_MEDIA_SERVER_PORT').then(setMediaServerPort)
  }, [])

  useEffect(() => {
    const loadUploaded = async () => {
      const result = await window.ipcRenderer.invoke('GET_UPLOADED_BACKGROUNDS', { category: 'ugc' })
      if (result.ok && result.items) {
        const mapped = result.items.map((item: { uid: string; fileName: string; filePath: string; mimeType: string }): BackgroundMedia => {
          const httpUrl = getHttpUrl(item.filePath, mediaServerPort)
          return {
            uid: item.uid,
            name: item.fileName,
            url: httpUrl,
            thumbnailUrl: httpUrl,
            type: 'video',
            durationMs: 30000,
          }
        })
        setUploadedVideos(mapped)
      }
    }
    if (mediaServerPort) {
      loadUploaded()
    }
  }, [mediaServerPort])

  const ugcBackgrounds = useMemo(() => {
    return items
      .filter((item) => item.type === 'video' && item.category === 'ugc' && item.isDownloaded)
      .map((item): BackgroundMedia => {
        const httpUrl = getHttpUrl(item.localPath, mediaServerPort)
        return {
          uid: item.uid,
          name: item.name || item.tags?.join(', ') || 'UGC Video',
          url: httpUrl || item.url,
          thumbnailUrl: httpUrl || item.url,
          type: 'video',
          durationMs: 30000,
        }
      })
  }, [items, mediaServerPort])

  const allBackgrounds = useMemo(() => {
    return [...uploadedVideos, ...ugcBackgrounds]
  }, [uploadedVideos, ugcBackgrounds])

  const handleUpload = async () => {
    const result = await window.ipcRenderer.invoke('SELECT_BACKGROUND_MEDIA', { category: 'ugc' })
    if (result.ok && result.mediaUrl) {
      const httpUrl = getHttpUrl(result.filePath, mediaServerPort)
      const newBackground: BackgroundMedia = {
        uid: result.uid,
        name: result.fileName,
        url: httpUrl,
        thumbnailUrl: httpUrl,
        type: 'video',
        durationMs: 30000,
      }
      setUploadedVideos((prev) => [newBackground, ...prev])
      store.setHookBackground(newBackground)
    }
  }

  const isSelected = (uid: string) => store.hook.backgroundVideo?.uid === uid

  return (
    <div className="flex flex-col gap-2">
      <Label>Background Video</Label>
      <div
        className="overflow-x-auto overflow-y-hidden [&::-webkit-scrollbar]:h-2 [&::-webkit-scrollbar]:bg-transparent [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-neutral-200"
        style={{ height: 120 }}
      >
        <div className="flex gap-2 pb-2 h-full items-start">
          <button
            onClick={handleUpload}
            className="relative shrink-0 rounded-lg overflow-hidden border-2 border-dashed border-neutral-300 hover:border-neutral-400 flex flex-col items-center justify-center cursor-pointer transition-colors"
            style={{ height: 100, width: 56 }}
          >
            <UploadIcon size={20} className="text-neutral-400" weight="bold" />
            <span className="text-[9px] text-neutral-500 mt-1">Upload</span>
          </button>

          {allBackgrounds.map((media) => {
            const selected = isSelected(media.uid)
            return (
              <button
                key={media.uid}
                onClick={() => store.setHookBackground(media)}
                className={`relative shrink-0 rounded-lg overflow-hidden group cursor-pointer border-2 transition-all ${
                  selected ? 'border-gray-500' : 'border-transparent hover:border-neutral-300'
                }`}
                style={{ height: 100, width: 56 }}
              >
                <video
                  src={media.thumbnailUrl}
                  className="w-full h-full object-cover"
                  muted
                  playsInline
                  onMouseEnter={(e) => e.currentTarget.play()}
                  onMouseLeave={(e) => {
                    e.currentTarget.pause()
                    e.currentTarget.currentTime = 0
                  }}
                />
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}

const ContentBackgroundUpload: React.FC<{ clipUid: string }> = ({ clipUid }) => {
  const store = useUgcAvatarHookStore()
  const clip = store.contentClips.find((c) => c.uid === clipUid)
  const [mediaServerPort, setMediaServerPort] = React.useState<number | null>(null)

  useEffect(() => {
    window.ipcRenderer.invoke('GET_MEDIA_SERVER_PORT').then(setMediaServerPort)
  }, [])

  const handleUpload = async () => {
    const result = await window.ipcRenderer.invoke('SELECT_BACKGROUND_MEDIA', { category: 'ugc' })
    if (result.ok && result.mediaUrl) {
      const httpUrl = getHttpUrl(result.filePath, mediaServerPort)
      const newBackground: BackgroundMedia = {
        uid: result.uid,
        name: result.fileName,
        url: httpUrl,
        thumbnailUrl: httpUrl,
        type: 'video',
        durationMs: 30000,
      }
      store.setContentBackground(clipUid, newBackground)
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <Label className="text-xs">Video</Label>
      {clip?.backgroundVideo ? (
        <div className="flex items-center gap-2">
          <video
            src={clip.backgroundVideo.thumbnailUrl}
            className="w-16 h-16 object-cover rounded-lg border"
            muted
            playsInline
          />
          <div className="flex-1 text-xs text-neutral-600 truncate">
            {clip.backgroundVideo.name}
          </div>
          <Button variant="ghost" size="sm" onClick={handleUpload}>
            Change
          </Button>
        </div>
      ) : (
        <Button variant="outline" size="sm" onClick={handleUpload} className="w-full">
          <UploadIcon size={14} />
          Upload Video
        </Button>
      )}
    </div>
  )
}

const CaptionsTypeSelect: React.FC<{
  value: CaptionsType
  onChange: (value: CaptionsType) => void
}> = ({ value, onChange }) => (
  <Select value={value} onValueChange={onChange}>
    <SelectTrigger className="text-xs">
      <SelectValue />
    </SelectTrigger>
    <SelectContent>
      <SelectGroup>
        <SelectItem value="roundedTextbox">Rounded Textbox</SelectItem>
        <SelectItem value="outlined">Outlined Text</SelectItem>
      </SelectGroup>
    </SelectContent>
  </Select>
)

const CaptionsAlignSelect: React.FC<{
  value: VerticalAlignmentType
  onChange: (value: VerticalAlignmentType) => void
}> = ({ value, onChange }) => (
  <Select value={value} onValueChange={onChange}>
    <SelectTrigger className="text-xs">
      <SelectValue />
    </SelectTrigger>
    <SelectContent>
      <SelectGroup>
        <SelectItem value="top">Top</SelectItem>
        <SelectItem value="center">Center</SelectItem>
        <SelectItem value="bottom">Bottom</SelectItem>
      </SelectGroup>
    </SelectContent>
  </Select>
)

const ContentClipCard: React.FC<{ clipUid: string; index: number }> = ({ clipUid, index }) => {
  const store = useUgcAvatarHookStore()
  const clip = store.contentClips.find((c) => c.uid === clipUid)

  if (!clip) return null

  return (
    <div className="border border-neutral-200 rounded-lg p-3 bg-neutral-50">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-medium text-neutral-600">Content #{index + 1}</span>
        <Button
          variant="ghost"
          size="sm"
          className="h-6 w-6 p-0 text-neutral-400 hover:text-red-500"
          onClick={() => store.deleteContentClip(clipUid)}
        >
          <TrashIcon size={14} />
        </Button>
      </div>

      <div className="flex flex-col gap-3">
        <ContentBackgroundUpload clipUid={clipUid} />

        <div className="flex flex-col gap-1">
          <Label className="text-xs">Caption Text</Label>
          <Textarea
            value={clip.text}
            onChange={(e) => store.setContentText(clipUid, e.target.value)}
            placeholder="Enter caption text..."
            className="text-xs min-h-[60px]"
          />
        </div>

        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id={`voice-${clipUid}`}
            checked={clip.generateVoice}
            onChange={(e) => store.setContentGenerateVoice(clipUid, e.target.checked)}
            className="rounded"
          />
          <Label htmlFor={`voice-${clipUid}`} className="text-xs cursor-pointer">
            Generate voice
          </Label>
        </div>

        {clip.generateVoice && (
          <div className="flex flex-col gap-1">
            <Label className="text-xs">Voice</Label>
            <VoiceSelect
              value={clip.voice}
              onChange={(v) => store.setContentVoice(clipUid, v)}
              compact
            />
          </div>
        )}

        <div className="grid grid-cols-2 gap-2">
          <div className="flex flex-col gap-1">
            <Label className="text-xs">Captions Style</Label>
            <CaptionsTypeSelect
              value={clip.captionsType}
              onChange={(v) => store.setContentCaptionsType(clipUid, v)}
            />
          </div>
          <div className="flex flex-col gap-1">
            <Label className="text-xs">Alignment</Label>
            <CaptionsAlignSelect
              value={clip.captionsAlign}
              onChange={(v) => store.setContentCaptionsAlign(clipUid, v)}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div className="flex flex-col gap-1">
            <Label className="text-xs">Duration (ms)</Label>
            <Input
              type="number"
              value={clip.durationMs || ''}
              onChange={(e) => store.setContentDuration(clipUid, e.target.value ? Number(e.target.value) : undefined)}
              placeholder="Auto"
              className="text-xs"
            />
          </div>
          <div className="flex flex-col gap-1">
            <Label className="text-xs">Offset Start (ms)</Label>
            <Input
              type="number"
              value={clip.offsetStartMs || ''}
              onChange={(e) => store.setContentOffsetStart(clipUid, e.target.value ? Number(e.target.value) : undefined)}
              placeholder="0"
              className="text-xs"
            />
          </div>
        </div>
      </div>
    </div>
  )
}

const MemoizedPlayer = React.memo(({ timeline, durationInFrames, aspectRatio }: {
  timeline: UgcAvatarHookTimeline
  durationInFrames: number
  aspectRatio: string
}) => {
  return (
    <Player
      component={UgcAvatarHookVideo}
      schema={ugcAvatarHookTimelineSchema}
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

export const UgcAvatarHookPage = () => {
  const setRoute = useRouter((state) => state.setRoute)
  const store = useUgcAvatarHookStore()
  const apiKeys = useSettingsStore((state) => state.apiKeys)
  const mediaServerPortRef = useRef<number | null>(null)
  const [apiKeysModalOpen, setApiKeysModalOpen] = React.useState(false)
  const [pendingAction, setPendingAction] = React.useState<'preview' | 'save' | null>(null)

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

  const computeHash = (text: string): string => {
    let hash = 0
    for (let i = 0; i < text.length; i++) {
      const char = text.charCodeAt(i)
      hash = ((hash << 5) - hash) + char
      hash = hash & hash
    }
    return hash.toString(36)
  }

  const generateAudioForHook = async (): Promise<boolean> => {
    const hook = store.hook
    if (!hook.text || !hook.generateVoice) return true

    const textHash = computeHash(hook.text + hook.voice)
    if (hook.textHash === textHash && hook.audioData?.audioUrl) {
      return true
    }

    const tts = new OpenAITTSProvider()
    const result = await tts.generate(hook.voice, hook.text)

    const saveResult = await window.ipcRenderer.invoke('SAVE_GENERATED_AUDIO', {
      base64Data: result.base64Data,
      filename: `tts_hook_${Date.now()}.mp3`,
    })

    if (!saveResult.ok) {
      console.error('Failed to save audio:', saveResult.error)
      return false
    }

    const lastEndTime = result.timestamps.wordEndTimestampSeconds[result.timestamps.wordEndTimestampSeconds.length - 1] || 0
    const durationMs = Math.ceil(lastEndTime * 1000)

    store.setHookAudioData({
      audioUrl: saveResult.mediaUrl,
      durationMs,
      timestamps: result.timestamps,
    }, textHash)

    return true
  }

  const generateAudioForContent = async (clipUid: string): Promise<boolean> => {
    const clip = store.getContentClip(clipUid)
    if (!clip || !clip.text || !clip.generateVoice) return true

    const textHash = computeHash(clip.text + clip.voice)
    if (clip.textHash === textHash && clip.audioData?.audioUrl) {
      return true
    }

    const tts = new OpenAITTSProvider()
    const result = await tts.generate(clip.voice, clip.text)

    const saveResult = await window.ipcRenderer.invoke('SAVE_GENERATED_AUDIO', {
      base64Data: result.base64Data,
      filename: `tts_content_${clipUid}_${Date.now()}.mp3`,
    })

    if (!saveResult.ok) {
      console.error('Failed to save audio:', saveResult.error)
      return false
    }

    const lastEndTime = result.timestamps.wordEndTimestampSeconds[result.timestamps.wordEndTimestampSeconds.length - 1] || 0
    const durationMs = Math.ceil(lastEndTime * 1000)

    store.setContentAudioData(clipUid, {
      audioUrl: saveResult.mediaUrl,
      durationMs,
      timestamps: result.timestamps,
    }, textHash)

    return true
  }

  const createTimelineFromState = (): UgcAvatarHookTimeline | null => {
    const currentState = useUgcAvatarHookStore.getState()
    const port = mediaServerPortRef.current

    if (!currentState.hook.backgroundVideo) return null

    const createClip = (
      bgVideo: BackgroundMedia,
      text: string,
      generateVoice: boolean,
      audioData: typeof currentState.hook.audioData,
      captionsType: CaptionsType,
      captionsAlign: VerticalAlignmentType,
      highlightColor: string,
      durationMs?: number,
      offsetStartMs?: number
    ): UgcClip => {
      const bgUrl = transformMediaUrl(bgVideo.url, port) || bgVideo.url

      if (generateVoice && audioData) {
        const { words, wordStartTimestampSeconds, wordEndTimestampSeconds } = audioData.timestamps
        return {
          backgroundVideoUrl: bgUrl,
          durationMs,
          offsetStartMs,
          captionsType,
          captionsAlign,
          highlightColor,
          message: {
            words: words.map((word, i) => ({
              word,
              startMs: Math.round(wordStartTimestampSeconds[i] * 1000),
              endMs: Math.round(wordEndTimestampSeconds[i] * 1000),
            })),
            audioUrl: transformMediaUrl(audioData.audioUrl, port),
            durationMs: audioData.durationMs,
          },
        }
      }

      return {
        backgroundVideoUrl: bgUrl,
        durationMs: durationMs || Math.ceil(text.split(/\s+/).filter(Boolean).length * SECONDS_PER_WORD * 1000),
        offsetStartMs,
        captionsType,
        captionsAlign,
        highlightColor,
        text,
      }
    }

    const hook = createClip(
      currentState.hook.backgroundVideo,
      currentState.hook.text,
      currentState.hook.generateVoice,
      currentState.hook.audioData,
      currentState.hook.captionsType,
      currentState.hook.captionsAlign,
      currentState.hook.highlightColor,
      currentState.hook.durationMs,
      currentState.hook.offsetStartMs
    )

    const content: UgcClip[] = currentState.contentClips
      .filter((c) => c.backgroundVideo)
      .map((c) =>
        createClip(
          c.backgroundVideo!,
          c.text,
          c.generateVoice,
          c.audioData,
          c.captionsType,
          c.captionsAlign,
          c.highlightColor,
          c.durationMs,
          c.offsetStartMs
        )
      )

    return { hook, content }
  }

  const calculateDuration = (): number => {
    const timeline = store.timeline
    if (!timeline) return 1

    const calculateClipDuration = (clip: UgcClip): number => {
      if (clip.durationMs) return clip.durationMs
      if (clip.message) return clip.message.durationMs
      if (clip.text) {
        const wordCount = clip.text.split(/\s+/).filter(Boolean).length
        return wordCount * SECONDS_PER_WORD * 1000
      }
      return 3000
    }

    const totalMs = calculateClipDuration(timeline.hook) +
      timeline.content.reduce((sum, c) => sum + calculateClipDuration(c), 0)

    return Math.max(1, Math.round((totalMs / 1000) * FPS))
  }

  const durationInFrames = calculateDuration()

  const onGeneratePreview = async () => {
    if (!store.hook.backgroundVideo || !store.hook.text) return

    store.setPreviewGenerating(true)
    store.setPreviewError(null)

    const clipsNeedingAudio: string[] = []

    if (store.hook.generateVoice && store.hook.text) {
      const hash = computeHash(store.hook.text + store.hook.voice)
      if (store.hook.textHash !== hash || !store.hook.audioData?.audioUrl) {
        clipsNeedingAudio.push('hook')
      }
    }

    for (const clip of store.contentClips) {
      if (clip.generateVoice && clip.text) {
        const hash = computeHash(clip.text + clip.voice)
        if (clip.textHash !== hash || !clip.audioData?.audioUrl) {
          clipsNeedingAudio.push(clip.uid)
        }
      }
    }

    store.setPreviewProgress({
      audioTotal: clipsNeedingAudio.length,
      audioDone: 0,
    })

    try {
      for (const id of clipsNeedingAudio) {
        if (id === 'hook') {
          await generateAudioForHook()
        } else {
          await generateAudioForContent(id)
        }
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

    const generatedTimeline = createTimelineFromState()
    store.setTimeline(generatedTimeline)

    store.setPreviewGenerating(false)
    store.setPreviewProgress(null)
    store.setIsPreviewGenerated(true)
  }

  const renderVideo = async (timelineToRender: UgcAvatarHookTimeline) => {
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

    const inputProps = {
      ...timelineToRender,
      metadata: {
        durationInFrames: calculateDuration(),
        compositionWidth: 1080,
        compositionHeight: 1920,
        fps: FPS,
      },
    }

    const response = await window.ipcRenderer.invoke(
      'RENDER_MEDIA',
      inputProps,
      'UgcAvatarHookVideo',
      'UGC Avatar Hook'
    )

    if (response.success) {
      console.log('Video rendered successfully!')
      if (!document.hasFocus()) {
        new Notification('Video Render Complete', {
          body: 'Your UGC Avatar Hook video has finished rendering',
        })
      }
    } else {
      console.error('Failed to render video.')
    }

    store.setIsRendering(false)
  }

  const onSaveVideo = async () => {
    if (!store.hook.backgroundVideo) return

    await onGeneratePreview()
    const generatedTimeline = createTimelineFromState()
    if (generatedTimeline) {
      await renderVideo(generatedTimeline)
    }
  }

  const needsVoiceGeneration = store.hook.generateVoice || store.contentClips.some(c => c.generateVoice)
  const hasRequiredApiKeys = !!apiKeys.openai?.trim()
  const needsApiKeys = needsVoiceGeneration && !hasRequiredApiKeys

  const handleGeneratePreviewClick = () => {
    if (needsApiKeys) {
      setPendingAction('preview')
      setApiKeysModalOpen(true)
      return
    }
    onGeneratePreview()
  }

  const handleSaveVideoClick = () => {
    if (needsApiKeys) {
      setPendingAction('save')
      setApiKeysModalOpen(true)
      return
    }
    onSaveVideo()
  }

  const handleApiKeysModalContinue = () => {
    if (pendingAction === 'preview') {
      onGeneratePreview()
    } else if (pendingAction === 'save') {
      onSaveVideo()
    }
    setPendingAction(null)
  }

  const handleApiKeysModalClose = () => {
    setApiKeysModalOpen(false)
    setPendingAction(null)
  }

  const canGeneratePreview = store.hook.backgroundVideo && store.hook.text

  return (
    <div className="flex flex-col h-full w-full">
      <PageHeader title="UGC Avatar Hook" />

      <div className="flex flex-1 overflow-hidden">
        <div className="flex-1 overflow-y-auto p-6 [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar]:bg-transparent [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-neutral-200 [&::-webkit-scrollbar-track]:my-2">
          <div className="flex flex-col gap-5 max-w-[640px] mx-auto pb-8">
            {/* Hook Section */}
            <Section title="Hook">
              <HookBackgroundPicker />

              <div className="flex flex-col gap-2">
                <Label>Caption Text</Label>
                <Textarea
                  value={store.hook.text}
                  onChange={(e) => store.setHookText(e.target.value)}
                  placeholder="Enter the hook caption text..."
                  className="min-h-[80px]"
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="hook-voice"
                  checked={store.hook.generateVoice}
                  onChange={(e) => store.setHookGenerateVoice(e.target.checked)}
                  className="rounded"
                />
                <Label htmlFor="hook-voice" className="cursor-pointer">
                  Generate voice
                </Label>
              </div>

              {store.hook.generateVoice && (
                <div className="flex flex-col gap-2">
                  <Label>Voice</Label>
                  <VoiceSelect
                    value={store.hook.voice}
                    onChange={store.setHookVoice}
                  />
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-2">
                  <Label>Captions Style</Label>
                  <CaptionsTypeSelect
                    value={store.hook.captionsType}
                    onChange={store.setHookCaptionsType}
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <Label>Alignment</Label>
                  <CaptionsAlignSelect
                    value={store.hook.captionsAlign}
                    onChange={store.setHookCaptionsAlign}
                  />
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <Label>Highlight Color</Label>
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => store.setColorPickerOpen(!store.colorPickerOpen, 'hook')}
                    className="w-full h-9 rounded-md border border-input cursor-pointer hover:opacity-90 transition-opacity"
                    style={{ backgroundColor: store.hook.highlightColor }}
                  />
                  {store.colorPickerOpen && store.colorPickerTarget === 'hook' && (
                    <>
                      <div
                        className="fixed inset-0 z-40"
                        onClick={() => store.setColorPickerOpen(false)}
                      />
                      <div className="absolute top-11 left-0 z-50">
                        <Chrome
                          color={store.hook.highlightColor}
                          onChange={(color) => store.setHookHighlightColor(color.hex)}
                        />
                      </div>
                    </>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-2">
                  <Label>Duration (ms)</Label>
                  <Input
                    type="number"
                    value={store.hook.durationMs || ''}
                    onChange={(e) => store.setHookDuration(e.target.value ? Number(e.target.value) : undefined)}
                    placeholder="Auto"
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <Label>Offset Start (ms)</Label>
                  <Input
                    type="number"
                    value={store.hook.offsetStartMs || ''}
                    onChange={(e) => store.setHookOffsetStart(e.target.value ? Number(e.target.value) : undefined)}
                    placeholder="0"
                  />
                </div>
              </div>
            </Section>

            {/* Content Section */}
            <Section title="Content">
              <div className="flex flex-col gap-3">
                {store.contentClips.map((clip, index) => (
                  <ContentClipCard key={clip.uid} clipUid={clip.uid} index={index} />
                ))}
              </div>

              <Button variant="default" onClick={store.addContentClip} className="w-full" size="sm">
                <PlusIcon size={16} weight="bold" />
                Add Content Clip
              </Button>
            </Section>
          </div>
        </div>

        {/* Preview Panel */}
        <div className="w-[30%] flex-shrink-0 border-l border-neutral-100 p-3 flex flex-col items-center justify-center overflow-hidden gap-2">
          <Label>Preview</Label>
          {store.isPreviewGenerated && store.timeline ? (
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
              onClick={handleGeneratePreviewClick}
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
                onClick={handleSaveVideoClick}
                disabled={!canGeneratePreview || store.previewGenerating || store.isRendering}
              >
                <DownloadSimpleIcon />
                Save video
              </Button>
            </div>
          )}
        </div>
      </div>

      <ApiKeysModal
        open={apiKeysModalOpen}
        onClose={handleApiKeysModalClose}
        onContinue={handleApiKeysModalContinue}
      />
    </div>
  )
}
