import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 300;

const comfyBase = (process.env.COMFYUI_BASE_URL ?? "http://127.0.0.1:8188").replace(/\/$/, "");
const checkpoint = process.env.COMFYUI_CHECKPOINT ?? "DreamShaper_8_pruned.safetensors";

const illustrationStyle = "children's storybook illustration, stylized 2D digital painting, cartoon game concept art, hand-painted brushwork, simplified elegant shapes, warm colors, clean composition";
const negativePrompt = "photorealistic, photograph, camera, live action, 3d render, CGI, text, letters, words, writing, Chinese characters, signage, menu, watermark, logo, signature, blurry, low quality, low resolution, noisy, oversaturated, cluttered composition, cropped face, cut off body, out of frame, duplicate person, extra limbs, malformed anatomy, deformed face, asymmetrical eyes, bad hands, malformed fingers, fused fingers, extra fingers, missing fingers";

function makeWorkflow(prompt: string) {
  const seed = Math.floor(Math.random() * 2 ** 32);
  return {
    "1": { class_type: "CheckpointLoaderSimple", inputs: { ckpt_name: checkpoint } },
    "2": { class_type: "CLIPTextEncode", inputs: { text: `${illustrationStyle}, ${prompt}, natural human proportions and hands, complete subjects fully in frame, calm detailed background, no signs or writing, blank undecorated surfaces`, clip: ["1", 1] } },
    "3": { class_type: "CLIPTextEncode", inputs: { text: negativePrompt, clip: ["1", 1] } },
    "4": { class_type: "EmptyLatentImage", inputs: { width: 512, height: 512, batch_size: 1 } },
    "5": { class_type: "KSampler", inputs: { seed, steps: 24, cfg: 7, sampler_name: "dpmpp_2m", scheduler: "karras", denoise: 1, model: ["1", 0], positive: ["2", 0], negative: ["3", 0], latent_image: ["4", 0] } },
    "6": { class_type: "VAEDecode", inputs: { samples: ["5", 0], vae: ["1", 2] } },
    "7": { class_type: "SaveImage", inputs: { filename_prefix: "hanzi-quest/scene", images: ["6", 0] } },
  };
}

export async function POST(request: Request) {
  try {
    const { prompt } = await request.json();
    if (typeof prompt !== "string" || !prompt.trim() || prompt.length > 1000) return NextResponse.json({ error: "Enter a prompt under 1,000 characters." }, { status: 400 });
    const response = await fetch(`${comfyBase}/prompt`, {
      method: "POST", headers: { "Content-Type": "application/json" }, signal: AbortSignal.timeout(10_000),
      body: JSON.stringify({ prompt: makeWorkflow(prompt.trim()), client_id: "hanzi-quest-studio" }),
    });
    const result = await response.json();
    if (!response.ok || result.error) return NextResponse.json({ error: result.error?.message ?? "ComfyUI rejected the workflow. Check the checkpoint filename and installed nodes.", details: result.node_errors }, { status: 502 });
    return NextResponse.json({ promptId: result.prompt_id, queuePosition: result.number });
  } catch (error) {
    const message = error instanceof Error && error.name === "TimeoutError" ? "ComfyUI did not respond in time." : "Unable to reach ComfyUI. Start it and confirm COMFYUI_BASE_URL.";
    return NextResponse.json({ error: message }, { status: 503 });
  }
}

export async function GET(request: Request) {
  const promptId = new URL(request.url).searchParams.get("promptId");
  if (!promptId || !/^[\w-]{8,80}$/.test(promptId)) return NextResponse.json({ error: "A valid promptId is required." }, { status: 400 });
  try {
    const response = await fetch(`${comfyBase}/history/${encodeURIComponent(promptId)}`, { signal: AbortSignal.timeout(5000), cache: "no-store" });
    if (!response.ok) return NextResponse.json({ error: "ComfyUI could not read this job." }, { status: 502 });
    const history = await response.json();
    const job = history[promptId];
    if (!job) return NextResponse.json({ status: "running" });
    if (job.status?.status_str === "error" || job.status?.status_str === "interrupted") return NextResponse.json({ status: "failed", error: "ComfyUI could not generate this image. Check its console for model or VRAM errors." });
    type ComfyOutput = { images?: Array<{ filename: string; subfolder?: string; type?: string }> };
    const outputs = Object.values(job.outputs ?? {}) as ComfyOutput[];
    const image = outputs.flatMap(output => output.images ?? [])[0];
    if (!image) return NextResponse.json({ status: "running" });
    const query = new URLSearchParams({ filename: image.filename, subfolder: image.subfolder ?? "", type: image.type ?? "output" });
    const imageResponse = await fetch(`${comfyBase}/view?${query}`, { signal: AbortSignal.timeout(15_000), cache: "no-store" });
    if (!imageResponse.ok) return NextResponse.json({ status: "failed", error: "ComfyUI finished, but the image could not be retrieved." });
    const bytes = Buffer.from(await imageResponse.arrayBuffer());
    return NextResponse.json({ status: "completed", image: `data:${imageResponse.headers.get("content-type") ?? "image/png"};base64,${bytes.toString("base64")}` });
  } catch {
    return NextResponse.json({ error: "Unable to read the ComfyUI job. Confirm ComfyUI is still running." }, { status: 503 });
  }
}
