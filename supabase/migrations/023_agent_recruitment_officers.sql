-- Five Agent Registration Officers (ARO 1–5). Multi-use short codes gate /agent/apply.
-- Codes are stored hashed; plaintext is shown only when generated or rotated in admin.

create table if not exists public.agent_recruitment_officers (
  id uuid primary key default gen_random_uuid(),
  officer_number int not null unique check (officer_number between 1 and 5),
  label text not null,
  code_hash text,
  status text not null default 'revoked'
    check (status in ('active', 'revoked')),
  code_generated_at timestamptz,
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

insert into public.agent_recruitment_officers (officer_number, label, status)
values
  (1, 'Agent Registration Officer 1', 'revoked'),
  (2, 'Agent Registration Officer 2', 'revoked'),
  (3, 'Agent Registration Officer 3', 'revoked'),
  (4, 'Agent Registration Officer 4', 'revoked'),
  (5, 'Agent Registration Officer 5', 'revoked')
on conflict (officer_number) do nothing;

alter table public.agent_registrations
  add column if not exists aro_id uuid references public.agent_recruitment_officers (id) on delete set null,
  add column if not exists aro_officer_number int;

create index if not exists agent_registrations_aro_id_idx
  on public.agent_registrations (aro_id)
  where aro_id is not null;

create index if not exists agent_registrations_aro_officer_idx
  on public.agent_registrations (aro_officer_number)
  where aro_officer_number is not null;

create index if not exists agent_registrations_state_aro_idx
  on public.agent_registrations (assigned_state_id, aro_officer_number);

comment on table public.agent_recruitment_officers is
  'ARO 1–5. Multi-use recruitment codes (hashed); revoke or rotate from admin.';

comment on column public.agent_registrations.aro_id is
  'Which Agent Registration Officer code unlocked this application.';

comment on column public.agent_registrations.aro_officer_number is
  'Denormalised ARO number (1–5) for filters and reporting.';

alter table public.agent_recruitment_officers enable row level security;

notify pgrst, 'reload schema';
