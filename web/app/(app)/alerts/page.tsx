import type { Metadata } from "next";
import { AlertsClient } from "./alerts-client";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Alerts | Legal Marketing Intelligence",
};

export default function AlertsPage() {
  return (
    <>
      <h1 className="text-3xl font-bold text-midnight-navy">
        Competitor Alerts
      </h1>
      <p className="mt-2 text-sm text-slate-gray">
        Get notified when new competitors start advertising for your torts.
        Configure alerts below and receive email or in-app notifications.
      </p>
      <AlertsClient />
    </>
  );
}
