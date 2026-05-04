import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Settings",
  robots: { index: false, follow: false },
};

/**
 * Settings shell. For now Firms is the only sub-page; future settings
 * (account, billing, members) will be added as siblings.
 */
export default function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-3xl font-semibold text-midnight-navy">
          Settings
        </h1>
        <p className="mt-1 text-sm text-slate-gray">
          Manage your firm profile, brand voice, and Campaign Builder defaults.
        </p>
      </div>

      <nav className="border-b border-cloud">
        <Link
          href="/settings/firms"
          className="inline-block border-b-2 border-intelligence-teal px-4 pb-2 text-sm font-semibold text-intelligence-teal"
        >
          Firms
        </Link>
      </nav>

      <div>{children}</div>
    </div>
  );
}
