import Link from "next/link";
import Image from "next/image";
import { createClient } from "@/lib/supabase/server";

export const metadata = {
  title: "Legal Marketing Intelligence — Competitive Ad Intel for Plaintiff Firms",
  description:
    "Market-wide advertising intelligence for plaintiff law firms. Track competitor activity, find high-opportunity markets, and make smarter case-acquisition decisions.",
};

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

  return (
    <div className="min-h-screen bg-midnight-navy text-white">
      {/* ── Nav ─────────────────────────────────────────── */}
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
        <Image
          src="/logo-horizontal-white.svg"
          alt="Legal Marketing Intelligence"
          width={200}
          height={48}
          priority
          className="h-10 w-auto"
        />
        <div className="flex items-center gap-4">
          {isLoggedIn ? (
            <Link
              href="/overview"
              className="rounded-lg bg-intelligence-teal px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-light-teal"
            >
              Open App
            </Link>
          ) : (
            <Link
              href="/login"
              className="rounded-lg bg-intelligence-teal px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-light-teal"
            >
              Sign In
            </Link>
          )}
        </div>
      </header>

      {/* ── Hero ────────────────────────────────────────── */}
      <section className="mx-auto max-w-4xl px-6 pb-20 pt-16 text-center">
        <h1 className="font-heading text-4xl font-bold leading-tight tracking-tight sm:text-5xl lg:text-6xl">
          See where plaintiff firms are advertising — and where the best opportunities still are.
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-white/70">
          Legal Marketing Intelligence tracks TV, CTV, radio, search, social, and display activity across U.S. markets, then layers in tort lifecycle, litigation momentum, and real-world demand signals so you can find less crowded opportunities and make smarter case-acquisition decisions.
        </p>
        <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
          <a
            href="#request-walkthrough"
            className="rounded-lg bg-intelligence-teal px-8 py-3.5 text-base font-semibold text-white transition hover:bg-light-teal"
          >
            Request a Walkthrough
          </a>
          <Link
            href="/sample/market"
            className="inline-flex items-center gap-1 text-base font-medium text-intelligence-teal transition hover:text-light-teal"
          >
            View Sample Market
            <span aria-hidden="true">&rarr;</span>
          </Link>
        </div>
      </section>

      {/* ── Who It's For ────────────────────────────────── */}
      <section className="bg-steel-blue/20 py-20">
        <div className="mx-auto max-w-6xl px-6">
          <h2 className="text-center font-heading text-2xl font-bold sm:text-3xl">
            Who It&apos;s For
          </h2>
          <div className="mt-12 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            <AudienceCard
              title="Plaintiff Firms"
              primary
              description="Identify high-opportunity markets, track competitor activity, and make smarter case-acquisition decisions with real advertising intelligence."
            />
            <AudienceCard
              title="Marketing Agencies"
              description="Give your legal clients a competitive edge with market-level ad intelligence and channel planning data."
            />
            <AudienceCard
              title="Legal-Focused Media Companies"
              description="Understand where legal ad spend is flowing, which markets are underpenetrated, and where to pitch inventory."
            />
            <AudienceCard
              title="Litigation Funders"
              description="Evaluate tort momentum, competitive crowding, and acquisition economics before deploying capital."
            />
          </div>
        </div>
      </section>

      {/* ── What It Shows ───────────────────────────────── */}
      <section className="py-20">
        <div className="mx-auto max-w-4xl px-6">
          <h2 className="text-center font-heading text-2xl font-bold sm:text-3xl">
            What It Shows
          </h2>
          <div className="mt-12 grid gap-6 sm:grid-cols-2">
            <FeatureCard
              title="Markets"
              description="Competition + opportunity by DMA — see where ad dollars are flowing and where gaps exist."
            />
            <FeatureCard
              title="Torts"
              description="Lifecycle stage + advertising intensity — spot torts worth entering and torts to avoid."
            />
            <FeatureCard
              title="Competitors"
              description="Who's spending where — channel mix, market coverage, and tort focus at a glance."
            />
            <FeatureCard
              title="Planner"
              description="Recommended markets and channels — lead-gen vs brand roles with competition signals."
            />
          </div>
        </div>
      </section>

      {/* ── Sample Views ────────────────────────────────── */}
      <section className="bg-steel-blue/20 py-20">
        <div className="mx-auto max-w-4xl px-6 text-center">
          <h2 className="font-heading text-2xl font-bold sm:text-3xl">
            See It in Action
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-white/70">
            Browse read-only samples from live data — no login required.
          </p>
          <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
            <Link
              href="/sample/market"
              className="rounded-lg bg-white/10 px-6 py-3 text-sm font-semibold text-white ring-1 ring-white/20 transition hover:bg-white/20"
            >
              Sample Market View
            </Link>
            <Link
              href="/sample/tort"
              className="rounded-lg bg-white/10 px-6 py-3 text-sm font-semibold text-white ring-1 ring-white/20 transition hover:bg-white/20"
            >
              Sample Tort View
            </Link>
          </div>
        </div>
      </section>

      {/* ── Social Proof ────────────────────────────────── */}
      <section className="py-20">
        <div className="mx-auto max-w-3xl px-6 text-center">
          <p className="text-lg font-medium italic text-white/80">
            &ldquo;Built by a mass-tort case acquisition veteran to reflect how
            plaintiff firms actually buy cases.&rdquo;
          </p>
        </div>
      </section>

      {/* ── Footer CTA ──────────────────────────────────── */}
      <section className="border-t border-white/10 py-12">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6">
          <p className="text-sm text-white/50">Legal Marketing Intelligence</p>
          <div className="flex items-center gap-4">
            {isLoggedIn ? (
              <Link
                href="/overview"
                className="text-sm font-medium text-intelligence-teal transition hover:text-light-teal"
              >
                Open App
              </Link>
            ) : (
              <Link
                href="/login"
                className="text-sm font-medium text-intelligence-teal transition hover:text-light-teal"
              >
                Sign In
              </Link>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}

function AudienceCard({
  title,
  description,
  primary,
}: {
  title: string;
  description: string;
  primary?: boolean;
}) {
  return (
    <div
      className={`rounded-xl p-6 ${
        primary
          ? "bg-intelligence-teal/20 ring-1 ring-intelligence-teal/40"
          : "bg-white/5 ring-1 ring-white/10"
      }`}
    >
      {primary && (
        <span className="mb-3 inline-block rounded-full bg-intelligence-teal/30 px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wide text-intelligence-teal">
          Primary
        </span>
      )}
      <h3 className="font-heading text-lg font-semibold">{title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-white/70">{description}</p>
    </div>
  );
}

function FeatureCard({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-xl bg-white/5 p-6 ring-1 ring-white/10">
      <h3 className="font-heading text-lg font-semibold text-intelligence-teal">
        {title}
      </h3>
      <p className="mt-2 text-sm leading-relaxed text-white/70">{description}</p>
    </div>
  );
}
