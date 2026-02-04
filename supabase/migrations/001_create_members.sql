-- SDP Member Portal: members table
-- Run in Supabase SQL Editor or via `supabase db push`

create table if not exists public.members (
  id uuid primary key default gen_random_uuid(),
  title text not null default 'Mr',
  surname text not null,
  first_name text not null,
  other_names text,
  phone text not null,
  email text,
  date_of_birth date,
  join_date date default current_date,
  state text not null,
  lga text not null,
  ward text not null,
  voter_registration_number text not null,
  portrait_data_url text,
  gender text,
  created_at timestamptz default now() not null,
  registered_by text
);

-- Unique constraint for voter ID (prevents duplicates)
create unique index if not exists idx_members_voter_unique 
  on public.members (voter_registration_number);

-- Indexes for verification and admin queries
create index if not exists idx_members_voter 
  on public.members (voter_registration_number);

create index if not exists idx_members_state 
  on public.members (state);

create index if not exists idx_members_created_at 
  on public.members (created_at desc);

-- RLS: allow public insert (enrollment) and select (verification)
-- Admin mutations can use service_role key (bypasses RLS)
alter table public.members enable row level security;

create policy "Allow public insert" on public.members
  for insert with check (true);

create policy "Allow public select" on public.members
  for select using (true);
