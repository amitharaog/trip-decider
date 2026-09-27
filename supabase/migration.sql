-- Trip Decider: the only additions to the existing schema.
-- Stores the date window and top options (fit labels only, no private
-- preferences) frozen when the organizer closes collection.
alter table trips add column if not exists decision jsonb;
-- Places the organizer put on the table (destination ids). Null = let the app suggest.
alter table trips add column if not exists destinations text[];
-- Places each person would like to go: the organizer's pick if they're in, or their own picks.
alter table responses add column if not exists wants text[];
