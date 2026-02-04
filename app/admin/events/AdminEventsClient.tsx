"use client";

import { useState, useEffect } from "react";
import type { EventRecord, AnnouncementRecord } from "@/lib/db/content";
import { getLocalizedText } from "@/lib/i18n/localize";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calendar, Megaphone, Plus, Trash2 } from "lucide-react";
import { createEvent, createAnnouncement, removeEvent, removeAnnouncement } from "@/app/actions/content";
import { useRouter } from "next/navigation";

function formatDate(s: string) {
  try {
    return new Date(s + "T00:00:00").toLocaleDateString("en-NG", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return s;
  }
}

export function AdminEventsClient({
  initialEvents,
  initialAnnouncements,
  configured,
}: {
  initialEvents: EventRecord[];
  initialAnnouncements: AnnouncementRecord[];
  configured: boolean;
}) {
  const router = useRouter();
  const [events, setEvents] = useState(initialEvents);
  const [announcements, setAnnouncements] = useState(initialAnnouncements);

  useEffect(() => {
    setEvents(initialEvents);
    setAnnouncements(initialAnnouncements);
  }, [initialEvents, initialAnnouncements]);
  const [eventFormOpen, setEventFormOpen] = useState(false);
  const [annFormOpen, setAnnFormOpen] = useState(false);
  const [eventSubmitting, setEventSubmitting] = useState(false);
  const [annSubmitting, setAnnSubmitting] = useState(false);
  const [eventError, setEventError] = useState("");
  const [annError, setAnnError] = useState("");

  const handleAddEvent = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setEventSubmitting(true);
    setEventError("");
    const form = e.currentTarget;
    const formData = new FormData(form);
    const result = await createEvent(formData);
    setEventSubmitting(false);
    if (result.ok) {
      form.reset();
      setEventFormOpen(false);
      router.refresh();
    } else {
      setEventError(result.error);
    }
  };

  const handleAddAnnouncement = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setAnnSubmitting(true);
    setAnnError("");
    const form = e.currentTarget;
    const formData = new FormData(form);
    const result = await createAnnouncement(formData);
    setAnnSubmitting(false);
    if (result.ok) {
      form.reset();
      setAnnFormOpen(false);
      router.refresh();
    } else {
      setAnnError(result.error);
    }
  };

  const handleDeleteEvent = async (id: string) => {
    if (!confirm("Delete this event?")) return;
    const result = await removeEvent(id);
    if (result.ok) {
      router.refresh();
      setEvents((prev) => prev.filter((e) => e.id !== id));
    }
  };

  const handleDeleteAnnouncement = async (id: string) => {
    if (!confirm("Delete this announcement?")) return;
    const result = await removeAnnouncement(id);
    if (result.ok) {
      router.refresh();
      setAnnouncements((prev) => prev.filter((a) => a.id !== id));
    }
  };

  if (!configured) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-neutral-900">Events & Announcements</h1>
        <p className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          Supabase is not configured. Add <code className="rounded bg-amber-100 px-1">NEXT_PUBLIC_SUPABASE_URL</code>,{" "}
          <code className="rounded bg-amber-100 px-1">NEXT_PUBLIC_SUPABASE_ANON_KEY</code>, and{" "}
          <code className="rounded bg-amber-100 px-1">SUPABASE_SERVICE_ROLE_KEY</code> to use this feature. Run the migration{" "}
          <code className="rounded bg-amber-100 px-1">002_create_events_announcements.sql</code> in Supabase.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold text-neutral-900">Events & Announcements</h1>
      <p className="text-sm text-neutral-600">Manage upcoming events and announcements shown on the home page.</p>

      {/* Events */}
      <section className="rounded-xl border border-neutral-200 bg-white p-6 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-lg font-semibold text-neutral-900">
            <Calendar className="h-5 w-5" />
            Upcoming Events
          </h2>
          <Button onClick={() => setEventFormOpen(!eventFormOpen)} className="min-h-[44px]" type="button">
            <Plus className="h-4 w-4" />
            Add Event
          </Button>
        </div>
        {eventFormOpen && (
          <form onSubmit={handleAddEvent} className="mb-6 space-y-4 rounded-lg border border-neutral-200 bg-neutral-50 p-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="event-title">Title</Label>
                <Input id="event-title" name="title" required minLength={2} maxLength={200} placeholder="State Chapter Meeting" className="min-h-[44px]" />
              </div>
              <div>
                <Label htmlFor="event-date">Event Date</Label>
                <Input id="event-date" name="eventDate" type="date" required className="min-h-[44px]" />
              </div>
            </div>
            <div>
              <Label htmlFor="event-location">Location (optional)</Label>
              <Input id="event-location" name="location" maxLength={100} placeholder="Lagos" className="min-h-[44px]" />
            </div>
            <div>
              <Label htmlFor="event-desc">Description (optional)</Label>
              <Input id="event-desc" name="description" maxLength={500} placeholder="Brief description" className="min-h-[44px]" />
            </div>
            {eventError && <p className="text-sm text-red-600">{eventError}</p>}
            <div className="flex gap-2">
              <Button type="submit" disabled={eventSubmitting} className="min-h-[44px]">
                {eventSubmitting ? "Saving…" : "Save Event"}
              </Button>
              <Button type="button" variant="outline" onClick={() => setEventFormOpen(false)} className="min-h-[44px]">
                Cancel
              </Button>
            </div>
          </form>
        )}
        <ul className="space-y-3">
          {events.length === 0 ? (
            <li className="text-sm text-neutral-500">No events yet. Add one above.</li>
          ) : (
            events.map((e) => {
              const titleText = getLocalizedText(e.title);
              const locationText = e.location ? getLocalizedText(e.location) : null;
              return (
                <li key={e.id} className="flex items-center justify-between rounded-lg border border-neutral-100 p-3">
                  <div>
                    <p className="font-medium text-neutral-900">{titleText}</p>
                    <p className="text-xs text-neutral-600">
                      {formatDate(e.eventDate)}
                      {locationText ? ` · ${locationText}` : ""}
                    </p>
                  </div>
                  <Button type="button" variant="ghost" size="icon" onClick={() => handleDeleteEvent(e.id)} className="min-h-[44px] min-w-[44px]" aria-label={`Delete ${titleText}`}>
                    <Trash2 className="h-4 w-4 text-red-600" />
                  </Button>
                </li>
              );
            })
          )}
        </ul>
      </section>

      {/* Announcements */}
      <section className="rounded-xl border border-neutral-200 bg-white p-6 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-lg font-semibold text-neutral-900">
            <Megaphone className="h-5 w-5" />
            Announcements
          </h2>
          <Button onClick={() => setAnnFormOpen(!annFormOpen)} className="min-h-[44px]" type="button">
            <Plus className="h-4 w-4" />
            Add Announcement
          </Button>
        </div>
        {annFormOpen && (
          <form onSubmit={handleAddAnnouncement} className="mb-6 space-y-4 rounded-lg border border-neutral-200 bg-neutral-50 p-4">
            <div>
              <Label htmlFor="ann-text">Text</Label>
              <Input id="ann-text" name="text" required minLength={5} maxLength={500} placeholder="Member registration is now open. Join your ward today." className="min-h-[44px]" />
            </div>
            <div>
              <Label htmlFor="ann-date">Published Date</Label>
              <Input id="ann-date" name="publishedAt" type="date" defaultValue={new Date().toISOString().slice(0, 10)} className="min-h-[44px]" />
            </div>
            {annError && <p className="text-sm text-red-600">{annError}</p>}
            <div className="flex gap-2">
              <Button type="submit" disabled={annSubmitting} className="min-h-[44px]">
                {annSubmitting ? "Saving…" : "Save Announcement"}
              </Button>
              <Button type="button" variant="outline" onClick={() => setAnnFormOpen(false)} className="min-h-[44px]">
                Cancel
              </Button>
            </div>
          </form>
        )}
        <ul className="space-y-3">
          {announcements.length === 0 ? (
            <li className="text-sm text-neutral-500">No announcements yet. Add one above.</li>
          ) : (
            announcements.map((a) => {
              const textContent = getLocalizedText(a.text);
              return (
                <li key={a.id} className="flex items-start justify-between gap-4 rounded-lg border border-neutral-100 p-3">
                  <div>
                    <p className="text-sm text-neutral-900">{textContent}</p>
                    <p className="text-xs text-neutral-500 mt-1">{formatDate(a.publishedAt)}</p>
                  </div>
                  <Button type="button" variant="ghost" size="icon" onClick={() => handleDeleteAnnouncement(a.id)} className="shrink-0 min-h-[44px] min-w-[44px]" aria-label="Delete announcement">
                    <Trash2 className="h-4 w-4 text-red-600" />
                  </Button>
                </li>
              );
            })
          )}
        </ul>
      </section>
    </div>
  );
}
