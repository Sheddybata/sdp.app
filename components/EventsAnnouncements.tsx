"use client";

import { Calendar, Megaphone } from "lucide-react";
import type { EventRecord, AnnouncementRecord } from "@/lib/db/content";
import { useLanguage } from "@/lib/i18n/context";
import { getLocalizedEvent, getLocalizedAnnouncement } from "@/lib/i18n/content-helpers";

/** Shown when Supabase has no upcoming events (same copy as migration 013). */
const MOCK_EVENTS_FALLBACK: EventRecord[] = [
  {
    id: "mock-ev-1",
    title: "National Convention",
    eventDate: "2026-04-27",
    location: null,
    description: "April 27th – April 28th, 2026",
    createdAt: "",
  },
  {
    id: "mock-ev-2",
    title: "National Congress",
    eventDate: "2026-04-27",
    location: null,
    description: "April 27 – May 1st, 2026",
    createdAt: "",
  },
  {
    id: "mock-ev-3",
    title: "Primaries",
    eventDate: "2026-04-27",
    location: null,
    description: "April 27th – May 1st, 2026",
    createdAt: "",
  },
];

const MOCK_ANNOUNCEMENTS: { text: string; date: string }[] = [
  { text: "Member registration is now open. Join your ward today.", date: "Jan 28, 2026" },
];

function formatDate(s: string, locale: string = "en-NG") {
  try {
    return new Date(s + "T00:00:00").toLocaleDateString(locale, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return s;
  }
}

interface EventsAnnouncementsProps {
  events?: EventRecord[];
  announcements?: AnnouncementRecord[];
}

export function EventsAnnouncements({ events = [], announcements = [] }: EventsAnnouncementsProps) {
  const { language, t } = useLanguage();
  const localeMap: Record<string, string> = {
    en: "en-NG",
    ha: "ha-NG",
    ff: "ff-NG",
    ig: "ig-NG",
    yo: "yo-NG",
  };
  const locale = localeMap[language] || "en-NG";

  const displayEvents = events.length > 0 ? events : MOCK_EVENTS_FALLBACK;
  const displayAnnouncements = announcements.length > 0 ? announcements : MOCK_ANNOUNCEMENTS.map((a) => ({ id: "", text: a.text, publishedAt: a.date, createdAt: "" } as AnnouncementRecord));

  return (
    <section className="space-y-4">
      <h2 className="text-base font-semibold text-neutral-900">{t.home.upcomingAndNews}</h2>
      <div className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm">
        <h3 className="mb-3 flex items-center gap-2 text-sm font-medium text-neutral-700">
          <Calendar className="h-4 w-4" />
          {t.home.upcomingEvents}
        </h3>
        <ul className="space-y-3">
          {displayEvents.map((e, i) => {
            const localized = getLocalizedEvent(e, language);
            return (
              <li key={e.id || `e-${i}`} className="flex flex-col gap-0.5 text-sm">
                <span className="font-medium text-neutral-900">{localized.title}</span>
                <span className="text-xs text-neutral-600">
                  {localized.description?.trim()
                    ? localized.description.trim()
                    : e.eventDate?.length === 10
                      ? formatDate(e.eventDate, locale)
                      : e.eventDate}
                  {localized.location ? ` · ${localized.location}` : ""}
                </span>
              </li>
            );
          })}
        </ul>
      </div>
      <div className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm">
        <h3 className="mb-3 flex items-center gap-2 text-sm font-medium text-neutral-700">
          <Megaphone className="h-4 w-4" />
          {t.home.announcements}
        </h3>
        <ul className="space-y-3">
          {displayAnnouncements.map((a, i) => {
            const localized = getLocalizedAnnouncement(a, language);
            return (
              <li key={a.id || `a-${i}`} className="text-sm text-neutral-700">
                {localized.text}
                <span className="ml-1 text-xs text-neutral-500">
                  — {a.publishedAt?.length === 10 ? formatDate(a.publishedAt, locale) : a.publishedAt}
                </span>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
