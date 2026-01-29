// src/app/page.tsx
import Link from "next/link";
import { getHomeWeatherBundle } from "@/lib/apiBox";

function Card({
  title,
  children,
  action,
}: {
  title: string;
  children: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-white/10 bg-white/5 p-4 shadow-sm backdrop-blur">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="text-sm font-semibold tracking-wide text-white/90">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}

function Badge({ tone, children }: { tone: "info" | "watch" | "warning"; children: React.ReactNode }) {
  const cls =
    tone === "warning"
      ? "bg-red-500/15 text-red-200 ring-red-500/20"
      : tone === "watch"
      ? "bg-amber-500/15 text-amber-200 ring-amber-500/20"
      : "bg-sky-500/15 text-sky-200 ring-sky-500/20";

  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs ring-1 ${cls}`}>
      {children}
    </span>
  );
}

export default async function HomePage() {
  // MVP: server-side fetch (fast, SEO-friendly)
  const bundle = await getHomeWeatherBundle({ locationName: "Northern California" });

  const fab5 = [
    "Sacramento, CA",
    "San Francisco, CA",
    "Oakland, CA",
    "Reno, NV",
    "Los Angeles, CA",
  ];

  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-950 to-slate-900 text-white">
      <div className="mx-auto max-w-6xl px-4 py-8">
        {/* Header */}
        <header className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs uppercase tracking-widest text-white/60">Family Weather</p>
            <h1 className="text-2xl font-semibold leading-tight sm:text-3xl">
              Weather that helps you plan real life.
            </h1>
            <p className="mt-1 max-w-2xl text-sm text-white/70">
              Glance, plan, invite. The forecast plus historical context, built for families and groups.
            </p>
          </div>

          <div className="flex gap-2">
            <Link
              href="/dashboard"
              className="inline-flex items-center justify-center rounded-xl bg-white px-4 py-2 text-sm font-semibold text-slate-950 shadow-sm hover:bg-white/90"
            >
              Plan an event
            </Link>
            <Link
              href="/login"
              className="inline-flex items-center justify-center rounded-xl border border-white/15 px-4 py-2 text-sm font-semibold text-white hover:bg-white/5"
            >
              Sign in
            </Link>
          </div>
        </header>

        {/* Top grid */}
        <div className="grid gap-4 lg:grid-cols-3">
          <Card
            title="Right now"
            action={<span className="text-xs text-white/60">Updated {new Date(bundle.now.updatedAtISO).toLocaleTimeString()}</span>}
          >
            <div className="flex items-end justify-between gap-4">
              <div>
                <p className="text-sm text-white/70">{bundle.now.locationName}</p>
                <div className="mt-2 flex items-end gap-3">
                  <div className="text-5xl font-semibold">{bundle.now.tempF}°</div>
                  <div className="pb-1 text-sm text-white/70">{bundle.now.condition}</div>
                </div>
                <p className="mt-2 text-sm text-white/70">
                  Feels like <span className="text-white/90">{bundle.now.feelsLikeF}°</span> · Wind{" "}
                  <span className="text-white/90">{bundle.now.windMph} mph</span> · Humidity{" "}
                  <span className="text-white/90">{bundle.now.humidityPct}%</span>
                </p>
              </div>

              <div className="hidden sm:block rounded-2xl bg-white/5 p-3 text-xs text-white/70">
                <p className="font-semibold text-white/90">Pro tip</p>
                <p className="mt-1">Events are where the magic is. Plan once, share with everyone.</p>
              </div>
            </div>
          </Card>

          <Card title="10-day forecast" action={<span className="text-xs text-white/60">Tap later: details</span>}>
            <div className="space-y-2">
              {bundle.tenDay.slice(0, 5).map((d) => (
                <div
                  key={d.dateISO}
                  className="flex items-center justify-between rounded-xl bg-white/5 px-3 py-2"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-white/90">{new Date(d.dateISO).toLocaleDateString()}</p>
                    <p className="text-xs text-white/60">{d.condition}</p>
                  </div>
                  <div className="flex items-center gap-3 text-sm">
                    <span className="text-white/70">{d.lowF}°</span>
                    <span className="font-semibold text-white/90">{d.highF}°</span>
                    <span className="text-xs text-white/60">{d.precipChancePct}%</span>
                  </div>
                </div>
              ))}
              <p className="text-xs text-white/50">
                (MVP) Full 10-day view comes next. We’re building the planning flow first.
              </p>
            </div>
          </Card>

          <Card title="Alerts">
            {bundle.alerts.length === 0 ? (
              <div className="rounded-xl bg-white/5 p-3 text-sm text-white/70">No alerts right now.</div>
            ) : (
              <div className="space-y-2">
                {bundle.alerts.map((a) => (
                  <div key={a.id} className="rounded-xl bg-white/5 p-3">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm font-semibold text-white/90">{a.title}</p>
                      <Badge tone={a.severity}>{a.severity.toUpperCase()}</Badge>
                    </div>
                    <p className="mt-1 text-xs text-white/60">{a.area}</p>
                  </div>
                ))}
                <p className="text-xs text-white/50">
                  (MVP) Later: region-aware alerts, personalization, push/email.
                </p>
              </div>
            )}
          </Card>
        </div>

        {/* Fab 5 */}
        <div className="mt-4">
          <Card title="Fab 5 cities" action={<span className="text-xs text-white/60">Pinned quick looks</span>}>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
              {fab5.map((city) => (
                <div key={city} className="rounded-xl bg-white/5 p-3">
                  <p className="truncate text-sm font-semibold text-white/90">{city}</p>
                  <p className="mt-1 text-xs text-white/60">(MVP) Weather tile</p>
                </div>
              ))}
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <Link
                href="/dashboard"
                className="inline-flex items-center justify-center rounded-xl bg-white px-3 py-2 text-sm font-semibold text-slate-950 hover:bg-white/90"
              >
                Create an event
              </Link>
              <span className="inline-flex items-center rounded-xl border border-white/15 px-3 py-2 text-sm text-white/70">
                Next: save your own Fab 5
              </span>
            </div>
          </Card>
        </div>

        <footer className="mt-8 text-xs text-white/45">
          © {new Date().getFullYear()} Family Weather · Built for planning, not doomscrolling.
        </footer>
      </div>
    </main>
  );
}
