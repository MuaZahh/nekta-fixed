import { useState } from 'react'
import { SparkleIcon, XIcon, CircleNotchIcon } from '@phosphor-icons/react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'

interface GenerateSlidesModalProps {
  open: boolean
  onClose: () => void
  onGenerate: (description: string) => Promise<void>
}

export const GenerateSlidesModal = ({
  open,
  onClose,
  onGenerate,
}: GenerateSlidesModalProps) => {
  const [generating, setGenerating] = useState(false)
  const [description, setDescription] = useState('')

  const handleClose = () => {
    setDescription('')
    onClose()
  }

  const handleGenerate = async () => {
    if (!description.trim()) return
    setGenerating(true)
    await onGenerate(description.trim())
    handleClose()
    setGenerating(false)
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="relative bg-white rounded-2xl p-6 w-[520px] flex flex-col gap-5 shadow-2xl">
        <Button
          variant="ghost"
          size="icon"
          onClick={handleClose}
          className="absolute right-3 top-3"
          disabled={generating}
        >
          <XIcon size={18} />
        </Button>

        <div className="flex flex-col gap-1">
          <h2 className="text-lg font-semibold text-neutral-900">
            Generate Slideshow with AI
          </h2>
          <p className="text-sm text-neutral-500">
            Describe your slideshow and AI will generate slides with titles, content, and image descriptions.
          </p>
        </div>

        <div className="flex flex-col gap-2">
          <Label>Slideshow Description</Label>
          <Textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="E.g., A motivational slideshow about overcoming challenges in life, featuring inspiring quotes and beautiful nature imagery..."
            className="min-h-[120px] resize-none"
            disabled={generating}
          />
        </div>

        <div className="flex justify-end pt-2">
          <Button
            onClick={handleGenerate}
            disabled={generating || !description.trim()}
            size="sm"
          >
            {generating ? (
              <>
                <CircleNotchIcon className="animate-spin" size={14} />
                Generating...
              </>
            ) : (
              <>
                <SparkleIcon size={14} weight="fill" />
                Generate Slides
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  )
}
