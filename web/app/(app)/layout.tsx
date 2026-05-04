import type { Metadata } from "next";
import { Sidebar } from "./sidebar";
import { PageTracker } from "./page-tracker";
import { TrialGate } from "./components/trial-gate";
import { DemoModePill } from "./components/demo-mode-pill";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default function AppLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
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
          <TrialGate>{children}</TrialGate>
        </div>
      </main>
    </div>
  );
}
