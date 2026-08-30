import type { Metadata } from "next";
import LegalPage from "../components/LegalPage";

export const metadata: Metadata = {
  title: "SMS Consent Terms — Family Weather",
  description: "Consent, frequency, help and opt-out terms for Family Weather text messages.",
  alternates: { canonical: "/sms-consent" },
};

export default function SmsConsentPage() {
  return (
    <LegalPage eyebrow="Text messaging" title="SMS Consent Terms" summary="Family Weather text messages are event-related communications sent only after the mobile-number owner has provided the required consent.">
      <section><h2>Program description</h2><p>If you expressly opt in, Family Weather may send transactional text messages about an event, such as an invitation, RSVP confirmation, event reminder, schedule or location update, and an important weather-related event update. Family Weather does not use event-message consent for unrelated advertising.</p></section>
      <section><h2>How consent works</h2><p>Entering another person’s phone number does not prove that person consented. The owner of the mobile number must complete the consent step presented by Family Weather before recurring or automated texts are enabled. Consent applies only to the Family Weather event-message program described at opt-in, cannot be bought, sold or transferred, and is not a condition of purchasing anything.</p></section>
      <section><h2>Frequency and charges</h2><p>Message frequency varies based on event activity and the messages the recipient requests. Message and data rates may apply. Carriers are not liable for delayed or undelivered messages.</p></section>
      <section><h2>Opting out</h2><p>Reply <strong>STOP</strong> to unsubscribe. We may send one final confirmation that the opt-out was processed. We honor reasonable revocation requests as required by applicable law. After opting out, no further Family Weather program texts will be sent unless the mobile-number owner provides new consent.</p></section>
      <section><h2>Help</h2><p>Reply <strong>HELP</strong> for assistance or email <a href="mailto:contact@thefamilyweather.com">contact@thefamilyweather.com</a>.</p></section>
      <section><h2>Privacy</h2><p>Mobile phone numbers, SMS opt-in records and messaging consent are used to operate requested Family Weather communications. <strong>We do not sell, rent or share mobile information or SMS consent with third parties for their own marketing or promotional purposes.</strong> Service providers may process this information only as needed to deliver and support the messaging service. See our <a href="/privacy">Privacy Policy</a> for more information.</p></section>
      <section><h2>Changes</h2><p>We may update these SMS Consent Terms as the messaging program or legal requirements change. The effective date above identifies the current version.</p></section>
    </LegalPage>
  );
}
