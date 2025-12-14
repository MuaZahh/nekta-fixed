import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ArtStyles } from '@/data/contentStyles'
import { Textarea } from '@/components/ui/textarea'


export const ArtStyleSelect = ({
  styleId,
  styleDesc,
  onStyleChange,
  onDescChange,
}: {
  styleId: string
  styleDesc: string
  onStyleChange: (value: string) => void
  onDescChange: (value: string) => void
}) => {
  const handleStyleSelect = (newStyleId: string) => {
    onStyleChange(newStyleId)
    const style = ArtStyles.find((s) => s.uid === newStyleId)
    if (style) {
      onDescChange(style.description)
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <Select value={styleId} onValueChange={handleStyleSelect}>
        <SelectTrigger className="w-full">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectGroup>
            {ArtStyles.map((s) => (
              <SelectItem key={s.uid} value={s.uid}>
                {s.name}
              </SelectItem>
            ))}
          </SelectGroup>
        </SelectContent>
      </Select>
      <Textarea
        value={styleDesc}
        onChange={(e) => onDescChange(e.target.value)}
        className="h-[72px] resize-none"
        placeholder="Describe the art style..."
      />
    </div>
  )
}