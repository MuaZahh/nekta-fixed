import { captionsTypeSchema, messageSchema, verticalAlignmentSchema } from "@/remotion/types";
import { z } from "zod";

export const ugcAvatarHookTimelineSchema = z.object({
  hook: z.object({
    backgroundVideoUrl: z.string().url(),
    durationMs: z.number().optional(),
    message: messageSchema.optional(),
    text: z.string().optional(),
    captionsAlign: verticalAlignmentSchema,
    captionsType: captionsTypeSchema
  }),
  content: z.array(z.object({
    backgroundVideoUrl: z.string().url(),
    durationMs: z.number().optional(),
    message: messageSchema.optional(),
    text: z.string().optional(),
    captionsAlign: verticalAlignmentSchema,
    captionsType: captionsTypeSchema
  }))
})

export type UgcAvatarHookTimeline = z.infer<typeof ugcAvatarHookTimelineSchema>