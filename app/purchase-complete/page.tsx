import type { Metadata } from "next";
import Link from "next/link";
import PurchaseComplete from "./PurchaseComplete";

export const metadata: Metadata = {
  title: "Purchase complete | Family Weather",
  referrer: "no-referrer",
  robots: { index: false, follow: false },
};

export default function PurchaseCompletePage() {
  return <main className="workflowMain"><h1>Opening your event.</h1><p>Please wait while we return you to your event.</p><PurchaseComplete /><noscript><Link href="/events">Continue to your events</Link></noscript></main>;
}
