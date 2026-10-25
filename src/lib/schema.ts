import { z } from "zod";

export const lessonRequestSchema = z.object({
  topic: z.string().trim().min(1).max(120),
  level: z.enum(["Beginner", "Elementary", "Intermediate"]).default("Beginner"),
  scenario: z.string().trim().min(1).max(160),
});

const dialogueLine = z.object({ speaker: z.string(), chinese: z.string(), pinyin: z.string(), translation: z.string() });
const exercise = z.object({ prompt: z.string(), answer: z.string(), explanation: z.string() });

export const lessonSchema = z.object({
  title: z.string(), summary: z.string(),
  vocabulary: z.array(z.object({ hanzi: z.string(), pinyin: z.string(), meaning: z.string(), example: z.string(), examplePinyin: z.string(), exampleTranslation: z.string() })).min(3).max(8),
  dialogue: z.array(dialogueLine).min(2).max(8),
  exercises: z.array(exercise).min(2).max(6),
  imagePrompt: z.string(),
});
export type Lesson = z.infer<typeof lessonSchema>;
