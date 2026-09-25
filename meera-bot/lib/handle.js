import { config } from "./config.js";
import { createStore } from "./store.js";
import { sendMessage, sendTyping } from "./telegram.js";
import { processNote, rejectionMessage, draftMessage } from "./pipeline.js";

const HELP = `Send me a note (text) and I'll:
1. score it 0-10 — below ${config.minScore} I tell you why and stop
2. look for a current news angle
3. send back a LinkedIn draft in your voice

Reply APPROVE or REJECT to a draft to record your decision. I never post anything — you do.
/id shows this chat's id.`;

const DECISION = /^\s*(APPROVE|APPROVED|REJECT|REJECTED)\b[\s:.,-]*(.*)$/is;

// Decides what to do with one Telegram update. Returns a promise for the work,
// which the webhook hands to waitUntil so Telegram gets its 200 straight away.
export function routeUpdate(update, store = createStore()) {
  const msg = update.message || update.channel_post;
  if (!msg || msg.from?.is_bot) return null;
  const chatId = msg.chat.id;

  if (config.allowedChatId && String(chatId) !== String(config.allowedChatId)) {
    console.warn("ignoring chat", chatId);
    return null;
  }

  const text = (msg.text || msg.caption || "").trim();
  if (!text) {
    return sendMessage(chatId, "I can only read text for now. Paste the note (or use Telegram's voice-to-text) and send it again.", msg.message_id);
  }
  if (/^\/(start|help)\b/.test(text)) return sendMessage(chatId, HELP);
  if (/^\/id\b/.test(text)) return sendMessage(chatId, `This chat's id is ${chatId}`);

  const decision = text.match(DECISION);
  if (decision) return handleDecision({ store, chatId, msg, decision });

  return handleNote({ store, chatId, msg, text, updateId: update.update_id });
}

async function handleNote({ store, chatId, msg, text, updateId }) {
  const note = await store.saveNote({ updateId, chatId, messageId: msg.message_id, text });
  if (!note) return; // duplicate delivery
  await sendTyping(chatId);
  try {
    const result = await processNote(text, { store });
    if (result.kind === "rejected") {
      await store.updateNote(note.id, { score: result.score, score_reason: result.reason, status: "rejected_by_score" });
      await sendMessage(chatId, rejectionMessage(result), msg.message_id);
      return;
    }
    await store.updateNote(note.id, { score: result.score, score_reason: result.reason, status: "drafted" });
    const draft = await store.saveDraft({
      note_id: note.id,
      chat_id: chatId,
      body: result.body,
      news: result.news,
      news_query: result.query,
      model: result.model,
    });
    const ids = await sendMessage(chatId, draftMessage(result, draft.id), msg.message_id);
    await store.updateDraft(draft.id, { telegram_message_ids: ids });
  } catch (err) {
    console.error("pipeline failed", err);
    await store.updateNote(note.id, { status: "error", score_reason: String(err.message).slice(0, 500) }).catch(() => {});
    await sendMessage(chatId, `Something broke while drafting this note, so there's no draft. Your note is saved.\n\n(${err.message})`, msg.message_id);
  }
}

async function handleDecision({ store, chatId, msg, decision }) {
  if (!store.enabled) {
    return sendMessage(chatId, "Supabase isn't connected yet, so I can't record approvals. See the README.", msg.message_id);
  }
  const status = decision[1].toUpperCase().startsWith("APPROVE") ? "approved" : "rejected";
  const feedback = decision[2].trim() || null;
  const replyTo = msg.reply_to_message?.message_id;
  const draft = replyTo
    ? await store.findDraftByMessage(chatId, replyTo)
    : await store.latestPendingDraft(chatId);
  if (!draft) {
    return sendMessage(chatId, replyTo ? "That message isn't a draft I know about." : "No pending draft to decide on. Reply to the draft message itself.", msg.message_id);
  }
  await store.updateDraft(draft.id, { status, feedback, decided_at: new Date().toISOString() });
  if (draft.note_id) await store.updateNote(draft.note_id, { status });
  const word = status === "approved" ? "Approved" : "Rejected";
  const next = status === "approved" ? " Edit it as you like and post it yourself." : feedback ? " Reason saved." : "";
  return sendMessage(chatId, `${word} draft #${draft.id}.${next}`, msg.message_id);
}
