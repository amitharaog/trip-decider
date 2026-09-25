import { test } from "node:test";
import assert from "node:assert/strict";
import { processNote, draftMessage } from "../lib/pipeline.js";
import { parseTopItem } from "../lib/news.js";
import { routeUpdate } from "../lib/handle.js";

const NEWS = { title: "CDSCO tightens cosmetic labelling", source: "Mint", date: "2026-09-20", link: "https://example.com/a", summary: "New rules." };

function fakeServices({ score, usedNews = "YES", news = NEWS }) {
  const calls = [];
  return {
    calls,
    s: {
      async gemini({ system, prompt, json }) {
        calls.push({ model: "gemini", system, prompt });
        if (system.startsWith("You screen")) return { score, reason: "Specific incident with a clear point." };
        if (system.startsWith("You turn")) return { keywords: ["ph", "supplier"], query: "cosmetic supplier formula change" };
        return `I held batch fourteen.\n\nNEWS_USED: ${usedNews}`;
      },
      async claude({ system, prompt }) {
        calls.push({ model: "claude", system, prompt });
        return `Claude draft.\nNEWS_USED: ${usedNews}`;
      },
      async findNews() {
        return news;
      },
      async loadVoice() {
        return "VOICE PROFILE MARKER";
      },
    },
  };
}

test("low score stops before drafting", async () => {
  const { s, calls } = fakeServices({ score: 2 });
  const r = await processNote("call the courier", { s, minScore: 6 });
  assert.equal(r.kind, "rejected");
  assert.equal(calls.length, 1);
});

