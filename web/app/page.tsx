import Link from "next/link";
import Image from "next/image";
import { createClient } from "@/lib/supabase/server";
import { getLatestDevelopments } from "@/lib/queries/mdl-developments";
import { Scale, Megaphone, Tv, Landmark } from "lucide-react";
import { MobileNav } from "./home-nav";

export const metadata = {
  title: "Legal Marketing Intelligence — Competitive Ad Intel for Plaintiff Firms",
  description:
    "Market-wide advertising intelligence for plaintiff law firms. Track competitor activity, find high-opportunity markets, and make smarter case-acquisition decisions.",
};

const EVENT_TYPE_COLORS: Record<
  string,
  { bg: string; text: string; dot: string; label: string }
> = {
  ruling: { bg: "#EFF6FF", text: "#2563EB", dot: "#2563EB", label: "Ruling" },
  verdict: { bg: "#F0FDF4", text: "#16A34A", dot: "#16A34A", label: "Verdict" },
  settlement: { bg: "#FFFBEB", text: "#D97706", dot: "#D97706", label: "Settlement" },
  "bellwether trial": { bg: "#FAF5FF", text: "#7C3AED", dot: "#7C3AED", label: "Bellwether Trial" },
  filing: { bg: "#F9FAFB", text: "#6B7280", dot: "#6B7280", label: "Filing" },
  regulatory: { bg: "#FFF1F2", text: "#E11D48", dot: "#E11D48", label: "Regulatory" },
};

const DEFAULT_EVENT_COLOR = { bg: "#F1F5F9", text: "#6B7280", dot: "#6B7280", label: "Event" };

function getEventColor(eventType: string) {
  return EVENT_TYPE_COLORS[eventType] ?? DEFAULT_EVENT_COLOR;
}

const COMPARISON_ROWS = [
  { feature: "Legal firm taxonomy", lmi: true, mediaradar: false, semrush: false, ispot: false },
  { feature: "Mass tort / MDL integration", lmi: true, mediaradar: false, semrush: false, ispot: false },
  { feature: "On-docket vs. off-docket", lmi: true, mediaradar: false, semrush: false, ispot: false },
  { feature: "TV / CTV ad tracking", lmi: true, mediaradar: true, semrush: false, ispot: true },
  { feature: "Social ad intelligence", lmi: true, mediaradar: "Partial", semrush: false, ispot: false },
  { feature: "Search / PPC intelligence", lmi: true, mediaradar: false, semrush: true, ispot: false },
  { feature: "Fatality & incident signals", lmi: true, mediaradar: false, semrush: false, ispot: false },
  { feature: "Cancer / disease overlay", lmi: true, mediaradar: false, semrush: false, ispot: false },
  { feature: "State-level market intel", lmi: true, mediaradar: false, semrush: false, ispot: false },
  { feature: "Channel planning tool", lmi: true, mediaradar: false, semrush: false, ispot: false },
  { feature: "Built for plaintiff firms", lmi: true, mediaradar: false, semrush: false, ispot: false },
] as const;

