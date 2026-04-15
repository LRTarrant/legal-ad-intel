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
              Log In
            </Link>
          )}
        </div>
      </header>

      {/* ── Hero ────────────────────────────────────────── */}
      <section className="mx-auto max-w-4xl px-6 pb-16 pt-16 text-center">
        <h1 className="font-heading text-4xl font-bold leading-tight tracking-tight sm:text-5xl lg:text-6xl">
          See where plaintiff firms are advertising — and where the best
          opportunities still are.
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-white/70">
          Legal Marketing Intelligence tracks TV, CTV, radio, search, social,
          and display activity across U.S. markets, then layers in tort
          lifecycle, litigation momentum, and real-world demand signals so you
          can find less crowded opportunities and make smarter case-acquisition
          decisions.
        </p>
        <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
          <a
            href="mailto:lancetarrant@gmail.com"
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

      {/* ── Proof Strip ─────────────────────────────────── */}
      <section className="border-y border-white/10 py-6">
        <div className="mx-auto flex max-w-5xl flex-col items-center justify-center gap-6 px-6 sm:flex-row sm:gap-12">
          <ProofItem text="Track legal ad activity across channels" />
          <ProofItem text="Compare market crowding and opportunity" />
          <ProofItem text="Overlay tort lifecycle and litigation signals" />
        </div>
      </section>

      {/* ── What This Product Does ──────────────────────── */}
      <section className="py-20">
        <div className="mx-auto max-w-3xl px-6">
          <h2 className="text-center font-heading text-2xl font-bold sm:text-3xl">
            What This Product Does
          </h2>
          <p className="mt-8 text-base leading-relaxed text-white/70">
            Legal Marketing Intelligence is built for people making real
            decisions about where to compete, where to spend, and which
            opportunities are getting too crowded. Instead of showing raw
            advertising data in isolation, it connects ad activity to market
            pressure, tort momentum, and the signals that matter when you are
            trying to buy better cases or deploy capital intelligently.
          </p>
          <p className="mt-6 text-base leading-relaxed text-white/70">
            Use it to see where plaintiff firms are active, which torts are
            heating up, where markets still look favorable, and how channel
            strategy changes when the goal is lower cost per signed case versus
            longer-term brand support.
          </p>
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
              description="See where competitors are spending, which torts are accelerating, and which markets show meaningful demand without the same level of crowding. The goal is simple: help you pursue more signed cases with better economics and less guesswork."
            />
            <AudienceCard
              title="Legal Marketing Agencies"
              description="Build sharper media plans with actual competitor activity, market-level competition, and channel context your clients can understand. Show where opportunity exists before budgets get wasted in crowded markets."
            />
            <AudienceCard
              title="Legal-Focused Media Companies"
              description="Identify where legal advertising demand is growing, which markets look underpenetrated, and where your inventory can solve a real buyer problem. Walk into conversations with plaintiff firms using data instead of generic ad sales language."
            />
            <AudienceCard
              title="Litigation Funders"
              description="Evaluate tort momentum, marketing intensity, competitive crowding, and the acquisition environment before capital is committed. See which opportunities look early, crowded, or worth a closer look."
            />
          </div>
        </div>
      </section>

      {/* ── What You Can Explore ─────────────────────────── */}
      <section className="py-20">
        <div className="mx-auto max-w-4xl px-6">
          <h2 className="text-center font-heading text-2xl font-bold sm:text-3xl">
            What You Can Explore
          </h2>
          <div className="mt-12 grid gap-6 sm:grid-cols-2">
            <FeatureCard
              title="Markets"
              description="Compare markets by demand, competition, and advertising intensity to find places that look promising before they get crowded out."
            />
            <FeatureCard
              title="Torts"
              description="Track MDL and tort momentum alongside ad activity so you can see where litigation lifecycle and marketing pressure are moving together."
            />
            <FeatureCard
              title="Competitors"
              description="See which firms are active, where they are showing up, and how their market and channel footprint is evolving over time."
            />
            <FeatureCard
              title="Planner"
              description="Start with a market or tort, then evaluate which channels look more favorable, more crowded, or better suited for lead generation versus brand support."
            />
          </div>
        </div>
      </section>

      {/* ── Why It's Different ──────────────────────────── */}
      <section className="bg-steel-blue/20 py-20">
        <div className="mx-auto max-w-3xl px-6">
          <h2 className="text-center font-heading text-2xl font-bold sm:text-3xl">
            Why It&apos;s Different
          </h2>
          <p className="mt-8 text-base leading-relaxed text-white/70">
            Most legal marketing tools stop at visibility. They show ads,
            creatives, or spend estimates, but they do not help you think
            through whether a market is getting crowded, whether a tort still
            has room, or whether the acquisition environment looks attractive
            enough to act.
          </p>
          <p className="mt-6 text-base leading-relaxed text-white/70">
            Legal Marketing Intelligence is different because it connects
            advertising activity to litigation and demand signals, which makes
            the product more useful for plaintiff firms, more defensible for
            agencies, more practical for media sellers, and more interesting
            to litigation funders.
          </p>
        </div>
      </section>

      {/* ── Sample Views ────────────────────────────────── */}
      <section className="py-20">
        <div className="mx-auto max-w-4xl px-6 text-center">
          <h2 className="font-heading text-2xl font-bold sm:text-3xl">
            See It in Action
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-white/70">
            Explore a sample market to see how competition, saturation, and
            opportunity come together in one place. Then open a sample tort
            page to see how litigation momentum and advertising activity can
            be evaluated side by side.
          </p>
          <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
            <Link
              href="/sample/market"
              className="rounded-lg bg-intelligence-teal px-8 py-3.5 text-base font-semibold text-white transition hover:bg-light-teal"
            >
              View Sample Market
            </Link>
            <Link
              href="/sample/tort"
              className="rounded-lg bg-intelligence-teal/20 px-8 py-3.5 text-base font-semibold text-intelligence-teal ring-1 ring-intelligence-teal/40 transition hover:bg-intelligence-teal/30"
            >
              View Sample Tort
            </Link>
          </div>
        </div>
      </section>

      {/* ── Closing ─────────────────────────────────────── */}
      <section className="bg-steel-blue/20 py-20">
        <div className="mx-auto max-w-3xl px-6 text-center">
          <p className="text-lg leading-relaxed text-white/80">
            If you are trying to decide where to spend next, which markets
            look viable, or whether a tort is getting too crowded to chase
            efficiently, this is the place to start. Legal Marketing
            Intelligence is built to help you make clearer decisions before
            the market gets more expensive.
          </p>
          <div className="mt-10 flex flex-col items-center gap-4">
            <a
              href="mailto:lancetarrant@gmail.com"
              className="rounded-lg bg-intelligence-teal px-8 py-3.5 text-base font-semibold text-white transition hover:bg-light-teal"
            >
              Request a Walkthrough
            </a>
            <p className="text-sm text-white/50">
              Or start with a{" "}
              <Link
                href="/sample/market"
                className="text-intelligence-teal underline underline-offset-2 transition hover:text-light-teal"
              >
                sample market
              </Link>{" "}
              to see how the product works in practice.
            </p>
          </div>
        </div>
      </section>

      {/* ── Footer ──────────────────────────────────────── */}
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
                Log In
              </Link>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}

function ProofItem({ text }: { text: string }) {
  return (
    <div className="flex items-center gap-2 text-sm font-medium text-white/80">
      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-intelligence-teal/20 text-intelligence-teal">
        <svg
          className="h-3 w-3"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={3}
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M4.5 12.75l6 6 9-13.5"
          />
        </svg>
      </span>
      {text}
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
          ? "bg-intelligence-teal/20 ring-2 ring-intelligence-teal"
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
