
import { z } from "zod";

export const verticalAlignmentSchema = z.union([
  z.literal("top"),
  z.literal("center"),
  z.literal("bottom"),
]);

export type VerticalAlignmentType = z.infer<typeof verticalAlignmentSchema>

export const captionsTypeSchema = z.union([
  z.literal("outlined"),
  z.literal("roundedTextbox"),
]);

export type CaptionsType = z.infer<typeof captionsTypeSchema>



export const wordTimestampSchema = z.object({
  word: z.string(),
  startMs: z.number(),
  endMs: z.number(),
});

export type WordTimestamp = z.infer<typeof wordTimestampSchema>


export const messageSchema = z.object({
  words: z.array(wordTimestampSchema),
  audioUrl: z.string().url().optional(),
  durationMs: z.number()
})

export type MessageType = z.infer<typeof messageSchema>
