import { create } from 'zustand'
import { immer } from 'zustand/middleware/immer'

type State = {
  updateInstalled: boolean
  installedVersions: string[]
}

type Actions = {
  setUpdateInstalled: (val: boolean) => void
  addInstalledVersion: (version: string) => void
}

export const useUpdaterStore = create<State & Actions>()(
  immer((set) => ({
    updateInstalled: false,
    installedVersions: [],
    setUpdateInstalled: (val: boolean) =>
      set((state) => {
        state.updateInstalled = val
      }),
    addInstalledVersion: (version: string) =>
      set((state) => {
        state.installedVersions.push(version)
      }),
  }))
)
