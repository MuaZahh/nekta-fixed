import { useState } from 'react'
import { SparkleIcon, XIcon, CircleNotchIcon } from '@phosphor-icons/react'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { OpenAIStructuredGenProvider } from '@/lib/providers/openAI'
import { useCaptionedVideoStore } from './store'

const GeneratedContent = z.object({
  slides: z.array(z.string()),
})

const getGenerateCaptionedContentPrompt = (topic: string) => {
  return `You are an expert viral content writer specializing in short-form video scripts that captivate audiences from the first word.

Generate a script for a captioned video about: "${topic}"

REQUIREMENTS:
- Create 5-8 short slides/captions (each 1-2 sentences max)
- Each slide should be punchy, direct, and create curiosity or emotional impact
- Use storytelling techniques: hooks, tension, reveals, and payoffs
- Write in a conversational, engaging tone that feels authentic
- Include pattern interrupts to maintain attention (questions, surprising facts, bold statements)
- Build momentum - each slide should compel the viewer to see the next one
- End with a memorable conclusion that resonates

CONTENT STYLE:
- Open with an irresistible hook that stops scrolling
- Use power words that evoke emotion
- Create information gaps that viewers want filled
- Include specific details that add credibility
- Keep language simple but impactful
- Vary sentence structure to maintain rhythm

Return as JSON with an array of slide texts:
{
  "slides": ["First slide text...", "Second slide text...", ...]
}

Generate content that makes viewers feel they MUST watch until the end.`
}

interface GenerateContentModalProps {
  open: boolean
  onClose: () => void
}

export const GenerateContentModal = ({
  open,
  onClose,
}: GenerateContentModalProps) => {
  const [generating, setGenerating] = useState(false)
  const [topic, setTopic] = useState('')
  const store = useCaptionedVideoStore()

  const handleClose = () => {
    setTopic('')
    onClose()
  }

  const onGenerate = async () => {
    if (!topic.trim()) return

    setGenerating(true)
    try {
      const provider = new OpenAIStructuredGenProvider()
      const result = await provider.generate(
        getGenerateCaptionedContentPrompt(topic.trim()),
        GeneratedContent
      )

      for (const slideText of result.slides) {
        store.addSlideWithText(slideText)
      }

      handleClose()
    } catch (err) {
      console.error('Failed to generate content:', err)
    } finally {
      setGenerating(false)
    }
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
            Generate Content with AI
          </h2>
          <p className="text-sm text-neutral-500">
            Enter a topic or idea to generate engaging video content
          </p>
        </div>

        <div className="flex flex-col gap-2">
          <Label>Topic or Idea</Label>
          <Textarea
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            placeholder="E.g., 5 surprising facts about the ocean, A day in the life of a software engineer, Why morning routines change your life..."
            disabled={generating}
            className="min-h-[100px] resize-none"
          />
        </div>

        <div className="flex justify-end pt-2">
          <Button
            onClick={onGenerate}
            disabled={generating || !topic.trim()}
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
                Generate Content
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  )
}
