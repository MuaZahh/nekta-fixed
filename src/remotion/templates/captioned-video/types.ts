import { messageSchema } from "@/remotion/types";
import { z } from "zod";

export const captionedVideoBackgroundTypeSchema = z.union([
  z.literal("image"),
  z.literal("video"),
]);
export type CaptionedVideoBackgroundType = z.infer<typeof captionedVideoBackgroundTypeSchema>


export const captionedVideoBackgroundSchema = z.object({
  type: captionedVideoBackgroundTypeSchema,
  url: z.string().url(),
  fromMs: z.number(),
  durationMs: z.number()
})
export type CaptionedVideoBackground = z.infer<typeof captionedVideoBackgroundSchema>


export const captionedVideoSettingSchema = z.object({
  highlightOutlineColor: z.string(),
  audioBasedDuration: z.boolean().default(true)
})
export type CaptionedVideoSettingSchema = z.infer<typeof captionedVideoSettingSchema>


export const captionedVideoSpeakerTypeSchema = z.union([
  z.literal("system"),
  z.literal("character"),
]);
export type CaptionedVideoSpeakerType = z.infer<typeof captionedVideoSpeakerTypeSchema>


export const dialogMessageSchema = z.object({
  speaker: captionedVideoSpeakerTypeSchema,
  imageUrl: z.string().optional(),
  message: z.array(messageSchema)
})
export type DialogMessage = z.infer<typeof dialogMessageSchema>


export const captionedVideoTimelineSchema = z.object({
  background: z.array(captionedVideoBackgroundSchema),
  dialog: z.array(dialogMessageSchema),
  settings: captionedVideoSettingSchema
})
export type CaptionedVideoTimeline = z.infer<typeof captionedVideoTimelineSchema>


