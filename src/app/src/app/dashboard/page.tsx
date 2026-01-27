// src/app/dashboard/page.tsx
import Link from "next/link";

export default function DashboardPage() {
  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <div className="mx-auto max-w-4xl px-4 py-10">
        <header className="mb-8">
          <p className="text-xs uppercase tracking-widest text-white/60">Dashboard</p>
          <h1 className="mt-1 text-2xl font-semibold">Plan an event</h1>
          <p className="mt-2 text-sm text-white/70">
            (MVP) This will become the event creator + invitation sender + RSVP tracker.
          </p>
        </header>

        <section className="rounded-2xl border border-white/10 bg-white/5 p-6">
          <h2 className="text-sm font-semibold text-white/90">Next up</h2>
          <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-white/70">
            <li>Event form (name, date/time, location)</li>
            <li>Event Weather Intelligence panel (forecast + historical trend)</li>
            <li>Invite list paste + send (email/SMS later)</li>
          </ul>

          <div className="mt-5 flex flex-wrap gap-2">
            <Link
              href="/"
              className="inline-flex items-center justify-center rounded-xl border border-white/15 px-4 py-2 text-sm font-semibold text-white hover:bg-white/5"
            >
              Back home
            </Link>
            <Link
              href="/events/demo"
              className="inline-flex items-center justify-center rounded-xl bg-white px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-white/90"
            >
              Preview an event page
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}
