-- Slim agent apply: only names, phone, gender, photo (+ assignment / password in app).
-- Older identity docs and extra location JSON become optional for new rows.

alter table public.agent_registrations
  alter column voter_identification_number drop not null,
  alter column agent_polling_unit drop not null,
  alter column agent_voting_unit drop not null,
  alter column polling_unit drop not null,
  alter column pvc_data_url drop not null;

comment on column public.agent_registrations.voter_identification_number is
  'Optional; no longer collected on the slim agent apply form.';

comment on column public.agent_registrations.agent_polling_unit is
  'Optional; no longer collected on the slim agent apply form.';

comment on column public.agent_registrations.agent_voting_unit is
  'Optional; no longer collected on the slim agent apply form.';

comment on column public.agent_registrations.polling_unit is
  'Optional; no longer collected on the slim agent apply form.';

comment on column public.agent_registrations.pvc_data_url is
  'Optional; no longer collected on the slim agent apply form.';

notify pgrst, 'reload schema';
