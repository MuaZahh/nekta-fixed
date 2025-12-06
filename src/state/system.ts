import { create } from 'zustand'
import { immer } from 'zustand/middleware/immer'

type State = {
  isOffline: boolean
}

type Actions = {
  setIsOffline: (val: boolean) => void
}

export const useSystemStore = create<State & Actions>()(
  immer((set) => ({
    isOffline: false,
    setIsOffline: (val: boolean) =>
      set((state) => {
        state.isOffline = val
      }),
  }))
)
