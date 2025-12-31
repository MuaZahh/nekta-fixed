import { captionsTypeSchema, verticalAlignmentSchema } from '@/remotion/types'
import {z} from 'zod'

export const simpleSlideSchema = z.object({
  title: z.string().optional(),
  content: z.string().optional(),
  backgroundImageUrl: z.string().url(),
  verticalAlign: verticalAlignmentSchema.optional()
})

export type SimpleSlideType = z.infer<typeof simpleSlideSchema>

export const videoSlideshowTimelineSchema = z.object({
  slides: z.array(simpleSlideSchema),
  slideDurationSeconds: z.number().optional(),
  backgroundMusicUrl: z.string().url().optional(),
  backgroundOverlayColor: z.string().optional(),
  backgroundOverlayOpacity: z.number().optional(),
  captionsType: captionsTypeSchema.optional()
})

export type VideoSlideshowTimeline = z.infer<typeof videoSlideshowTimelineSchema>