test("good note gets news, voice and the verify flag", async () => {
  process.env.DRAFT_MODEL = "gemini";
  const { s, calls } = fakeServices({ score: 8 });
  const r = await processNote("batch fourteen pH dropped", { s, minScore: 6 });
  assert.equal(r.kind, "draft");
  const draftCall = calls.at(-1);
  assert.match(draftCall.system, /VOICE PROFILE MARKER/);
  assert.match(draftCall.prompt, /CDSCO tightens cosmetic labelling/);
  assert.match(r.body, /NEWS SOURCE: CDSCO tightens cosmetic labelling/);
  assert.match(r.body, /FROM: Mint · 2026-09-20/);
  assert.match(r.body, /LINK: https:\/\/example.com\/a/);
  assert.match(r.body, /you are the author of this claim/);
  assert.doesNotMatch(r.body, /NEWS_USED/);
  assert.match(draftMessage(r, 12), /DRAFT #12 · score 8\/10/);
});

test("unused news is still attached as related news", async () => {
  process.env.DRAFT_MODEL = "gemini";
  const { s } = fakeServices({ score: 7, usedNews: "NO" });
  const r = await processNote("note", { s, minScore: 6 });
  assert.equal(r.usedNews, false);
  assert.doesNotMatch(r.body, /NEWS SOURCE/);
  assert.match(r.body, /RELATED NEWS \(not used in this draft\): CDSCO/);
  assert.match(r.body, /LINK: https:\/\/example.com\/a/);
});

test("says so when no news was found", async () => {
  process.env.DRAFT_MODEL = "gemini";
  const { s } = fakeServices({ score: 7, news: null });
  const r = await processNote("note", { s, minScore: 6 });
  assert.match(r.body, /News: nothing found on Google News for "cosmetic supplier formula change"/);
});

test("widens the search until Google News returns something", async () => {
  const { findNews } = await import("../lib/news.js");
  const seen = [];
  const real = globalThis.fetch;
  globalThis.fetch = async (url) => {
    const q = new URL(url).searchParams.get("q");
    seen.push(q);
    const hit = q === "supplier formula";
    return { ok: true, text: async () => (hit ? `<item><title>Hit - Mint</title><link>https://x</link><pubDate>Mon, 22 Sep 2026 08:00:00 GMT</pubDate><source url="m">Mint</source></item>` : "<rss></rss>") };
  };
  const n = await findNews("supplier formula change", ["cosmetics"]);
  globalThis.fetch = real;
  assert.deepEqual(seen, ["supplier formula change when:30d", "supplier formula change", "supplier formula"]);
  assert.equal(n.title, "Hit");
  assert.equal(n.searchedFor, "supplier formula");
});

test("DRAFT_MODEL=claude drafts with Claude", async () => {
  process.env.DRAFT_MODEL = "claude";
  const { s, calls } = fakeServices({ score: 9 });
  const r = await processNote("note", { s, minScore: 6 });
  assert.equal(r.model, "claude");
  assert.equal(calls.at(-1).model, "claude");
  delete process.env.DRAFT_MODEL;
});

test("parses the top Google News item", () => {
  const xml = `<rss><channel><item><title>Brands quietly reformulate - The Hindu</title><link>https://news.google.com/x</link><pubDate>Mon, 22 Sep 2026 08:00:00 GMT</pubDate><description>&lt;a href="x"&gt;Brands quietly reformulate&lt;/a&gt;&amp;nbsp;&amp;nbsp;&lt;font&gt;The Hindu&lt;/font&gt;</description><source url="https://thehindu.com">The Hindu</source></item></channel></rss>`;
  const n = parseTopItem(xml);
  assert.equal(n.title, "Brands quietly reformulate");
  assert.equal(n.source, "The Hindu");
  assert.equal(n.date, "2026-09-22");
  assert.equal(n.link, "https://news.google.com/x");
});

test("APPROVE as a reply updates that draft", async () => {
  const sent = [];
  globalThis.fetch = async (url, init) => {
    sent.push(JSON.parse(init.body));
    return { json: async () => ({ ok: true, result: { message_id: 99 } }) };
  };
  const updates = [];
  const store = {
    enabled: true,
    async findDraftByMessage(chatId, id) {
      return id === 50 ? { id: 7, note_id: 3 } : null;
    },
    async updateDraft(id, f) {
      updates.push(["draft", id, f.status, f.feedback]);
    },
    async updateNote(id, f) {
      updates.push(["note", id, f.status]);
    },
  };
  await routeUpdate({ update_id: 1, message: { message_id: 51, chat: { id: 5 }, text: "REJECT too long", reply_to_message: { message_id: 50 } } }, store);
  assert.deepEqual(updates, [["draft", 7, "rejected", "too long"], ["note", 3, "rejected"]]);
  assert.match(sent[0].text, /Rejected draft #7/);
});

test("voice note is transcribed, echoed, then run as a note", async () => {
  process.env.TELEGRAM_BOT_TOKEN = "t";
  process.env.GEMINI_API_KEY = "g";
  const sent = [];
  const geminiBodies = [];
  globalThis.fetch = async (url, init) => {
    url = String(url);
    if (url.includes("/getFile")) return { json: async () => ({ ok: true, result: { file_path: "voice/1.oga" } }) };
    if (url.includes("/file/bot")) return { ok: true, arrayBuffer: async () => new Uint8Array([1, 2, 3]).buffer };
    if (url.includes("generativelanguage")) {
      const body = JSON.parse(init.body);
      geminiBodies.push(body);
      const isAudio = body.contents[0].parts.some((p) => p.inline_data);
      const text = isAudio ? "Call the courier at four." : JSON.stringify({ score: 1, reason: "Just a reminder." });
      return { ok: true, json: async () => ({ candidates: [{ content: { parts: [{ text }] } }] }) };
    }
    if (url.includes("api.telegram.org")) {
      sent.push(JSON.parse(init.body));
      return { json: async () => ({ ok: true, result: { message_id: 1 } }) };
    }
    throw new Error("unexpected " + url);
  };
  const store = { enabled: false, saveNote: async () => ({ id: null }), updateNote: async () => {} };
  await routeUpdate({ update_id: 9, message: { message_id: 3, chat: { id: 5 }, voice: { file_id: "abc", mime_type: "audio/ogg" } } }, store);
  const audioPart = geminiBodies[0].contents[0].parts[0].inline_data;
  assert.equal(audioPart.mime_type, "audio/ogg");
  assert.equal(audioPart.data, "AQID");
  const texts = sent.filter((m) => m.text).map((m) => m.text);
  assert.match(texts[0], /Heard:\nCall the courier at four\./);
  assert.match(texts[1], /Not drafted \(score 1\/10\)/);
});
