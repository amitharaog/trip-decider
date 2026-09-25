import Anthropic from "@anthropic-ai/sdk";
import { config } from "./config.js";

// Gemini over its REST API. With json: true the reply is parsed as JSON.
// If the main model is busy, over quota or retired, the fallback model answers instead.
export async function gemini({ system, prompt, json = false, temperature = 0.7, audio }) {
  if (!config.geminiKey) throw new Error("GEMINI_API_KEY is not set");
  const models = [...new Set([config.geminiModel, config.geminiFallbackModel].filter(Boolean))];
  let lastError;
  for (const model of models) {
    try {
      return await geminiOnce(model, { system, prompt, json, temperature, audio });
    } catch (err) {
      lastError = err;
      if (![404, 429, 500, 503].includes(err.status)) throw err;
      console.warn(`${model} unavailable (${err.status}), trying next model`);
    }
  }
  throw lastError;
}

async function geminiOnce(model, { system, prompt, json, temperature, audio }) {
  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-goog-api-key": config.geminiKey },
    body: JSON.stringify({
      systemInstruction: system ? { parts: [{ text: system }] } : undefined,
      contents: [
        {
          role: "user",
          parts: [
            ...(audio ? [{ inline_data: { mime_type: audio.mimeType, data: audio.data.toString("base64") } }] : []),
            { text: prompt },
          ],
        },
      ],
      generationConfig: {
        temperature,
        ...(json ? { responseMimeType: "application/json" } : {}),
      },
    }),
  });
  if (!res.ok) {
    const detail = (await res.text()).match(/"message":\s*"([^"]{0,200})/)?.[1] || "";
    throw Object.assign(new Error(`Gemini ${model} ${res.status}: ${detail}`), { status: res.status });
  }
  const data = await res.json();
  const text = (data.candidates?.[0]?.content?.parts || []).map((p) => p.text || "").join("").trim();
  if (!text) throw new Error(`Gemini returned no text (${data.candidates?.[0]?.finishReason || "no candidates"})`);
  return json ? parseJson(text) : text;
}

let anthropic;

export async function claude({ system, prompt }) {
  if (!config.anthropicKey) throw new Error("ANTHROPIC_API_KEY is not set");
  anthropic ??= new Anthropic({ apiKey: config.anthropicKey });
  const response = await anthropic.messages.create({
    model: config.claudeModel,
    max_tokens: 8000,
    output_config: { effort: "medium" },
    system,
    messages: [{ role: "user", content: prompt }],
  });
  if (response.stop_reason === "refusal") throw new Error("Claude declined to draft this note");
  return response.content
    .filter((b) => b.type === "text")
    .map((b) => b.text)
    .join("")
    .trim();
}

function parseJson(text) {
  const cleaned = text.replace(/^```(?:json)?\s*|\s*```$/g, "");
  return JSON.parse(cleaned);
}

// Voice note -> text, word for word, so it can go through the same pipeline as a typed note.
export async function transcribe(data, mimeType) {
  return gemini({
    audio: { data, mimeType },
    prompt:
      "Transcribe this voice note word for word in the language it is spoken. Output only the transcript, no labels or commentary. If there is no intelligible speech, output exactly: [no speech]",
    temperature: 0,
  });
}
