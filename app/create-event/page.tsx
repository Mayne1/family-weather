import type { Metadata } from "next";
import PublicChrome from "../components/PublicChrome";
import CreateEventFlow from "./CreateEventFlow";

export const metadata: Metadata = { title: "Create an Event | Family Weather", referrer: "no-referrer", description: "Create a weather-aware event, then design the invitation and manage guest responses in separate, clear steps.", robots: { index: false, follow: true } };

export default async function CreateEventPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const query = await searchParams;
  const initial = (key: string) => typeof query[key] === "string" ? query[key] as string : "";
  return <PublicChrome><main className="workflowMain"><section className="workflowHeading"><p className="publicKicker">Create an event</p><h1>One decision at a time.</h1><p>First confirm the event details and weather. You’ll need a free account to save your event, design an invitation, and manage replies. Your guests can RSVP without signing up.</p></section><CreateEventFlow initialActivity={initial("activity")} initialLocation={initial("location")} initialDate={initial("date")} initialWindow={initial("window")} initialTime={initial("time")} /></main></PublicChrome>;
}
