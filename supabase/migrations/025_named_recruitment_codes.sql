-- Named recruitment codes (e.g. state governors). Independent of ARO; lock to one state.
-- Also stamp a denormalised registered_by_label on each application for admin "who registered who".

create table if not exists public.agent_named_recruitment_codes (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  label text not null,
  state_id text not null,
  state_name text not null,
  code_hash text,
  status text not null default 'revoked'
    check (status in ('active', 'revoked')),
  code_generated_at timestamptz,
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

-- Governor of Nasarawa — plain code GOV-IG754 (hashed; no invite pepper).
-- sha256('GOV-IG754') = 3179168573d99e37b334d33518f1784ca4be5ad19a0df4de0b71b8e7c989cc51
insert into public.agent_named_recruitment_codes (
  slug, label, state_id, state_name, code_hash, status, code_generated_at, updated_at
)
values (
  'governor-nasarawa',
  'Governor of Nasarawa',
  'nasarawa',
  'NASARAWA',
  '3179168573d99e37b334d33518f1784ca4be5ad19a0df4de0b71b8e7c989cc51',
  'active',
  now(),
  now()
)
on conflict (slug) do update set
  label = excluded.label,
  state_id = excluded.state_id,
  state_name = excluded.state_name,
  code_hash = excluded.code_hash,
  status = 'active',
  code_generated_at = now(),
  updated_at = now();

alter table public.agent_registrations
  add column if not exists named_recruitment_code_id uuid
    references public.agent_named_recruitment_codes (id) on delete set null,
  add column if not exists registered_by_label text;

create index if not exists agent_registrations_named_code_idx
  on public.agent_registrations (named_recruitment_code_id)
  where named_recruitment_code_id is not null;

-- Backfill labels for existing ARO-stamped rows.
update public.agent_registrations
set registered_by_label = 'Agent Registration Officer ' || aro_officer_number::text
where registered_by_label is null
  and aro_officer_number is not null;

-- Backfill labels for existing state-code registrations.
update public.agent_registrations ar
set registered_by_label = initcap(lower(sc.state_name)) || ' state code'
from public.agent_state_recruitment_codes sc
where ar.state_recruitment_code_id = sc.id
  and ar.registered_by_label is null;

comment on table public.agent_named_recruitment_codes is
  'Named multi-use codes (e.g. governors). Lock apply to one state; independent of ARO.';

comment on column public.agent_registrations.named_recruitment_code_id is
  'Named recruitment code that unlocked this application (null when ARO or state code).';

comment on column public.agent_registrations.registered_by_label is
  'Human-readable who unlocked registration (ARO / state code / named sponsor).';

alter table public.agent_named_recruitment_codes enable row level security;

notify pgrst, 'reload schema';
