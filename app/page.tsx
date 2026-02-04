import { getEvents, getAnnouncements } from "@/lib/db/content";
import { HomeClient } from "./HomeClient";

export default async function HomePage() {
  const [events, announcements] = await Promise.all([getEvents(10), getAnnouncements(5)]);
  return <HomeClient events={events} announcements={announcements} />;
}
