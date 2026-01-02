import { z } from "zod";

export const musicLayoutTypeSchema = z.union([
  z.literal("rotating-disk"),
  z.literal("rotating-vinyl"),
  z.literal("big-cover"),
]);

export type MusicLayoutTypeSchema = z.infer<typeof musicLayoutTypeSchema>


export const waveformTypeSchema = z.union([
  z.literal("thick-bars-one-side"),
  z.literal("thin-bars-one-side"),
  z.literal("thin-bars-double-side"),
  z.literal("area-three-colors"),
  z.literal("area-one-color"),
  z.literal("area-multi"),
  z.literal("waves-multi"),
  z.literal("waves-lines"),
  z.literal("waves-edge-lines"),
  z.literal("circle-lines"),
]);

export type WaveformType = z.infer<typeof waveformTypeSchema>

export const musicVizAudioSchema = z.object({
  audioUrl: z.string()
})

export const musicVizWaveformSchema = z.object({
  type: waveformTypeSchema,
  color: z.string()
})

export type MusicVizWaveformType = z.infer<typeof musicVizWaveformSchema>


export const musicVizTimelineSchema = z.object({
  layout: musicLayoutTypeSchema,
  audio: musicVizAudioSchema,
  songTitle: z.string(),
  author: z.string().optional(),
  coverUrl: z.string().url().optional(),
  waveform: musicVizWaveformSchema
})

export type MusicVizTimeline = z.infer<typeof musicVizTimelineSchema>
