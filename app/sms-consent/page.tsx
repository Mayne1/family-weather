import type { Metadata } from "next";
import LegalPage from "../components/LegalPage";

export const metadata: Metadata = {
  title: "SMS Consent Terms — Family Weather",
  description: "Consent, frequency, help and opt-out terms for Family Weather text messages.",
  alternates: { canonical: "/sms-consent" },
  robots: { index: false, follow: true },
  openGraph: {
    title: "SMS Consent Terms — Family Weather",
    description: "Consent, frequency, help and opt-out terms for Family Weather text messages.",
    url: "/sms-consent",
  },
};

export default function SmsConsentPage() {
  return (
    <LegalPage effectiveDate="October 22, 2026" eyebrow="Text messaging" title="SMS Consent Terms" summary="Family Weather announcement texts are optional link messages sent after the mobile-number owner signs up for a specific organizer’s announcements.">
      <section><h2>Program description</h2><p>If you expressly opt in, Family Weather sends short links to personal announcements from the organizer named on your signup form. The announcement and replies stay on the website. This program does not include advertising, automatic weather alerts, or invitation reminders.</p></section>
      <section><h2>How consent works</h2><p>Entering another person’s phone number does not prove that person consented. The mobile-number owner enters their own name and U.S. mobile number on the organizer’s signup page and checks a separate, initially unchecked consent box. We record the exact wording and when and where it was accepted. Permission applies only to announcements from that organizer, cannot be bought, sold or transferred, and is not a condition of purchasing anything. Signing up sends no text and requires no Family Weather account.</p></section>
      <section><h2>Frequency and charges</h2><p>Message frequency varies with the organizer’s announcements, with at most one link text per announcement to each recipient. Organizers purchase optional text credits; recipients do not purchase a pack to receive messages. Message and data rates may apply. Carriers are not liable for delayed or undelivered messages.</p></section>
      <section><h2>Opting out</h2><p>Reply <strong>STOP</strong> to unsubscribe. Your SMS provider may send a final opt-out confirmation. You can also use the private preference link shown after signup to stop all Family Weather announcement texts, or email our support address. Texts already in transit may still arrive. We honor reasonable revocation requests as required by applicable law. After opting out, no further Family Weather program texts will be sent unless the mobile-number owner requests to rejoin and we confirm renewed consent and provider eligibility. A new signup alone does not clear an opt-out.</p></section>
      <section><h2>Help</h2><p>Reply <strong>HELP</strong> for assistance or email <a href="mailto:contact@thefamilyweather.com">contact@thefamilyweather.com</a>.</p></section>
      <section><h2>Privacy</h2><p>Mobile phone numbers, SMS opt-in records and messaging consent are used to operate requested Family Weather communications. <strong>We do not sell, rent or share mobile information or SMS consent with third parties for their own marketing or promotional purposes.</strong> Service providers may process this information only as needed to deliver and support the messaging service. See our <a href="/privacy">Privacy Policy</a> for more information.</p></section>
      <section><h2>Changes</h2><p>We may update these SMS Consent Terms as the messaging program or legal requirements change. The effective date above identifies the current version.</p></section>
    </LegalPage>
  );
}
