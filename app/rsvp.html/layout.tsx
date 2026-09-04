import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "RSVP — Family Weather",
  alternates: { canonical: null },
  robots: { index: false, follow: false },
};

export default function RsvpLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children;
}
