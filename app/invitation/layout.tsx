import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Private Invitation — Family Weather",
  alternates: { canonical: null },
  robots: { index: false, follow: false },
};

export default function InvitationLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children;
}
