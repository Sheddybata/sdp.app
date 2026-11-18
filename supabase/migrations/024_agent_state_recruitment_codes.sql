-- Independent multi-use recruitment codes per INEC state (not under ARO).
-- Unlocking a state code locks that state on /agent/apply and blocks National Agent.

create table if not exists public.agent_state_recruitment_codes (
  id uuid primary key default gen_random_uuid(),
  state_id text not null unique,
  state_name text not null,
  code_hash text,
  status text not null default 'revoked'
    check (status in ('active', 'revoked')),
  code_generated_at timestamptz,
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

insert into public.agent_state_recruitment_codes (state_id, state_name, status)
values
  ('abia', 'ABIA', 'revoked'),
  ('adamawa', 'ADAMAWA', 'revoked'),
  ('akwa-ibom', 'AKWA IBOM', 'revoked'),
  ('anambra', 'ANAMBRA', 'revoked'),
  ('bauchi', 'BAUCHI', 'revoked'),
  ('bayelsa', 'BAYELSA', 'revoked'),
  ('benue', 'BENUE', 'revoked'),
  ('borno', 'BORNO', 'revoked'),
  ('cross-river', 'CROSS RIVER', 'revoked'),
  ('delta', 'DELTA', 'revoked'),
  ('ebonyi', 'EBONYI', 'revoked'),
  ('edo', 'EDO', 'revoked'),
  ('ekiti', 'EKITI', 'revoked'),
  ('enugu', 'ENUGU', 'revoked'),
  ('federal-capital-territory', 'FEDERAL CAPITAL TERRITORY', 'revoked'),
  ('gombe', 'GOMBE', 'revoked'),
  ('imo', 'IMO', 'revoked'),
  ('jigawa', 'JIGAWA', 'revoked'),
  ('kaduna', 'KADUNA', 'revoked'),
  ('kano', 'KANO', 'revoked'),
  ('katsina', 'KATSINA', 'revoked'),
  ('kebbi', 'KEBBI', 'revoked'),
  ('kogi', 'KOGI', 'revoked'),
  ('kwara', 'KWARA', 'revoked'),
  ('lagos', 'LAGOS', 'revoked'),
  ('nasarawa', 'NASARAWA', 'revoked'),
  ('niger', 'NIGER', 'revoked'),
  ('ogun', 'OGUN', 'revoked'),
  ('ondo', 'ONDO', 'revoked'),
  ('osun', 'OSUN', 'revoked'),
  ('oyo', 'OYO', 'revoked'),
  ('plateau', 'PLATEAU', 'revoked'),
  ('rivers', 'RIVERS', 'revoked'),
  ('sokoto', 'SOKOTO', 'revoked'),
  ('taraba', 'TARABA', 'revoked'),
  ('yobe', 'YOBE', 'revoked'),
  ('zamfara', 'ZAMFARA', 'revoked')
on conflict (state_id) do nothing;

alter table public.agent_registrations
  add column if not exists state_recruitment_code_id uuid
    references public.agent_state_recruitment_codes (id) on delete set null;

create index if not exists agent_registrations_state_code_idx
  on public.agent_registrations (state_recruitment_code_id)
  where state_recruitment_code_id is not null;

comment on table public.agent_state_recruitment_codes is
  'Independent per-state multi-use recruitment codes (hashed). Not linked to ARO.';

comment on column public.agent_registrations.state_recruitment_code_id is
  'Which state recruitment code unlocked this application (null when unlocked via ARO).';

alter table public.agent_state_recruitment_codes enable row level security;

notify pgrst, 'reload schema';
