import { lessonSchema, type Lesson } from "@/lib/schema";
import { z } from "zod";

const baseUrl = process.env.OLLAMA_BASE_URL ?? "http://127.0.0.1:11434";
const model = process.env.OLLAMA_MODEL ?? "qwen3:4b";

export async function generateLesson(input: { topic: string; level: string; scenario: string }): Promise<Lesson> {
  const prompt = `Create an accurate, learner-friendly Mandarin Chinese lesson as JSON. Use simplified Chinese, tone-mark pinyin, and concise natural English. Match the learner level. Do not invent cultural facts. Keep the vocabulary useful in the scenario. Return exactly this shape: {"title":"","summary":"","vocabulary":[{"hanzi":"","pinyin":"","meaning":"","example":"","examplePinyin":"","exampleTranslation":""}],"dialogue":[{"speaker":"","chinese":"","pinyin":"","translation":""}],"exercises":[{"prompt":"","answer":"","explanation":""}],"imagePrompt":"A short visual prompt for an educational scene, no text or lettering"}. Include 4 vocabulary items, 4 dialogue turns, and 3 exercises. Topic: ${input.topic}; level: ${input.level}; scenario: ${input.scenario}.`;
  const response = await fetch(`${baseUrl}/api/chat`, {
    method: "POST", headers: { "Content-Type": "application/json" }, signal: AbortSignal.timeout(180_000),
    body: JSON.stringify({ model, stream: false, think: false, format: z.toJSONSchema(lessonSchema), options: { temperature: 0.4, num_ctx: 4096, num_predict: 2600 }, messages: [{ role: "user", content: prompt }] }),
  });
  if (!response.ok) throw new Error(`Ollama returned ${response.status}. Check that Ollama is running and the selected model is installed.`);
  const data = await response.json();
  const content = data?.message?.content;
  if (typeof content !== "string") throw new Error("Ollama returned an empty response.");
  return lessonSchema.parse(JSON.parse(content));
}
