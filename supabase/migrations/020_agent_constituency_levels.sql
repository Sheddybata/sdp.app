-- Eight party-agent types + constituency assignment fields.
-- Election result levels gain national / senatorial / federal / state-constituency collation.

-- Agent registration levels
alter table public.agent_registrations drop constraint if exists agent_registrations_agent_level_check;
alter table public.agent_registrations
  add constraint agent_registrations_agent_level_check
  check (agent_level in (
    'national',
    'state',
    'senatorial',
    'house_of_reps',
    'state_assembly',
    'lga',
    'ward',
    'polling_unit'
  ));

alter table public.agent_registrations
  add column if not exists assigned_constituency_code text,
  add column if not exists assigned_constituency_name text;

comment on column public.agent_registrations.assigned_constituency_code is
  'INEC constituency code (SD/FC/SC) when agent_level is senatorial, house_of_reps, or state_assembly; NATIONAL for national agents.';
comment on column public.agent_registrations.assigned_constituency_name is
  'Display name for the constituency / national post.';

create index if not exists agent_registrations_constituency_code_idx
  on public.agent_registrations (assigned_constituency_code)
  where assigned_constituency_code is not null;

create index if not exists agent_registrations_level_code_idx
  on public.agent_registrations (agent_level, assigned_code);

-- Election result levels
alter table public.election_results drop constraint if exists election_results_level_check;
alter table public.election_results
  add constraint election_results_level_check
  check (level in (
    'polling_unit',
    'ward',
    'lga',
    'state',
    'state_constituency',
    'federal_constituency',
    'senatorial',
    'national'
  ));
