import { createAdminClient } from "@/lib/supabase/admin";
import type { Language } from "@/lib/i18n/languages";

// Multilingual content structure
export type MultilingualText = {
  en: string;
  ha?: string;
  ff?: string;
  ig?: string;
  yo?: string;
};

export type EventRecord = {
  id: string;
  title: string | MultilingualText;
  eventDate: string;
  location: string | MultilingualText | null;
  description: string | MultilingualText | null;
  createdAt: string;
};

export type AnnouncementRecord = {
  id: string;
  text: string | MultilingualText;
  publishedAt: string;
  createdAt: string;
};

type DbEvent = {
  id: string;
  title: string | MultilingualText;
  event_date: string;
  location: string | MultilingualText | null;
  description: string | MultilingualText | null;
  created_at: string;
};

type DbAnnouncement = {
  id: string;
  text: string | MultilingualText;
  published_at: string;
  created_at: string;
};

// Helper function to get text in a specific language
export function getLocalizedText(
  content: string | MultilingualText | null | undefined,
  lang: Language = "en"
): string {
  if (!content) return "";
  if (typeof content === "string") return content;
  return content[lang] || content.en || "";
}

function toEvent(row: DbEvent): EventRecord {
  return {
    id: row.id,
    title: row.title,
    eventDate: row.event_date,
    location: row.location ?? null,
    description: row.description ?? null,
    createdAt: row.created_at,
  };
}

function toAnnouncement(row: DbAnnouncement): AnnouncementRecord {
  return {
    id: row.id,
    text: row.text,
    publishedAt: row.published_at,
    createdAt: row.created_at,
  };
}

export function isContentConfigured(): boolean {
  const supabase = createAdminClient();
  return !!supabase;
}

/** Fetch upcoming events (next 6 months, sorted by date) */
export async function getEvents(limit = 10): Promise<EventRecord[]> {
  const supabase = createAdminClient();
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("events")
    .select("*")
    .gte("event_date", new Date().toISOString().slice(0, 10))
    .order("event_date", { ascending: true })
    .limit(limit);
  if (error) return [];
  return (data ?? []).map(toEvent);
}

/** Fetch all events for admin */
export async function getAllEvents(): Promise<EventRecord[]> {
  const supabase = createAdminClient();
  if (!supabase) return [];
  const { data, error } = await supabase.from("events").select("*").order("event_date", { ascending: false });
  if (error) return [];
  return (data ?? []).map(toEvent);
}

/** Fetch recent announcements (last 30 days) */
export async function getAnnouncements(limit = 5): Promise<AnnouncementRecord[]> {
  const supabase = createAdminClient();
  if (!supabase) return [];
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const { data, error } = await supabase
    .from("announcements")
    .select("*")
    .gte("published_at", thirtyDaysAgo.toISOString().slice(0, 10))
    .order("published_at", { ascending: false })
    .limit(limit);
  if (error) return [];
  return (data ?? []).map(toAnnouncement);
}

/** Fetch all announcements for admin */
export async function getAllAnnouncements(): Promise<AnnouncementRecord[]> {
  const supabase = createAdminClient();
  if (!supabase) return [];
  const { data, error } = await supabase.from("announcements").select("*").order("published_at", { ascending: false });
  if (error) return [];
  return (data ?? []).map(toAnnouncement);
}

export type EventInsert = { title: string; eventDate: string; location?: string; description?: string };
export type AnnouncementInsert = { text: string; publishedAt?: string };

/** Insert event */
export async function insertEvent(data: EventInsert): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  const supabase = createAdminClient();
  if (!supabase) return { ok: false, error: "Database not configured." };
  const { data: row, error } = await supabase
    .from("events")
    .insert({
      title: data.title.trim().slice(0, 200),
      event_date: data.eventDate,
      location: data.location?.trim().slice(0, 100) ?? null,
      description: data.description?.trim().slice(0, 500) ?? null,
    })
    .select("id")
    .single();
  if (error) return { ok: false, error: error.message };
  return { ok: true, id: row.id };
}

/** Insert announcement */
export async function insertAnnouncement(data: AnnouncementInsert): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  const supabase = createAdminClient();
  if (!supabase) return { ok: false, error: "Database not configured." };
  const { data: row, error } = await supabase
    .from("announcements")
    .insert({
      text: data.text.trim().slice(0, 500),
      published_at: data.publishedAt ?? new Date().toISOString().slice(0, 10),
    })
    .select("id")
    .single();
  if (error) return { ok: false, error: error.message };
  return { ok: true, id: row.id };
}

/** Delete event */
export async function deleteEvent(id: string): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = createAdminClient();
  if (!supabase) return { ok: false, error: "Database not configured." };
  const { error } = await supabase.from("events").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

/** Delete announcement */
export async function deleteAnnouncement(id: string): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = createAdminClient();
  if (!supabase) return { ok: false, error: "Database not configured." };
  const { error } = await supabase.from("announcements").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}
