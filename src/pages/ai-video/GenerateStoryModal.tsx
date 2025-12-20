import { useState } from 'react'
import { SparkleIcon, XIcon, CircleNotchIcon } from '@phosphor-icons/react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { AiStoryTopics } from '@/data/contentStyles'
import { OpenAIStructuredGenProvider } from '@/lib/providers/openAI'
import { getGenerateTitlesPrompt, TitleList } from './service'
import { WizardStep } from './types'

interface GenerateStoryModalProps {
  open: boolean
  onClose: () => void
  onGenerate: (title: string, topic: string) => Promise<void>
}

export const GenerateStoryModal = ({
  open,
  onClose,
  onGenerate,
}: GenerateStoryModalProps) => {
  const [wizardStep, setWizardStep] = useState<WizardStep>('create-titles')
  const [generating, setGenerating] = useState(false)

  const [topic, setTopic] = useState<string>('')
  const [customTopic, setCustomTopic] = useState<string>('')
  const [generatedTitles, setGeneratedTitles] = useState<string[]>([])
  const [selectedTitle, setSelectedTitle] = useState<string>('')
  const [customTitle, setCustomTitle] = useState<string>('')

  const effectiveTopic = customTopic.trim() || topic
  const effectiveTitle = customTitle.trim() || selectedTitle

  const handleClose = () => {
    setWizardStep('create-titles')
    setTopic('')
    setCustomTopic('')
    setGeneratedTitles([])
    setSelectedTitle('')
    setCustomTitle('')
    onClose()
  }

  const onGenerateTitles = async () => {
    if (!effectiveTopic) return
    setGenerating(true)
    const p = new OpenAIStructuredGenProvider()

    const titles = await p.generate(
      getGenerateTitlesPrompt(effectiveTopic),
      TitleList
    )

    setGeneratedTitles(titles.titles)
    setWizardStep('select-title')
    setGenerating(false)
  }

  const onGenerateStory = async () => {
    if (!effectiveTitle) return
    setGenerating(true)
    await onGenerate(effectiveTitle, effectiveTopic)
    handleClose()
    setGenerating(false)
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="relative bg-white rounded-2xl p-6 w-[480px] flex flex-col gap-5 shadow-2xl">
        <Button
          variant="ghost"
          size="icon"
          onClick={handleClose}
          className="absolute right-3 top-3"
        >
          <XIcon size={18} />
        </Button>

        <div className="flex flex-col gap-1">
          <h2 className="text-lg font-semibold text-neutral-900">
            Generate Story with AI
          </h2>
          <p className="text-sm text-neutral-500">
            {wizardStep === 'create-titles'
              ? 'Choose a topic to generate story titles'
              : 'Select a title to generate your story'}
          </p>
        </div>

        {/* Step indicator */}
        <div className="flex items-center gap-2">
          <div
            className={`h-1 flex-1 rounded-full transition-colors ${
              wizardStep === 'create-titles'
                ? 'bg-neutral-900'
                : 'bg-neutral-200'
            }`}
          />
          <div
            className={`h-1 flex-1 rounded-full transition-colors ${
              wizardStep === 'select-title'
                ? 'bg-neutral-900'
                : 'bg-neutral-200'
            }`}
          />
        </div>

        {wizardStep === 'create-titles' && (
          <>
            <div className="flex flex-col gap-2">
              <Label>Script Topic</Label>
              <Select
                value={topic}
                onValueChange={setTopic}
                disabled={!!customTopic.trim() || generating}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select a topic..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    {AiStoryTopics.map((t) => (
                      <SelectItem key={t.uid} value={t.uid}>
                        {t.name}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
              <Input
                value={customTopic}
                onChange={(e) => setCustomTopic(e.target.value)}
                placeholder="Or enter custom topic..."
                disabled={generating}
              />
            </div>

            <div className="flex justify-end pt-2">
              <Button
                onClick={onGenerateTitles}
                disabled={generating || !effectiveTopic}
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
                    Generate Titles
                  </>
                )}
              </Button>
            </div>
          </>
        )}

        {wizardStep === 'select-title' && (
          <>
            <div className="flex flex-col gap-2">
              <Label>Select a Title</Label>
              <Select
                value={selectedTitle}
                onValueChange={setSelectedTitle}
                disabled={!!customTitle.trim() || generating}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Choose a title..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    {generatedTitles.map((t) => (
                      <SelectItem key={t} value={t}>
                        {t}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
              <Input
                value={customTitle}
                onChange={(e) => setCustomTitle(e.target.value)}
                placeholder="Or enter custom title..."
                disabled={generating}
              />
            </div>

            <div className="flex justify-between pt-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setWizardStep('create-titles')}
                disabled={generating}
              >
                Back
              </Button>
              <Button
                onClick={onGenerateStory}
                size="sm"
                disabled={generating || !effectiveTitle}
              >
                {generating ? (
                  <>
                    <CircleNotchIcon className="animate-spin" size={14} />
                    Generating...
                  </>
                ) : (
                  <>
                    <SparkleIcon size={14} weight="fill" />
                    Generate Story
                  </>
                )}
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
