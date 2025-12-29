import { useState, useMemo, useEffect } from 'react'
import { PlayIcon, CheckIcon, ArrowsOutIcon, CircleNotchIcon, CloudArrowDownIcon } from '@phosphor-icons/react'
import { BackgroundVideo } from './types'
import { MediaPreview } from '@/components/shared/MediaPreview'
import { useCaptionedVideoStore } from './store'
import { useContentStore, MediaContentItem } from '@/lib/contentManager'

const getHttpUrl = (localPath: string | null, port: number | null): string => {
  if (!localPath || !port) return ''
  return `http://127.0.0.1:${port}/?path=${encodeURIComponent(localPath)}`
}

export const BackgroundPicker = () => {
  const [previewVideo, setPreviewVideo] = useState<BackgroundVideo | null>(null)
  const [mediaServerPort, setMediaServerPort] = useState<number | null>(null)

  const selectedBackground = useCaptionedVideoStore((s) => s.selectedBackground)
  const setSelectedBackground = useCaptionedVideoStore((s) => s.setSelectedBackground)
  const clearSelectedBackground = useCaptionedVideoStore((s) => s.clearSelectedBackground)

  const isDownloading = useContentStore((s) => s.isDownloading)
  const isLoading = useContentStore((s) => s.isLoading)
  const items = useContentStore((s) => s.items)

  useEffect(() => {
    window.ipcRenderer.invoke('GET_MEDIA_SERVER_PORT').then(setMediaServerPort)
  }, [])

  const backgroundVideos = useMemo(() => {
    return items
      .filter((item) => item.type === 'video' && item.category === 'background' && item.isDownloaded)
      .map((item): BackgroundVideo => {
        const httpUrl = getHttpUrl(item.localPath, mediaServerPort)
        return {
          uid: item.uid,
          name: item.name || item.tags?.join(', ') || 'Background',
          url: httpUrl || item.url,
          thumbnailUrl: httpUrl || item.url,
          durationMs: 30000,
        }
      })
  }, [items, mediaServerPort])

  useEffect(() => {
    if (backgroundVideos.length > 0 && !selectedBackground) {
      setSelectedBackground(backgroundVideos[0])
    }
  }, [backgroundVideos, selectedBackground, setSelectedBackground])

  const pendingCount = useMemo(() => {
    return items.filter(
      (item) => item.type === 'video' && item.category === 'background' && !item.isDownloaded
    ).length
  }, [items])

  const isSelected = (uid: string) => selectedBackground?.uid === uid

  const handleToggle = (video: BackgroundVideo) => {
    if (isSelected(video.uid)) {
      clearSelectedBackground()
    } else {
      setSelectedBackground(video)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[170px] text-neutral-400">
        <CircleNotchIcon className="animate-spin" size={24} />
      </div>
    )
  }

  if (backgroundVideos.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-[170px] text-neutral-400 gap-2">
        {isDownloading && pendingCount > 0 ? (
          <>
            <CloudArrowDownIcon size={32} className="animate-pulse" />
            <span className="text-sm">Downloading {pendingCount} video{pendingCount > 1 ? 's' : ''}...</span>
          </>
        ) : (
          <span className="text-sm">No background videos available</span>
        )}
      </div>
    )
  }

  return (
    <>
      <div
        className="overflow-x-auto overflow-y-hidden [&::-webkit-scrollbar]:h-2 [&::-webkit-scrollbar]:bg-transparent [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-neutral-200"
        style={{ height: 200 }}
      >
        <div className="flex gap-3 pb-3 h-full items-start">
          {backgroundVideos.map((video) => {
            const selected = isSelected(video.uid)
            return (
              <button
                key={video.uid}
                onClick={() => handleToggle(video)}
                className={`relative shrink-0 rounded-xl overflow-hidden group cursor-pointer border-2 transition-all ${
                  selected
                    ? 'border-gray-500'
                    : 'border-transparent hover:border-neutral-300'
                }`}
                style={{
                  height: 170,
                  width: 96,
                }}
              >
                <video
                  src={video.thumbnailUrl}
                  className="w-full h-full object-cover"
                  muted
                  playsInline
                  onMouseEnter={(e) => e.currentTarget.play()}
                  onMouseLeave={(e) => {
                    e.currentTarget.pause()
                    e.currentTarget.currentTime = 0
                  }}
                />

                {/* Hover overlay */}
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
                  <PlayIcon size={24} className="text-white" weight="fill" />
                </div>

                {/* Preview button */}
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    setPreviewVideo(video)
                  }}
                  className="absolute top-2 right-2 w-6 h-6 bg-black/60 hover:bg-black/80 rounded-md flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <ArrowsOutIcon size={14} className="text-white" weight="bold" />
                </button>

                {/* Selected indicator */}
                {selected && (
                  <div className="absolute top-2 left-2 w-6 h-6 bg-black rounded-full flex items-center justify-center">
                    <CheckIcon size={14} className="text-white" weight="bold" />
                  </div>
                )}

                {/* Name overlay */}
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-2">
                  <span className="text-white text-[10px] font-medium line-clamp-1">
                    {video.name}
                  </span>
                </div>
              </button>
            )
          })}

          {/* Show pending downloads indicator */}
          {isDownloading && pendingCount > 0 && (
            <div
              className="relative shrink-0 rounded-xl overflow-hidden border-2 border-dashed border-neutral-200 flex flex-col items-center justify-center"
              style={{ height: 170, width: 96 }}
            >
              <CloudArrowDownIcon size={24} className="text-neutral-300 animate-pulse" />
              <span className="text-[10px] text-neutral-400 mt-1">+{pendingCount}</span>
            </div>
          )}
        </div>
      </div>

      <MediaPreview
        open={!!previewVideo}
        onClose={() => setPreviewVideo(null)}
        mediaUrl={previewVideo?.url || ''}
        mediaType="video"
        title={previewVideo?.name}
      />
    </>
  )
}
