-- Phone verification fields for members
-- Run in Supabase SQL Editor or via `supabase db push`

alter table public.members
  add column if not exists phone_verified boolean default false,
  add column if not exists phone_verified_at timestamptz,
  add column if not exists phone_normalized text;

-- Optional uniqueness to prevent duplicate verified phones (comment out if not desired)
create unique index if not exists idx_members_phone_normalized_unique
  on public.members (phone_normalized)
  where phone_normalized is not null;

create index if not exists idx_members_phone_verified
  on public.members (phone_verified);
