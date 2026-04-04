import { createSupabaseServerClient } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const supabase = createSupabaseServerClient();

  const { data: adEvents, error } = await supabase
    .from("ad_events")
    .select(
      "id, event_date, advertiser_name_raw, channel, platform, dma_code, spend_estimate, impressions_estimate",
    )
    .order("event_date", { ascending: false })
    .limit(50);

  if (error) {
    return (
      <main className="mx-auto flex w-full max-w-5xl flex-1 px-6 py-10">
        <div className="w-full rounded-3xl border border-red-200 bg-red-50 p-6 text-red-800">
          <h1 className="text-xl font-semibold">Dashboard unavailable</h1>
          <p className="mt-2 text-sm leading-6">
            Supabase returned an error while loading <code>ad_events</code>:{" "}
            {error.message}
          </p>
        </div>
      </main>
    );
  }

  const spendByChannel: Record<string, number> = {};

  for (const row of adEvents ?? []) {
    const channel = row.channel || "unknown";
    spendByChannel[channel] =
      (spendByChannel[channel] || 0) + Number(row.spend_estimate || 0);
  }

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-8 px-6 py-10">
      <section className="rounded-[2rem] border border-border bg-surface p-8 shadow-[0_24px_80px_rgba(31,41,55,0.06)]">
        <p className="text-sm font-semibold uppercase tracking-[0.16em] text-accent">
          Dashboard
        </p>
        <h1 className="mt-3 text-3xl font-semibold text-foreground">
          Recent legal advertising activity
        </h1>
        <p className="mt-3 max-w-3xl text-sm leading-7 text-muted">
          This starter dashboard keeps the existing architecture intact and
          reads directly from <code>ad_events</code>, the project&apos;s core
          fact table.
        </p>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        {Object.entries(spendByChannel).map(([channel, spend]) => (
          <article
            key={channel}
            className="rounded-3xl border border-border bg-surface p-5"
          >
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">
              {channel}
            </p>
            <p className="mt-3 text-3xl font-semibold text-foreground">
              ${spend.toLocaleString()}
            </p>
          </article>
        ))}
      </section>

      <section className="overflow-hidden rounded-[2rem] border border-border bg-surface">
        <div className="border-b border-border px-6 py-4">
          <h2 className="text-lg font-semibold text-foreground">
            Recent ad events
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-[rgba(234,223,208,0.55)] text-muted">
              <tr>
                <th className="px-4 py-3 font-semibold">Date</th>
                <th className="px-4 py-3 font-semibold">Advertiser</th>
                <th className="px-4 py-3 font-semibold">Channel</th>
                <th className="px-4 py-3 font-semibold">Platform</th>
                <th className="px-4 py-3 font-semibold">DMA</th>
                <th className="px-4 py-3 text-right font-semibold">Spend</th>
                <th className="px-4 py-3 text-right font-semibold">
                  Impressions
                </th>
              </tr>
            </thead>
            <tbody>
              {(adEvents ?? []).map((row) => (
                <tr key={row.id} className="border-t border-border">
                  <td className="px-4 py-3">{row.event_date}</td>
                  <td className="px-4 py-3">{row.advertiser_name_raw || "—"}</td>
                  <td className="px-4 py-3">{row.channel || "—"}</td>
                  <td className="px-4 py-3">{row.platform || "—"}</td>
                  <td className="px-4 py-3">{row.dma_code || "—"}</td>
                  <td className="px-4 py-3 text-right">
                    ${Number(row.spend_estimate || 0).toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {Number(row.impressions_estimate || 0).toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!adEvents?.length ? (
            <div className="px-6 py-8 text-sm text-muted">
              No ad events are available yet. Once ETLs begin loading source
              data, this table will populate.
            </div>
          ) : null}
        </div>
      </section>
    </main>
  );
}
