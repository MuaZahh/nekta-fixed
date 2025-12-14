import { create } from 'zustand'
import { immer } from 'zustand/middleware/immer'
import { persist } from 'zustand/middleware'
import { AIProviderType } from '@/lib/types'



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
