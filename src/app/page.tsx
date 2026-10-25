"use client";
import { useState } from "react";
import Image from "next/image";
import type { Lesson } from "@/lib/schema";

export default function Home() {
  const [topic, setTopic] = useState("Ordering tea");
  const [scenario, setScenario] = useState("A small tea shop in Chengdu");
  const [level, setLevel] = useState("Beginner");
  const [lesson, setLesson] = useState<Lesson | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [imageBusy, setImageBusy] = useState(false);
  const [image, setImage] = useState("");
  const [imageError, setImageError] = useState("");
  async function generate(event: React.FormEvent) {
    event.preventDefault(); setBusy(true); setError(""); setLesson(null); setImage(""); setImageError("");
    try { const response = await fetch("/api/lessons", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ topic, scenario, level }) }); const data = await response.json(); if (!response.ok) throw new Error(data.error); setLesson(data.lesson); }
    catch (e) { setError(e instanceof Error ? e.message : "Something went wrong."); }
    finally { setBusy(false); }
  }
  async function generateImage() {
    if (!lesson) return;
    setImageBusy(true); setImageError(""); setImage("");
    try {
      const queued = await fetch("/api/images", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ prompt: lesson.imagePrompt }) });
      const job = await queued.json();
      if (!queued.ok) throw new Error(job.error ?? "Could not start image generation.");
      const deadline = Date.now() + 240_000;
      while (Date.now() < deadline) {
        await new Promise(resolve => setTimeout(resolve, 2000));
        const response = await fetch(`/api/images?promptId=${encodeURIComponent(job.promptId)}`, { cache: "no-store" });
        const status = await response.json();
        if (!response.ok) throw new Error(status.error ?? "Could not check image generation.");
        if (status.status === "completed") { setImage(status.image); return; }
        if (status.status === "failed") throw new Error(status.error ?? "Image generation failed.");
      }
      throw new Error("Image generation is taking longer than expected. Check the ComfyUI window; the queued job may still finish there.");
    } catch (e) { setImageError(e instanceof Error ? e.message : "Image generation failed."); }
    finally { setImageBusy(false); }
  }
  return <main className="shell">
    <header className="top"><div className="mark">漢</div><div><p className="eyebrow">LOCAL AI · LEARNING CONTENT</p><h1>Hanzi Quest Studio</h1></div><span className="local"><i /> Runs on your PC</span></header>
    <section className="intro"><div><p className="eyebrow">BUILD YOUR NEXT LESSON</p><h2>Learn Chinese<br/><em>one scene at a time.</em></h2><p className="sub">Generate vocabulary, natural dialogue, and practice exercises for an exploration-style learning game.</p></div><div className="stamp">茶<br/><small>TEA HOUSE · 成都</small></div></section>
    <section className="panel"><form onSubmit={generate}>
      <label>Lesson topic<input value={topic} onChange={e=>setTopic(e.target.value)} maxLength={120} required /></label>
      <div className="formrow"><label>Learning level<select value={level} onChange={e=>setLevel(e.target.value)}><option>Beginner</option><option>Elementary</option><option>Intermediate</option></select></label><label>Scene / location<input value={scenario} onChange={e=>setScenario(e.target.value)} maxLength={160} required /></label></div>
      <button disabled={busy}>{busy ? "Creating your lesson…" : "✦  Generate lesson"}</button>
      <p className="hint">Your prompt stays on this computer and goes to your local Ollama model.</p>
    </form></section>
    {error && <p className="error" role="alert">{error} <span>Check Ollama is running and the model is downloaded.</span></p>}
    {lesson && <section className="results"><div className="lessonhead"><div><p className="eyebrow">YOUR SCENE</p><h2>{lesson.title}</h2><p>{lesson.summary}</p></div><span className="tag">{level}</span></div>
      <h3>Words to know <span>詞彙</span></h3><div className="words">{lesson.vocabulary.map((w,i)=><article className="word" key={i}><strong>{w.hanzi}</strong><span className="pinyin">{w.pinyin}</span><span>{w.meaning}</span><p>{w.example}<br/><small>{w.examplePinyin}</small><br/><small>{w.exampleTranslation}</small></p></article>)}</div>
      <h3>At the scene <span>對話</span></h3><div className="dialogue">{lesson.dialogue.map((line,i)=><article key={i}><b>{line.speaker}</b><strong>{line.chinese}</strong><small>{line.pinyin}</small><span>{line.translation}</span></article>)}</div>
      <h3>Practice <span>練習</span></h3><div className="exercises">{lesson.exercises.map((x,i)=><details key={i}><summary>{i+1}. {x.prompt}</summary><p><b>{x.answer}</b> — {x.explanation}</p></details>)}</div>
      <div className="imageNote"><p>🎨 <b>Scene illustration</b></p><p>{lesson.imagePrompt}</p><button className="imageButton" onClick={generateImage} disabled={imageBusy}>{imageBusy ? "Generating on your PC…" : image ? "Generate another image" : "Generate with ComfyUI"}</button>{imageError && <p className="imageError" role="alert">{imageError}</p>}{image && <Image unoptimized width={512} height={512} className="sceneImage" src={image} alt={`AI illustration for ${lesson.title}`} />}</div>
    </section>}
    <footer>HANZI QUEST STUDIO <span>Made for curious learners · Local-first</span></footer>
  </main>;
}
