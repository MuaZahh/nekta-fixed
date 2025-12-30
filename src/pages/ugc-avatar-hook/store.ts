import { create } from 'zustand'
import { immer } from 'zustand/middleware/immer'
import { StitchingState } from '@remotion/renderer'
import { HookClipState, ContentClipState, BackgroundMedia, AudioData } from './types'
import { UgcAvatarHookTimeline } from '@/remotion/templates/ugc-avatar-hook/types'
import { CaptionsType, VerticalAlignmentType } from '@/remotion/types'

interface RenderProgress {
  renderedFrames: number
  encodedFrames: number
  encodedDoneIn: number | null
  renderedDoneIn: number | null
  renderEstimatedTime: number
  progress: number
  stitchStage: StitchingState
}

interface RenderError {
  name: string
  message: string
  stack?: string
}

interface PreviewProgress {
  audioTotal: number
  audioDone: number
}

const createDefaultHook = (): HookClipState => ({
  backgroundVideo: null,
  text: '',
  voice: 'alloy',
  generateVoice: true,
  captionsType: 'roundedTextbox',
  captionsAlign: 'top',
  highlightColor: '#ffff00',
})

const createDefaultContentClip = (): ContentClipState => ({
  uid: crypto.randomUUID(),
  backgroundVideo: null,
  text: '',
  voice: 'alloy',
  generateVoice: true,
  captionsType: 'roundedTextbox',
  captionsAlign: 'bottom',
  highlightColor: '#ffff00',
})

type State = {
  // Hook
  hook: HookClipState

  // Content clips
  contentClips: ContentClipState[]

  // Settings
  aspectRatio: string

  // UI state
  colorPickerOpen: boolean
  colorPickerTarget: 'hook' | string | null

  // Preview state
  isPreviewGenerated: boolean
  timeline: UgcAvatarHookTimeline | null
  previewGenerating: boolean
  previewProgress: PreviewProgress | null
  previewError: string | null

  // Render state
  isRendering: boolean
  renderProgress: RenderProgress | null
  renderError: RenderError | null
}

type Actions = {
  // Hook actions
  setHookBackground: (video: BackgroundMedia) => void
  setHookText: (text: string) => void
  setHookVoice: (voice: string) => void
  setHookGenerateVoice: (generateVoice: boolean) => void
  setHookCaptionsType: (type: CaptionsType) => void
  setHookCaptionsAlign: (align: VerticalAlignmentType) => void
  setHookHighlightColor: (color: string) => void
  setHookDuration: (durationMs: number | undefined) => void
  setHookOffsetStart: (offsetStartMs: number | undefined) => void
  setHookAudioData: (audioData: AudioData | undefined, textHash: string) => void

  // Content clip actions
  addContentClip: () => void
  deleteContentClip: (uid: string) => void
  setContentBackground: (uid: string, video: BackgroundMedia) => void
  setContentText: (uid: string, text: string) => void
  setContentVoice: (uid: string, voice: string) => void
  setContentGenerateVoice: (uid: string, generateVoice: boolean) => void
  setContentCaptionsType: (uid: string, type: CaptionsType) => void
  setContentCaptionsAlign: (uid: string, align: VerticalAlignmentType) => void
  setContentHighlightColor: (uid: string, color: string) => void
  setContentDuration: (uid: string, durationMs: number | undefined) => void
  setContentOffsetStart: (uid: string, offsetStartMs: number | undefined) => void
  setContentAudioData: (uid: string, audioData: AudioData | undefined, textHash: string) => void
  getContentClip: (uid: string) => ContentClipState | undefined

  // UI actions
  setColorPickerOpen: (open: boolean, target?: 'hook' | string) => void

  // Preview actions
  setTimeline: (timeline: UgcAvatarHookTimeline | null) => void
  setPreviewGenerating: (generating: boolean) => void
  setIsPreviewGenerated: (generated: boolean) => void
  setPreviewProgress: (progress: PreviewProgress | null) => void
  setPreviewError: (error: string | null) => void
  incrementPreviewProgress: () => void

  // Render actions
  setIsRendering: (rendering: boolean) => void
  setRenderProgress: (progress: RenderProgress | null) => void
  setRenderError: (error: RenderError | null) => void

  // Reset
  reset: () => void
}

const initialState: State = {
  hook: createDefaultHook(),
  contentClips: [],
  aspectRatio: '9:16',
  colorPickerOpen: false,
  colorPickerTarget: null,
  isPreviewGenerated: false,
  timeline: null,
  previewGenerating: false,
  previewProgress: null,
  previewError: null,
  isRendering: false,
  renderProgress: null,
  renderError: null,
}

