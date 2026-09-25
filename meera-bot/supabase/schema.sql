-- Meera bot memory layer. Paste into Supabase -> SQL Editor -> Run.
-- The bot uses the service role key, so RLS is on with no public policies.

create table if not exists notes (
  id bigint generated always as identity primary key,
  telegram_update_id bigint unique,          -- stops duplicate deliveries
  telegram_message_id bigint,
  chat_id bigint not null,
  text text not null,
  score int,
  score_reason text,
  status text not null default 'received',  -- received | rejected_by_score | drafted | approved | rejected | error
  created_at timestamptz not null default now()
);

create table if not exists drafts (
  id bigint generated always as identity primary key,
  note_id bigint references notes(id),
  chat_id bigint not null,
  body text not null,
  news jsonb,                                -- {title, source, date, link, summary} when the draft used it
  news_query text,
  model text,                                -- gemini | claude
  status text not null default 'pending',    -- pending | approved | rejected (never deleted)
  feedback text,                             -- anything after REJECT / APPROVE
  telegram_message_ids bigint[] not null default '{}',
  created_at timestamptz not null default now(),
  decided_at timestamptz
);

create table if not exists voice_skill (
  id bigint generated always as identity primary key,
  content text not null,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create index if not exists drafts_chat_status on drafts (chat_id, status, created_at desc);

alter table notes enable row level security;
alter table drafts enable row level security;
alter table voice_skill enable row level security;
