import { waitUntil } from "@vercel/functions";
import { config } from "../lib/config.js";
import { routeUpdate } from "../lib/handle.js";

// Telegram calls this for every message. We answer 200 at once and keep working
// in the background, so Telegram never times out and re-sends the same note.
export async function POST(request) {
  if (config.webhookSecret && request.headers.get("x-telegram-bot-api-secret-token") !== config.webhookSecret) {
    return new Response("forbidden", { status: 403 });
  }
  let update;
  try {
    update = await request.json();
  } catch {
    return new Response("bad request", { status: 400 });
  }
  const work = routeUpdate(update);
  if (work) waitUntil(work.catch((err) => console.error("update failed", err)));
  return Response.json({ ok: true });
}

// Open /api/webhook in a browser to check the deploy and which keys are set.
export function GET() {
  return Response.json({
    ok: true,
    telegram: Boolean(config.telegramToken),
    gemini: Boolean(config.geminiKey),
    claude: Boolean(config.anthropicKey),
    supabase: Boolean(config.supabaseUrl && config.supabaseKey),
  });
}
