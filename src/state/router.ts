import { create } from 'zustand'
import { immer } from 'zustand/middleware/immer'

export type AppRoute = 'home' | 'ugc-avatar-hook' | 'library' | 'settings' | 'usage' | 'avatars' | 'music' | 'ai-video' | 'captioned-video' | 'video-slideshow'

type State = {
  route: AppRoute
}

type Actions = {
  setRoute: (route: AppRoute) => void
}

export const useRouter = create<State & Actions>()(
  immer((set) => ({
    route: 'home',
    setRoute: (route: AppRoute) =>
      set((state) => {
        state.route = route
      }),
  }))
)
