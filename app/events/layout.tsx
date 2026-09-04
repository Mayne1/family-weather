import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "My Events — Family Weather",
  alternates: { canonical: null },
  robots: { index: false, follow: false },
};

export default function EventsLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children;
}
