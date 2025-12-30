import { captionsTypeSchema, messageSchema, verticalAlignmentSchema } from "@/remotion/types";
import { z } from "zod";

export const ugcClipSchema = z.object({
  backgroundVideoUrl: z.string().url(),
  durationMs: z.number().optional(),
  offsetStartMs: z.number().optional(),
  message: messageSchema.optional(),
  text: z.string().optional(),
  captionsAlign: verticalAlignmentSchema,
  captionsType: captionsTypeSchema,
  highlightColor: z.string().optional()
})

export type UgcClip = z.infer<typeof ugcClipSchema>

export const ugcAvatarHookTimelineSchema = z.object({
  hook: ugcClipSchema,
  content: z.array(ugcClipSchema)
})

export type UgcAvatarHookTimeline = z.infer<typeof ugcAvatarHookTimelineSchema>