export default async function HomePage() {
  let isLoggedIn = false;
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    isLoggedIn = !!user;
  } catch {
    // not logged in
  }

  const developments = await getLatestDevelopments(4);

  return (
    <div className="min-h-screen">
      {/* ── 1. Sticky Navigation ───────────────────────── */}
      <header className="sticky top-0 z-50 border-b border-white/10 bg-midnight-navy">
        <div className="relative mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Image
            src="/logo-horizontal-white.svg"
            alt="Legal Marketing Intelligence"
            width={180}
            height={40}
            priority
            className="h-9 w-auto"
          />

          <nav className="hidden items-center gap-8 lg:flex">
            <a
              href="#product"
              className="text-sm font-medium text-white/70 transition hover:text-white"
            >
              Product
            </a>
            <Link
              href="/pricing"
              className="text-sm font-medium text-white/70 transition hover:text-white"
            >
              Pricing
            </Link>
            <Link
              href="/login"
              className="text-sm font-medium text-white/70 transition hover:text-white"
            >
              Log In
            </Link>
            <a
              href="mailto:admin@legalmarketingintelligence.com"
              className="rounded-full bg-intelligence-teal px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-intelligence-teal/90"
            >
              Schedule a Demo
            </a>
          </nav>

          <MobileNav />
        </div>
      </header>

      {/* ── 2. Hero Section ────────────────────────────── */}
      <section className="relative overflow-hidden bg-gradient-to-br from-midnight-navy via-[#0F2035] to-[#0A2A3C]">
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage:
              "radial-gradient(circle, rgba(255,255,255,0.8) 1px, transparent 1px)",
            backgroundSize: "24px 24px",
          }}
        />
        <div className="relative mx-auto grid max-w-6xl gap-12 px-6 py-24 lg:grid-cols-[55%_45%] lg:items-center lg:py-32">
          {/* Text column */}
          <div>
            <p className="mb-6 text-xs font-semibold uppercase tracking-[0.2em] text-intelligence-teal">
              THE INTELLIGENCE PLATFORM FOR LEGAL ADVERTISING
            </p>
            <h1 className="font-heading text-4xl font-bold leading-tight text-white sm:text-5xl lg:text-[56px]">
              Know where plaintiff firms are competing. See what they&apos;re
              missing.
            </h1>
            <p className="mt-6 max-w-lg text-lg text-white/70">
              Legal Marketing Intelligence connects advertising activity to
              litigation momentum, demand signals, and real-world market data —
              so you can make smarter case-acquisition decisions before the
              market gets more expensive.
            </p>
            <div className="mt-10 flex flex-wrap gap-4">
              <a
                href="mailto:admin@legalmarketingintelligence.com"
                className="rounded-full bg-intelligence-teal px-8 py-3.5 text-base font-semibold text-white transition hover:bg-intelligence-teal/90"
              >
                Schedule a Demo
              </a>
              <Link
                href="/login"
                className="rounded-full border-2 border-white/20 px-8 py-3.5 text-base font-semibold text-white/80 transition hover:border-white/40"
              >
                Log In
              </Link>
            </div>
          </div>

          {/* Floating product preview cards */}
          {/* Desktop: absolute positioned, overlapping, rotated */}
          <div className="relative hidden min-h-[400px] lg:block">
            {/* Card 1 — Tort Saturation */}
            <div className="absolute left-0 top-0 z-10 w-72 -rotate-2 rounded-xl bg-white p-5 shadow-xl">
              <p className="text-sm font-bold text-midnight-navy">DEPO-PROVERA</p>
              <p className="mt-1 flex items-center gap-1.5 text-xs text-slate-500">
                <span className="inline-block h-2 w-2 rounded-full bg-intelligence-teal" />
                Active MDL · 18,000+ cases
              </p>
              <div className="mt-3 h-0.5 w-full rounded bg-slate-100">
                <div className="h-0.5 w-[70%] rounded bg-alert" />
              </div>
              <p className="mt-2 text-xs font-semibold text-alert">
                SEVERE in 3 markets
              </p>
            </div>

            {/* Card 2 — PI Competitor Bars */}
            <div className="absolute right-0 top-[120px] z-20 w-72 rotate-1 rounded-xl bg-white p-5 shadow-xl">
              <p className="text-sm font-bold text-midnight-navy">
                ALABAMA · PI ADVERTISING
              </p>
              <p className="mt-1 text-xs text-slate-500">Top Competitor</p>
              <div className="mt-3 space-y-2">
                <CompetitorBar name="Arnold & Itkin" score={75.0} maxScore={75} />
                <CompetitorBar name="Morris Bart" score={62.0} maxScore={75} />
                <CompetitorBar name="Alexander Shunnarah" score={48.0} maxScore={75} />
              </div>
              <p className="mt-3 text-xs text-slate-400">
                6 firms · 22 observations
              </p>
            </div>

            {/* Card 3 — Latest Development */}
            <div className="absolute bottom-0 left-[40px] z-30 w-72 -rotate-1 rounded-xl bg-white p-5 shadow-xl">
              <p className="text-xs uppercase tracking-wider text-slate-400">
                LATEST DEVELOPMENT
              </p>
              <div className="mt-2 flex items-center gap-2">
                <span className="inline-block h-2 w-2 rounded-full bg-success" />
                <span className="rounded-full bg-green-50 px-2 py-0.5 text-xs text-green-700">
                  Verdict
                </span>
              </div>
              <p className="mt-2 text-sm font-semibold text-midnight-navy">
                $375M NM Jury Verdict vs Meta
              </p>
              <span className="mt-2 inline-block rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600">
                Social Media Addiction
              </span>
              <p className="mt-2 text-xs text-intelligence-teal">
                AboutLawsuits ↗
              </p>
            </div>
          </div>

          {/* Mobile: stacked cards */}
          <div className="flex flex-col gap-4 lg:hidden">
            {/* Card 1 — Tort Saturation */}
            <div className="rounded-xl bg-white p-5 shadow-xl">
              <p className="text-sm font-bold text-midnight-navy">DEPO-PROVERA</p>
              <p className="mt-1 flex items-center gap-1.5 text-xs text-slate-500">
                <span className="inline-block h-2 w-2 rounded-full bg-intelligence-teal" />
                Active MDL · 18,000+ cases
              </p>
              <div className="mt-3 h-0.5 w-full rounded bg-slate-100">
                <div className="h-0.5 w-[70%] rounded bg-alert" />
              </div>
              <p className="mt-2 text-xs font-semibold text-alert">
                SEVERE in 3 markets
              </p>
            </div>

            {/* Card 2 — PI Competitor Bars */}
            <div className="rounded-xl bg-white p-5 shadow-xl">
              <p className="text-sm font-bold text-midnight-navy">
                ALABAMA · PI ADVERTISING
              </p>
              <p className="mt-1 text-xs text-slate-500">Top Competitor</p>
              <div className="mt-3 space-y-2">
                <CompetitorBar name="Arnold & Itkin" score={75.0} maxScore={75} />
                <CompetitorBar name="Morris Bart" score={62.0} maxScore={75} />
                <CompetitorBar name="Alexander Shunnarah" score={48.0} maxScore={75} />
              </div>
              <p className="mt-3 text-xs text-slate-400">
                6 firms · 22 observations
              </p>
            </div>

            {/* Card 3 — Latest Development */}
            <div className="rounded-xl bg-white p-5 shadow-xl">
              <p className="text-xs uppercase tracking-wider text-slate-400">
                LATEST DEVELOPMENT
              </p>
              <div className="mt-2 flex items-center gap-2">
                <span className="inline-block h-2 w-2 rounded-full bg-success" />
                <span className="rounded-full bg-green-50 px-2 py-0.5 text-xs text-green-700">
                  Verdict
                </span>
              </div>
              <p className="mt-2 text-sm font-semibold text-midnight-navy">
                $375M NM Jury Verdict vs Meta
              </p>
              <span className="mt-2 inline-block rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600">
                Social Media Addiction
              </span>
              <p className="mt-2 text-xs text-intelligence-teal">
                AboutLawsuits ↗
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── 3. Stats Strip ─────────────────────────────── */}
      <section className="bg-intelligence-teal">
        <div className="mx-auto grid max-w-6xl grid-cols-2 gap-8 px-6 py-12 text-center sm:grid-cols-4">
          <StatItem value="14" label="Active MDLs Tracked" />
          <StatItem value="41" label="Live Litigation Developments" />
          <StatItem value="30+" label="Competitor Firms Monitored" />
          <StatItem value="3" label="State Markets with Deep Intel" />
        </div>
      </section>

      {/* ── 4. Who It's For ────────────────────────────── */}
      <section className="bg-white py-20">
        <div className="mx-auto max-w-6xl px-6">
          <p className="text-center text-xs font-semibold uppercase tracking-[0.2em] text-intelligence-teal">
            BUILT FOR LEGAL ADVERTISING DECISION-MAKERS
          </p>
          <h2 className="mt-3 text-center text-3xl font-bold text-midnight-navy">
            Four audiences. One platform.
          </h2>
          <div className="mt-12 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            <AudienceCard
              icon={<Scale className="h-6 w-6 text-intelligence-teal" />}
              title="Plaintiff Firms"
              description="See where competitors are spending, which torts are accelerating, and which markets have demand without the crowding."
            />
            <AudienceCard
              icon={<Megaphone className="h-6 w-6 text-intelligence-teal" />}
              title="Legal Marketing Agencies"
              description="Build sharper media plans with real competitor data, market-level context, and channel intelligence your clients will understand."
            />
            <AudienceCard
              icon={<Tv className="h-6 w-6 text-intelligence-teal" />}
              title="Legal-Focused Media Companies"
              description="Identify where legal ad demand is growing and where your inventory solves a real buyer problem."
            />
            <AudienceCard
              icon={<Landmark className="h-6 w-6 text-intelligence-teal" />}
              title="Litigation Funders"
              description="Evaluate tort momentum, competitive crowding, and the case-acquisition environment before capital is committed."
            />
          </div>
        </div>
      </section>

      {/* ── 5. What You Get / Product Features ─────────── */}
      <section id="product" className="bg-midnight-navy py-20">
        <div className="mx-auto max-w-6xl px-6">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-intelligence-teal">
            THE PLATFORM
          </p>
          <h2 className="mt-3 text-3xl font-bold text-white">
            Intelligence layers that no other platform offers.
          </h2>
          <p className="mt-4 max-w-2xl text-base text-white/60">
            Legal Marketing Intelligence combines advertising monitoring with
            litigation, demand, and risk signals — purpose-built for the legal
            vertical.
          </p>

          <div className="mt-16 space-y-16">
            {/* Row 1: State Intelligence */}
            <FeatureRow
              label="STATE INTELLIGENCE"
              title="Deep market research, state by state."
              description="Crash data, demographics, PI advertising competition, judicial profiles, and case-type recommendations — combined into a single state-level view. Know where to advertise and what cases to target before your competitors do."
              visual={
                <div className="space-y-3">
                  <MiniStat label="Alabama" detail="1,075 fatalities · 6 PI competitors · Low saturation" />
                  <MiniStat label="Florida" detail="3,521 fatalities · 12 PI competitors · High saturation" />
                  <MiniStat label="California" detail="4,407 fatalities · 9 PI competitors · Moderate saturation" />
                </div>
              }
            />

            {/* Row 2: Tort Intelligence (reversed) */}
            <FeatureRow
              label="MASS TORT PROFILES"
              title="Every tort, researched and monitored."
              description="Case summaries, MDL status, buying criteria, audience analysis, and real-time litigation developments from live RSS feeds. 11 active tort profiles with more added as you need them."
              reverse
              visual={
                <div className="space-y-3">
                  <TimelineItem color="#16A34A" label="Verdict" text="$375M NM Jury Verdict vs Meta" />
                  <TimelineItem color="#2563EB" label="Ruling" text="Judge consolidates Ozempic claims into MDL" />
                  <TimelineItem color="#D97706" label="Settlement" text="$1.2B Roundup settlement proposal filed" />
                </div>
              }
            />

            {/* Row 3: Competitor Tracking */}
            <FeatureRow
              label="COMPETITOR TRACKING"
              title="See who's spending where — and who's not."
              description="30+ law firms and aggregators tracked across TV, CTV, radio, search, social, and display. Classified as on-docket or off-docket, with spend estimates, market footprint, and channel mix."
              visual={
                <div className="space-y-2">
                  <MiniLeaderboardRow name="Arnold & Itkin" width="100%" />
                  <MiniLeaderboardRow name="Morris Bart" width="82%" />
                  <MiniLeaderboardRow name="Morgan & Morgan" width="68%" />
                </div>
              }
            />

            {/* Row 4: Channel Planner (reversed) */}
            <FeatureRow
              label="CHANNEL PLANNER"
              title="Data-driven media mix recommendations."
              description="Select a tort type and market, get scored channel recommendations based on audience fit, competition levels, and channel economics. Know whether to lead with search, support with CTV, or test podcast — backed by data."
              reverse
              visual={
                <div className="space-y-3">
                  <ChannelScore channel="Search" score="100%" tag="Core" />
                  <ChannelScore channel="Facebook" score="90%" tag="Competitive" />
                  <ChannelScore channel="YouTube" score="87%" tag="Opportunity" />
                </div>
              }
            />

            {/* Row 5: MDL Monitoring */}
            <FeatureRow
              label="LITIGATION MONITORING"
              title="Live docket intelligence, automatically updated."
              description="Track 14+ MDLs with pending action counts, judicial assignments, and developments ingested from legal news sources daily. Know when a bellwether trial date is set or a settlement is announced — the same day it happens."
              visual={
                <div>
                  <p className="text-sm font-semibold text-white">MDL 3047</p>
                  <p className="mt-1 text-xs text-white/60">
                    Social Media Addiction
                  </p>
                  <p className="mt-2 text-xs text-white/40">
                    5 developments · Latest:{" "}
                    <span className="text-intelligence-teal">
                      $375M Verdict
                    </span>
                  </p>
                </div>
              }
            />
          </div>
        </div>
      </section>

      {/* ── 6. Competitive Gap Table ───────────────────── */}
      <section className="bg-white py-20">
        <div className="mx-auto max-w-6xl px-6">
          <h2 className="text-center text-3xl font-bold text-midnight-navy">
            The only platform built for legal advertising intelligence.
          </h2>
          <p className="mt-3 text-center text-base text-slate-600">
            Other tools cover pieces. None cover the legal vertical end-to-end.
          </p>

          <div className="mt-12 overflow-x-auto">
            <table className="w-full min-w-[600px] overflow-hidden rounded-xl border border-slate-200 text-sm shadow-sm">
              <thead>
                <tr>
                  <th className="px-5 py-3 text-left font-semibold text-midnight-navy">
                    Feature
                  </th>
                  <th className="bg-intelligence-teal px-5 py-3 text-center font-bold text-white">
                    LMI
                  </th>
                  <th className="px-5 py-3 text-center font-semibold text-midnight-navy">
                    MediaRadar
                  </th>
                  <th className="px-5 py-3 text-center font-semibold text-midnight-navy">
                    SEMrush
                  </th>
                  <th className="px-5 py-3 text-center font-semibold text-midnight-navy">
                    iSpot
                  </th>
                </tr>
              </thead>
              <tbody>
                {COMPARISON_ROWS.map((row, i) => (
                  <tr
                    key={row.feature}
                    className={i % 2 === 0 ? "bg-cloud" : "bg-white"}
                  >
                    <td className="px-5 py-3 font-medium text-midnight-navy">
                      {row.feature}
                    </td>
                    <td className="px-5 py-3 text-center font-bold text-intelligence-teal">
                      ✓
                    </td>
                    <ComparisonCell value={row.mediaradar} />
                    <ComparisonCell value={row.semrush} />
                    <ComparisonCell value={row.ispot} />
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* ── 7. Latest Developments ─────────────────────── */}
      <section className="bg-cloud py-16">
        <div className="mx-auto max-w-4xl px-6">
          <h2 className="text-center text-2xl font-bold text-midnight-navy">
            The platform is live. Here&apos;s what&apos;s happening now.
          </h2>
          <p className="mt-2 text-center text-sm text-slate-600">
            Litigation developments are ingested automatically from legal news
            sources.
          </p>

          <div className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2">
            {developments.map((dev) => {
              const color = getEventColor(dev.event_type);
              return (
                <div
                  key={dev.id}
                  className="rounded-xl border border-slate-100 bg-white p-5 shadow-sm"
                >
                  <span
                    className="inline-block rounded-full px-2 py-0.5 text-xs font-medium"
                    style={{ backgroundColor: color.bg, color: color.text }}
                  >
                    {color.label}
                  </span>
                  <p className="mt-1 text-xs text-slate-400">
                    {new Date(dev.event_date).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </p>
                  <p className="mt-2 text-sm font-semibold text-midnight-navy">
                    {dev.title}
                  </p>
                  {dev.source_name && (
                    <p className="mt-1 text-xs text-intelligence-teal">
                      {dev.source_name}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── 8. CTA Section ─────────────────────────────── */}
      <section className="bg-midnight-navy py-20">
        <div className="mx-auto max-w-3xl px-6 text-center">
          <h2 className="text-3xl font-bold text-white">
            See the intelligence your competitors are missing.
          </h2>
          <p className="mt-4 text-base text-white/60">
            Schedule a walkthrough and we&apos;ll show you what the data looks
            like for your markets and torts.
          </p>
          <a
            href="mailto:admin@legalmarketingintelligence.com"
            className="mt-8 inline-block rounded-full bg-intelligence-teal px-10 py-4 text-lg font-semibold text-white transition hover:bg-intelligence-teal/90"
          >
            Schedule a Demo
          </a>
          <p className="mt-4 text-sm text-white/40">
            Or email us directly at{" "}
            <a
              href="mailto:admin@legalmarketingintelligence.com"
              className="underline underline-offset-2"
            >
              admin@legalmarketingintelligence.com
            </a>
          </p>
        </div>
      </section>

      {/* ── 9. Footer ──────────────────────────────────── */}
      <footer className="bg-[#0A1120]">
        <div className="mx-auto max-w-6xl px-6 py-12">
          <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
            {/* Brand */}
            <div>
              <Image
                src="/logo-horizontal-white.svg"
                alt="Legal Marketing Intelligence"
                width={160}
                height={36}
                className="h-8 w-auto"
              />
              <p className="mt-3 text-sm text-white/50">
                Competitive advertising intelligence for plaintiff law firms.
              </p>
            </div>

            {/* Product links */}
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-white/40">
                Product
              </p>
              <nav className="mt-4 flex flex-col gap-2">
                <FooterLink href="#product">State Intelligence</FooterLink>
                <FooterLink href="#product">Tort Profiles</FooterLink>
                <FooterLink href="#product">Competitor Tracking</FooterLink>
                <FooterLink href="#product">Channel Planner</FooterLink>
                <FooterLink href="#product">MDL Tracker</FooterLink>
              </nav>
            </div>

            {/* Company links */}
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-white/40">
                Company
              </p>
              <nav className="mt-4 flex flex-col gap-2">
                <FooterLink href="/pricing">Pricing</FooterLink>
                <FooterLink href="mailto:admin@legalmarketingintelligence.com">
                  Schedule a Demo
                </FooterLink>
                <FooterLink href="/login">Log In</FooterLink>
                <FooterLink href="mailto:admin@legalmarketingintelligence.com">
                  Contact
                </FooterLink>
              </nav>
            </div>
          </div>

          <div className="mt-8 flex flex-col items-center justify-between gap-4 border-t border-white/10 pt-8 sm:flex-row">
            <p className="text-xs text-white/30">
              © 2026 Legal Marketing Intelligence
            </p>
            <div className="flex items-center gap-4 text-xs text-white/30">
              <span>Privacy Policy</span>
              <span>|</span>
              <span>Terms of Service</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

/* ── Helper Components ─────────────────────────────── */

function StatItem({ value, label }: { value: string; label: string }) {
  return (
    <div>
      <p className="text-4xl font-bold text-white">{value}</p>
      <p className="mt-1 text-sm text-white/80">{label}</p>
    </div>
  );
}

function AudienceCard({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-100 bg-cloud p-8">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-intelligence-teal/10">
        {icon}
      </div>
      <h3 className="mt-5 text-lg font-bold text-midnight-navy">{title}</h3>
      <p className="mt-3 text-sm leading-relaxed text-slate-600">
        {description}
      </p>
    </div>
  );
}

function FeatureRow({
  label,
  title,
  description,
  visual,
  reverse,
}: {
  label: string;
  title: string;
  description: string;
  visual: React.ReactNode;
  reverse?: boolean;
}) {
  return (
    <div
      className={`flex flex-col items-center gap-12 lg:flex-row ${
        reverse ? "lg:flex-row-reverse" : ""
      }`}
    >
      <div className="lg:w-1/2">
        <p className="text-sm font-semibold uppercase tracking-wide text-intelligence-teal">
          {label}
        </p>
        <h3 className="mt-2 text-2xl font-bold text-white">{title}</h3>
        <p className="mt-4 leading-relaxed text-white/70">{description}</p>
      </div>
      <div className="w-full lg:w-1/2">
        <div className="rounded-xl border border-white/10 bg-white/5 p-6">
          {visual}
        </div>
      </div>
    </div>
  );
}

function MiniStat({ label, detail }: { label: string; detail: string }) {
  return (
    <div>
      <p className="text-sm font-semibold text-white">{label}</p>
      <p className="text-xs text-white/50">{detail}</p>
    </div>
  );
}

function TimelineItem({
  color,
  label,
  text,
}: {
  color: string;
  label: string;
  text: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <span
        className="mt-1.5 block h-2.5 w-2.5 flex-shrink-0 rounded-full"
        style={{ backgroundColor: color }}
      />
      <div>
        <p className="text-xs font-medium text-white/50">{label}</p>
        <p className="text-sm text-white">{text}</p>
      </div>
    </div>
  );
}

function MiniLeaderboardRow({
  name,
  width,
}: {
  name: string;
  width: string;
}) {
  return (
    <div className="flex items-center gap-3">
      <p className="w-36 flex-shrink-0 text-xs text-white/70">{name}</p>
      <div className="h-2 flex-1 rounded bg-white/10">
        <div
          className="h-2 rounded bg-intelligence-teal"
          style={{ width }}
        />
      </div>
    </div>
  );
}

function ChannelScore({
  channel,
  score,
  tag,
}: {
  channel: string;
  score: string;
  tag: string;
}) {
  return (
    <div className="flex items-center gap-3">
      <p className="w-20 flex-shrink-0 text-xs text-white/70">{channel}</p>
      <div className="h-2 flex-1 rounded bg-white/10">
        <div
          className="h-2 rounded bg-intelligence-teal"
          style={{ width: score }}
        />
      </div>
      <span className="text-xs text-white/40">{tag}</span>
    </div>
  );
}

function CompetitorBar({
  name,
  score,
  maxScore,
}: {
  name: string;
  score: number;
  maxScore: number;
}) {
  const pct = `${(score / maxScore) * 100}%`;
  return (
    <div className="flex items-center gap-2">
      <p className="w-36 flex-shrink-0 text-xs text-slate-600">{name}</p>
      <div className="h-1.5 flex-1 rounded bg-slate-100">
        <div
          className="h-1.5 rounded bg-intelligence-teal"
          style={{ width: pct }}
        />
      </div>
      <span className="text-xs text-slate-500">{score.toFixed(1)}</span>
    </div>
  );
}

function ComparisonCell({ value }: { value: boolean | string }) {
  if (value === true) return <td className="px-5 py-3 text-center text-slate-400">✓</td>;
  if (typeof value === "string")
    return <td className="px-5 py-3 text-center text-slate-400">{value}</td>;
  return <td className="px-5 py-3 text-center text-slate-300">—</td>;
}

function FooterLink({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  if (href.startsWith("mailto:") || href.startsWith("#")) {
    return (
      <a
        href={href}
        className="text-sm text-white/60 transition hover:text-white"
      >
        {children}
      </a>
    );
  }
  return (
    <Link
      href={href}
      className="text-sm text-white/60 transition hover:text-white"
    >
      {children}
    </Link>
  );
}
