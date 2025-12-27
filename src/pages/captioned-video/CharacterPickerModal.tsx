import { useEffect, useCallback, useRef } from 'react'
import { XIcon, UploadSimpleIcon, CheckIcon } from '@phosphor-icons/react'
import { Button } from '@/components/ui/button'
import { CharacterImage } from './types'
import { CHARACTER_IMAGES } from './data'
import { useCaptionedVideoStore } from './store'

export const CharacterPickerModal = () => {
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  const characterPickerOpen = useCaptionedVideoStore((s) => s.characterPickerOpen)
  const selectedSlideForCharacter = useCaptionedVideoStore((s) => s.selectedSlideForCharacter)
  const slides = useCaptionedVideoStore((s) => s.slides)
  const closeCharacterPicker = useCaptionedVideoStore((s) => s.closeCharacterPicker)
  const updateSlideCharacterImage = useCaptionedVideoStore((s) => s.updateSlideCharacterImage)

  const selectedSlide = selectedSlideForCharacter
    ? slides.find((s) => s.uid === selectedSlideForCharacter)
    : null

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        closeCharacterPicker()
      }
    },
    [closeCharacterPicker]
  )

  useEffect(() => {
    if (characterPickerOpen) {
      document.addEventListener('keydown', handleKeyDown)
      return () => document.removeEventListener('keydown', handleKeyDown)
    }
  }, [characterPickerOpen, handleKeyDown])

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !selectedSlideForCharacter) return

    const reader = new FileReader()
    reader.onload = async () => {
      const base64Data = (reader.result as string).split(',')[1]
      const result = await window.ipcRenderer.invoke('SAVE_GENERATED_IMAGE', {
        base64Data,
        filename: `character_${Date.now()}.png`,
      })

      if (result.ok) {
        updateSlideCharacterImage(selectedSlideForCharacter, result.mediaUrl)
        closeCharacterPicker()
      }
    }
    reader.readAsDataURL(file)

    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const handleCharacterSelect = (character: CharacterImage) => {
    if (!selectedSlideForCharacter) return
    updateSlideCharacterImage(selectedSlideForCharacter, character.imageUrl)
    closeCharacterPicker()
  }

  if (!characterPickerOpen) return null

  return (
    <div
      className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50"
      onClick={closeCharacterPicker}
    >
      <div
        className="relative bg-white rounded-2xl p-6 w-[500px] max-h-[80vh] flex flex-col gap-4 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <Button
          variant="ghost"
          size="icon"
          onClick={closeCharacterPicker}
          className="absolute right-3 top-3"
        >
          <XIcon size={18} />
        </Button>

        <div className="flex flex-col gap-1 pr-8">
          <h2 className="text-lg font-semibold text-neutral-900">Select Character</h2>
          <p className="text-sm text-neutral-500">
            Choose a character from the library or upload your own image
          </p>
        </div>

        {/* Upload button */}
        <Button
          variant="default"
          size="sm"
          onClick={() => fileInputRef.current?.click()}
          className="w-full"
        >
          <UploadSimpleIcon size={16} />
          Upload Custom Image
        </Button>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileSelect}
          className="hidden"
        />

        {/* Character grid */}
        <div className="flex-1 overflow-y-auto">
          <div className="grid grid-cols-4 gap-3">
            {CHARACTER_IMAGES.map((character) => (
              <button
                key={character.uid}
                onClick={() => handleCharacterSelect(character)}
                className={`relative aspect-[2/3] rounded-xl overflow-hidden group cursor-pointer border-2 transition-all ${
                  selectedSlide?.characterImageUrl === character.imageUrl
                    ? 'border-black ring-2 ring-black/20'
                    : 'border-transparent hover:border-neutral-300'
                }`}
              >
                <img
                  src={character.imageUrl}
                  alt={character.name}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="absolute bottom-0 left-0 right-0 p-2 text-white text-xs font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                  {character.name}
                </div>
                {selectedSlide?.characterImageUrl === character.imageUrl && (
                  <div className="absolute top-2 right-2 w-6 h-6 bg-black rounded-full flex items-center justify-center">
                    <CheckIcon size={14} className="text-white" weight="bold" />
                  </div>
                )}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
