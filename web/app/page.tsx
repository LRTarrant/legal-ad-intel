export default function Home() {
  return (
    <main className="flex flex-1 items-center justify-center px-6 py-16">
      <section className="w-full max-w-5xl rounded-[2rem] border border-border bg-surface shadow-[0_24px_80px_rgba(31,41,55,0.08)]">
        <div className="grid gap-10 px-8 py-10 lg:grid-cols-[1.2fr_0.8fr] lg:px-12 lg:py-14">
          <div className="space-y-6">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-accent">
              Legal Ad Intelligence
            </p>
            <h1 className="max-w-3xl text-4xl leading-tight font-semibold text-foreground md:text-5xl">
              Track plaintiff advertising, market pressure, and litigation
              signals from one fact model.
            </h1>
            <p className="max-w-2xl text-lg leading-8 text-muted">
              The current platform centers on <code>ad_events</code> as the core
              fact table, with firms, markets, torts, MDLs, dockets, and
              enrichment data layered around it for analysis.
            </p>
            <div className="flex flex-col gap-4 sm:flex-row">
              <a
                className="inline-flex items-center justify-center rounded-full bg-accent px-6 py-3 text-sm font-semibold text-white transition hover:opacity-90"
                href="/dashboard"
              >
                Open dashboard
              </a>
              <a
                className="inline-flex items-center justify-center rounded-full border border-border px-6 py-3 text-sm font-semibold text-foreground transition hover:bg-accent-soft"
                href="https://supabase.com/docs"
                target="_blank"
                rel="noreferrer"
              >
                Supabase docs
              </a>
            </div>
          </div>
          <div className="grid gap-4 rounded-[1.5rem] bg-[linear-gradient(180deg,#f0e8dc_0%,#fbf8f2_100%)] p-6">
            <div className="rounded-2xl border border-border bg-surface p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">
                Core entities
              </p>
              <p className="mt-3 text-sm leading-7 text-foreground">
                <code>firms</code>, <code>markets</code>, <code>mass_torts</code>
                , <code>mdls</code>, <code>dockets</code>, and enrichment tables
                stay normalized around advertising activity.
              </p>
            </div>
            <div className="rounded-2xl border border-border bg-surface p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">
                Current focus
              </p>
              <p className="mt-3 text-sm leading-7 text-foreground">
                Stabilize the frontend shell, keep Supabase migrations intact,
                and make ETL plus product development easier to reason about.
              </p>
            </div>
            <div className="rounded-2xl border border-border bg-surface p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">
                What changed
              </p>
              <p className="mt-3 text-sm leading-7 text-foreground">
                The app now uses one active App Router tree, one frontend
                package boundary, and a font setup that does not depend on
                network access during builds.
              </p>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
