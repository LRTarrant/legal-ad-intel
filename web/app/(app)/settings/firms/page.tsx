import { Suspense } from "react";
import { FirmsPageClient } from "./firms-page-client";

export default function FirmsPage() {
  return (
    <Suspense fallback={<div className="text-sm text-slate-gray">Loading\u2026</div>}>
      <FirmsPageClient />
    </Suspense>
  );
}
