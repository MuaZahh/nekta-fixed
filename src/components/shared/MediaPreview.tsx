import { useEffect, useCallback } from 'react'
import { XIcon } from '@phosphor-icons/react'
import { Button } from '@/components/ui/button'

interface MediaPreviewProps {
  open: boolean
  onClose: () => void
  mediaUrl: string
  mediaType: 'image' | 'video'
  title?: string
}

export const MediaPreview = ({
  open,
  onClose,
  mediaUrl,
  mediaType,
  title,
}: MediaPreviewProps) => {
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      }
    },
    [onClose]
  )

  useEffect(() => {
    if (open) {
      document.addEventListener('keydown', handleKeyDown)
      return () => document.removeEventListener('keydown', handleKeyDown)
    }
  }, [open, handleKeyDown])

  if (!open) return null

  return (
    <div
      className="fixed inset-0 bg-black/90 flex items-center justify-center z-50"
      onClick={onClose}
    >
      <Button
        variant="ghost"
        size="icon"
        onClick={onClose}
        className="absolute right-4 top-4 text-white hover:bg-white/10 z-10"
      >
        <XIcon size={24} />
      </Button>

      {title && (
        <div className="absolute top-4 left-4 text-white text-sm font-medium">
          {title}
        </div>
      )}

      <div
        className="max-w-[90vw] max-h-[90vh] flex items-center justify-center"
        onClick={(e) => e.stopPropagation()}
      >
        {mediaType === 'image' ? (
          <img
            src={mediaUrl}
            alt={title || 'Preview'}
            className="max-w-full max-h-[90vh] object-contain rounded-lg"
          />
        ) : (
          <video
            src={mediaUrl}
            controls
            autoPlay
            className="max-w-full max-h-[90vh] object-contain rounded-lg"
          />
        )}
      </div>
    </div>
  )
}
