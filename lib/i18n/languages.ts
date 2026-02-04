export type Language = "en" | "ha" | "ff" | "ig" | "yo";

export interface LanguageInfo {
  code: Language;
  name: string;
  nativeName: string;
  flag: string;
}

export const LANGUAGES: Record<Language, LanguageInfo> = {
  en: {
    code: "en",
    name: "English",
    nativeName: "English",
    flag: "🇬🇧",
  },
  ha: {
    code: "ha",
    name: "Hausa",
    nativeName: "Hausa",
    flag: "🇳🇬",
  },
  ff: {
    code: "ff",
    name: "Fulfulde",
    nativeName: "Fulfulde",
    flag: "🇳🇬",
  },
  ig: {
    code: "ig",
    name: "Igbo",
    nativeName: "Asụsụ Igbo",
    flag: "🇳🇬",
  },
  yo: {
    code: "yo",
    name: "Yoruba",
    nativeName: "Èdè Yorùbá",
    flag: "🇳🇬",
  },
};

export const DEFAULT_LANGUAGE: Language = "en";

export function getLanguageFromCode(code: string): Language {
  return Object.values(LANGUAGES).some((lang) => lang.code === code) ? (code as Language) : DEFAULT_LANGUAGE;
}
