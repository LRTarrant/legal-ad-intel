import Link from "next/link";
import {
  Thermometer,
  AlertTriangle,
  ArrowRight,
  Bell,
  FileSearch,
  LineChart,
} from "lucide-react";

export const dynamic = "force-dynamic";

export function generateMetadata() {
  return {
    title: "Recall Watchlist | Legal Marketing Intelligence",
    description:
      "Pre-MDL early-warning board tracking FDA device recalls, CourtListener filings, and Five-Stage Thermometer heat scoring for plaintiff firms.",
  };
}

export default function RecallWatchlistComingSoonPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white dark:from-slate-950 dark:to-slate-900">
      <div className="mx-auto max-w-5xl px-6 py-16">
        {/* Header */}
        <div className="mb-10 flex items-start gap-4">
          <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400">
            <Thermometer className="h-6 w-6" />
          </div>
          <div>
            <div className="mb-1 inline-flex items-center gap-2 rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-800 dark:bg-amber-950 dark:text-amber-300">
              <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
              Coming soon · Ships in ~2 days
            </div>
            <h1 className="text-3xl font-semibold tracking-tight text-slate-900 dark:text-slate-50">
              Recall Watchlist
            </h1>
            <p className="mt-2 max-w-2xl text-base text-slate-600 dark:text-slate-400">
              A pre-MDL early-warning board that turns FDA device recalls into
              qualified tort leads — before the mass-tort community catches on.
            </p>
          </div>
        </div>

        {/* Status card */}
        <div className="mb-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="mb-4 flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-300">
            <LineChart className="h-4 w-4 text-emerald-600" />
            Build status
          </div>
          <div className="space-y-3">
            <StatusRow
              done
              label="Day 1 — Data plumbing"
              detail="3,929 FDA Class I/II device recalls loaded (5-year window, 874 manufacturers). Supabase schema + ingestion pipeline live."
            />
            <StatusRow
              label="Day 2 — Scoring engine"
              detail="CourtListener party-search hook, weekly cron, and Five-Stage Thermometer (Cold → Boiling) scoring logic."
            />
            <StatusRow
              label="Day 3 — This page"
              detail="Heat-map board, manufacturer-level drilldowns, and sort-by-heat filtering land here."
            />
            <StatusRow
              label="Day 4 — Reporting"
              detail="Timeline drilldown, white-label PDF export, and ad-spend profile badges."
            />
            <StatusRow
              label="Day 5 — Alerts"
              detail="Resend email alerts, Google Chat webhooks, and a Monday-morning weekly digest."
            />
          </div>
        </div>

        {/* What's coming */}
        <div className="mb-8 grid gap-4 md:grid-cols-3">
          <FeatureCard
            icon={<FileSearch className="h-5 w-5" />}
            title="Recall Board"
            text="Every Class I/II device recall in one sortable table, with manufacturer, device family, and linked tort."
          />
          <FeatureCard
            icon={<Thermometer className="h-5 w-5" />}
            title="Five-Stage Thermometer"
            text="Cold · Warming · Warm · Hot · Boiling — scored from case count, state spread, specialty-firm activity, and MDL signals."
          />
          <FeatureCard
            icon={<Bell className="h-5 w-5" />}
            title="Early-Warning Alerts"
            text="Get notified the moment a recall jumps a heat tier or a specialty plaintiff firm files its first complaint."
          />
        </div>

        {/* CTA row */}
        <div className="flex flex-wrap gap-3">
          <Link
            href="/advertising/torts/olympus-scopes"
            className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-slate-800 dark:bg-slate-50 dark:text-slate-900 dark:hover:bg-white"
          >
            Preview Olympus Scopes (Pre-MDL)
            <ArrowRight className="h-4 w-4" />
          </Link>
          <Link
            href="/advertising"
            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            Back to Advertising
          </Link>
        </div>

        {/* Disclaimer */}
        <div className="mt-10 flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
          <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0" />
          <div>
            <strong className="font-semibold">Preview build.</strong> Data is
            being ingested and scored. Thermometer scores, spend-profile badges,
            and docket overlays appear once Days 2–4 ship. Questions? Ping the
            team.
          </div>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                             */
/* ------------------------------------------------------------------ */

function StatusRow({
  done,
  label,
  detail,
}: {
  done?: boolean;
  label: string;
  detail: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <div
        className={`mt-1 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full text-[10px] font-bold ${
          done
            ? "bg-emerald-600 text-white"
            : "border-2 border-slate-300 text-slate-400 dark:border-slate-600"
        }`}
      >
        {done ? "✓" : ""}
      </div>
      <div className="flex-1">
        <div
          className={`text-sm font-medium ${
            done
              ? "text-slate-900 dark:text-slate-100"
              : "text-slate-700 dark:text-slate-300"
          }`}
        >
          {label}
        </div>
        <div className="text-sm text-slate-500 dark:text-slate-400">
          {detail}
        </div>
      </div>
    </div>
  );
}

function FeatureCard({
  icon,
  title,
  text,
}: {
  icon: React.ReactNode;
  title: string;
  text: string;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
      <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
        {icon}
      </div>
      <div className="mb-1 text-sm font-semibold text-slate-900 dark:text-slate-100">
        {title}
      </div>
      <div className="text-sm text-slate-500 dark:text-slate-400">{text}</div>
    </div>
  );
}
