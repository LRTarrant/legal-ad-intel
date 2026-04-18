import type { Metadata } from "next";
import { BroadcastIntelClient } from "./broadcast-intel-client";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Broadcast Intel | Legal Marketing Intelligence",
};

export default function BroadcastIntelPage() {
  return (
    <>
      <h1 className="text-3xl font-bold text-midnight-navy">
        Broadcast Market Intelligence
      </h1>
      <p className="mt-2 text-sm text-slate-gray">
        Discover TV stations in your market and identify law firms spending on
        digital ads who may be good candidates for broadcast advertising.
      </p>
      <BroadcastIntelClient />
    </>
  );
}
