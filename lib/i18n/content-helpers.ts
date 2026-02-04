import type { Language } from "./languages";
import type { EventRecord, AnnouncementRecord, MultilingualText } from "@/lib/db/content";
import { getLocalizedText } from "@/lib/i18n/localize";

export function getLocalizedEvent(event: EventRecord, lang: Language): {
  title: string;
  location: string | null;
  description: string | null;
} {
  return {
    title: getLocalizedText(event.title, lang),
    location: event.location ? getLocalizedText(event.location, lang) : null,
    description: event.description ? getLocalizedText(event.description, lang) : null,
  };
}

export function getLocalizedAnnouncement(announcement: AnnouncementRecord, lang: Language): {
  text: string;
} {
  return {
    text: getLocalizedText(announcement.text, lang),
  };
}
