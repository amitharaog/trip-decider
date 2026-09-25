// Tells Telegram where to deliver messages: PUBLIC_URL/api/webhook
import { setWebhook } from "../lib/telegram.js";

const base = (process.argv[2] || process.env.PUBLIC_URL || "").replace(/\/$/, "");
if (!base.startsWith("https://")) {
  console.error("Usage: npm run set-webhook -- https://your-project.vercel.app  (or set PUBLIC_URL)");
  process.exit(1);
}
const url = `${base}/api/webhook`;
await setWebhook(url, process.env.TELEGRAM_WEBHOOK_SECRET);
console.log(`Webhook set: ${url}`);
