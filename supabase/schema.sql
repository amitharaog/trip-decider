-- Trip Decider schema.
-- RLS is enabled with NO policies: only the server (secret key) can read/write.
-- If your existing tables have different columns, uncomment the drops below
-- (they contain no data you need yet) and run this file in the SQL editor.

-- drop table if exists confirmations, vetoes, responses, trips cascade;

create table if not exists trips (
  id                uuid primary key default gen_random_uuid(),
  name              text not null,
  organizer_name    text not null,
  members           text[] not null,
  upi_id            text not null,
  advance_amount    integer not null default 2000,
  min_confirmations integer not null default 3,
  admin_token       text not null,
  status            text not null default 'collecting'
                    check (status in ('collecting', 'deciding', 'locked')),
  date_window       jsonb,          -- frozen at close: { start, end, days, available[] }
  options           jsonb,          -- frozen at close: top options with fit labels only
  created_at        timestamptz not null default now(),
  decided_at        timestamptz,
  locked_at         timestamptz
);

create table if not exists responses (
  id                uuid primary key default gen_random_uuid(),
  trip_id           uuid not null references trips(id) on delete cascade,
  member_name       text not null,
  member_token      text not null,  -- proves "this device submitted as this member"
  windows           jsonb not null, -- [{ start: 'YYYY-MM-DD', end: 'YYYY-MM-DD' }]
  destination_types text[] not null,
  budget            text not null,
  dealbreakers      text[] not null default '{}',
  created_at        timestamptz not null default now(),
  unique (trip_id, member_name)     -- answers lock: one insert per member, no updates
);

create table if not exists vetoes (
  id          uuid primary key default gen_random_uuid(),
  trip_id     uuid not null references trips(id) on delete cascade,
  member_name text not null,
  option_id   text not null,
  created_at  timestamptz not null default now(),
  unique (trip_id, member_name),    -- one veto per member for the whole trip
  unique (trip_id, option_id)       -- an option can only be knocked out once
);

create table if not exists confirmations (
  id          uuid primary key default gen_random_uuid(),
  trip_id     uuid not null references trips(id) on delete cascade,
  member_name text not null,
  claimed_at  timestamptz not null default now(),
  verified    boolean not null default false,
  verified_at timestamptz,
  unique (trip_id, member_name)
);

alter table trips         enable row level security;
alter table responses     enable row level security;
alter table vetoes        enable row level security;
alter table confirmations enable row level security;
