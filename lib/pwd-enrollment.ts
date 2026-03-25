/** Stored values for `members.pwd_category` — keep in sync with enrollment schema & UI. */
export const PWD_CATEGORY_VALUES = [
  "wheelchair_mobility",
  "deaf_hard_of_hearing",
  "blind_visual",
  "intellectual_learning",
  "psychosocial_mental_health",
  "prefer_not_to_say",
  "other",
] as const;

export type PwdCategory = (typeof PWD_CATEGORY_VALUES)[number];

/** Labels for review / admin (English); form uses i18n via matching keys on `step4`. */
export const PWD_CATEGORY_LABELS_EN: Record<PwdCategory, string> = {
  wheelchair_mobility: "Wheelchair user / Mobility impairment",
  deaf_hard_of_hearing: "Deaf / Hard of hearing",
  blind_visual: "Blind / Visual impairment",
  intellectual_learning:
    "Intellectual / Learning disability (e.g., Dyslexia, Down Syndrome)",
  psychosocial_mental_health: "Psychosocial / Mental health condition",
  prefer_not_to_say: "I prefer not to say",
  other: "Other",
};

export function getPwdCategoryLabel(
  category: string | undefined | null,
  t: {
    pwdCategoryWheelchairMobility: string;
    pwdCategoryDeafHardOfHearing: string;
    pwdCategoryBlindVisual: string;
    pwdCategoryIntellectualLearning: string;
    pwdCategoryPsychosocialMentalHealth: string;
    pwdCategoryPreferNotToSay: string;
    pwdCategoryOther: string;
  }
): string {
  if (!category) return "—";
  const map: Record<string, string> = {
    wheelchair_mobility: t.pwdCategoryWheelchairMobility,
    deaf_hard_of_hearing: t.pwdCategoryDeafHardOfHearing,
    blind_visual: t.pwdCategoryBlindVisual,
    intellectual_learning: t.pwdCategoryIntellectualLearning,
    psychosocial_mental_health: t.pwdCategoryPsychosocialMentalHealth,
    prefer_not_to_say: t.pwdCategoryPreferNotToSay,
    other: t.pwdCategoryOther,
  };
  return map[category] ?? category;
}
