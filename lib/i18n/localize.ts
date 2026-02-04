import type { Language } from "./languages";

type MultilingualText = {
  en: string;
  ha?: string;
  ff?: string;
  ig?: string;
  yo?: string;
};

export function getLocalizedText(
  content: string | MultilingualText | null | undefined,
  lang: Language = "en"
): string {
  if (!content) return "";
  if (typeof content === "string") return content;
  return content[lang] || content.en || "";
}
