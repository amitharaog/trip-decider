-- Trip Decider: the only addition to the existing schema.
-- Stores the date window and top options (fit labels only, no private
-- preferences) frozen when the organizer closes collection.
alter table trips add column if not exists decision jsonb;
