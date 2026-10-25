# Hanzi Quest Studio

A local-first starter for generating structured Mandarin learning lessons. The Next.js UI calls a small server API, which talks to Ollama on your PC. The generated lesson includes vocabulary, pinyin, examples, a scene dialogue, exercises, and an image prompt that can seed a ComfyUI workflow.

## Your PC and model choices

The target machine is an Alienware 17 R4 with a GTX 1070 (8 GB VRAM), 16 GB system RAM, and Windows 10 64-bit. Start with `qwen3:4b` for comfortable memory headroom. If it runs well and enough system memory is free, try `qwen3:8b`; choose a smaller context (the app requests 4K) and close memory-heavy apps. A 14B model is a poor fit for this machine. Model tags and hardware support can change; check the current Ollama library before downloading.

Image generation is more demanding. Begin with the FP16 Stable Diffusion 1.5 checkpoint in ComfyUI at 512×512, batch size 1. SDXL is likely to be slow and tight on 8 GB VRAM. Avoid assuming FLUX will fit comfortably. Run text or image generation one at a time, and keep Windows/browser memory use low. The app submits a basic SD 1.5 workflow to ComfyUI, polls job history, and displays the generated image.

## Requirements

- Windows 10/11 x64
- Node.js 20.9 or newer and Git
- Ollama for Windows
- Optional: [ComfyUI for Windows](https://github.com/Comfy-Org/ComfyUI), plus a Stable Diffusion 1.5 checkpoint

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

To enable image generation:

1. Download ComfyUI's [NVIDIA CUDA 12.6 portable build](https://github.com/comfyanonymous/ComfyUI/releases/latest/download/ComfyUI_windows_portable_nvidia_cu126.7z) for GTX 10-series and older cards; the standard current portable build targets newer cards. Extract it and start ComfyUI.
2. Download the FP16 checkpoint from [Comfy-Org's Stable Diffusion 1.5 model](https://huggingface.co/Comfy-Org/stable-diffusion-1.5/resolve/main/v1-5-pruned-emaonly-fp16.safetensors) and put it in `ComfyUI\models\checkpoints`.
3. Set `COMFYUI_CHECKPOINT` in `.env.local` to its exact filename (default `v1-5-pruned-emaonly-fp16.safetensors`). Set `COMFYUI_BASE_URL` only if ComfyUI uses a different local address, then restart Next.js.

The app uses ComfyUI's local `/prompt`, `/history`, and `/view` endpoints. Never expose either local service directly to the public internet. See the [ComfyUI server API documentation](https://docs.comfy.org/development/comfyui-server/comms_routes) for its local queue and image routes.

## API

`POST /api/lessons`

```json
{"topic":"Ordering tea","level":"Beginner","scenario":"A tea shop in Chengdu"}
```

Returns `{ "lesson": { title, summary, vocabulary, dialogue, exercises, imagePrompt } }`. The response is validated with Zod before it reaches the UI. `POST /api/images` accepts `{ "prompt": "..." }`, submits an SD 1.5 workflow, and returns a ComfyUI `promptId`. Poll `GET /api/images?promptId=...` for job status; when complete it returns the image as a data URL. The first image may take several minutes while ComfyUI loads the checkpoint.

## Extend toward the exploration game

- Keep lesson output as versionable structured data; add a persisted lesson/scenario ID and tags when adding storage.
- Add location, NPC, quest objective, unlock conditions, and collectible vocabulary to the request/response schemas.
- Keep provider logic behind `src/lib/ollama.ts` so a hosted or alternate local model can be added later.
- Adapt the workflow in `src/app/api/images/route.ts` for other checkpoints or custom nodes, and save generated image metadata against a scene as persistence is added.
- Review generated Chinese and answers before shipping lessons; local generation can still produce language errors.

## Configuration

| Variable | Default | Purpose |
| --- | --- | --- |
| `OLLAMA_BASE_URL` | `http://127.0.0.1:11434` | Local Ollama API |
| `OLLAMA_MODEL` | `qwen3:4b` | Installed Ollama model tag |
| `COMFYUI_BASE_URL` | `http://127.0.0.1:8188` | Local ComfyUI server |
| `COMFYUI_CHECKPOINT` | `v1-5-pruned-emaonly-fp16.safetensors` | Checkpoint filename in ComfyUI's checkpoints folder |

## Troubleshooting

- **Cannot connect to Ollama:** ensure the Ollama app is running, visit `http://127.0.0.1:11434` locally, and verify `.env.local`.
- **Model not found:** run `ollama list`; set `OLLAMA_MODEL` to one of those exact names and restart Next.js.
- **Out of memory / slow:** use `qwen3:4b`, close other apps, and try again. Keep image generation separate from text generation.
- **Invalid lesson response:** retry once. The API validates the JSON shape and shows the returned error rather than silently accepting malformed content.
- **ComfyUI rejects an image job:** confirm the checkpoint filename exactly matches a file in `ComfyUI\models\checkpoints` and that ComfyUI reports no missing nodes.
- **Image generation is slow or runs out of memory:** use a small SD 1.5 checkpoint, close other GPU-heavy apps, and keep generation at 512×512 with one image per batch.

## Stack

Next.js App Router, React, TypeScript, Zod, Ollama HTTP API, and optional ComfyUI HTTP endpoint. No cloud model credentials are required.
