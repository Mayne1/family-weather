/* Intentional full-page navigation keeps advertising scripts out of private and legal routes. */
/* eslint-disable @next/next/no-html-link-for-pages */
import Link from "next/link";
import RightNowStrip from "./RightNowStrip";
import SiteTour from "./SiteTour";
import SocialLinks from "./SocialLinks";
import HomeAccount from "./HomeAccount";
import type { ReactNode } from "react";

export function PublicHeader() {
  return (
    <header className="publicHeader">
      <Link className="eventsBrand" href="/" aria-label="Family Weather home">
        <span className="brandMark" aria-hidden="true"><i /><i /><i /></span>
        <span><strong>Family Weather</strong><small>Plan together. Weather better.</small></span>
      </Link>
      <nav aria-label="Primary navigation">
        <Link href="/today">Today</Link>
        <Link href="/plan">Plan an activity</Link>
        <a href="/events">My events</a>
        <a href="/announcements">Announcements</a>
        <details className="publicHeaderMore">
          <summary>Explore</summary>
          <div>
            <Link href="/weather-history">Weather history</Link>
            <Link href="/live">Live desk</Link>
            <Link href="/how-it-works">How it works</Link>
            <Link href="/weather-stories">Stories</Link>
          </div>
        </details>
      </nav>
      <details className="publicHeaderMobile">
        <summary>Menu</summary>
        <div>
          <a className="publicHeaderMobileCta" href="/create-event">Create event</a><Link href="/today">Today</Link><Link href="/plan">Plan an activity</Link><a href="/events">My events</a><a href="/announcements">Announcements</a><Link href="/weather-history">Weather history</Link><Link href="/live">Live desk</Link><Link href="/how-it-works">How it works</Link><Link href="/weather-stories">Stories</Link>
        </div>
      </details>
      <HomeAccount />
      <a className="publicHeaderCta" href="/create-event">Create event</a>
    </header>
  );
}

export function PublicFooter({ firstVisitTour = false }: { firstVisitTour?: boolean }) {
  return (
    <footer className="publicFooter">
      <SocialLinks />
      <div className="publicFooterBrand">
        <strong>Family Weather</strong>
        <span>Weather for what you’re actually doing.</span>
        <span>Plans change. Families stay connected.</span>
        <a className="publicFooterEmail" href="mailto:contact@thefamilyweather.com">contact@thefamilyweather.com</a>
      </div>
      <div className="publicFooterColumn"><strong>PLAN</strong><Link href="/today">Today</Link><Link href="/plan">Activity planner</Link><Link href="/weather-history">Weather history</Link></div>
      <div className="publicFooterColumn"><strong>USE</strong><Link href="/live">Live weather desk</Link><a href="/create-event">Invitations</a><a data-tour="announcements" href="/announcements">Free announcements</a><Link href="/events">My events</Link><Link href="/pricing">Pricing</Link></div>
      <div className="publicFooterColumn" data-tour="help"><strong>COMPANY</strong><Link href="/about">About</Link><Link href="/faq">FAQ</Link><SiteTour firstVisit={firstVisitTour}/><a href="/contact">Contact</a><a href="/privacy">Privacy</a><a href="/terms">Terms</a></div>
    </footer>
  );
}

export default function PublicChrome({ children }: { children: ReactNode }) {
  return <div className="publicSite"><PublicHeader /><RightNowStrip/>{children}<PublicFooter /></div>;
}
