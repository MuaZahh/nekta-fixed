import { useState, useRef } from "react"
import { SlideshowSlideType } from "./types"
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ButtonGroup, ButtonGroupSeparator } from '@/components/ui/button-group'
import { MediaPreview } from '@/components/shared/MediaPreview'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  SparkleIcon,
  TrashIcon,
  ImageIcon,
  CircleNotchIcon,
  UploadSimpleIcon,
  ArrowsOutIcon,
} from '@phosphor-icons/react'
import { VerticalAlignmentType } from "@/remotion/types"

interface SlideCardProps {
  slide: SlideshowSlideType
  index: number
  onDelete: (uid: string) => void
  onTitleChange: (uid: string, val: string) => void
  onContentChange: (uid: string, val: string) => void
  onImageDescChange: (uid: string, val: string) => void
  onVerticalAlignChange: (uid: string, align: VerticalAlignmentType) => void
  onGenerateImage: (uid: string) => Promise<void>
  onImageUpload: (uid: string, imageUrl: string) => void
}

export const SlideCard = ({
  slide,
  index,
  onDelete,
  onTitleChange,
  onContentChange,
  onImageDescChange,
  onVerticalAlignChange,
  onGenerateImage,
  onImageUpload,
}: SlideCardProps) => {
  const [generating, setGenerating] = useState(false)
  const [previewOpen, setPreviewOpen] = useState(false)
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = async () => {
      const base64Data = (reader.result as string).split(',')[1]
      const result = await window.ipcRenderer.invoke('SAVE_GENERATED_IMAGE', {
        base64Data,
        filename: `slideshow_${slide.uid}_${Date.now()}.png`,
      })

      if (result.ok) {
        onImageUpload(slide.uid, result.mediaUrl)
      }
    }
    reader.readAsDataURL(file)

    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const handleGenerate = async () => {
    setGenerating(true)
    await onGenerateImage(slide.uid)
    setGenerating(false)
  }

  return (
    <div className="p-3 rounded-xl bg-neutral-50 border border-neutral-100 flex flex-col gap-2">
      {/* Header */}
      <div className='flex items-center gap-2'>
        <ButtonGroup>
          <Button
            variant="default"
            className='h-7 disabled:opacity-100 disabled:bg-gray-100'
            disabled
          >
            Slide {index + 1}
          </Button>
          <ButtonGroupSeparator />
          <Button
            variant='default'
            size='icon'
            onClick={() => onDelete(slide.uid)}
            className="text-xs w-fit px-2 h-7 hover:bg-red-100"
          >
            <TrashIcon size={12} weight="fill" />
          </Button>
        </ButtonGroup>
        <div className="grow" />
        <Button
          variant="default"
          size="sm"
          onClick={handleGenerate}
          disabled={generating || !slide.imageDesc}
          className="text-xs w-[101px] px-2 h-7"
        >
          {generating ? (
            <CircleNotchIcon size={12} className="animate-spin" />
          ) : (
            <SparkleIcon size={12} weight="fill" />
          )}
          {generating ? 'Generating' : 'Generate'}
        </Button>
      </div>

      {/* Content */}
      <div className="flex gap-3">
        {/* Text inputs */}
        <div className="flex-1 flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <Label className="text-xs text-muted-foreground">Title (optional)</Label>
            <Input
              value={slide.title}
              onChange={(e) => onTitleChange(slide.uid, e.target.value)}
              className="h-8 bg-white"
              placeholder="Slide title..."
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label className="text-xs text-muted-foreground">Content (optional)</Label>
            <Textarea
              value={slide.content}
              onChange={(e) => onContentChange(slide.uid, e.target.value)}
              className="h-[60px] resize-none bg-white"
              placeholder="Slide content text..."
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label className="text-xs text-muted-foreground">Image Description</Label>
            <Textarea
              value={slide.imageDesc}
              onChange={(e) => onImageDescChange(slide.uid, e.target.value)}
              className="h-[60px] resize-none bg-white"
              placeholder="Describe the image to generate..."
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label className="text-xs text-muted-foreground">Text Alignment</Label>
            <Select
              value={slide.verticalAlign}
              onValueChange={(v: VerticalAlignmentType) => onVerticalAlignChange(slide.uid, v)}
            >
              <SelectTrigger className="h-8 text-xs bg-white">
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
          </div>
        </div>

        {/* Image preview */}
        <div className="flex flex-col gap-1 shrink-0">
          <Label className="text-xs text-center text-muted-foreground">Image</Label>

          <div className="relative w-[101px] h-[180px] bg-white rounded-lg overflow-hidden border-neutral-200 group">
            {slide.imageUrl ? (
              <>
                <img
                  src={slide.imageUrl}
                  className="w-full h-full object-cover"
                  alt="Slide background"
                />
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="flex items-center justify-center w-8 h-8 bg-white/90 hover:bg-white text-neutral-700 rounded-lg transition-colors cursor-pointer"
                    aria-label="Upload image"
                  >
                    <UploadSimpleIcon size={16} weight="bold" />
                  </button>
                  <button
                    onClick={() => setPreviewOpen(true)}
                    className="flex items-center justify-center w-8 h-8 bg-white/90 hover:bg-white text-neutral-700 rounded-lg transition-colors cursor-pointer"
                    aria-label="Preview image"
                  >
                    <ArrowsOutIcon size={16} weight="bold" />
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className="w-full h-full flex items-center justify-center">
                  <ImageIcon size={24} className="text-neutral-300 group-hover:hidden" />
                </div>
                <div
                  className="absolute inset-0 bg-neutral-100 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <UploadSimpleIcon size={24} className="text-neutral-500" />
                </div>
              </>
            )}
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileSelect}
            className="hidden"
          />
        </div>
      </div>

      <MediaPreview
        open={previewOpen}
        onClose={() => setPreviewOpen(false)}
        mediaUrl={slide.imageUrl || ''}
        mediaType="image"
        title={`Slide ${index + 1}`}
      />
    </div>
  )
}
