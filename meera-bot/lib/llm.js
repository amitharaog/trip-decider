import Anthropic from "@anthropic-ai/sdk";
import { config } from "./config.js";

// Gemini over its REST API. With json: true the reply is parsed as JSON.
export async function gemini({ system, prompt, json = false, temperature = 0.7 }) {
  if (!config.geminiKey) throw new Error("GEMINI_API_KEY is not set");
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${config.geminiModel}:generateContent`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": config.geminiKey },
      body: JSON.stringify({
        systemInstruction: system ? { parts: [{ text: system }] } : undefined,
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: {
          temperature,
          ...(json ? { responseMimeType: "application/json" } : {}),
        },
      }),
    },
  );
  if (!res.ok) throw new Error(`Gemini ${res.status}: ${(await res.text()).slice(0, 300)}`);
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
