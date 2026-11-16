-- Agent portal: sign in with phone + password (email optional).
-- Non-members may apply without an SDP membership ID / card; photo, PVC and NIN still required.

alter table public.portal_users
  alter column email drop not null;

-- Allow multiple agent rows with null email; keep uniqueness when email is present.
drop index if exists public.portal_users_email_role_unique;
create unique index if not exists portal_users_email_role_unique
  on public.portal_users (lower(trim(email)), role)
  where email is not null and btrim(email) <> '';

-- Before unique (role, phone): keep one row per phone (prefer approved, then newest).
-- Losing rows get a non-login suffix so the index can be created; they must re-register
-- or have an admin reset the phone if they still need access.
with ranked as (
  select
    id,
    phone,
    row_number() over (
      partition by role, btrim(phone)
      order by
        case coalesce(status, 'approved')
          when 'approved' then 0
          when 'pending' then 1
          else 2
        end,
        created_at desc nulls last,
        id
    ) as rn
  from public.portal_users
  where phone is not null
    and btrim(phone) <> ''
    and phone not like '%#dup-%'
),
losers as (
  select id, phone
  from ranked
  where rn > 1
)
update public.portal_users p
set phone = p.phone || '#dup-' || left(replace(p.id::text, '-', ''), 8)
from losers l
where p.id = l.id;

-- Keep agent_registrations.phone aligned with portal_users for the rows we rewrote.
update public.agent_registrations ar
set phone = p.phone
from public.portal_users p
where ar.user_id = p.id
  and p.phone like '%#dup-%'
  and ar.phone is distinct from p.phone;

drop index if exists public.portal_users_phone_role_unique;
create unique index portal_users_phone_role_unique
  on public.portal_users (role, phone)
  where phone is not null and btrim(phone) <> '';

comment on table public.portal_users is
  'Field agents sign in with phone + password; cluster leads with email + password.';

alter table public.agent_registrations
  alter column sdp_membership_id drop not null,
  alter column email drop not null,
  alter column membership_id_card_data_url drop not null;

comment on column public.agent_registrations.member_id is
  'Linked SDP member when the applicant verified a membership ID; null for non-member agents.';

comment on column public.agent_registrations.sdp_membership_id is
  'SDP membership ID when provided; null for non-member applicants.';

comment on column public.agent_registrations.membership_id_card_data_url is
  'Required for verified members; null for non-member applicants.';

comment on column public.agent_registrations.email is
  'Optional contact email; agents sign in with phone, not email.';

notify pgrst, 'reload schema';
