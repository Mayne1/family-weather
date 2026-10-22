import Link from "next/link";
import type { ReactNode } from "react";

type LegalPageProps = {
  eyebrow: string;
  title: string;
  summary: string;
  children: ReactNode;
  effectiveDate?: string;
};

export default function LegalPage({ eyebrow, title, summary, children, effectiveDate = "August 30, 2026" }: LegalPageProps) {
  return (
    <main className="legalPage">
      <header className="legalHeader">
        <Link className="brand" href="/" aria-label="Family Weather home">
          <span className="brandMark"><i /><i /><i /></span>
          <span><strong>Family Weather</strong><small>Plans change. Families stay connected.</small></span>
        </Link>
        <Link className="legalHome" href="/">Back to Family Weather</Link>
      </header>
      <article className="legalDocument">
        <p className="eyebrow dark"><span /> {eyebrow}</p>
        <h1>{title}</h1>
        <p className="legalSummary">{summary}</p>
        <p className="legalEffective"><strong>Effective:</strong> {effectiveDate}</p>
        <div className="legalContent">{children}</div>
      </article>
      <footer className="legalFooter">
        <strong>Family Weather</strong>
        <nav aria-label="Legal pages">
          <Link href="/privacy">Privacy</Link>
          <Link href="/terms">Terms</Link>
        </nav>
        <a href="mailto:contact@thefamilyweather.com">contact@thefamilyweather.com</a>
      </footer>
    </main>
  );
}
