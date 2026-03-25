-- PWD (person with disability) self-declaration on domestic members
ALTER TABLE public.members
  ADD COLUMN IF NOT EXISTS pwd_identifies boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS pwd_category text,
  ADD COLUMN IF NOT EXISTS pwd_category_other text;

COMMENT ON COLUMN public.members.pwd_identifies IS 'Member answers Yes/No to identifying as a person with disability';
COMMENT ON COLUMN public.members.pwd_category IS 'When pwd_identifies, one of: wheelchair_mobility, deaf_hard_of_hearing, blind_visual, intellectual_learning, psychosocial_mental_health, prefer_not_to_say, other';
COMMENT ON COLUMN public.members.pwd_category_other IS 'Free text when pwd_category is other';
