-- Election-day reporting by agents: results (photo + typed figures), incidents and check-ins.
-- Locations use INEC codes: state "15", LGA "15/01", ward "15/01/01", polling unit "15/01/01/004".
-- Result sheet photos live in the private Storage bucket "election-uploads"; rows store object paths.

create table if not exists public.elections (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  election_type text not null check (
    election_type in ('presidential', 'senate', 'house_of_reps', 'governorship', 'state_assembly', 'lg_chairman', 'councillor', 'other')
  ),
  election_date date not null,
  -- Party acronyms on the ballot, in ballot order, e.g. {SDP,APC,PDP,LP}
  parties text[] not null,
  -- Null = nationwide; otherwise only these state ids (off-cycle governorship, by-elections)
  state_ids text[],
  status text not null default 'draft' check (status in ('draft', 'open', 'closed', 'locked')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists elections_date_idx on public.elections (election_date desc);

create table if not exists public.election_results (
  id uuid primary key default gen_random_uuid(),
  election_id uuid not null references public.elections (id) on delete cascade,
  level text not null check (level in ('polling_unit', 'ward', 'lga', 'state')),
  location_code text not null,
  state_id text not null,
  state_name text not null,
  lga_id text,
  lga_name text,
  ward_id text,
  ward_name text,
  polling_unit_name text,

  submitted_by uuid not null references public.portal_users (id) on delete cascade,
  agent_registration_id uuid references public.agent_registrations (id) on delete set null,
  submitter_name text not null,
  submitter_phone text,
  -- true when a ward agent submitted a polling unit result as backup
  is_backup boolean not null default false,

  registered_voters integer,
  accredited_voters integer not null,
  rejected_votes integer not null,
  total_valid_votes integer not null,
  total_votes_cast integer not null,
  party_votes jsonb not null,

  photo_paths text[] not null,
  note text,
  discrepancies text[] not null default '{}',
  latitude double precision,
  longitude double precision,
  location_accuracy_m double precision,

  verified_at timestamptz,
  verified_note text,
  version integer not null default 1,
  client_submission_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  unique (election_id, level, location_code)
);

create index if not exists election_results_election_idx on public.election_results (election_id, level);
create index if not exists election_results_state_idx on public.election_results (election_id, state_id);

-- Every save of a result (first submission and corrections), for audit.
create table if not exists public.election_result_versions (
  id uuid primary key default gen_random_uuid(),
  result_id uuid not null references public.election_results (id) on delete cascade,
  version integer not null,
  submitted_by uuid references public.portal_users (id) on delete set null,
  snapshot jsonb not null,
  created_at timestamptz not null default now()
);

create index if not exists election_result_versions_result_idx on public.election_result_versions (result_id, version);

create table if not exists public.election_incidents (
  id uuid primary key default gen_random_uuid(),
  election_id uuid not null references public.elections (id) on delete cascade,
  submitted_by uuid not null references public.portal_users (id) on delete cascade,
  agent_registration_id uuid references public.agent_registrations (id) on delete set null,
  submitter_name text not null,
  submitter_phone text,
  level text not null,
  location_code text not null,
  location_label text not null,
  state_id text not null,
  state_name text not null,
  category text not null,
  severity text not null default 'medium' check (severity in ('low', 'medium', 'high')),
  description text not null,
  occurred_at timestamptz not null,
  photo_paths text[] not null default '{}',
  latitude double precision,
  longitude double precision,
  status text not null default 'open' check (status in ('open', 'resolved')),
  client_submission_id text unique,
  created_at timestamptz not null default now()
);

create index if not exists election_incidents_election_idx on public.election_incidents (election_id, created_at desc);

create table if not exists public.election_checkins (
  id uuid primary key default gen_random_uuid(),
  election_id uuid not null references public.elections (id) on delete cascade,
  submitted_by uuid not null references public.portal_users (id) on delete cascade,
  submitter_name text not null,
  level text not null,
  location_code text not null,
  location_label text not null,
  state_id text not null,
  state_name text not null,
  stage text not null check (stage in ('arrived', 'accreditation_started', 'voting_ended', 'counting_done')),
  latitude double precision,
  longitude double precision,
  created_at timestamptz not null default now(),
  unique (election_id, submitted_by, location_code, stage)
);

create index if not exists election_checkins_election_idx on public.election_checkins (election_id, stage);

-- ---------- Aggregates for the admin dashboard (computed in the database) ----------

-- Per state and level: how many results, flagged, verified, and summed party votes.
create or replace function public.election_state_totals(eid uuid)
returns table (state_id text, level text, reported bigint, flagged bigint, verified bigint, party_votes jsonb)
language sql stable as $$
  with base as (
    select * from public.election_results where election_id = eid
  ),
  counts as (
    select b.state_id, b.level,
      count(*) as reported,
      count(*) filter (where cardinality(b.discrepancies) > 0) as flagged,
      count(*) filter (where b.verified_at is not null) as verified
    from base b group by 1, 2
  ),
  votes as (
    select x.state_id, x.level, jsonb_object_agg(x.party, x.v) as pv
    from (
      select b.state_id, b.level, p.key as party, sum(p.value::bigint) as v
      from base b cross join lateral jsonb_each_text(b.party_votes) p
      group by 1, 2, 3
    ) x
    group by 1, 2
  )
  select c.state_id, c.level, c.reported, c.flagged, c.verified, coalesce(v.pv, '{}'::jsonb)
  from counts c left join votes v on v.state_id = c.state_id and v.level = c.level;
$$;

-- Each ward / LGA / state collation result next to the sum of polling unit results beneath it.
create or replace function public.election_comparison(eid uuid)
returns table (
  result_id uuid, level text, location_code text, state_id text, state_name text, lga_name text, ward_name text,
  collation jsonb, pu_totals jsonb, pus_reported bigint
)
language sql stable as $$
  with pu as (
    select r.party_votes, string_to_array(r.location_code, '/') as parts
    from public.election_results r
    where r.election_id = eid and r.level = 'polling_unit'
  ),
  anc as (
    select array_to_string(parts[1:1], '/') as code, 'state'::text as lvl, party_votes from pu
    union all select array_to_string(parts[1:2], '/'), 'lga', party_votes from pu
    union all select array_to_string(parts[1:3], '/'), 'ward', party_votes from pu
  ),
  pu_sums as (
    select x.lvl, x.code, jsonb_object_agg(x.party, x.v) as totals
    from (
      select a.lvl, a.code, p.key as party, sum(p.value::bigint) as v
      from anc a cross join lateral jsonb_each_text(a.party_votes) p
      group by 1, 2, 3
    ) x
    group by 1, 2
  ),
  pu_counts as (
    select lvl, code, count(*) as n from anc group by 1, 2
  )
  select r.id, r.level, r.location_code, r.state_id, r.state_name, r.lga_name, r.ward_name, r.party_votes,
    coalesce(s.totals, '{}'::jsonb), coalesce(n.n, 0)
  from public.election_results r
  left join pu_sums s on s.lvl = r.level and s.code = r.location_code
  left join pu_counts n on n.lvl = r.level and n.code = r.location_code
  where r.election_id = eid and r.level <> 'polling_unit';
$$;

create or replace function public.election_checkin_counts(eid uuid)
returns table (state_id text, stage text, n bigint)
language sql stable as $$
  select state_id, stage, count(distinct location_code)
  from public.election_checkins where election_id = eid
  group by 1, 2;
$$;

revoke all on function public.election_state_totals(uuid) from public, anon, authenticated;
revoke all on function public.election_comparison(uuid) from public, anon, authenticated;
revoke all on function public.election_checkin_counts(uuid) from public, anon, authenticated;
grant execute on function public.election_state_totals(uuid) to service_role;
grant execute on function public.election_comparison(uuid) to service_role;
grant execute on function public.election_checkin_counts(uuid) to service_role;

alter table public.elections enable row level security;
alter table public.election_results enable row level security;
alter table public.election_result_versions enable row level security;
alter table public.election_incidents enable row level security;
alter table public.election_checkins enable row level security;
-- No policies: only the service role (server actions) can read or write.

-- Private bucket for result sheet / incident photos (server uploads; admins view via signed URLs).
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('election-uploads', 'election-uploads', false, 2097152, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

notify pgrst, 'reload schema';
