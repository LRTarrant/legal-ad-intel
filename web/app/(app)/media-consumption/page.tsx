import { getSupabase } from "@/lib/supabase";

// Minimal scaffold (Pass 1): just reads the national media_consumption_baseline
// and dumps the rows so there is a working route + nav target. The designed
// surface (by-race / by-age tables + Pew/Nielsen attribution block) is built in
// Pass 2 via the Impeccable flow. Do NOT style this here.

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Media Consumption | Legal Marketing Intelligence",
};

type BaselineRow = {
  demographic_type: string;
  demographic_group: string;
  channel: string;
  metric: string;
  scope: string;
  value: number;
  unit: string | null;
  source: string | null;
  source_url: string | null;
  source_year: number | null;
  notes: string | null;
};

export default async function MediaConsumptionPage() {
  // media_consumption_baseline lands in database.types.ts only after the
  // migration applies; until then use an untyped handle (the repo's pattern for
  // not-yet-typed tables/RPCs).
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = getSupabase() as any;
  const { data, error } = await supabase
    .from("media_consumption_baseline")
    .select(
      "demographic_type, demographic_group, channel, metric, scope, value, unit, source, source_url, source_year, notes",
    )
    .eq("geography_level", "national")
    .order("demographic_type", { ascending: true })
    .order("channel", { ascending: true });

  const rows = (data as BaselineRow[] | null) ?? [];

  return (
    <div style={{ padding: 24 }}>
      <h1>Media Consumption (baseline)</h1>
      <p>
        National consumption patterns by demographic, applied to a market&apos;s
        population mix. Pass 1 scaffold — design lands in Pass 2.
      </p>
      {error ? (
        <p style={{ color: "crimson" }}>Failed to load baseline: {String(error.message ?? error)}</p>
      ) : (
        <p>{rows.length} baseline rows.</p>
      )}
      <table style={{ borderCollapse: "collapse", fontSize: 12 }}>
        <thead>
          <tr>
            {["demo type", "group", "channel", "metric", "scope", "value", "unit", "source", "year"].map(
              (h) => (
                <th key={h} style={{ border: "1px solid #ccc", padding: "2px 6px", textAlign: "left" }}>
                  {h}
                </th>
              ),
            )}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i}>
              <td style={{ border: "1px solid #eee", padding: "2px 6px" }}>{r.demographic_type}</td>
              <td style={{ border: "1px solid #eee", padding: "2px 6px" }}>{r.demographic_group}</td>
              <td style={{ border: "1px solid #eee", padding: "2px 6px" }}>{r.channel}</td>
              <td style={{ border: "1px solid #eee", padding: "2px 6px" }}>{r.metric}</td>
              <td style={{ border: "1px solid #eee", padding: "2px 6px" }}>{r.scope}</td>
              <td style={{ border: "1px solid #eee", padding: "2px 6px", textAlign: "right" }}>{r.value}</td>
              <td style={{ border: "1px solid #eee", padding: "2px 6px" }}>{r.unit}</td>
              <td style={{ border: "1px solid #eee", padding: "2px 6px" }}>{r.source}</td>
              <td style={{ border: "1px solid #eee", padding: "2px 6px" }}>{r.source_year}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p style={{ marginTop: 16, fontSize: 11, color: "#666", maxWidth: 720 }}>
        Source: Pew Research Center (2024–2025); BLS American Time Use Survey. Pew
        Research Center bears no responsibility for the analyses or interpretations
        of the data presented here. Nielsen-sourced figures are cited as fact, not
        reproduced from Nielsen tables.
      </p>
    </div>
  );
}
