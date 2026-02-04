import { en } from "./en";
import { ha } from "./ha";
import { ff } from "./ff";
import { ig } from "./ig";
import { yo } from "./yo";
import type { Language } from "../languages";

export type TranslationKeys = typeof en;

export const translations: Record<Language, TranslationKeys> = {
  en: en as TranslationKeys,
  ha: ha as TranslationKeys,
  ff: ff as TranslationKeys,
  ig: ig as TranslationKeys,
  yo: yo as TranslationKeys,
};

export function getTranslations(lang: Language): TranslationKeys {
  return translations[lang] || translations.en;
}
