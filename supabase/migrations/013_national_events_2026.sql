-- Homepage / upcoming events: national calendar (April 2026).
-- Replaces all rows in public.events. Run in Supabase SQL Editor or via migration.

delete from public.events;

insert into public.events (title, event_date, location, description)
values
  (
    'National Convention',
    '2026-04-27',
    null,
    'April 27th – April 28th, 2026'
  ),
  (
    'National Congress',
    '2026-04-27',
    null,
    'April 27 – May 1st, 2026'
  ),
  (
    'Primaries',
    '2026-04-27',
    null,
    'April 27th – May 1st, 2026'
  );
