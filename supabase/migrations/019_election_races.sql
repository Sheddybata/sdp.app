-- One election (election day) can hold several races on the same ballot day, e.g.
-- Presidential + Senate + House of Reps, or Governorship + State House of Assembly.
-- Results are stored per race; check-ins and incidents stay per election day.

alter table public.elections add column if not exists races text[];
update public.elections set races = array[election_type] where races is null;
alter table public.elections alter column races set not null;
alter table public.elections alter column election_type drop not null;
alter table public.elections drop constraint if exists elections_races_check;
alter table public.elections add constraint elections_races_check check (
  cardinality(races) > 0
  and races <@ array['presidential', 'senate', 'house_of_reps', 'governorship', 'state_assembly', 'lg_chairman', 'councillor', 'other']::text[]
);

alter table public.election_results add column if not exists race text;
update public.election_results r
set race = coalesce(e.races[1], e.election_type)
from public.elections e
where e.id = r.election_id and r.race is null;
alter table public.election_results alter column race set not null;

alter table public.election_results drop constraint if exists election_results_election_id_level_location_code_key;
alter table public.election_results drop constraint if exists election_results_race_location_key;
alter table public.election_results add constraint election_results_race_location_key
  unique (election_id, race, level, location_code);

drop index if exists public.election_results_election_idx;
create index if not exists election_results_election_race_idx on public.election_results (election_id, race, level);

-- Aggregates now take the race.
drop function if exists public.election_state_totals(uuid);
drop function if exists public.election_comparison(uuid);

create or replace function public.election_state_totals(eid uuid, p_race text)
returns table (state_id text, level text, reported bigint, flagged bigint, verified bigint, party_votes jsonb)
language sql stable as $$
  with base as (
    select * from public.election_results r where r.election_id = eid and r.race = p_race
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

create or replace function public.election_comparison(eid uuid, p_race text)
returns table (
  result_id uuid, level text, location_code text, state_id text, state_name text, lga_name text, ward_name text,
  collation jsonb, pu_totals jsonb, pus_reported bigint
)
language sql stable as $$
  with pu as (
    select r.party_votes, string_to_array(r.location_code, '/') as parts
    from public.election_results r
    where r.election_id = eid and r.race = p_race and r.level = 'polling_unit'
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
  where r.election_id = eid and r.race = p_race and r.level <> 'polling_unit';
$$;

revoke all on function public.election_state_totals(uuid, text) from public, anon, authenticated;
revoke all on function public.election_comparison(uuid, text) from public, anon, authenticated;
grant execute on function public.election_state_totals(uuid, text) to service_role;
grant execute on function public.election_comparison(uuid, text) to service_role;

notify pgrst, 'reload schema';
