import type { Metadata } from "next";
import Link from "next/link";
import EventSaved from "./EventSaved";

export const metadata: Metadata = {
  title: "Event saved | Family Weather",
  referrer: "no-referrer",
  robots: { index: false, follow: false },
};

export default function EventSavedPage() {
  return <main className="workflowMain"><h1>Opening your invitation.</h1><p>Opening your invitation…</p><EventSaved /><noscript><Link href="/events">Continue to your events</Link></noscript></main>;
}
