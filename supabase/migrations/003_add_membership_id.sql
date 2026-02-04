-- Add membership_id column to members table
-- Membership ID format: SDP-{first 3 letters of surname}-{last 6 digits of voter ID}

-- Add the column
alter table public.members 
add column if not exists membership_id text;

-- Create unique index for fast lookups
create unique index if not exists idx_members_membership_id_unique 
on public.members (membership_id);

-- Create regular index for queries
create index if not exists idx_members_membership_id 
on public.members (membership_id);

-- Backfill existing records with computed membership IDs
-- Format: SDP-{first 3 uppercase letters of surname}-{last 6 uppercase characters of voter_registration_number}
-- Ensure entire membership_id is uppercase
update public.members
set membership_id = 
  upper('SDP-' || 
  upper(substring(replace(surname, ' ', '') from 1 for 3)) || 
  '-' || 
  upper(substring(voter_registration_number from length(voter_registration_number) - 5)))
where membership_id is null;

-- Also update any existing membership_ids to be uppercase (in case they were inserted differently)
update public.members
set membership_id = upper(membership_id)
where membership_id is not null and membership_id != upper(membership_id);

-- Make it not null after backfilling (optional - can keep nullable if preferred)
-- alter table public.members alter column membership_id set not null;
