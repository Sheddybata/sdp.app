-- Ward-scoped serials (AA001..ZZ999) and generator function

alter table public.members
  add column if not exists ward_serial text;

-- Unique per ward
create unique index if not exists idx_members_ward_serial_unique
  on public.members (state, lga, ward, ward_serial)
  where ward_serial is not null;

-- Generate next ward serial with advisory lock to prevent races
create or replace function public.next_ward_serial(
  _state text,
  _lga text,
  _ward text
) returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  last_serial text;
  next_serial text;
  letters text;
  num int;
  prefix int;
begin
  if _state is null or _lga is null or _ward is null then
    raise exception 'State/LGA/Ward required for ward serial';
  end if;

  -- Lock per ward
  perform pg_advisory_xact_lock(hashtext(_state || ':' || _lga || ':' || _ward));

  select ward_serial
    into last_serial
    from public.members
   where state = _state
     and lga = _lga
     and ward = _ward
     and ward_serial is not null
   order by ward_serial desc
   limit 1;

  if last_serial is null then
    return 'AA001';
  end if;

  letters := substring(last_serial from 1 for 2);
  num := substring(last_serial from 3)::int;

  if num < 999 then
    num := num + 1;
    return letters || lpad(num::text, 3, '0');
  end if;

  -- increment two-letter prefix (A-Z base26)
  prefix := (ascii(substr(letters,1,1)) - 65) * 26 + (ascii(substr(letters,2,1)) - 65);
  if prefix >= 26*26 - 1 then
    raise exception 'Ward serial exhausted for %, %, %', _state, _lga, _ward;
  end if;
  prefix := prefix + 1;
  letters := chr(prefix / 26 + 65) || chr(prefix % 26 + 65);
  next_serial := letters || '001';
  return next_serial;
end;
$$;
