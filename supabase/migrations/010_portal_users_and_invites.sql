-- Multi-user agent / cluster portal auth with national-secretariat invite codes

create table if not exists public.portal_users (
  id uuid primary key default gen_random_uuid(),
  role text not null check (role in ('agent', 'cluster')),
  full_name text not null,
  phone text not null,
  email text not null,
  password_hash text not null,
  created_at timestamptz not null default now()
);

create unique index if not exists portal_users_email_role_unique
  on public.portal_users (lower(trim(email)), role);

create table if not exists public.portal_invite_tokens (
  id uuid primary key default gen_random_uuid(),
  role text not null check (role in ('agent', 'cluster')),
  token_hash text not null unique,
  note text,
  expires_at timestamptz,
  used_at timestamptz,
  used_by_user_id uuid references public.portal_users (id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists portal_invite_tokens_role_idx
  on public.portal_invite_tokens (role);

create index if not exists portal_invite_tokens_unused_idx
  on public.portal_invite_tokens (role, used_at)
  where used_at is null;

alter table public.portal_users enable row level security;
alter table public.portal_invite_tokens enable row level security;

-- No policies: anon/authenticated cannot read; service role bypasses RLS for server actions.

comment on table public.portal_users is 'Field agents and cluster leads; sign in with email + password';
comment on table public.portal_invite_tokens is 'Single-use signup codes created by admin (national secretariat workflow)';
