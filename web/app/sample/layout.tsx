import Link from "next/link";
import Image from "next/image";

export const metadata = {
  robots: { index: false, follow: false },
};

export default function SampleLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-cloud">
      {/* Top bar */}
      <header className="bg-midnight-navy text-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <Link href="/" className="flex items-center gap-3">
            <Image
              src="/logo-horizontal-white.svg"
              alt="Legal Marketing Intelligence"
              width={180}
              height={40}
              priority
              className="h-8 w-auto"
            />
          </Link>
          <div className="flex items-center gap-3">
            <span className="rounded-full bg-intelligence-teal/20 px-3 py-1 text-xs font-semibold text-intelligence-teal">
              Sample View
            </span>
            <Link
              href="/login"
              className="rounded-lg bg-intelligence-teal px-4 py-2 text-sm font-semibold text-white transition hover:bg-light-teal"
            >
              Sign In for Full Access
            </Link>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="mx-auto max-w-7xl px-6 pt-8 pb-8 lg:px-8">
        {children}
      </main>

      {/* Bottom CTA */}
      <footer className="border-t border-cloud bg-white py-8">
        <div className="mx-auto max-w-7xl px-6 text-center">
          <p className="text-sm text-slate-gray">
            This is a read-only sample. Sign in for full interactive access, filters, and all markets.
          </p>
          <div className="mt-4 flex justify-center gap-4">
            <Link
              href="/"
              className="text-sm font-medium text-intelligence-teal transition hover:text-light-teal"
            >
              Back to Home
            </Link>
            <Link
              href="/login"
              className="rounded-lg bg-intelligence-teal px-5 py-2 text-sm font-semibold text-white transition hover:bg-light-teal"
            >
              Sign In
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
