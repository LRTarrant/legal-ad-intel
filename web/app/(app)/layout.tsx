import type { Metadata } from "next";
import { Sidebar } from "./sidebar";
import { PageTracker } from "./page-tracker";
import { TrialGate } from "./components/trial-gate";
import { TrialExpired } from "./components/trial-expired";
import { DemoModePill } from "./components/demo-mode-pill";
import { hasUnlimitedAccess } from "@/lib/roles";
import {
  getRequestUser,
  getRequestProfile,
} from "@/lib/entitlements/request-context";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

const MS_PER_DAY = 1000 * 60 * 60 * 24;

export default async function AppLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Resolve the trial state on the SERVER so an expired-trial user never has a
  // child page fetch data — we render <TrialExpired /> instead of children.
  // Managers and above (hasUnlimitedAccess) and users with no trial_expires_at
  // are never gated. This mirrors the old client-side TrialGate exactly.
  let expired = false;
  let daysRemaining: number | null = null;

  // Shared per-request reads (memoized) — the entitlement guards on the child
  // page reuse the same user + profile, so this costs one getUser + one
  // profiles read per request, not two.
  const user = await getRequestUser();

  if (user) {
    const profile = await getRequestProfile(user.id);

    if (
      profile &&
      !hasUnlimitedAccess(profile.role) &&
      profile.trial_expires_at
    ) {
      const expiresAt = new Date(profile.trial_expires_at).getTime();
      const now = new Date().getTime();
      expired = expiresAt < now;
      daysRemaining = expired
        ? 0
        : Math.max(0, Math.ceil((expiresAt - now) / MS_PER_DAY));
    }
  }

  return (
    <div className="flex h-full min-h-screen">
      <Sidebar />
      <PageTracker />
      {/* Admin-only demo-mode switcher. Renders nothing for non-super-admin
          users; for super_admin it floats top-right of every page so the
          impersonation state is always visible. */}
      <DemoModePill />
      <main className="flex-1 bg-cloud overflow-auto">
        <div className="mx-auto max-w-7xl px-6 pt-16 pb-8 md:pt-8 lg:px-8">
          {expired ? (
            <TrialExpired />
          ) : (
            <TrialGate daysRemaining={daysRemaining}>{children}</TrialGate>
          )}
        </div>
      </main>
    </div>
  );
}
