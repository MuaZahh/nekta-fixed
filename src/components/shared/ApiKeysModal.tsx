import { useState } from 'react'
import { XIcon, EyeIcon, EyeSlashIcon, ArrowSquareOutIcon } from '@phosphor-icons/react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useSettingsStore } from '@/state/settings'
import { AIProviderType } from '@/lib/types'

import openaiIcon from '@/assets/icons/openai-logo.svg'
import togetherIcon from '@/assets/icons/together-color.svg'

type ApiKeyDataItem = {
  name: string
  type: AIProviderType
  icon: string
  iconSize: number
  helpUrl: string
  description: string
}

const apiKeyData: ApiKeyDataItem[] = [
  {
    name: 'OpenAI',
    type: 'openai',
    icon: openaiIcon,
    iconSize: 24,
    helpUrl: 'https://docs.nekta-studio.com/openai',
    description: 'Required for voice generation and text AI',
  },
  {
    name: 'Together.AI',
    type: 'togetherai',
    icon: togetherIcon,
    iconSize: 18,
    helpUrl: 'https://docs.nekta-studio.com/together',
    description: 'Alternative provider for image generation',
  },
]

interface ApiKeysModalProps {
  open: boolean
  onClose: () => void
  onContinue?: () => void
}

export const ApiKeysModal = ({ open, onClose, onContinue }: ApiKeysModalProps) => {
  const { apiKeys, setApiKey } = useSettingsStore()
  const [revealedKeys, setRevealedKeys] = useState<Record<AIProviderType, boolean>>({
    openai: false,
    elevenlabs: false,
    gemini: false,
    togetherai: false,
  })

  const toggleReveal = (type: AIProviderType) => {
    setRevealedKeys((prev) => ({ ...prev, [type]: !prev[type] }))
  }

  const hasOpenAI = !!apiKeys.openai?.trim()
  const canContinue = hasOpenAI

  const handleContinue = () => {
    if (canContinue && onContinue) {
      onContinue()
    }
    onClose()
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="relative bg-white rounded-2xl p-6 w-[480px] flex flex-col gap-5 shadow-2xl">
        <Button
          variant="ghost"
          size="icon"
          onClick={onClose}
          className="absolute right-3 top-3"
        >
          <XIcon size={18} />
        </Button>

        <div className="flex flex-col gap-1">
          <h2 className="text-lg font-semibold text-neutral-900">
            API Keys Required
          </h2>
          <p className="text-sm text-neutral-500">
            Configure your API keys to generate AI content. At minimum, an OpenAI key is required for voice generation.
          </p>
        </div>

        <div className="flex flex-col gap-4">
          {apiKeyData.map((item) => (
            <div key={item.type} className="flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <div className="flex items-center justify-center w-6 h-6">
                  <img
                    src={item.icon}
                    width={item.iconSize}
                    height={item.iconSize}
                    alt={item.name}
                  />
                </div>
                <Label>{item.name}</Label>
                <span className="text-xs text-neutral-400 ml-auto">{item.description}</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="relative grow">
                  <Input
                    type={revealedKeys[item.type] ? 'text' : 'password'}
                    value={apiKeys[item.type] || ''}
                    onChange={(e) => setApiKey(item.type, e.target.value)}
                    placeholder={`Enter ${item.name} API key`}
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => toggleReveal(item.type)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-neutral-400 hover:text-neutral-600 transition-colors"
                    aria-label={revealedKeys[item.type] ? 'Hide API key' : 'Show API key'}
                  >
                    {revealedKeys[item.type] ? (
                      <EyeSlashIcon size={18} />
                    ) : (
                      <EyeIcon size={18} />
                    )}
                  </button>
                </div>
                <Button
                  className="shrink-0"
                  variant="outline"
                  size="sm"
                  onClick={() => window.open(item.helpUrl, '_blank')}
                >
                  <ArrowSquareOutIcon size={16} />
                  Help
                </Button>
              </div>
            </div>
          ))}
        </div>

        <div className="flex items-center justify-between pt-2 border-t border-neutral-100">
          <p className="text-xs text-neutral-400">
            Keys are stored locally and never sent to our servers.
          </p>
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={onClose}>
              Cancel
            </Button>
            {onContinue && (
              <Button size="sm" onClick={handleContinue} disabled={!canContinue}>
                Continue
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
