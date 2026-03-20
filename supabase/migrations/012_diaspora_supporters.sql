-- Diaspora supporters: separate from domestic `members` (no PVC/ward required)

create table if not exists public.diaspora_supporters (
  id uuid primary key default gen_random_uuid(),
  surname text not null,
  first_name text not null,
  email text not null,
  phone_e164 text not null,
  phone_country_iso2 text not null,
  residence_country_iso2 text not null,
  residence_city text not null,
  residence_address text not null,
  nigeria_state_id text not null,
  nigeria_lga_id text not null,
  nigeria_state_name text not null,
  nigeria_lga_name text not null,
  vin text,
  portrait_data_url text,
  id_document_data_url text,
  created_at timestamptz default now() not null,
  registered_via text default 'diaspora' not null
);

create index if not exists idx_diaspora_supporters_created_at
  on public.diaspora_supporters (created_at desc);

create index if not exists idx_diaspora_supporters_email
  on public.diaspora_supporters (email);

create index if not exists idx_diaspora_supporters_residence_country
  on public.diaspora_supporters (residence_country_iso2);

alter table public.diaspora_supporters enable row level security;

create policy "Allow public insert diaspora_supporters" on public.diaspora_supporters
  for insert with check (true);

create policy "Allow public select diaspora_supporters" on public.diaspora_supporters
  for select using (true);
