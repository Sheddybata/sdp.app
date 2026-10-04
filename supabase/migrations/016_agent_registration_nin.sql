-- Agent registration now collects NIN, and no longer asks for date of birth, gender,
-- marital status or religion. Old columns are kept (nullable) so earlier rows are not lost.

alter table public.agent_registrations
  add column if not exists nin text;

alter table public.agent_registrations
  alter column date_of_birth drop not null,
  alter column gender drop not null,
  alter column marital_status drop not null,
  alter column religion drop not null;

-- One registration per NIN (earlier rows without a NIN are allowed).
create unique index if not exists agent_registrations_nin_unique
  on public.agent_registrations (nin)
  where nin is not null;

notify pgrst, 'reload schema';
