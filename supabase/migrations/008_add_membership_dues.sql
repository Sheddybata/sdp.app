-- Membership dues tracking (phase 1: no payment gateway)
-- Stores computed owed months/amount at enrollment time for admin follow-up.

alter table public.members
  add column if not exists monthly_due integer not null default 300,
  add column if not exists months_owed integer not null default 1,
  add column if not exists amount_owed integer not null default 300,
  add column if not exists dues_calculated_at timestamptz not null default now(),
  add column if not exists has_paid_membership boolean not null default false,
  add column if not exists membership_status text not null default 'unpaid';

create index if not exists idx_members_membership_status
  on public.members (membership_status);

create index if not exists idx_members_amount_owed
  on public.members (amount_owed);

