import { useState, useMemo, useEffect } from 'react'
import { PlayIcon, CheckIcon, ArrowsOutIcon, CircleNotchIcon, CloudArrowDownIcon, PlusIcon, ImageIcon } from '@phosphor-icons/react'
import { BackgroundMedia } from './types'
import { MediaPreview } from '@/components/shared/MediaPreview'
import { useCaptionedVideoStore } from './store'
import { useContentStore } from '@/lib/contentManager'

const getHttpUrl = (localPath: string | null, port: number | null): string => {
  if (!localPath || !port) return ''
  return `http://127.0.0.1:${port}/?path=${encodeURIComponent(localPath)}`
}

const isImageFile = (url: string): boolean => {
  const lowercaseUrl = url.toLowerCase()
  return /\.(jpg|jpeg|png|gif|webp)(\?|$)/.test(lowercaseUrl)
}

export const BackgroundPicker = () => {
  const [previewMedia, setPreviewMedia] = useState<BackgroundMedia | null>(null)
  const [mediaServerPort, setMediaServerPort] = useState<number | null>(null)
  const [uploadedBackgrounds, setUploadedBackgrounds] = useState<BackgroundMedia[]>([])

  const selectedBackground = useCaptionedVideoStore((s) => s.selectedBackground)
  const setSelectedBackground = useCaptionedVideoStore((s) => s.setSelectedBackground)
  const clearSelectedBackground = useCaptionedVideoStore((s) => s.clearSelectedBackground)

  const isDownloading = useContentStore((s) => s.isDownloading)
  const isLoading = useContentStore((s) => s.isLoading)
  const items = useContentStore((s) => s.items)

  useEffect(() => {
    window.ipcRenderer.invoke('GET_MEDIA_SERVER_PORT').then(setMediaServerPort)
  }, [])

  useEffect(() => {
    const loadUploaded = async () => {
      const result = await window.ipcRenderer.invoke('GET_UPLOADED_BACKGROUNDS', { category: 'background' })
      if (result.ok && result.items) {
        const mapped = result.items.map((item: { uid: string; fileName: string; filePath: string; mimeType: string }): BackgroundMedia => {
          const httpUrl = getHttpUrl(item.filePath, mediaServerPort)
          const isImage = item.mimeType?.startsWith('image/')
          return {
            uid: item.uid,
            name: item.fileName,
            url: httpUrl,
            thumbnailUrl: httpUrl,
            type: isImage ? 'image' : 'video',
            durationMs: 30000,
          }
        })
        setUploadedBackgrounds(mapped)
      }
    }
    if (mediaServerPort) {
      loadUploaded()
    }
  }, [mediaServerPort])

  const libraryBackgrounds = useMemo(() => {
    return items
      .filter((item) => item.type === 'video' && item.category === 'background' && item.isDownloaded)
      .map((item): BackgroundMedia => {
        const httpUrl = getHttpUrl(item.localPath, mediaServerPort)
        return {
          uid: item.uid,
          name: item.name || item.tags?.join(', ') || 'Background',
          url: httpUrl || item.url,
          thumbnailUrl: httpUrl || item.url,
          type: 'video',
          durationMs: 30000,
        }
      })
  }, [items, mediaServerPort])

  const allBackgrounds = useMemo(() => {
    return [...uploadedBackgrounds, ...libraryBackgrounds]
  }, [uploadedBackgrounds, libraryBackgrounds])

  useEffect(() => {
    if (allBackgrounds.length > 0 && !selectedBackground) {
      setSelectedBackground(allBackgrounds[0])
    }
  }, [allBackgrounds, selectedBackground, setSelectedBackground])

  const handleUpload = async () => {
    const result = await window.ipcRenderer.invoke('SELECT_BACKGROUND_MEDIA', { category: 'background' })
    if (result.ok && result.mediaUrl) {
      const httpUrl = getHttpUrl(result.filePath, mediaServerPort)
      const isImage = result.mimeType?.startsWith('image/')
      const newBackground: BackgroundMedia = {
        uid: result.uid,
        name: result.fileName,
        url: httpUrl,
        thumbnailUrl: httpUrl,
        type: isImage ? 'image' : 'video',
        durationMs: 30000,
      }
      setUploadedBackgrounds((prev) => [newBackground, ...prev])
      setSelectedBackground(newBackground)
    }
  }

  const pendingCount = useMemo(() => {
    return items.filter(
      (item) => item.type === 'video' && item.category === 'background' && !item.isDownloaded
    ).length
  }, [items])

  const isSelected = (uid: string) => selectedBackground?.uid === uid

  const handleToggle = (media: BackgroundMedia) => {
    if (isSelected(media.uid)) {
      clearSelectedBackground()
    } else {
      setSelectedBackground(media)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[170px] text-neutral-400">
        <CircleNotchIcon className="animate-spin" size={24} />
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
          {/* Upload button */}
          <button
            onClick={handleUpload}
            className="relative shrink-0 rounded-xl overflow-hidden border-2 border-dashed border-neutral-300 hover:border-neutral-400 flex flex-col items-center justify-center cursor-pointer transition-colors"
            style={{ height: 170, width: 96 }}
          >
            <PlusIcon size={24} className="text-neutral-400" weight="bold" />
            <span className="text-[10px] text-neutral-500 mt-1">Upload</span>
          </button>

          {allBackgrounds.map((media) => {
            const selected = isSelected(media.uid)
            const isImage = media.type === 'image'
            return (
              <button
                key={media.uid}
                onClick={() => handleToggle(media)}
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
                {isImage ? (
                  <img
                    src={media.thumbnailUrl}
                    className="w-full h-full object-cover"
                    alt={media.name}
                  />
                ) : (
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
                )}

                {/* Hover overlay */}
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
                  {isImage ? (
                    <ImageIcon size={24} className="text-white" weight="fill" />
                  ) : (
                    <PlayIcon size={24} className="text-white" weight="fill" />
                  )}
                </div>

                {/* Preview button */}
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    setPreviewMedia(media)
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
                    {media.name}
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
        open={!!previewMedia}
        onClose={() => setPreviewMedia(null)}
        mediaUrl={previewMedia?.url || ''}
        mediaType={previewMedia?.type === 'image' ? 'image' : 'video'}
        title={previewMedia?.name}
      />
    </>
  )
}
