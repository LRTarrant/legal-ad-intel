import Link from "next/link";
import Image from "next/image";
import { MobileNav } from "../home-nav";

export const metadata = {
  title: "Pricing — Legal Marketing Intelligence",
  description:
    "Pricing plans built for legal advertising teams. Schedule a demo to learn more.",
};

export default function PricingPage() {
  return (
    <div className="flex min-h-screen flex-col bg-midnight-navy">
      {/* ── Sticky Navigation ───────────────────────── */}
      <header className="sticky top-0 z-50 border-b border-white/10 bg-midnight-navy">
        <div className="relative mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Link href="/">
            <Image
              src="/logo-horizontal-white.svg"
              alt="Legal Marketing Intelligence"
              width={260}
              height={56}
              priority
              className="h-14 w-auto"
            />
          </Link>

          <nav className="hidden items-center gap-8 lg:flex">
            <Link
              href="/#product"
              className="text-sm font-medium text-white/70 transition hover:text-white"
            >
              Product
            </Link>
            <Link
              href="/pricing"
              className="text-sm font-medium text-white transition"
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
              href="https://calendar.google.com/calendar/u/0/appointments/schedules/AcZssZ0JT0P1BiH1fwrVK1nEgj9qJBNkct0Rqc7LZodi0vH92DJmuvMJeVTkI5pR1u5cK8LIfF5ps0x8"
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-full bg-intelligence-teal px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-intelligence-teal/90"
            >
              Schedule a Demo
            </a>
          </nav>

          <MobileNav />
        </div>
      </header>

      {/* ── Main Content ────────────────────────────── */}
      <main className="flex flex-1 flex-col items-center justify-center px-6 py-24">
        {/* Coming Soon Badge */}
        <span className="inline-block rounded-full bg-intelligence-teal/15 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.15em] text-intelligence-teal">
          Coming Soon
        </span>

        {/* Heading */}
        <h1 className="mt-6 max-w-2xl text-center text-4xl font-bold leading-tight text-white sm:text-5xl">
          Pricing plans built for legal advertising teams.
        </h1>

        {/* Subtext */}
        <p className="mt-6 max-w-xl text-center text-lg leading-relaxed text-white/60">
          We&apos;re finalizing our pricing tiers. Schedule a demo and
          we&apos;ll walk you through options that fit your needs.
        </p>

        {/* CTA Buttons */}
        <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row">
          <a
            href="https://calendar.google.com/calendar/u/0/appointments/schedules/AcZssZ0JT0P1BiH1fwrVK1nEgj9qJBNkct0Rqc7LZodi0vH92DJmuvMJeVTkI5pR1u5cK8LIfF5ps0x8"
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-full bg-intelligence-teal px-8 py-3.5 text-base font-semibold text-white transition hover:bg-intelligence-teal/90"
          >
            Schedule a Demo
          </a>
          <Link
            href="/"
            className="text-sm font-medium text-white/50 transition hover:text-white"
          >
            &larr; Back to Home
          </Link>
        </div>

        {/* ── Tier Preview Cards ────────────────────── */}
        <div className="mt-20 grid w-full max-w-4xl grid-cols-1 gap-6 sm:grid-cols-3">
          <TierCard
            name="Intelligence"
            description="Market-level advertising data and tort signals for individual firms."
          />
          <TierCard
            name="Market Pro"
            description="Multi-state coverage, competitor tracking, and channel planning tools."
          />
          <TierCard
            name="Agency / Enterprise"
            description="Full platform access with custom reporting and dedicated support."
          />
        </div>
      </main>

      {/* ── Footer ──────────────────────────────────── */}
      <footer className="border-t border-white/10">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-8">
          <p className="text-xs text-white/30">
            &copy; 2026 Legal Marketing Intelligence
          </p>
          <Link
            href="/"
            className="text-xs text-white/30 transition hover:text-white/60"
          >
            Home
          </Link>
        </div>
      </footer>
    </div>
  );
}

function TierCard({
  name,
  description,
}: {
  name: string;
  description: string;
}) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/5 p-6">
      <h3 className="text-lg font-bold text-white">{name}</h3>
      <p className="mt-2 text-sm leading-relaxed text-white/50">
        {description}
      </p>
    </div>
  );
}
