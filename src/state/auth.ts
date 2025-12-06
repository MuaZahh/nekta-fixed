import { create } from 'zustand'
import { immer } from 'zustand/middleware/immer'
// import { persist } from 'zustand/middleware'

type State = {
  loggedIn: boolean
  accountEmail?: string
  accountName?: string
}

type Actions = {
  logOut: VoidFunction
  setAccount: (mail: string, name: string) => void
}

export const useAuthStore = create<State & Actions>()(
  // persist(
  immer((set) => ({
    loggedIn: false,
    setAccount: (mail: string, name: string) =>
      set((state) => {
        state.accountEmail = mail
        state.accountName = name
        state.loggedIn = true
      }),
    logOut: () =>
      set((state) => {
        state.loggedIn = false
        state.accountEmail = undefined
        state.accountName = undefined
      }),
  }))
  // {
  //   name: 'auth-store',
  // }
  // )
)
