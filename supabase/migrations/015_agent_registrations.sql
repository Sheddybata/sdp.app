-- Self-registration for field agents (reviewed by the national secretariat before portal access)

alter table public.portal_users
  add column if not exists status text not null default 'approved',
  add column if not exists reviewed_at timestamptz,
  add column if not exists review_note text;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'portal_users_status_check'
  ) then
    alter table public.portal_users
      add constraint portal_users_status_check
      check (status in ('pending', 'approved', 'rejected'));
  end if;
end $$;

comment on column public.portal_users.status is
  'pending = self-registered, awaiting admin review; approved = may sign in; rejected = sign-in blocked';

create table if not exists public.agent_registrations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references public.portal_users (id) on delete cascade,

  -- Step 1: assignment
  agent_level text not null check (agent_level in ('polling_unit', 'ward', 'lga', 'state')),
  assigned_state_id text not null,
  assigned_state_name text not null,
  assigned_lga_id text,
  assigned_lga_name text,
  assigned_ward_id text,
  assigned_ward_name text,
  assigned_polling_unit_name text,
  assigned_code text,

  -- Step 2: personal details
  first_name text not null,
  middle_name text,
  surname text not null,
  date_of_birth date not null,
  phone text not null,
  gender text not null,
  email text not null,
  voter_identification_number text not null,
  marital_status text not null,
  religion text not null,
  sdp_membership_id text not null,
  -- { stateId, stateName, lgaId, lgaName, wardId, wardName, pollingUnitName, code }
  agent_polling_unit jsonb not null,
  agent_voting_unit jsonb not null,
  polling_unit jsonb not null,

  -- Step 3: documents (base64 data URLs, same storage approach as members.portrait_data_url)
  photo_data_url text not null,
  membership_id_card_data_url text not null,
  pvc_data_url text not null,
  acknowledged_at timestamptz not null,

  created_at timestamptz not null default now()
);

-- The acknowledgment is a declaration checkbox (acknowledged_at), not an upload.
alter table public.agent_registrations drop column if exists acknowledgment_data_url;

create index if not exists agent_registrations_created_at_idx
  on public.agent_registrations (created_at desc);

create index if not exists agent_registrations_state_idx
  on public.agent_registrations (assigned_state_id);

alter table public.agent_registrations enable row level security;

-- No policies: only the service role (server actions) can read or write.

comment on table public.agent_registrations is
  'Agent self-registration details; login account lives in portal_users (role = agent)';
