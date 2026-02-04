import { getAllEvents, getAllAnnouncements, isContentConfigured } from "@/lib/db/content";
import { AdminEventsClient } from "./AdminEventsClient";

export default async function AdminEventsPage() {
  const [events, announcements] = await Promise.all([getAllEvents(), getAllAnnouncements()]);
  const configured = isContentConfigured();

  return (
    <AdminEventsClient
      initialEvents={events}
      initialAnnouncements={announcements}
      configured={configured}
    />
  );
}
