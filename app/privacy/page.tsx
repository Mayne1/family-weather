import type { Metadata } from "next";
import LegalPage from "../components/LegalPage";

export const metadata: Metadata = {
  title: "Privacy Policy — Family Weather",
  description: "How Family Weather collects, uses, protects and shares information.",
  alternates: { canonical: "/privacy" },
};

export default function PrivacyPage() {
  return (
    <LegalPage eyebrow="Your information" title="Privacy Policy" summary="Family Weather uses the information you provide to plan events, deliver invitations, record RSVPs and show location-based weather. We do not sell personal information.">
      <section><h2>Information we collect</h2><p>Depending on how you use Family Weather, we may collect:</p><ul><li><strong>Account information:</strong> your email address and authentication identifiers. Password authentication is provided through Google Firebase; Family Weather does not store your plain-text password.</li><li><strong>Event information:</strong> event names, activities, dates, times, locations, coordinates, guest estimates and planning preferences.</li><li><strong>Invitation and RSVP information:</strong> invitee email addresses, invitation links, names, RSVP responses, guest counts and messages. If SMS is enabled and used, we may also process phone numbers and messaging consent records.</li><li><strong>Location information:</strong> a place you search for or coordinates you choose to provide. Browser geolocation is used only with your permission. A recently selected home location may be stored in your browser for a limited period.</li><li><strong>Technical information:</strong> standard server logs such as IP address, browser type, request time, requested page and error information.</li></ul></section>
      <section><h2>How we use information</h2><ul><li>Provide weather, forecast and historical Almanac results.</li><li>Create, save and manage events, invitations and RSVPs.</li><li>Authenticate accounts and protect private event information.</li><li>Send event-related email or text communications that were requested and properly authorized.</li><li>Operate, secure, troubleshoot and improve Family Weather.</li><li>Comply with applicable law and enforce our Terms.</li></ul></section>
      <section><h2>Service providers and sharing</h2><p>We disclose information only as needed to operate the service, fulfill a request, protect Family Weather or comply with law. Providers may include hosting and database vendors, Google Firebase for authentication, weather and map/location data services, and future email or messaging delivery providers. Public weather/location providers may receive a location or coordinates needed to answer a request.</p><p><strong>We do not sell personal information. We do not sell, rent or share mobile phone numbers, SMS opt-in data or messaging consent with third parties for their own marketing or promotional purposes.</strong></p></section>
      <section><h2>Invitation links</h2><p>Invitation links are designed to be private, but anyone who receives or is forwarded a valid link may be able to view the invitation and submit an RSVP. Event organizers should share links only with intended guests.</p></section>
      <section><h2>Storage, retention and security</h2><p>Family Weather uses reasonable administrative and technical safeguards. No internet service can promise absolute security. We retain information while it is needed to provide the service, maintain records, resolve disputes, prevent abuse or satisfy legal obligations. Event owners may delete saved events through available account controls.</p></section>
      <section><h2>Your choices</h2><p>You may decline browser location permission and enter a location manually. You may request access, correction or deletion of personal information by emailing <a href="mailto:contact@thefamilyweather.com">contact@thefamilyweather.com</a>. We may need to verify your identity before completing a request. SMS recipients can withdraw consent as described in our <a href="/sms-consent">SMS Consent Terms</a>.</p></section>
      <section><h2>Children</h2><p>Family Weather is not directed to children under 13, and we do not knowingly collect personal information directly from children under 13.</p></section>
      <section><h2>Changes and contact</h2><p>We may update this policy as Family Weather changes. The effective date above identifies the current version. Questions or privacy requests may be sent to <a href="mailto:contact@thefamilyweather.com">contact@thefamilyweather.com</a>.</p></section>
    </LegalPage>
  );
}
