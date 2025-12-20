import { useEffect, useCallback } from 'react'
import { XIcon } from '@phosphor-icons/react'
import { Button } from '@/components/ui/button'

interface ConfirmModalProps {
  open: boolean
  onClose: () => void
  onConfirm: () => void
  title: string
  message: string
  confirmLabel?: string
  cancelLabel?: string
  confirmVariant?: 'default' | 'destructive'
}

export const ConfirmModal = ({
  open,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  confirmVariant = 'default',
}: ConfirmModalProps) => {
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
      className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50"
      onClick={onClose}
    >
      <div
        className="relative bg-white rounded-2xl p-6 w-[400px] flex flex-col gap-4 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <Button
          variant="ghost"
          size="icon"
          onClick={onClose}
          className="absolute right-3 top-3"
        >
          <XIcon size={18} />
        </Button>

        <div className="flex flex-col gap-2 pr-8">
          <h2 className="text-lg font-semibold text-neutral-900">{title}</h2>
          <p className="text-sm text-neutral-500">{message}</p>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="ghost" size="sm" onClick={onClose}>
            {cancelLabel}
          </Button>
          <Button
            variant={confirmVariant === 'destructive' ? 'default' : 'default'}
            size="sm"
            onClick={() => {
              onConfirm()
              onClose()
            }}
            className={confirmVariant === 'destructive' ? 'bg-red-500 hover:bg-red-600' : ''}
          >
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  )
}
