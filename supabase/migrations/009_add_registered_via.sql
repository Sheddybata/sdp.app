-- How the member was registered (public self-serve vs agent/cluster portal)
alter table public.members
  add column if not exists registered_via text not null default 'self';

comment on column public.members.registered_via is 'self | agent | cluster';
comment on column public.members.registered_by is 'Email (or id) of agent/cluster user when registered_via is agent or cluster';

create index if not exists idx_members_registered_via
  on public.members (registered_via);
