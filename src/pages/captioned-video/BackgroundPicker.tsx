import { useState } from 'react'
import { PlayIcon, CheckIcon, ArrowsOutIcon } from '@phosphor-icons/react'
import { BackgroundVideo } from './types'
import { BACKGROUND_VIDEOS } from './data'
import { MediaPreview } from '@/components/shared/MediaPreview'
import { useCaptionedVideoStore } from './store'

export const BackgroundPicker = () => {
  const [previewVideo, setPreviewVideo] = useState<BackgroundVideo | null>(null)

  const selectedBackground = useCaptionedVideoStore((s) => s.selectedBackground)
  const setSelectedBackground = useCaptionedVideoStore((s) => s.setSelectedBackground)
  const clearSelectedBackground = useCaptionedVideoStore((s) => s.clearSelectedBackground)

  const isSelected = (uid: string) => selectedBackground?.uid === uid

  const handleToggle = (video: BackgroundVideo) => {
    if (isSelected(video.uid)) {
      clearSelectedBackground()
    } else {
      setSelectedBackground(video)
    }
  }

  return (
    <>
      <div
        className="overflow-x-auto overflow-y-hidden [&::-webkit-scrollbar]:h-2 [&::-webkit-scrollbar]:bg-transparent [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-neutral-200"
        style={{ height: 200 }}
      >
        <div className="flex gap-3 pb-3 h-full items-start">
          {BACKGROUND_VIDEOS.map((video) => {
            const selected = isSelected(video.uid)
            return (
              <button
                key={video.uid}
                onClick={() => handleToggle(video)}
                className={`relative shrink-0 rounded-xl overflow-hidden group cursor-pointer border-2 transition-all ${
                  selected
                    ? 'border-black ring-2 ring-black/20'
                    : 'border-transparent hover:border-neutral-300'
                }`}
                style={{
                  height: 170,
                  width: 96, // 9:16 ratio: 170 * 9/16 = 95.625
                }}
              >
                <img
                  src={video.thumbnailUrl}
                  alt={video.name}
                  className="w-full h-full object-cover"
                />

                {/* Hover overlay */}
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
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
        </div>
      </div>

      <MediaPreview
        open={!!previewVideo}
        onClose={() => setPreviewVideo(null)}
        mediaUrl={previewVideo?.url || ''}
        mediaType="image"
        title={previewVideo?.name}
      />
    </>
  )
}
