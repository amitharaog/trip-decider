# Trip Decider

Helps a group of friends pick a trip and **commit with a paid advance**, instead of running another WhatsApp poll.

Next.js (App Router, TypeScript) · Tailwind · Supabase · deploys to Vercel. Mobile-first.

## How it works

1. **Organizer** creates a trip on `/` and gets a group link (`/t/[id]`) and a private admin link (`/t/[id]/admin?token=…`).
2. **Members** pick their name and submit dates, place types, budget and dealbreakers once. Answers lock on submit.
3. **Organizer closes collection.** The app picks the date window and the top 3 destinations, and freezes them.
4. **The plan** is option 1 unless someone vetoes it. Each member gets one anonymous veto, and the last option can't be vetoed.
5. **Commit:** members pay the advance with a UPI link and tap "I've paid". Payments open only after the organizer taps "Finalise plan & open payments" on the admin page, which also closes vetoes. The organizer verifies each payment, and once the minimum is verified the trip locks and shows **Trip is on**.

Trip status goes `collecting` → `deciding` (options out, vetoes open) → `confirming` (organizer finalised the plan, payments open) → `locked`.

"Load demo trip" on `/` creates Riya's trip with Siddharth, Karan and Aisha already answered. Preethi hasn't answered yet, so you can fill in her form.

## UI

- **Landing (`/`)**: a 3-step setup wizard (trip, crew, commitment) next to the four-stage explainer, plus a one-tap demo.
- **Member dashboard (`/t/[id]`)**: pick your name from avatars, answer a 5-step private form (quick-pick weekends, place type, budget, dealbreakers, review), then see the plan, your veto, the UPI payment and the fit view.
- **Organizer dashboard (`/t/[id]/admin`)**: stat tiles (answers, dates, plan, paid), a "your next step" card for the current stage, WhatsApp nudges, payment verification, options and fit matrix.
- A progress strip on every trip page shows the four stages: Set up → Collect → Decide → Commit.

## Decision rules (`lib/decide.ts`, `lib/dates.ts`)

