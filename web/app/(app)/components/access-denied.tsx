import { Lock, Mail, Calendar } from "lucide-react";

/**
 * Server-rendered "not included in your plan" surface. Shown when a signed-in
 * user opens a state or tort page their ACCOUNT hasn't purchased. Styled to
 * match TrialExpired so the two gated states feel like one system.
 */
export function AccessDenied({
  surface,
  name,
}: {
  /** Which kind of surface is gated. */
  surface: "state" | "tort";
  /** Optional human label of the specific state/tort that was blocked. */
  name?: string;
}) {
  const noun = surface === "state" ? "state" : "tort";
  const heading =
    name && name.trim().length > 0
      ? `${name} isn't in your plan`
      : `This ${noun} isn't in your plan`;

  return (
    <div className="flex min-h-[60vh] items-center justify-center px-4">
      <div className="w-full max-w-lg text-center">
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-slate-100">
          <Lock className="h-8 w-8 text-slate-500" />
        </div>

        <h1 className="text-2xl font-semibold text-charcoal">{heading}</h1>
        <p className="mt-2 text-sm text-slate-gray">
          Your subscription covers a specific set of {noun}s. Add this {noun} to
          your plan to unlock its advertising intelligence, benchmarks, and
          targeting data.
        </p>

        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <a
            href="mailto:sales@legalmarketingintelligence.com"
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-intelligence-teal px-5 py-2.5 text-sm font-semibold text-white transition hover:opacity-90"
          >
            <Mail className="h-4 w-4" />
            Add to Your Plan
          </a>
          <a
            href="https://calendar.google.com/calendar/u/0/appointments/schedules/AcZssZ0JT0P1BiH1fwrVK1nEgj9qJBNkct0Rqc7LZodi0vH92DJmuvMJeVTkI5pR1u5cK8LIfF5ps0x8"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-300 px-5 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
          >
            <Calendar className="h-4 w-4" />
            Talk to Sales
          </a>
        </div>
      </div>
    </div>
  );
}
