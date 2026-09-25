import { config, draftModel } from "./config.js";
import { gemini, claude } from "./llm.js";
import { findNews, verifyBlock } from "./news.js";
import { loadVoice } from "./voice.js";
import { SCORE_SYSTEM, KEYWORDS_SYSTEM, draftSystem, draftPrompt } from "./prompts.js";

// Default services; tests swap these out.
export const services = { gemini, claude, findNews, loadVoice };

// Step 1: is this note worth a post?
export async function scoreNote(text, s = services) {
  const out = await s.gemini({ system: SCORE_SYSTEM, prompt: text, json: true, temperature: 0 });
  const score = Math.max(0, Math.min(10, Math.round(Number(out.score))));
  if (Number.isNaN(score)) throw new Error("Scoring returned no number");
  return { score, reason: String(out.reason || "").trim() };
}

// Step 2: find something current to hang it on.
export async function newsFor(text, s = services) {
  try {
    const { query } = await s.gemini({ system: KEYWORDS_SYSTEM, prompt: text, json: true, temperature: 0 });
    const news = await s.findNews(query);
    return { query, news };
  } catch (err) {
    console.error("news lookup failed", err);
    return { query: null, news: null }; // a draft without news beats no draft
  }
}

// Step 3: write the draft in her voice.
export async function writeDraft(text, news, { model = draftModel(), store, s = services } = {}) {
  const voice = await s.loadVoice(store);
  const args = { system: draftSystem(voice), prompt: draftPrompt(text, news) };
  const raw = model === "claude" ? await s.claude(args) : await s.gemini(args);
  const match = raw.match(/\n?\s*NEWS_USED:\s*(YES|NO)\s*$/i);
  const post = (match ? raw.slice(0, match.index) : raw).trim();
  const usedNews = Boolean(news) && match?.[1].toUpperCase() === "YES";
  return { post, usedNews, model };
}

// The whole run for one note. Returns what should go back to Telegram.
export async function processNote(text, { store, s = services, minScore = config.minScore } = {}) {
  const { score, reason } = await scoreNote(text, s);
  if (score < minScore) {
    return { kind: "rejected", score, reason };
  }
  const { query, news } = await newsFor(text, s);
  const draft = await writeDraft(text, news, { store, s });
  const body = draft.usedNews ? `${draft.post}\n\n${verifyBlock(news)}` : draft.post;
  return { kind: "draft", score, reason, query, news: draft.usedNews ? news : null, body, model: draft.model };
}

export function rejectionMessage({ score, reason }) {
  return `Not drafted (score ${score}/10). ${reason}\n\nNote saved. Add a specific example or the point you want to make and send it again if you want a draft.`;
}

export function draftMessage(result, draftId) {
  const head = `DRAFT${draftId ? ` #${draftId}` : ""} · score ${result.score}/10 · ${result.model}\n${result.reason}`;
  const tail = "Reply APPROVE or REJECT to this message (REJECT can include a reason). Nothing is posted anywhere — you publish it yourself.";
  return `${head}\n\n${result.body}\n\n${tail}`;
}
