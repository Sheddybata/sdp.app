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
  const displayAnnouncements = announcements;

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
      {displayAnnouncements.length > 0 ? (
        <div className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm">
          <h3 className="mb-3 flex gap-2 text-sm font-semibold leading-snug text-neutral-900">
            <Megaphone className="mt-0.5 h-4 w-4 shrink-0 text-neutral-600" aria-hidden />
            <span className="text-balance">{t.home.announcements}</span>
          </h3>
          <ul className="space-y-3">
            {displayAnnouncements.map((a, i) => {
              const localized = getLocalizedAnnouncement(a, language);
              const showDate =
                Boolean(a.publishedAt?.trim()) && a.publishedAt.length === 10;
              return (
                <li key={a.id || `a-${i}`} className="text-sm leading-relaxed text-neutral-700">
                  {localized.text}
                  {showDate ? (
                    <span className="ml-1 text-xs text-neutral-500">
                      — {formatDate(a.publishedAt, locale)}
                    </span>
                  ) : null}
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}
      <div className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm">
        <h3 className="mb-3 text-sm font-medium text-neutral-700">{t.home.contactHeading}</h3>
        <p className="mb-3 text-sm text-neutral-600">{t.home.contactIntro}</p>
        <ul className="space-y-3 text-sm text-neutral-800">
          <li>
            <a href="tel:+2347043979165" className="font-medium text-sdp-primary hover:underline">
              +234 704 397 9165
            </a>
            <div className="text-xs text-neutral-600">{t.home.contactDeskOfficer}</div>
          </li>
          <li>
            <a href="tel:+2348066524457" className="font-medium text-sdp-primary hover:underline">
              +234 806 652 4457
            </a>
            <div className="text-xs text-neutral-600">{t.home.contactOrganizingManager}</div>
          </li>
          <li>
            <a href="tel:+2348033022578" className="font-medium text-sdp-primary hover:underline">
              +234 803 302 2578
            </a>
            <div className="text-xs text-neutral-600">{t.home.contactNationalLine}</div>
          </li>
        </ul>
      </div>
    </section>
  );
}
