import type { Metadata } from "next";
import LegalPage from "../components/LegalPage";

export const metadata: Metadata = {
  title: "Terms of Service — Family Weather",
  description: "Terms governing use of Family Weather.",
  alternates: { canonical: "/terms" },
  openGraph: {
    title: "Terms of Service — Family Weather",
    description: "Terms governing use of Family Weather.",
    url: "/terms",
  },
};

export default function TermsPage() {
  return (
    <LegalPage eyebrow="Using the service" title="Terms of Service" summary="These Terms govern your use of Family Weather, including weather planning, accounts, events, invitations and RSVPs.">
      <section><h2>Agreement and eligibility</h2><p>By using Family Weather, you agree to these Terms and our <a href="/privacy">Privacy Policy</a>. You must be at least 13 years old. If you are under the age of legal majority where you live, use the service only with permission from a parent or legal guardian.</p></section>
      <section><h2>Weather and Almanac information</h2><p>Forecasts, observations, recommendations and historical patterns are informational planning tools. Weather can change quickly, data providers can be delayed or unavailable, and no result is guaranteed. Almanac results describe prior matching dates and are <strong>not forecasts</strong>. Use official alerts, local authorities and sound judgment for safety-critical decisions.</p></section>
      <section><h2>Accounts and event ownership</h2><p>You are responsible for information submitted through your account and for protecting access to your device and authentication session. Event organizers are responsible for event accuracy, guest communications and deciding who receives an invitation link.</p></section>
      <section><h2>Invitations, email and text messages</h2><p>You may use Family Weather only to contact people with whom you have an appropriate relationship and permission to contact. Do not use the service for spam, purchased lists, unsolicited promotions or harassment. Text messages may be sent only under the consent rules in our <a href="/sms-consent">SMS Consent Terms</a>. Consent from one person cannot be transferred to another person or reused for an unrelated purpose.</p></section>
      <section><h2>Acceptable use</h2><p>You may not misuse Family Weather, attempt unauthorized access, interfere with service operation, scrape private information, impersonate another person, distribute malware, violate another person’s rights or use the service unlawfully.</p></section>
      <section><h2>Third-party services</h2><p>Family Weather relies on third-party authentication, mapping, weather, hosting, email and messaging services. Their availability and data may change. Your use of those features may also be subject to the provider’s terms.</p></section>
      <section><h2>Service changes and termination</h2><p>We may change, suspend or discontinue features, and we may restrict access when reasonably necessary to protect users, the service or the law. You may stop using Family Weather at any time.</p></section>
      <section><h2>Disclaimers and responsibility</h2><p>Family Weather is provided on an “as available” basis to the extent permitted by law. We do not promise uninterrupted operation or perfect accuracy. To the extent permitted by law, Family Weather is not responsible for indirect or consequential loss arising from reliance on weather data, event changes, undelivered communications or unauthorized sharing of an invitation link. Nothing in these Terms limits rights that cannot legally be waived.</p></section>
      <section><h2>Governing law and changes</h2><p>These Terms are governed by the laws of California, without regard to conflict-of-law rules. We may update these Terms, and the effective date above identifies the current version. Continued use after an update means you accept the revised Terms.</p></section>
      <section><h2>Contact</h2><p>Questions about these Terms may be sent to <a href="mailto:contact@thefamilyweather.com">contact@thefamilyweather.com</a>.</p></section>
    </LegalPage>
  );
}
