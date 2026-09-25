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

## Decision rules (`lib/decide.ts`, `lib/dates.ts`)

- **Dates:** every 3- and 4-day window starting 7–92 days out. A member can make it only if it fits inside one of their ranges. Windows are ranked by most people, then most weekend days, then longer trip, then earliest.
- **Filter:** drop destinations that hit any dealbreaker of anyone who can make the dates (travel > 8h, flight, trekking, party, cold).
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

The app uses the existing `trips`, `responses`, `vetoes` and `confirmations` tables. It adds one column: run `supabase/migration.sql` in the Supabase SQL editor.

```sql
alter table trips add column if not exists decision jsonb;
```

## Deploy to Vercel

Import the repo and set `SUPABASE_URL` and `SUPABASE_SECRET_KEY` under Project → Settings → Environment Variables (without a `NEXT_PUBLIC_` prefix), then deploy.

## Run locally

```bash
npm install
vercel env pull .env.local   # or: export SUPABASE_URL=... SUPABASE_SECRET_KEY=...
npm run dev                  # http://localhost:3000
```
