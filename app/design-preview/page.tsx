import type { Metadata } from "next";
import HomePreview from "./HomePreview";

export const metadata: Metadata = {
  title: "Family Weather — Homepage design preview",
  robots: { index: false, follow: false },
  alternates: { canonical: "/design-preview" },
};

export default function Page() { return <HomePreview />; }
