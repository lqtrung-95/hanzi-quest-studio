import { NextResponse } from "next/server";

export const runtime = "nodejs";
export async function POST(request: Request) {
  try {
    const { prompt } = await request.json();
    if (typeof prompt !== "string" || !prompt.trim() || prompt.length > 1000) return NextResponse.json({ error: "Enter a prompt under 1,000 characters." }, { status: 400 });
    const base = process.env.COMFYUI_BASE_URL ?? "http://127.0.0.1:8188";
    const check = await fetch(`${base}/system_stats`, { signal: AbortSignal.timeout(5000) });
    if (!check.ok) throw new Error("ComfyUI is unavailable.");
    return NextResponse.json({ message: "ComfyUI is reachable. Add a model-specific workflow in src/lib/comfyui.ts to queue image generation.", ready: true });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to reach ComfyUI." }, { status: 503 });
  }
}
