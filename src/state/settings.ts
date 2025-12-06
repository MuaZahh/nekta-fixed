import { create } from 'zustand'
import { immer } from 'zustand/middleware/immer'
import { persist } from 'zustand/middleware'

export type AIProviderType = 'openai' | 'elevenlabs' | 'replicate' | 'gemini'

export const aiProviderToLabel = (provider: AIProviderType) => {
  switch (provider) {
    case 'replicate':
      return 'Replicate'
    case 'elevenlabs':
      return 'ElevenLabs'
    case 'gemini':
      return 'Gemini'
    case 'openai':
      return 'OpenAI'
  }
}

type State = {
  apiKeys: Partial<Record<AIProviderType, string | undefined>>
}

type Actions = {
  setApiKey: (provider: AIProviderType, key?: string) => void
  getConnectedProviders: () => AIProviderType[]
}

export const useSettingsStore = create<State & Actions>()(
  persist(
    immer((set, get) => ({
      apiKeys: {},
      setApiKey: (provider: AIProviderType, key?: string) =>
        set((state) => {
          state.apiKeys[provider] = key
        }),
      getConnectedProviders: () => {
        const keys = get().apiKeys
        const res: AIProviderType[] = []
        for (const [key, value] of Object.entries(keys)) {
          if (value && value.length > 0) {
            res.push(key as AIProviderType)
          }
        }
        return res
      },
    })),
    {
      name: 'settings-store',
    }
  )
)
