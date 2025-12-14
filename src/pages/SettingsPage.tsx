import { useState, useEffect } from 'react'
import { EyeIcon, EyeSlashIcon, TrashIcon, FolderOpenIcon } from '@phosphor-icons/react'
import { useSettingsStore } from '../state/settings'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Section } from '@/components/shared/Section'
import { PageHeader } from '@/components/shared/PageHeader'
import { Button } from '@/components/ui/button'
import { AIProviderType } from '@/lib/types'

import openaiIcon from '@/assets/icons/openai-logo.svg'
import elevenLabsIcon from '@/assets/icons/elevenlabs-logo.svg'
import replicateIcon from '@/assets/icons/replicat_icon.svg'
import geminiIcon from '@/assets/icons/gemini.svg'

type ApiKeyDataItem = {
  name: string
  type: AIProviderType
  icon: string
  iconSize: number
}

const apiKeyData: ApiKeyDataItem[] = [
  {
    name: 'OpenAI',
    type: 'openai',
    icon: openaiIcon,
    iconSize: 24,
  },
  {
    name: 'ElevenLabs',
    type: 'elevenlabs',
    icon: elevenLabsIcon,
    iconSize: 24,
  },
  {
    name: 'Replicate',
    type: 'replicate',
    icon: replicateIcon,
    iconSize: 20,
  },
  {
    name: 'Gemini',
    type: 'gemini',
    icon: geminiIcon,
    iconSize: 20,
  },
]

type CacheStats = {
  fileCount: number
  totalSize: number
}

const formatBytes = (bytes: number): string => {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`
}

export const SettingsPage = () => {
  const { apiKeys, setApiKey } = useSettingsStore()
  const [revealedKeys, setRevealedKeys] = useState<Record<AIProviderType, boolean>>({
    openai: false,
    elevenlabs: false,
    replicate: false,
    gemini: false,
  })
  const [cacheStats, setCacheStats] = useState<CacheStats>({ fileCount: 0, totalSize: 0 })
  const [isClearing, setIsClearing] = useState(false)

  const fetchCacheStats = async () => {
    const result = await window.ipcRenderer.invoke('GET_CACHE_STATS')
    if (result.ok) {
      setCacheStats({ fileCount: result.fileCount, totalSize: result.totalSize })
    }
  }

  useEffect(() => {
    fetchCacheStats()
  }, [])

  const handleClearCache = async () => {
    const confirmed = window.confirm(
      `Are you sure you want to delete ${cacheStats.fileCount} cached files (${formatBytes(cacheStats.totalSize)})?`
    )
    if (!confirmed) return

    setIsClearing(true)
    await window.ipcRenderer.invoke('CLEAR_CACHE')
    await fetchCacheStats()
    setIsClearing(false)
  }

  const handleOpenCacheFolder = () => {
    window.ipcRenderer.invoke('OPEN_CACHE_FOLDER')
  }

  const toggleReveal = (type: AIProviderType) => {
    setRevealedKeys((prev) => ({ ...prev, [type]: !prev[type] }))
  }

  return (
    <div className="flex flex-col h-full w-full">
      <PageHeader title="Settings" />

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto p-6 [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar]:bg-transparent [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-neutral-200 [&::-webkit-scrollbar-track]:my-2">
        <div className="flex flex-col gap-5 max-w-[640px] mx-auto pb-8">
          {/* API Keys Section */}
          <Section title="API Keys">
            <div className="flex flex-col gap-4">
              {apiKeyData.map((item) => (
                <div key={item.type} className="flex flex-col gap-2">
                  <div className="flex items-center gap-2">
                    <img
                      src={item.icon}
                      width={item.iconSize}
                      height={item.iconSize}
                      alt={item.name}
                    />
                    <Label>{item.name}</Label>
                  </div>
                  <div className="relative">
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
                </div>
              ))}
            </div>
          </Section>

          {/* Cache Section */}
          <Section title="Cache">
            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between p-3 bg-neutral-50 rounded-lg">
                <div className="flex flex-col">
                  <span className="text-sm font-medium text-neutral-900">
                    {cacheStats.fileCount} files
                  </span>
                  <span className="text-xs text-neutral-500">
                    {formatBytes(cacheStats.totalSize)} total
                  </span>
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleOpenCacheFolder}
                  className="flex-1"
                >
                  <FolderOpenIcon size={16} />
                  Open Folder
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleClearCache}
                  disabled={isClearing || cacheStats.fileCount === 0}
                  className="flex-1"
                >
                  <TrashIcon size={16} />
                  {isClearing ? 'Clearing...' : 'Clear Cache'}
                </Button>
              </div>
            </div>
          </Section>
        </div>
      </div>
    </div>
  )
}
