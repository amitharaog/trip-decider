// Every setting comes from environment variables (Vercel project settings, or .env locally).
// Read on use (not at import), so tests and scripts can set variables first.
export const config = {
  get telegramToken() {
    return process.env.TELEGRAM_BOT_TOKEN;
  },
  get webhookSecret() {
    return process.env.TELEGRAM_WEBHOOK_SECRET || "";
  },
  get allowedChatId() {
    return process.env.ALLOWED_CHAT_ID || "";
  },
  get geminiKey() {
    return process.env.GEMINI_API_KEY;
  },
  get geminiModel() {
    return process.env.GEMINI_MODEL || "gemini-flash-latest";
  },
  get geminiFallbackModel() {
    return process.env.GEMINI_FALLBACK_MODEL ?? "gemini-flash-lite-latest";
  },
  get anthropicKey() {
    return process.env.ANTHROPIC_API_KEY;
  },
  get claudeModel() {
    return process.env.CLAUDE_MODEL || "claude-opus-5";
  },
  get minScore() {
    return Number(process.env.MIN_SCORE || 6);
  },
  get supabaseUrl() {
    return process.env.SUPABASE_URL;
  },
  get supabaseKey() {
    return process.env.SUPABASE_SERVICE_ROLE_KEY;
  },
};

// Which model writes the draft: DRAFT_MODEL wins, otherwise Claude when a key exists.
export function draftModel() {
  const chosen = (process.env.DRAFT_MODEL || "").toLowerCase();
  if (chosen === "claude" || chosen === "gemini") return chosen;
  return config.anthropicKey ? "claude" : "gemini";
}