- **Dates:** every 3- and 4-day window starting 7–92 days out. A member can make it only if it fits inside one of their ranges. Windows are ranked by most people, then most weekend days, then longer trip, then earliest.
- **Where:** the organizer either lets the app suggest from all destinations, or picks 1–5 places (`trips.destinations`). With a pick, each friend is first asked "Riya is keen on Wayanad. Are you in?" If they say no, they choose up to 3 places they'd rather go (`responses.wants`). Candidates are the organizer's places plus everyone's suggestions; nothing is dropped for dealbreakers (it just shows "doesn't work"), and fewest "doesn't work" ranks first. A place someone didn't ask for is at best a *stretch* for them. Without a pick, friends can optionally name places they'd love; each "want" adds +4 to that place's score. Options show how many people want them, never who.
- **Filter (no pick):** drop destinations that hit any dealbreaker of anyone who can make the dates (travel > 8h, flight, trekking, party, cold).
- **Budget fit** (against the top of the member's band): works if the destination's high cost fits, stretch if only its low cost fits, otherwise doesn't work.
- **Type fit:** a type mismatch makes it a stretch. The label is the worse of budget and type fit.
- **Score:** budget works +3, stretch +1, doesn't work −3; type match +2. Ties go to fewer "doesn't work", then cheaper, then shorter travel.
- People who can't make the dates show as *doesn't work*. People who never submitted show as *works*, because they go with the group.
- Only these labels are stored in `trips.decision`. The group API never returns budgets, dealbreakers or date ranges.

Destinations are hardcoded in `lib/destinations.ts`, with travel times from Bengaluru (`HOME_CITY`).

## Security model

- All database access goes through API routes under `app/api` with the Supabase **secret key**. `lib/supabase.ts` imports `server-only`, so importing it from browser code fails the build.
- RLS is on with no policies, so the public keys can't read anything.
- The admin token is checked with a constant-time compare on every admin request.
- There are no accounts. When you submit, the server returns a member token (an HMAC of your private response id, so no extra column) that is stored on your phone, and your veto requires it.

## Database

The app uses the existing `trips`, `responses`, `vetoes` and `confirmations` tables. It adds three columns: run `supabase/migration.sql` in the Supabase SQL editor.

```sql
alter table trips add column if not exists decision jsonb;
alter table trips add column if not exists destinations text[];
alter table responses add column if not exists wants text[];
```

Trips without a place pick keep working before the last two columns exist; picking places needs them.

## Deploy to Vercel

Import the repo and set `SUPABASE_URL` and `SUPABASE_SECRET_KEY` under Project → Settings → Environment Variables (without a `NEXT_PUBLIC_` prefix), then deploy.

## Run locally

```bash
npm install
vercel env pull .env.local   # or: export SUPABASE_URL=... SUPABASE_SECRET_KEY=...
npm run dev                  # http://localhost:3000
```

---

# Kargo hiring dashboard (`/hiring`)

Built for MESA Case 2 (Arjun and the Hiring Backlog). Lives alongside Trip Decider in this repo and shares its Supabase project; the trip app is untouched.

**Flow:** upload CVs (`/hiring/upload`) → each CV is split into personal details and anonymised content → the anonymised content is scored against the PM and SPM rubrics → candidates are ranked per applied role on `/hiring` → the top 5 per role get a 3-sentence interview brief and an invite draft, everyone else a rejection draft → **Arjun reads, edits, and clicks Confirm & send.** Nothing is ever sent automatically (Nine Checks 06 and 09: no auto-rejection).

## Privacy
- `lib/hiring/pii.ts` pulls name, email, phone and profile links out of the CV with deterministic code, not an LLM. They are stored in `candidates.personal_details` and never leave the database except to address the email. Every Gemini call receives only `cv_content` (check the "Anonymised CV text" panel on a card).
- Use a Gemini key from a project **with billing enabled**; the free AI Studio tier may use prompts to improve Google's models.
- RLS is on for both tables with no policies, so the anon key reads nothing. The app uses the secret key from route handlers only. Set `DASHBOARD_PASSWORD` on any public deploy; `proxy.ts` then guards `/hiring` and `/api/hiring` with Basic auth.

## Setup
1. Run `supabase/hiring.sql` in the Supabase SQL editor. The rubric (`lib/hiring/rubric-data.ts`, mirrored in `rubric.txt`) loads into `rubric_criteria` automatically on first use.
2. Copy `.env.example` to `.env.local` and fill in `SUPABASE_URL`, `SUPABASE_SECRET_KEY`, `GEMINI_API_KEY`, `DASHBOARD_PASSWORD`. Leave `RESEND_API_KEY` blank until the Resend step.
3. `npm run dev`, then open `/hiring/upload`. Add the same variables in Vercel and deploy.
4. Resend: set `RESEND_API_KEY` (and redeploy). Until you verify a domain, Resend only delivers to your own account email from `onboarding@resend.dev`; set `RESEND_TEST_RECIPIENT` to route every email to one test inbox (the subject shows the intended recipient).

## Scoring
Each criterion is scored 0-10 by Gemini from evidence in the CV. The weighted 0-100 total is computed in code (`toRoleScore`), never by the model. Every candidate is scored against both rubrics; ranking uses the rubric of the role they applied for. `SHORTLIST_SIZE` (default 5) sets the line.

## Rubric
`rubric.txt` was derived from Kargo's 8 hire CVs and their ratings, not the JDs. Three patterns separated the five "Exceeds" hires from the three "Meets/Below": hands-on operator time in freight/logistics, an unprompted fix that others adopted, and sole ownership with no one above. A fourth, failure on the record, separates the two hires who documented failures from three CVs that list only wins. The hire files contained CVs only (no interview notes or outcome one-liners), so the patterns come from the CVs plus the ratings table.
