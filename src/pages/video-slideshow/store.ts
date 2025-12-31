import { create } from 'zustand'
import { immer } from 'zustand/middleware/immer'
import { StitchingState } from '@remotion/renderer'
import { SlideshowSlideType, SlideshowSettings } from './types'
import { VideoSlideshowTimeline } from '@/remotion/templates/video-slideshow/types'
import { CaptionsType, VerticalAlignmentType } from '@/remotion/types'
import { ArtStyles } from '@/data/contentStyles'

const DEFAULT_ART_STYLE = 'realism'
const DEFAULT_ART_STYLE_DESC = ArtStyles.find((s) => s.uid === DEFAULT_ART_STYLE)?.description || ''

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
  imagesTotal: number
  imagesDone: number
}

type State = {
  // Slides
  slides: SlideshowSlideType[]

  // Settings
  settings: SlideshowSettings

  // UI state
  generateModalOpen: boolean
  colorPickerOpen: boolean

  // Preview state
  isPreviewGenerated: boolean
  timeline: VideoSlideshowTimeline | null
  previewGenerating: boolean
  previewProgress: PreviewProgress | null
  previewError: string | null

  // Render state
  isRendering: boolean
  renderProgress: RenderProgress | null
  renderError: RenderError | null
}

type Actions = {
  // Slide actions
  addSlide: () => void
  deleteSlide: (uid: string) => void
  setSlides: (slides: SlideshowSlideType[]) => void
  updateSlideTitle: (uid: string, title: string) => void
  updateSlideContent: (uid: string, content: string) => void
  updateSlideImageDesc: (uid: string, imageDesc: string) => void
  updateSlideImageUrl: (uid: string, imageUrl: string, imageDescHash?: string, isUploaded?: boolean) => void
  updateSlideVerticalAlign: (uid: string, align: VerticalAlignmentType) => void
  getSlide: (uid: string) => SlideshowSlideType | undefined

  // Settings actions
  setSlideDuration: (seconds: number) => void
  setOverlayColor: (color: string) => void
  setOverlayOpacity: (opacity: number) => void
  setCaptionsType: (type: CaptionsType) => void
  setImageModel: (model: string) => void
  setArtStyle: (style: string, desc: string) => void
  setArtStyleId: (style: string) => void
  setArtStyleDesc: (desc: string) => void

  // UI actions
  setGenerateModalOpen: (open: boolean) => void
  setColorPickerOpen: (open: boolean) => void

  // Preview actions
  setTimeline: (timeline: VideoSlideshowTimeline | null) => void
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

const createDefaultSlide = (): SlideshowSlideType => ({
  uid: crypto.randomUUID(),
  title: '',
  content: '',
  imageDesc: '',
  verticalAlign: 'center',
})

const initialState: State = {
  slides: [],
  settings: {
    slideDurationSeconds: 3,
    backgroundOverlayColor: '#000000',
    backgroundOverlayOpacity: 0.5,
    captionsType: 'outlined',
    imageModel: '',
    artStyle: DEFAULT_ART_STYLE,
    artStyleDesc: DEFAULT_ART_STYLE_DESC,
  },
  generateModalOpen: false,
  colorPickerOpen: false,
  isPreviewGenerated: false,
  timeline: null,
  previewGenerating: false,
  previewProgress: null,
  previewError: null,
  isRendering: false,
  renderProgress: null,
  renderError: null,
}

export const useVideoSlideshowStore = create<State & Actions>()(
  immer((set, get) => ({
    ...initialState,

    // Slide actions
    addSlide: () =>
      set((state) => {
        state.slides.push(createDefaultSlide())
      }),

    deleteSlide: (uid) =>
      set((state) => {
        state.slides = state.slides.filter((s) => s.uid !== uid)
      }),

    setSlides: (slides) =>
      set((state) => {
        state.slides = slides
      }),

    updateSlideTitle: (uid, title) =>
      set((state) => {
        const slide = state.slides.find((s) => s.uid === uid)
        if (slide) slide.title = title
      }),

    updateSlideContent: (uid, content) =>
      set((state) => {
        const slide = state.slides.find((s) => s.uid === uid)
        if (slide) slide.content = content
      }),

    updateSlideImageDesc: (uid, imageDesc) =>
      set((state) => {
        const slide = state.slides.find((s) => s.uid === uid)
        if (slide) slide.imageDesc = imageDesc
      }),

    updateSlideImageUrl: (uid, imageUrl, imageDescHash, isUploaded) =>
      set((state) => {
        const slide = state.slides.find((s) => s.uid === uid)
        if (slide) {
          slide.imageUrl = imageUrl
          if (imageDescHash !== undefined) slide.imageDescHash = imageDescHash
          if (isUploaded !== undefined) slide.isImageUploaded = isUploaded
        }
      }),

    updateSlideVerticalAlign: (uid, align) =>
      set((state) => {
        const slide = state.slides.find((s) => s.uid === uid)
        if (slide) slide.verticalAlign = align
      }),

    getSlide: (uid) => get().slides.find((s) => s.uid === uid),

    // Settings actions
    setSlideDuration: (seconds) =>
      set((state) => {
        state.settings.slideDurationSeconds = seconds
      }),

    setOverlayColor: (color) =>
      set((state) => {
        state.settings.backgroundOverlayColor = color
      }),

    setOverlayOpacity: (opacity) =>
      set((state) => {
        state.settings.backgroundOverlayOpacity = opacity
      }),

    setCaptionsType: (type) =>
      set((state) => {
        state.settings.captionsType = type
      }),

    setImageModel: (model) =>
      set((state) => {
        state.settings.imageModel = model
      }),

    setArtStyle: (style, desc) =>
      set((state) => {
        state.settings.artStyle = style
        state.settings.artStyleDesc = desc
      }),

    setArtStyleId: (style) =>
      set((state) => {
        state.settings.artStyle = style
      }),

    setArtStyleDesc: (desc) =>
      set((state) => {
        state.settings.artStyleDesc = desc
      }),

    // UI actions
    setGenerateModalOpen: (open) =>
      set((state) => {
        state.generateModalOpen = open
      }),

    setColorPickerOpen: (open) =>
      set((state) => {
        state.colorPickerOpen = open
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
          state.previewProgress.imagesDone += 1
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
