import { create } from 'zustand'
import { immer } from 'zustand/middleware/immer'
import { StitchingState } from '@remotion/renderer'
import { MusicLayoutTypeSchema, WaveformType, MusicVizTimeline, LayoutConfig } from '@/remotion/templates/music-viz/types'

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

type State = {
  // Audio
  audioUrl: string | null
  audioDuration: number // total duration of the audio file in seconds
  regionStart: number // seconds
  regionEnd: number // seconds

  // Layout
  layoutType: MusicLayoutTypeSchema
  coverUrl: string | null
  backgroundColor: string

  // Content
  songTitle: string
  author: string
  textColor: string

  // Waveform
  waveformType: WaveformType
  waveformColor: string

  // UI
  colorPickerOpen: 'background' | 'waveform' | 'text' | null
  isPlaying: boolean

  // Render state
  isRendering: boolean
  renderProgress: RenderProgress | null
  renderError: RenderError | null
}

type Actions = {
  // Audio actions
  setAudioUrl: (url: string | null) => void
  setAudioDuration: (duration: number) => void
  setRegionStart: (start: number) => void
  setRegionEnd: (end: number) => void
  setRegion: (start: number, end: number) => void

  // Layout actions
  setLayoutType: (type: MusicLayoutTypeSchema) => void
  setCoverUrl: (url: string | null) => void
  setBackgroundColor: (color: string) => void

  // Content actions
  setSongTitle: (title: string) => void
  setAuthor: (author: string) => void
  setTextColor: (color: string) => void

  // Waveform actions
  setWaveformType: (type: WaveformType) => void
  setWaveformColor: (color: string) => void

  // UI actions
  setColorPickerOpen: (picker: 'background' | 'waveform' | 'text' | null) => void
  setIsPlaying: (playing: boolean) => void

  // Render actions
  setIsRendering: (rendering: boolean) => void
  setRenderProgress: (progress: RenderProgress | null) => void
  setRenderError: (error: RenderError | null) => void

  // Getters
  getTimeline: () => MusicVizTimeline | null
  getRegionDuration: () => number

  // Reset
  reset: () => void
}

const initialState: State = {
  audioUrl: null,
  audioDuration: 0,
  regionStart: 0,
  regionEnd: 0,

  layoutType: 'big-cover',
  coverUrl: null,
  backgroundColor: '#000000',

  songTitle: '',
  author: '',
  textColor: '#ffffff',

  waveformType: 'thick-bars-one-side',
  waveformColor: '#EB6A65',

  colorPickerOpen: null,
  isPlaying: false,

  isRendering: false,
  renderProgress: null,
  renderError: null,
}

// Waveforms that use the custom color
const coloredWaveforms: WaveformType[] = [
  'thick-bars-one-side',
  'thin-bars-one-side',
  'thin-bars-double-side',
  'area-one-color',
  'waves-multi',
  'waves-edge-lines',
  'circle-lines',
]

export const isWaveformColored = (type: WaveformType): boolean => {
  return coloredWaveforms.includes(type)
}

// Layouts that require a cover image
export const layoutRequiresCover = (type: MusicLayoutTypeSchema): boolean => {
  return type === 'rotating-vinyl' || type === 'big-cover'
}

// Layouts that have background color option
export const layoutHasBackgroundColor = (type: MusicLayoutTypeSchema): boolean => {
  return type === 'big-cover'
}

export const useMusicVisualizationStore = create<State & Actions>()(
  immer((set, get) => ({
    ...initialState,

    // Audio actions
    setAudioUrl: (url) =>
      set((state) => {
        state.audioUrl = url
        if (!url) {
          state.audioDuration = 0
          state.regionStart = 0
          state.regionEnd = 0
        }
      }),

    setAudioDuration: (duration) =>
      set((state) => {
        state.audioDuration = duration
        // If region end is 0 or beyond duration, set it to full duration
        if (state.regionEnd === 0 || state.regionEnd > duration) {
          state.regionEnd = duration
        }
      }),

    setRegionStart: (start) =>
      set((state) => {
        state.regionStart = Math.max(0, Math.min(start, state.regionEnd - 0.5))
      }),

    setRegionEnd: (end) =>
      set((state) => {
        state.regionEnd = Math.min(state.audioDuration, Math.max(end, state.regionStart + 0.5))
      }),

    setRegion: (start, end) =>
      set((state) => {
        state.regionStart = Math.max(0, start)
        state.regionEnd = Math.min(state.audioDuration, end)
      }),

    // Layout actions
    setLayoutType: (type) =>
      set((state) => {
        state.layoutType = type
      }),

    setCoverUrl: (url) =>
      set((state) => {
        state.coverUrl = url
      }),

    setBackgroundColor: (color) =>
      set((state) => {
        state.backgroundColor = color
      }),

    // Content actions
    setSongTitle: (title) =>
      set((state) => {
        state.songTitle = title
      }),

    setAuthor: (author) =>
      set((state) => {
        state.author = author
      }),

    setTextColor: (color) =>
      set((state) => {
        state.textColor = color
      }),

    // Waveform actions
    setWaveformType: (type) =>
      set((state) => {
        state.waveformType = type
      }),

    setWaveformColor: (color) =>
      set((state) => {
        state.waveformColor = color
      }),

    // UI actions
    setColorPickerOpen: (picker) =>
      set((state) => {
        state.colorPickerOpen = picker
      }),

    setIsPlaying: (playing) =>
      set((state) => {
        state.isPlaying = playing
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

    // Getters
    getTimeline: () => {
      const state = get()

      // Check required fields
      if (!state.audioUrl || !state.songTitle) return null
      if (layoutRequiresCover(state.layoutType) && !state.coverUrl) return null
      if (state.regionEnd <= state.regionStart) return null

      let layoutConfig: LayoutConfig
      if (state.layoutType === 'rotating-disk') {
        layoutConfig = { layout: 'rotating-disk' }
      } else if (state.layoutType === 'rotating-vinyl') {
        layoutConfig = { layout: 'rotating-vinyl', coverUrl: state.coverUrl! }
      } else {
        layoutConfig = {
          layout: 'big-cover',
          coverUrl: state.coverUrl!,
          backgroundColor: state.backgroundColor
        }
      }

      return {
        layout: layoutConfig,
        audio: {
          audioUrl: state.audioUrl,
          startOffsetSeconds: state.regionStart,
          durationSeconds: state.regionEnd - state.regionStart,
        },
        songTitle: state.songTitle,
        author: state.author || undefined,
        waveform: {
          type: state.waveformType,
          color: state.waveformColor,
        },
        textColor: state.textColor,
      } satisfies MusicVizTimeline
    },

    getRegionDuration: () => {
      const state = get()
      return state.regionEnd - state.regionStart
    },

    // Reset
    reset: () => set(initialState),
  }))
)
