-- Location-based membership ID: stateCode-LGCode-WardCode-Serial (e.g., 17-09-11-AA123)

alter table public.members
  add column if not exists location_membership_id text;

create unique index if not exists idx_members_location_membership_id_unique
  on public.members (location_membership_id)
  where location_membership_id is not null;

-- Helper to build location ID from components
create or replace function public.build_location_membership_id(
  _state_code text,
  _lga_code text,
  _ward_code text,
  _ward_serial text
) returns text
language sql
immutable
as $$
  select _state_code || '-' || _lga_code || '-' || _ward_code || '-' || _ward_serial
$$;