export const useUgcAvatarHookStore = create<State & Actions>()(
  immer((set, get) => ({
    ...initialState,

    // Hook actions
    setHookBackground: (video) =>
      set((state) => {
        state.hook.backgroundVideo = video
      }),

    setHookText: (text) =>
      set((state) => {
        state.hook.text = text
      }),

    setHookVoice: (voice) =>
      set((state) => {
        state.hook.voice = voice
      }),

    setHookGenerateVoice: (generateVoice) =>
      set((state) => {
        state.hook.generateVoice = generateVoice
      }),

    setHookCaptionsType: (type) =>
      set((state) => {
        state.hook.captionsType = type
      }),

    setHookCaptionsAlign: (align) =>
      set((state) => {
        state.hook.captionsAlign = align
      }),

    setHookHighlightColor: (color) =>
      set((state) => {
        state.hook.highlightColor = color
      }),

    setHookDuration: (durationMs) =>
      set((state) => {
        state.hook.durationMs = durationMs
      }),

    setHookOffsetStart: (offsetStartMs) =>
      set((state) => {
        state.hook.offsetStartMs = offsetStartMs
      }),

    setHookAudioData: (audioData, textHash) =>
      set((state) => {
        state.hook.audioData = audioData
        state.hook.textHash = textHash
      }),

    // Content clip actions
    addContentClip: () =>
      set((state) => {
        state.contentClips.push(createDefaultContentClip())
      }),

    deleteContentClip: (uid) =>
      set((state) => {
        state.contentClips = state.contentClips.filter((c) => c.uid !== uid)
      }),

    setContentBackground: (uid, video) =>
      set((state) => {
        const clip = state.contentClips.find((c) => c.uid === uid)
        if (clip) clip.backgroundVideo = video
      }),

    setContentText: (uid, text) =>
      set((state) => {
        const clip = state.contentClips.find((c) => c.uid === uid)
        if (clip) clip.text = text
      }),

    setContentVoice: (uid, voice) =>
      set((state) => {
        const clip = state.contentClips.find((c) => c.uid === uid)
        if (clip) clip.voice = voice
      }),

    setContentGenerateVoice: (uid, generateVoice) =>
      set((state) => {
        const clip = state.contentClips.find((c) => c.uid === uid)
        if (clip) clip.generateVoice = generateVoice
      }),

    setContentCaptionsType: (uid, type) =>
      set((state) => {
        const clip = state.contentClips.find((c) => c.uid === uid)
        if (clip) clip.captionsType = type
      }),

    setContentCaptionsAlign: (uid, align) =>
      set((state) => {
        const clip = state.contentClips.find((c) => c.uid === uid)
        if (clip) clip.captionsAlign = align
      }),

    setContentHighlightColor: (uid, color) =>
      set((state) => {
        const clip = state.contentClips.find((c) => c.uid === uid)
        if (clip) clip.highlightColor = color
      }),

    setContentDuration: (uid, durationMs) =>
      set((state) => {
        const clip = state.contentClips.find((c) => c.uid === uid)
        if (clip) clip.durationMs = durationMs
      }),

    setContentOffsetStart: (uid, offsetStartMs) =>
      set((state) => {
        const clip = state.contentClips.find((c) => c.uid === uid)
        if (clip) clip.offsetStartMs = offsetStartMs
      }),

    setContentAudioData: (uid, audioData, textHash) =>
      set((state) => {
        const clip = state.contentClips.find((c) => c.uid === uid)
        if (clip) {
          clip.audioData = audioData
          clip.textHash = textHash
        }
      }),

    getContentClip: (uid) => {
      return get().contentClips.find((c) => c.uid === uid)
    },

    // UI actions
    setColorPickerOpen: (open, target) =>
      set((state) => {
        state.colorPickerOpen = open
        state.colorPickerTarget = target || null
      }),

    // Preview actions
    setTimeline: (timeline) =>
      set((state) => {
        state.timeline = timeline
      }),

    setPreviewGenerating: (generating) =>
      set((state) => {
        state.previewGenerating = generating
      }),

    setIsPreviewGenerated: (generated) =>
      set((state) => {
        state.isPreviewGenerated = generated
      }),

    setPreviewProgress: (progress) =>
      set((state) => {
        state.previewProgress = progress
      }),

    setPreviewError: (error) =>
      set((state) => {
        state.previewError = error
      }),

    incrementPreviewProgress: () =>
      set((state) => {
        if (state.previewProgress) {
          state.previewProgress.audioDone += 1
        }
      }),

    // Render actions
    setIsRendering: (rendering) =>
      set((state) => {
        state.isRendering = rendering
      }),

    setRenderProgress: (progress) =>
      set((state) => {
        state.renderProgress = progress
      }),

    setRenderError: (error) =>
      set((state) => {
        state.renderError = error
      }),

    // Reset
    reset: () => set(initialState),
  }))
)
