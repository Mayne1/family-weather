/* Intentional full-page navigation keeps advertising scripts out of private and legal routes. */
/* eslint-disable @next/next/no-html-link-for-pages */
import Link from "next/link";
import type { ReactNode } from "react";

export function PublicHeader() {
  return (
    <header className="publicHeader">
      <Link className="eventsBrand" href="/" aria-label="Family Weather home">
        <span className="brandMark" aria-hidden="true"><i /><i /><i /></span>
        <span><strong>Family Weather</strong><small>Plan together. Weather better.</small></span>
      </Link>
      <Link className="publicHeaderHome" href="/" aria-label="Return to the Family Weather homepage">Home</Link>
      <nav aria-label="Primary navigation">
        <Link href="/today">Today</Link>
        <Link href="/plan">Plan an activity</Link>
        <Link href="/weather-history">Weather history</Link>
        <Link href="/how-it-works">How it works</Link>
        <Link href="/weather-stories">Stories</Link>
        <a href="/events">My events</a>
      </nav>
      <a className="publicHeaderCta" href="/create-event">Create event</a>
    </header>
  );
}

export function PublicFooter() {
  return (
    <footer className="publicFooter">
      <div className="brand">
        <span className="brandMark" aria-hidden="true"><i /><i /><i /></span>
        <span><strong>Family Weather</strong><small>Plans change. Families stay connected.</small></span>
      </div>
      <nav aria-label="Company and support">
        <Link href="/about">About</Link>
        <a href="/contact">Contact</a>
        <Link href="/pricing">Pricing</Link>
        <a href="/privacy">Privacy</a>
        <a href="/terms">Terms</a>
      </nav>
      <a href="mailto:contact@thefamilyweather.com">contact@thefamilyweather.com</a>
    </footer>
  );
}

export default function PublicChrome({ children }: { children: ReactNode }) {
  return <div className="publicSite"><PublicHeader />{children}<PublicFooter /></div>;
}
