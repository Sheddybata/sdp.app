-- Staged bulk files from agent/cluster portals (national office reviews; not auto-inserted into members)

create table if not exists public.portal_bulk_uploads (
  id uuid primary key default gen_random_uuid(),
  storage_path text not null unique,
  original_filename text not null,
  mime_type text not null,
  byte_size bigint not null,
  portal_role text not null check (portal_role in ('agent', 'cluster')),
  uploaded_by_email text not null,
  uploaded_by_portal_user_id uuid references public.portal_users (id) on delete set null,
  data_row_count int,
  validation_summary jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists portal_bulk_uploads_created_at_idx
  on public.portal_bulk_uploads (created_at desc);

alter table public.portal_bulk_uploads enable row level security;

comment on table public.portal_bulk_uploads is
  'CSV/XLSX bulk lists submitted by agents/cluster for HQ download and manual processing.';

-- Private bucket (upload/download via service role + signed URLs from server actions)
insert into storage.buckets (id, name, public)
values ('portal-bulk-uploads', 'portal-bulk-uploads', false)
on conflict (id) do nothing;
