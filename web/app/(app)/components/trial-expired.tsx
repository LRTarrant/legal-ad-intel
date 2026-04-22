import { Clock, Mail, Calendar } from "lucide-react";

const FEATURES = [
  "Advertising intelligence across all markets",
  "Competitor tracking and alerts",
  "Tort-specific cost benchmarks and trends",
  "Judicial profiles and PI viability data",
  "Campaign planning tools",
];

export function TrialExpired() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center px-4">
      <div className="w-full max-w-lg text-center">
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-amber-100">
          <Clock className="h-8 w-8 text-amber-600" />
        </div>

        <h1 className="text-2xl font-semibold text-charcoal">
          Your trial has expired
        </h1>
        <p className="mt-2 text-sm text-slate-gray">
          Your free trial period has ended. Upgrade your account to continue
          accessing the platform.
        </p>

        <div className="mt-8 rounded-lg border border-slate-200 bg-white p-6 text-left shadow-sm">
          <p className="text-sm font-medium text-charcoal">
            With a full subscription you get access to:
          </p>
          <ul className="mt-3 space-y-2">
            {FEATURES.map((f) => (
              <li key={f} className="flex items-start gap-2 text-sm text-slate-600">
                <span className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full bg-intelligence-teal" />
                {f}
              </li>
            ))}
          </ul>
        </div>

        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <a
            href="mailto:sales@legalmarketingintelligence.com"
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-intelligence-teal px-5 py-2.5 text-sm font-semibold text-white transition hover:opacity-90"
          >
            <Mail className="h-4 w-4" />
            Upgrade to Continue
          </a>
          <a
            href="https://calendar.google.com/calendar/u/0/appointments/schedules/AcZssZ0JT0P1BiH1fwrVK1nEgj9qJBNkct0Rqc7LZodi0vH92DJmuvMJeVTkI5pR1u5cK8LIfF5ps0x8"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-300 px-5 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
          >
            <Calendar className="h-4 w-4" />
            Schedule a Call
          </a>
        </div>
      </div>
    </div>
  );
}
