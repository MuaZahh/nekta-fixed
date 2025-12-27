import { create } from 'zustand'
import { immer } from 'zustand/middleware/immer'
import { StitchingState } from '@remotion/renderer'
import { CaptionedVideoSlideType, CharacterMode, BackgroundVideo } from './types'
import { CaptionedVideoTimeline } from '@/remotion/templates/captioned-video/types'

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

type State = {
  // Slides
  slides: CaptionedVideoSlideType[]

  // Background
  selectedBackground: BackgroundVideo | null

  // Settings
  voice: string
  aspectRatio: string
  primaryColor: string

  // UI state
  colorPickerOpen: boolean
  characterPickerOpen: boolean
  selectedSlideForCharacter: string | null

  // Preview state
  isPreviewGenerated: boolean
  timeline: CaptionedVideoTimeline | null
  previewGenerating: boolean
  previewProgress: PreviewProgress | null

  // Render state
  isRendering: boolean
  renderProgress: RenderProgress | null
  renderError: RenderError | null
}

type Actions = {
  // Slide actions
  addSlide: () => void
  deleteSlide: (uid: string) => void
  updateSlideText: (uid: string, text: string) => void
  updateSlideCharacterMode: (uid: string, mode: CharacterMode) => void
  updateSlideCharacterImage: (uid: string, imageUrl: string) => void
  updateSlideAudioData: (uid: string, audioData: CaptionedVideoSlideType['audioData'], textHash: string) => void
  getSlide: (uid: string) => CaptionedVideoSlideType | undefined

  // Background actions
  setSelectedBackground: (video: BackgroundVideo) => void
  clearSelectedBackground: () => void

  // Settings actions
  setVoice: (voice: string) => void
  setPrimaryColor: (color: string) => void

  // UI actions
  setColorPickerOpen: (open: boolean) => void
  openCharacterPicker: (slideUid: string) => void
  closeCharacterPicker: () => void

  // Preview actions
  setTimeline: (timeline: CaptionedVideoTimeline | null) => void
  setPreviewGenerating: (generating: boolean) => void
  setIsPreviewGenerated: (generated: boolean) => void
  setPreviewProgress: (progress: PreviewProgress | null) => void
  incrementPreviewProgress: () => void

  // Render actions
  setIsRendering: (rendering: boolean) => void
  setRenderProgress: (progress: RenderProgress | null) => void
  setRenderError: (error: RenderError | null) => void

  // Reset
  reset: () => void
}

const initialState: State = {
  slides: [],
  selectedBackground: null,
  voice: 'alloy',
  aspectRatio: '9:16',
  primaryColor: '#ffff00',
  colorPickerOpen: false,
  characterPickerOpen: false,
  selectedSlideForCharacter: null,
  isPreviewGenerated: false,
  timeline: null,
  previewGenerating: false,
  previewProgress: null,
  isRendering: false,
  renderProgress: null,
  renderError: null,
}

export const useCaptionedVideoStore = create<State & Actions>()(
  immer((set, get) => ({
    ...initialState,

    // Slide actions
    addSlide: () =>
      set((state) => {
        state.slides.push({
          uid: crypto.randomUUID(),
          text: '',
          characterMode: 'none',
        })
      }),

    deleteSlide: (uid: string) =>
      set((state) => {
        state.slides = state.slides.filter((s) => s.uid !== uid)
      }),

    updateSlideText: (uid: string, text: string) =>
      set((state) => {
        const slide = state.slides.find((s) => s.uid === uid)
        if (slide) {
          slide.text = text
        }
      }),

    updateSlideCharacterMode: (uid: string, mode: CharacterMode) =>
      set((state) => {
        const slide = state.slides.find((s) => s.uid === uid)
        if (slide) {
          slide.characterMode = mode
          if (mode === 'none') {
            slide.characterImageUrl = undefined
          }
        }
      }),

    updateSlideCharacterImage: (uid: string, imageUrl: string) =>
      set((state) => {
        const slide = state.slides.find((s) => s.uid === uid)
        if (slide) {
          slide.characterImageUrl = imageUrl
        }
      }),

    updateSlideAudioData: (uid: string, audioData: CaptionedVideoSlideType['audioData'], textHash: string) =>
      set((state) => {
        const slide = state.slides.find((s) => s.uid === uid)
        if (slide) {
          slide.audioData = audioData
          slide.textHash = textHash
        }
      }),

    getSlide: (uid: string) => {
      return get().slides.find((s) => s.uid === uid)
    },

    // Background actions
    setSelectedBackground: (video: BackgroundVideo) =>
      set((state) => {
        state.selectedBackground = video
      }),

    clearSelectedBackground: () =>
      set((state) => {
        state.selectedBackground = null
      }),

    // Settings actions
    setVoice: (voice: string) =>
      set((state) => {
        state.voice = voice
      }),

    setPrimaryColor: (color: string) =>
      set((state) => {
        state.primaryColor = color
      }),

    // UI actions
    setColorPickerOpen: (open: boolean) =>
      set((state) => {
        state.colorPickerOpen = open
      }),

    openCharacterPicker: (slideUid: string) =>
      set((state) => {
        state.selectedSlideForCharacter = slideUid
        state.characterPickerOpen = true
      }),

    closeCharacterPicker: () =>
      set((state) => {
        state.characterPickerOpen = false
        state.selectedSlideForCharacter = null
      }),

    // Preview actions
    setTimeline: (timeline: CaptionedVideoTimeline | null) =>
      set((state) => {
        state.timeline = timeline
      }),

    setPreviewGenerating: (generating: boolean) =>
      set((state) => {
        state.previewGenerating = generating
      }),

    setIsPreviewGenerated: (generated: boolean) =>
      set((state) => {
        state.isPreviewGenerated = generated
      }),

    setPreviewProgress: (progress: PreviewProgress | null) =>
      set((state) => {
        state.previewProgress = progress
      }),

    incrementPreviewProgress: () =>
      set((state) => {
        if (state.previewProgress) {
          state.previewProgress.audioDone += 1
        }
      }),

    // Render actions
    setIsRendering: (rendering: boolean) =>
      set((state) => {
        state.isRendering = rendering
      }),

    setRenderProgress: (progress: RenderProgress | null) =>
      set((state) => {
        state.renderProgress = progress
      }),

    setRenderError: (error: RenderError | null) =>
      set((state) => {
        state.renderError = error
      }),

    // Reset
    reset: () => set(initialState),
  }))
)
