# Hanzi Quest Studio

A local-first starter for generating structured Mandarin learning lessons. The Next.js UI calls a small server API, which talks to Ollama on your PC. The generated lesson includes vocabulary, pinyin, examples, a scene dialogue, exercises, and an image prompt that can seed a ComfyUI workflow.

## Your PC and model choices

The target machine is an Alienware 17 R4 with a GTX 1070 (8 GB VRAM), 16 GB system RAM, and Windows 10 64-bit. Start with `qwen3:4b` for comfortable memory headroom. If it runs well and enough system memory is free, try `qwen3:8b`; choose a smaller context (the app requests 4K) and close memory-heavy apps. A 14B model is a poor fit for this machine. Model tags and hardware support can change; check the current Ollama library before downloading.

Image generation is more demanding. Begin with a lightweight Stable Diffusion 1.5 checkpoint in ComfyUI at 512×512, batch size 1. SDXL is likely to be slow and tight on 8 GB VRAM. Avoid assuming FLUX will fit comfortably. Run text or image generation one at a time, and keep Windows/browser memory use low. Image generation is an extension point in this starter; the UI exposes the lesson's image prompt and checks ComfyUI connectivity, but does not yet queue a model-specific workflow.

## Requirements

- Windows 10/11 x64
- Node.js 20.9 or newer and Git
- Ollama for Windows
- Optional: ComfyUI with a compatible checkpoint

## Setup

1. Install Ollama from its official Windows download and open it.
2. In PowerShell, download the starter model: `ollama pull qwen3:4b`.
3. Check the model responds: `ollama run qwen3:4b` (type `/bye` to exit).
4. Copy `.env.example` to `.env.local`. Defaults work when Ollama runs on this PC. Set `OLLAMA_MODEL` to another installed Ollama tag if needed.
5. Install app dependencies and start the web app:

   ```powershell
   npm install
   npm run dev
   ```

6. Open http://localhost:3000, enter a topic and scene, and generate a lesson. The first response can take a while as the model loads.

To enable the ComfyUI connectivity endpoint, start ComfyUI and set `COMFYUI_BASE_URL` in `.env.local` (default `http://127.0.0.1:8188`). Never expose either local service directly to the public internet.

## API

`POST /api/lessons`

```json
{"topic":"Ordering tea","level":"Beginner","scenario":"A tea shop in Chengdu"}
```

Returns `{ "lesson": { title, summary, vocabulary, dialogue, exercises, imagePrompt } }`. The response is validated with Zod before it reaches the UI. `POST /api/images` accepts `{ "prompt": "..." }` and checks that ComfyUI responds; queueing an image requires a workflow compatible with the installed checkpoint.

## Extend toward the exploration game

- Keep lesson output as versionable structured data; add a persisted lesson/scenario ID and tags when adding storage.
- Add location, NPC, quest objective, unlock conditions, and collectible vocabulary to the request/response schemas.
- Keep provider logic behind `src/lib/ollama.ts` so a hosted or alternate local model can be added later.
- Add a ComfyUI workflow adapter under `src/lib/` and save generated image metadata against a scene, rather than embedding provider details in the UI.
- Review generated Chinese and answers before shipping lessons; local generation can still produce language errors.

## Configuration

| Variable | Default | Purpose |
| --- | --- | --- |
| `OLLAMA_BASE_URL` | `http://127.0.0.1:11434` | Local Ollama API |
| `OLLAMA_MODEL` | `qwen3:4b` | Installed Ollama model tag |
| `COMFYUI_BASE_URL` | `http://127.0.0.1:8188` | Local ComfyUI server |

## Troubleshooting

- **Cannot connect to Ollama:** ensure the Ollama app is running, visit `http://127.0.0.1:11434` locally, and verify `.env.local`.
- **Model not found:** run `ollama list`; set `OLLAMA_MODEL` to one of those exact names and restart Next.js.
- **Out of memory / slow:** use `qwen3:4b`, close other apps, and try again. Keep image generation separate from text generation.
- **Invalid lesson response:** retry once. The API validates the JSON shape and shows the returned error rather than silently accepting malformed content.

## Stack

Next.js App Router, React, TypeScript, Zod, Ollama HTTP API, and optional ComfyUI HTTP endpoint. No cloud model credentials are required.
