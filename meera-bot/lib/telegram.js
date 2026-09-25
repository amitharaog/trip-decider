import { config } from "./config.js";

const LIMIT = 4000; // Telegram caps messages at 4096 characters

async function call(method, body) {
  const res = await fetch(`https://api.telegram.org/bot${config.telegramToken}/${method}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!data.ok) throw new Error(`Telegram ${method}: ${data.description}`);
  return data.result;
}

// Sends text (split if too long). Returns the message ids sent.
export async function sendMessage(chatId, text, replyTo) {
  const ids = [];
  for (const chunk of split(text)) {
    const msg = await call("sendMessage", {
      chat_id: chatId,
      text: chunk,
      link_preview_options: { is_disabled: true },
      ...(replyTo && ids.length === 0 ? { reply_parameters: { message_id: replyTo, allow_sending_without_reply: true } } : {}),
    });
    ids.push(msg.message_id);
  }
  return ids;
}

export function sendTyping(chatId) {
  return call("sendChatAction", { chat_id: chatId, action: "typing" }).catch(() => {});
}

export function setWebhook(url, secret) {
  return call("setWebhook", {
    url,
    ...(secret ? { secret_token: secret } : {}),
    allowed_updates: ["message", "channel_post"],
    drop_pending_updates: true,
  });
}

function split(text) {
  const chunks = [];
  let rest = text;
  while (rest.length > LIMIT) {
    let cut = rest.lastIndexOf("\n\n", LIMIT);
    if (cut < LIMIT / 2) cut = rest.lastIndexOf("\n", LIMIT);
    if (cut < LIMIT / 2) cut = LIMIT;
    chunks.push(rest.slice(0, cut).trimEnd());
    rest = rest.slice(cut).trimStart();
  }
  chunks.push(rest);
  return chunks;
}
