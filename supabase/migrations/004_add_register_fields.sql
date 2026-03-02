-- Add NIN, address, and polling unit to members table
-- Required by Electoral Act 2026 member register

alter table public.members
  add column if not exists nin text,
  add column if not exists address text,
  add column if not exists polling_unit text;

-- NIN should be unique when present
create unique index if not exists idx_members_nin_unique
  on public.members (nin);

-- Optional index for polling unit lookups
create index if not exists idx_members_polling_unit
  on public.members (polling_unit);
