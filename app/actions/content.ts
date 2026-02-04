"use server";

import { revalidatePath } from "next/cache";
import {
  getEvents,
  getAnnouncements,
  insertEvent,
  insertAnnouncement,
  deleteEvent,
  deleteAnnouncement,
  type EventRecord,
  type AnnouncementRecord,
} from "@/lib/db/content";

export async function fetchEvents(): Promise<EventRecord[]> {
  return getEvents(10);
}

export async function fetchAnnouncements(): Promise<AnnouncementRecord[]> {
  return getAnnouncements(5);
}

export async function createEvent(formData: FormData) {
  const title = String(formData.get("title") ?? "").trim();
  const eventDate = String(formData.get("eventDate") ?? "").trim();
  const location = String(formData.get("location") ?? "").trim() || undefined;
  const description = String(formData.get("description") ?? "").trim() || undefined;

  if (!title || title.length < 2) return { ok: false as const, error: "Title is required (min 2 characters)." };
  if (!eventDate) return { ok: false as const, error: "Event date is required." };

  const result = await insertEvent({ title, eventDate, location, description });
  if (result.ok) revalidatePath("/"), revalidatePath("/admin/events");
  return result;
}

export async function createAnnouncement(formData: FormData) {
  const text = String(formData.get("text") ?? "").trim();
  const publishedAt = String(formData.get("publishedAt") ?? "").trim() || undefined;

  if (!text || text.length < 5) return { ok: false as const, error: "Announcement text is required (min 5 characters)." };

  const result = await insertAnnouncement({ text, publishedAt });
  if (result.ok) revalidatePath("/"), revalidatePath("/admin/events");
  return result;
}

export async function removeEvent(id: string) {
  const result = await deleteEvent(id);
  if (result.ok) revalidatePath("/"), revalidatePath("/admin/events");
  return result;
}

export async function removeAnnouncement(id: string) {
  const result = await deleteAnnouncement(id);
  if (result.ok) revalidatePath("/"), revalidatePath("/admin/events");
  return result;
}
