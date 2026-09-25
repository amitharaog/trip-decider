// Every setting comes from environment variables (Vercel project settings, or .env locally).
export const config = {
  telegramToken: process.env.TELEGRAM_BOT_TOKEN,
  webhookSecret: process.env.TELEGRAM_WEBHOOK_SECRET || "",
  allowedChatId: process.env.ALLOWED_CHAT_ID || "",
  geminiKey: process.env.GEMINI_API_KEY,
  geminiModel: process.env.GEMINI_MODEL || "gemini-flash-latest",
  geminiFallbackModel: process.env.GEMINI_FALLBACK_MODEL ?? "gemini-flash-lite-latest",
  anthropicKey: process.env.ANTHROPIC_API_KEY,
  claudeModel: process.env.CLAUDE_MODEL || "claude-opus-5",
  minScore: Number(process.env.MIN_SCORE || 6),
  supabaseUrl: process.env.SUPABASE_URL,
  supabaseKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
};

// Which model writes the draft: DRAFT_MODEL wins, otherwise Claude when a key exists.
export function draftModel() {
  const chosen = (process.env.DRAFT_MODEL || "").toLowerCase();
  if (chosen === "claude" || chosen === "gemini") return chosen;
  return config.anthropicKey ? "claude" : "gemini";
}
