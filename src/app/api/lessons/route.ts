import { NextResponse } from "next/server";
import { generateLesson } from "@/lib/ollama";
import { lessonRequestSchema } from "@/lib/schema";

export const runtime = "nodejs";
export async function POST(request: Request) {
  try {
    const input = lessonRequestSchema.parse(await request.json());
    return NextResponse.json({ lesson: await generateLesson(input) });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to generate lesson.";
    const status = error instanceof TypeError && message.includes("fetch") ? 503 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
