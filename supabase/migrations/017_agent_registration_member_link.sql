-- Only SDP members may register as agents: each registration links to the member record
-- found by the membership ID, and a member can hold only one agent registration.

alter table public.agent_registrations
  add column if not exists member_id uuid references public.members (id) on delete set null;

create unique index if not exists agent_registrations_member_unique
  on public.agent_registrations (member_id)
  where member_id is not null;

notify pgrst, 'reload schema';
