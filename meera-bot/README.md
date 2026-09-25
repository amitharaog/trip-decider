# Meera bot: Telegram notes to LinkedIn drafts

Case 1 (Meera / Skinstinct). Meera drops a note into Telegram. The bot:

1. **Scores** it 0–10 with Gemini Flash. Below 6, it replies with the reason and stops.
2. **Finds a news angle**: Gemini pulls a search phrase and the bot takes the top Google News result (no key needed).
3. **Drafts** a LinkedIn post in her voice (`voice-skill.txt`). Claude writes it if `ANTHROPIC_API_KEY` is set, otherwise Gemini does.
4. **Flags the source.** Any draft that uses the news ends with a NEWS SOURCE / FROM / LINK block and "⚠ Check this before publishing".
5. **Saves** the note and the draft (status `pending`) in Supabase. Meera replies **APPROVE** or **REJECT** (with an optional reason), and the status updates. Nothing is deleted.

**The Cut (check 07, Judgment Protected):** the bot never posts or schedules anything. Meera reviews, edits and publishes herself.

```
Telegram ──► /api/webhook (Vercel) ──► score (Gemini) ──<6──► "not drafted, because…"
                                          │≥6
                                          ▼
                        keywords (Gemini) ► Google News RSS
                                          ▼
                 draft (Claude/Gemini + voice-skill.txt) ► verify flag
                                          ▼
                 Supabase (notes, drafts) ► Telegram draft ► Meera: APPROVE / REJECT
```

## Files

| File | What it does |
|---|---|
| `api/webhook.js` | The URL Telegram calls. Checks the secret, answers straight away, and does the work in the background. |
| `lib/handle.js` | Routes a message: a note, APPROVE/REJECT, `/help` or `/id`. |
| `lib/pipeline.js` | Score → news → draft → verify flag. |
| `lib/prompts.js` | All the model instructions. Tune the scoring here. |
| `voice-skill.txt` | Meera's voice profile, built from the 4 posts and 11 newsletters. Sent with every draft. |
| `lib/news.js` | Google News search and the verify block. |
| `lib/store.js` | Supabase memory. If Supabase isn't configured, the bot still drafts but saves nothing. |
| `supabase/schema.sql` | The `notes`, `drafts` and `voice_skill` tables. |
| `notes/` | Test notes: 01–03 strong, 04–05 borderline, 06–07 should be rejected. |

## Setup (about 15 minutes)

You need your **Telegram bot token** (BotFather), a **Gemini API key** (Google AI Studio), and optionally an **Anthropic API key** and a **Supabase** project.

1. **Supabase (for memory).** Create a project, open *SQL Editor*, paste `supabase/schema.sql` and run it. From *Project Settings → API*, copy the Project URL and the `service_role` key.
2. **Vercel.** *Add New → Project* and import this GitHub repo. **Set Root Directory to `meera-bot`.** This repo also holds Trip Decider, so without that setting Vercel deploys the wrong app. Framework preset: *Other*.
3. **Environment variables.** Before deploying, add the variables from `.env.example`:
   - `TELEGRAM_BOT_TOKEN`, `TELEGRAM_WEBHOOK_SECRET` (any long random string), `GEMINI_API_KEY`
   - optional: `ANTHROPIC_API_KEY`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `ALLOWED_CHAT_ID`
4. **Deploy.** Then open `https://<your-project>.vercel.app/api/webhook`. It should show `"ok": true` and which keys it can see.
5. **Connect Telegram.** Paste this into a browser tab, with your values filled in:
   ```
   https://api.telegram.org/bot<TOKEN>/setWebhook?url=https://<your-project>.vercel.app/api/webhook&secret_token=<TELEGRAM_WEBHOOK_SECRET>
   ```
   You should see `"ok":true`. Include `secret_token`. Without it, the bot rejects every message with 403.
6. **Test.** Send the bot `/help`, then paste `notes/01-batch-fourteen.txt`. A draft with a score and a news source should arrive. Then send `notes/06-reminder.txt`. It should come back "Not drafted" with a reason. Reply `APPROVE` to the draft and check that the `drafts` row in Supabase changes to `approved`.

**Using a channel instead of a private chat:** add the bot to Meera's channel as an **admin** with permission to post. Send `/id` in the channel and put that number in `ALLOWED_CHAT_ID` so nobody else can use the bot.

## Local commands

```bash
cp .env.example .env     # fill in keys
npm install
npm test                 # offline tests, no keys needed
npm run try -- notes/02-layering-order.txt       # run one note, print the result
npm run compare -- notes/02-layering-order.txt   # Gemini vs Claude on the same note + news
npm run set-webhook -- https://<your-project>.vercel.app
```

## Tuning

- **Too many notes pass?** Tighten `SCORE_SYSTEM` in `lib/prompts.js`, or raise `MIN_SCORE`. If everything passes, the scoring prompt is too lenient.
- **Drafts sound generic?** Edit `voice-skill.txt`. To change the voice without redeploying, insert a row into `voice_skill` with `active = true`. The newest active row wins.
- **Models:** `GEMINI_MODEL` (default `gemini-flash-latest`, falls back to `GEMINI_FALLBACK_MODEL`, default `gemini-flash-lite-latest`, when busy or over quota), `CLAUDE_MODEL` (default `claude-opus-5`), `DRAFT_MODEL=gemini|claude`.
