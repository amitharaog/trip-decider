import { createClient } from "@supabase/supabase-js";
import { config } from "./config.js";

// Memory layer: notes, drafts, voice_skill (see supabase/schema.sql).
// Rejected notes and drafts are kept, never deleted - they show what needs improving.
export function createStore() {
  if (!config.supabaseUrl || !config.supabaseKey) return nullStore;
  const db = createClient(config.supabaseUrl, config.supabaseKey, { auth: { persistSession: false } });

  const must = ({ data, error }) => {
    if (error) throw new Error(`Supabase: ${error.message}`);
    return data;
  };

  return {
    enabled: true,

    // Returns null when Telegram re-delivers an update we already have.
    async saveNote({ updateId, chatId, messageId, text }) {
      const { data, error } = await db
        .from("notes")
        .insert({ telegram_update_id: updateId, chat_id: chatId, telegram_message_id: messageId, text })
        .select()
        .single();
      if (error?.code === "23505") return null;
      return must({ data, error });
    },

    async updateNote(id, fields) {
      must(await db.from("notes").update(fields).eq("id", id));
    },

    async saveDraft(fields) {
      return must(await db.from("drafts").insert({ ...fields, status: "pending" }).select().single());
    },

    async updateDraft(id, fields) {
      must(await db.from("drafts").update(fields).eq("id", id));
    },

    async findDraftByMessage(chatId, messageId) {
      const rows = must(
        await db.from("drafts").select().eq("chat_id", chatId).contains("telegram_message_ids", [messageId]).limit(1),
      );
      return rows[0] || null;
    },

    async latestPendingDraft(chatId) {
      const rows = must(
        await db
          .from("drafts")
          .select()
          .eq("chat_id", chatId)
          .eq("status", "pending")
          .order("created_at", { ascending: false })
          .limit(1),
      );
      return rows[0] || null;
    },

    async activeVoice() {
      const { data, error } = await db
        .from("voice_skill")
        .select("content")
        .eq("active", true)
        .order("created_at", { ascending: false })
        .limit(1);
      if (error) return null; // table missing or empty: fall back to voice-skill.txt
      return data[0]?.content || null;
    },
  };
}

// Used when Supabase isn't configured: the pipeline still runs, nothing is saved.
const nullStore = {
  enabled: false,
  async saveNote() {
    return { id: null };
  },
  async updateNote() {},
  async saveDraft() {
    return { id: null };
  },
  async updateDraft() {},
  async findDraftByMessage() {
    return null;
  },
  async latestPendingDraft() {
    return null;
  },
  async activeVoice() {
    return null;
  },
};
