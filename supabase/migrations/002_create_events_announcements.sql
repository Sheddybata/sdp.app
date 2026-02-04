-- SDP Member Portal: events and announcements tables
-- Run in Supabase SQL Editor or via `supabase db push`

-- Events: upcoming party events
create table if not exists public.events (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  event_date date not null,
  location text,
  description text,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

create index if not exists idx_events_date on public.events (event_date desc);

-- Announcements: news and notices
create table if not exists public.announcements (
  id uuid primary key default gen_random_uuid(),
  text text not null,
  published_at date default current_date not null,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

create index if not exists idx_announcements_published on public.announcements (published_at desc);

-- RLS: public can read, mutations via service_role (admin)
alter table public.events enable row level security;
alter table public.announcements enable row level security;

create policy "Allow public select events" on public.events for select using (true);
create policy "Allow public select announcements" on public.announcements for select using (true);
