import Link from "next/link";
import {
  ArrowLeft,
  Scale,
  Gavel,
  Target,
  Calendar,
  AlertTriangle,
  TrendingUp,
  FileText,
  Shield,
  Users,
  Clock,
  XCircle,
  Eye,
  Monitor,
  Database,
  DollarSign,
} from "lucide-react";
import { AskAIPanel } from "../../components/ask-ai-panel";
import { NewLandingPagesCard } from "../../components/new-landing-pages-card";
import {
  getSegmentSummary,
  getAdvertiserPlatforms,
  getTortCostBenchmarks,
  getFaersDupixentSignals,
} from "@/lib/queries";
import { CostBenchmarkScorecard } from "../../components/cost-benchmark-scorecard";
import { LiveFaersSignals } from "@/components/tort-intelligence/live-faers-signals";

export const dynamic = "force-dynamic";

/* ── Metadata ──────────────────────────────────────────────────────────── */

export function generateMetadata() {
  return {
    title:
      "Dupixent (Cutaneous T-Cell Lymphoma) Tort Intelligence | Legal Marketing Intelligence",
    description:
      "Pre-MDL advertising intelligence brief for Dupixent (dupilumab) cutaneous T-cell lymphoma litigation — MDL 3180 status, scientific evidence, live FAERS signal, qualification criteria.",
  };
}

/*
 * Last verified: 2026-05-22. This is a PRE-MDL surface. MDL No. 3180 was
 * petitioned with the JPML on 2026-02-13; the consolidation hearing is set
 * for 2026-05-28 — no MDL has been formed yet. The MDL status copy below is
 * deliberately status-dated; revise after the JPML rules.
 */
const AS_OF_DATE = "May 22, 2026";

/* ── Static Data ───────────────────────────────────────────────────────── */

const DUPIXENT_TORT_CONTEXT = {
  tortName: "Dupixent (Cutaneous T-Cell Lymphoma)",
  injury:
    "Cutaneous T-cell lymphoma (CTCL) — a rare non-Hodgkin lymphoma of the skin; the litigation also reaches related peripheral T-cell lymphomas (PTCL)",
  mdlNumber:
    "MDL No. 3180 (In re: Dupixent (Dupilumab) Products Liability Litigation) — PETITIONED, not yet formed. JPML consolidation hearing May 28, 2026; consolidation requested in the Northern District of Georgia. Status as of May 22, 2026.",
  pendingCases:
    "~15 cases across 12 federal districts as of the May 2026 JPML hearing filing. Early-stage; cases filed individually, not a class action.",
  settlementRange:
    "None. No verdicts and no settlements; no settlement framework exists at this pre-MDL stage.",
  estimatedCPA:
    "LMI estimate only (no litigation-based figure exists pre-MDL): ~$5,000–$12,000, the upper band typical of early-stage cancer torts with a strict diagnosis screen and a contested-causation profile.",
  bellwetherDate:
    "None scheduled. Depends on whether the JPML forms MDL 3180 at the May 28, 2026 hearing.",
  caseSummary:
    "Dupixent (dupilumab) is a Regeneron/Sanofi IL-4/IL-13 biologic for atopic dermatitis, asthma and related conditions. Plaintiffs allege dupilumab caused or accelerated cutaneous T-cell lymphoma and that Regeneron and Sanofi failed to warn that the label did not mention CTCL, did not advise ruling out lymphoma before prescribing, and did not instruct monitoring of patients whose skin disease failed to improve or worsened on treatment. Key study: Hasan et al. (JAAD, 2024) — OR 4.10 for CTCL in dupilumab-treated atopic-dermatitis patients. Causation is contested: a competing 'unmasking' hypothesis holds that CTCL was present but misdiagnosed as atopic dermatitis before Dupixent.",
  qualification:
    "Product: Dupixent (dupilumab). Injury: CTCL diagnosis (mycosis fungoides / Sezary syndrome and other CTCL subtypes; some intake also accepts PTCL). Timing screen is decisive: CTCL diagnosed AFTER starting Dupixent — a CTCL diagnosis predating Dupixent use is the core defense ('unmasking') and a disqualifier. Not currently represented. Statute of limitations 2–3 years from diagnosis (varies by state).",
  advertisingLandscape:
    "Stage: Pre-MDL / emerging (stage 1). Live ad-platform data is collected automatically and will populate once advertisers begin running Dupixent CTCL campaigns. The live FAERS signal already shows direct plaintiff-firm reporting activity (5.56% lawyer-filed vs a 0.73% dataset baseline).",
  targetingInsights:
    "Not yet established. Dupixent's treated population is atopic-dermatitis and asthma patients; no verified geographic or demographic prescribing dataset is wired for this tort yet. Geographic targeting guidance is deferred until a grounded data source is available.",
};

const SCIENTIFIC_STUDIES = [
  {
    study: "Hasan et al. — retrospective cohort (TriNetX database)",
    year: "2024",
    source: "JAAD",
    finding:
      "OR 4.10 (95% CI 2.06–8.19) for CTCL in dupilumab-treated atopic-dermatitis patients vs untreated AD patients",
  },
  {
    study: "Hasan et al. — DMARD-naive subgroup",
    year: "2024",
    source: "JAAD",
    finding:
      "Association persists with no prior DMARD exposure: OR 3.20 (95% CI 1.57–6.51)",
  },
  {
    study: "FDA adverse-event reports (FAERS)",
    year: "2024–2026",
    source: "openFDA",
    finding:
      "300+ CTCL reports linked to Dupixent cited in the MDL petition; LMI's live FAERS query independently finds ~301 lymphoma/CTCL reports",
  },
  {
    study: "Decoupling commentary / 'unmasking' responses",
    year: "2024–2025",
    source: "JAAD",
    finding:
      "Competing view: pre-existing CTCL misdiagnosed as atopic dermatitis, then progressing — a genuine, unresolved causation contest",
  },
];

const QUALIFICATION_CRITERIA = [
  {
    criterion: "Product",
    standard: "Dupixent (dupilumab) — prescription-confirmed use",
    notes: "Single-source biologic; no generic exists",
  },
  {
    criterion: "Injury",
    standard: "Diagnosed cutaneous T-cell lymphoma (CTCL)",
    notes:
      "Mycosis fungoides / Sezary syndrome and other CTCL subtypes; some intake also accepts peripheral T-cell lymphoma (PTCL)",
  },
  {
    criterion: "Diagnosis Timing",
    standard: "CTCL diagnosed AFTER initiating Dupixent",
    notes:
      "Decisive screen — a CTCL diagnosis predating Dupixent use is the defendants' core 'unmasking' defense and a disqualifier",
  },
  {
    criterion: "Treatment Indication",
    standard: "Dupixent prescribed for atopic dermatitis / eczema or asthma",
    notes: "Establishes the misdiagnosis pathway the litigation alleges",
  },
  {
    criterion: "Existing Representation",
    standard: "Not currently represented",
    notes: "Standard disqualifier",
  },
  {
    criterion: "Statute of Limitations",
    standard: "2–3 years from diagnosis (varies by state)",
    notes: "Filing deadlines are a real constraint",
  },
];

const SCREENING_QUESTIONS = [
  "Who is the claimant? (You or loved one)",
  "Was Dupixent (dupilumab) prescribed and used?",
  "What condition was Dupixent prescribed for? (Eczema / atopic dermatitis / asthma)",
  "Diagnosed with cutaneous T-cell lymphoma or another T-cell lymphoma?",
  "When was Dupixent started?",
  "When was the lymphoma diagnosed? (Must be after starting Dupixent)",
  "Was any lymphoma suspected or diagnosed before Dupixent?",
  "Treatment received? (Skin-directed therapy, chemotherapy, radiation, etc.)",
  "Already have an attorney?",
];

const DISQUALIFIERS = [
  "Never used Dupixent (dupilumab)",
  "No T-cell lymphoma diagnosis",
  "CTCL diagnosed before Dupixent use (core 'unmasking' defense)",
  "Lymphoma type outside the CTCL / PTCL scope (e.g., B-cell lymphoma)",
  "Already represented",
];

const LITIGATION_TIMELINE = [
  {
    date: "March 2017",
    event: "FDA approves Dupixent (dupilumab) for atopic dermatitis",
    short: "FDA Approves Dupixent",
  },
  {
    date: "April 2024",
    event:
      "Hasan et al. publish the TriNetX cohort study in JAAD — OR 4.10 for CTCL",
    short: "JAAD Study: OR 4.10",
  },
  {
    date: "2024–2025",
    event:
      "JAAD publishes 'decoupling' commentary and responses debating the unmasking hypothesis",
    short: "Causation Debate",
  },
  {
    date: "Feb 13, 2026",
    event:
      "Petition filed with the JPML to consolidate Dupixent CTCL cases — MDL No. 3180",
    short: "MDL 3180 Petitioned",
  },
  {
    date: "May 2026",
    event:
      "~15 cases pending across 12 federal districts ahead of the JPML hearing",
    short: "~15 Cases / 12 Districts",
  },
  {
    date: "May 28, 2026",
    event:
      "JPML consolidation hearing — panel decides whether to form MDL 3180 (N.D. Georgia requested)",
    short: "JPML Hearing",
    future: true,
  },
  {
    date: "Mid 2026 (projected)",
    event:
      "JPML ruling expected shortly after the hearing; MDL formation and venue would follow",
    short: "JPML Ruling Expected",
    future: true,
  },
];

/* ── Helpers ────────────────────────────────────────────────────────────── */

function fmtCur(n: number | null): string {
  if (n == null) return "—";
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1000) return `$${(n / 1000).toFixed(1)}K`;
  return `$${n.toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
}

function fmtNum(n: number | null): string {
  if (n == null) return "—";
  return n.toLocaleString();
}

const SEGMENT_META: Record<
  string,
  { label: string; color: string; bg: string; bar: string }
> = {
  on_docket: { label: "On-Docket Firms", color: "#10B981", bg: "#ECFDF5", bar: "bg-emerald-500" },
  off_docket: { label: "Off-Docket Firms", color: "#F59E0B", bg: "#FFFBEB", bar: "bg-amber-500" },
  aggregator: { label: "Aggregators", color: "#7C3AED", bg: "#FAF5FF", bar: "bg-purple-500" },
  unknown: { label: "Unknown", color: "#6B7280", bg: "#F9FAFB", bar: "bg-slate-400" },
};

function segMeta(seg: string) {
  return SEGMENT_META[seg] ?? SEGMENT_META.unknown;
}

const PLATFORM_COLORS: Record<string, string> = {
  meta: "#3B82F6",
  google: "#10B981",
  tiktok: "#EC4899",
  youtube: "#EF4444",
  ispot: "#8B5CF6",
  mediaradar: "#F59E0B",
  tv: "#6366F1",
};

/* ── Page ───────────────────────────────────────────────────────────────── */

const TORT_SLUG = "dupixent";

export default async function DupixentPage() {
  /* ── Live data fetch from Supabase ─────────────────────────────────── */
  const [segments, platforms, benchmarks] = await Promise.all([
    getSegmentSummary(TORT_SLUG),
    getAdvertiserPlatforms(TORT_SLUG),
    getTortCostBenchmarks(),
  ]);

  // Live FAERS signals. getFaersDupixentSignals never throws (returns an
  // empty structure on failure), so a bare await keeps the page resilient.
  const faersSignals = await getFaersDupixentSignals();

  const totalAdvertisers = segments.reduce((s, r) => s + r.advertiser_count, 0);
  const totalSpend = segments.reduce((s, r) => s + r.total_spend, 0);
  const totalCreatives = segments.reduce((s, r) => s + r.total_creatives, 0);

  const allPlatforms = new Set<string>();
  for (const p of platforms) {
    for (const plat of p.platforms) allPlatforms.add(plat);
  }

  // Fuzzy-match a cost benchmark; null is expected pre-MDL and the
  // scorecard handles a null gracefully.
  const tortLabelLower = "dupixent";
  const benchmark =
    benchmarks
      .sort((a, b) => b.observed_date.localeCompare(a.observed_date))
      .find((b) => {
        const bName = b.tort_name.toLowerCase();
        return bName === tortLabelLower || bName.includes(tortLabelLower);
      }) ?? null;

  const hasLiveData = totalAdvertisers > 0 || totalSpend > 0 || totalCreatives > 0;

  return (
    <div className="space-y-8">
      {/* ── 1. Page Header ──────────────────────────────────────────────── */}
      <div>
        <Link
          href="/mass-tort-overview"
          className="text-sm text-slate-gray hover:text-midnight-navy"
        >
          <span className="flex items-center gap-1">
            <ArrowLeft className="w-3.5 h-3.5" />
            Mass Tort Overview
          </span>
        </Link>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <h1 className="font-heading text-3xl font-bold text-midnight-navy">
            Dupixent
          </h1>
          <span className="rounded-full bg-amber-50 border border-warning/30 px-3 py-0.5 text-xs font-bold uppercase tracking-wider text-warning">
            Pre-MDL — Petitioned
          </span>
        </div>
        <p className="mt-1 text-lg text-slate-gray">
          Cutaneous T-Cell Lymphoma (CTCL)
        </p>
        <p className="mt-0.5 text-xs text-slate-gray">
          Last Updated: {AS_OF_DATE}
        </p>
      </div>

      {/* ── 2. Key Stats Row ────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <div className="rounded-lg bg-white p-4 shadow-sm">
          <div className="flex items-center gap-1.5 mb-2">
            <Scale className="w-3.5 h-3.5 text-intelligence-teal" />
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-gray">
              Pending Cases
            </p>
          </div>
          <p className="text-2xl font-bold text-midnight-navy">~15</p>
          <p className="mt-0.5 text-[11px] text-slate-gray">12 federal districts</p>
        </div>
        <div className="rounded-lg bg-white p-4 shadow-sm">
          <div className="flex items-center gap-1.5 mb-2">
            <Gavel className="w-3.5 h-3.5 text-intelligence-teal" />
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-gray">
              MDL Status
            </p>
          </div>
          <p className="text-2xl font-bold text-midnight-navy">No. 3180</p>
          <p className="mt-0.5 text-[11px] text-slate-gray">Petitioned — not yet formed</p>
        </div>
        <div className="rounded-lg bg-white p-4 shadow-sm">
          <div className="flex items-center gap-1.5 mb-2">
            <Target className="w-3.5 h-3.5 text-intelligence-teal" />
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-gray">
              Estimated CPA
            </p>
          </div>
          <p className="text-2xl font-bold text-midnight-navy">~$5K – $12K</p>
          <p className="mt-0.5 text-[11px] text-slate-gray">LMI estimate</p>
        </div>
        <div className="rounded-lg bg-white p-4 shadow-sm">
          <div className="flex items-center gap-1.5 mb-2">
            <Calendar className="w-3.5 h-3.5 text-intelligence-teal" />
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-gray">
              JPML Hearing
            </p>
          </div>
          <p className="text-2xl font-bold text-midnight-navy">May 28, 2026</p>
          <p className="mt-0.5 text-[11px] text-slate-gray">Consolidation decision</p>
        </div>
      </div>

      {/* ── 3. Case Summary ─────────────────────────────────────────────── */}
      <div className="rounded-lg bg-white p-6 shadow-sm">
        <h2 className="font-heading text-lg font-semibold text-midnight-navy mb-4">
          Case Summary
        </h2>
        <div className="space-y-4 text-sm leading-relaxed text-midnight-navy/80">
          <p>
            Dupixent (dupilumab) is an interleukin-4/interleukin-13 inhibitor
            biologic developed by Regeneron Pharmaceuticals and Sanofi,
            FDA-approved since 2017 and widely prescribed for atopic dermatitis
            (eczema), asthma, and related inflammatory conditions. Plaintiffs
            allege that dupilumab caused or accelerated cutaneous T-cell
            lymphoma — a rare non-Hodgkin lymphoma of the skin — and that the
            manufacturers failed to warn patients and physicians of the risk.
          </p>
          <p>
            The core allegation is failure to warn: the prescribing
            information did not mention cutaneous T-cell lymphoma, did not
            advise physicians to rule out lymphoma before prescribing Dupixent,
            and did not instruct doctors to monitor patients whose skin disease
            failed to improve or worsened during treatment.
          </p>
          <p>
            A petition to consolidate the cases was filed with the Judicial
            Panel on Multidistrict Litigation on February 13, 2026, as
            MDL No. 3180, <em>In re: Dupixent (Dupilumab) Products Liability
            Litigation</em>. As of the May 2026 hearing filing, roughly 15
            cases were pending across 12 federal districts; petitioners have
            requested consolidation in the U.S. District Court for the
            Northern District of Georgia. The JPML consolidation hearing is set
            for May 28, 2026 — <strong>no MDL has been formed yet</strong>, and
            this page reflects status as of {AS_OF_DATE}.
          </p>
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <div className="rounded-md bg-cloud/60 px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-gray mb-1">
              Defendants
            </p>
            <p className="text-sm text-midnight-navy">
              Regeneron Pharmaceuticals, Inc. and Sanofi.
            </p>
          </div>
          <div className="rounded-md bg-cloud/60 px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-gray mb-1">
              Legal Theories
            </p>
            <p className="text-sm text-midnight-navy">
              Failure to warn, negligence, design defect, and related
              product-liability claims. Cases are filed individually — this is
              not a class action.
            </p>
          </div>
        </div>
      </div>

      {/* ── 4. Harm / Injury ────────────────────────────────────────────── */}
      <div className="rounded-lg bg-white p-6 shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <AlertTriangle className="w-4.5 h-4.5 text-alert" />
          <h2 className="font-heading text-lg font-semibold text-midnight-navy">
            Harm / Injury
          </h2>
        </div>
        <p className="text-sm leading-relaxed text-midnight-navy/80 mb-4">
          The core injury is cutaneous T-cell lymphoma (CTCL) — a rare,
          non-Hodgkin lymphoma in which malignant T-cells localize to the
          skin. Its most common forms are mycosis fungoides and the
          leukemic variant Sezary syndrome. CTCL is frequently mistaken for
          eczema or atopic dermatitis in its early stages, which is central to
          the litigation theory. The MDL petition also reaches related
          peripheral T-cell lymphomas (PTCL).
        </p>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-gray mb-2">
              Symptoms &amp; Presentation
            </p>
            <ul className="space-y-1.5">
              {[
                "Persistent, treatment-resistant skin patches or plaques",
                "Severe itching that does not respond to therapy",
                "Skin tumors or ulceration in advanced disease",
                "Generalized redness of the skin (erythroderma)",
                "Enlarged lymph nodes",
                "Disease that worsens rather than improves on treatment",
              ].map((s) => (
                <li
                  key={s}
                  className="flex items-start gap-2 text-sm text-midnight-navy/80"
                >
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-alert/60" />
                  {s}
                </li>
              ))}
            </ul>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-gray mb-2">
              Treatment
            </p>
            <p className="text-sm leading-relaxed text-midnight-navy/80">
              Skin-directed therapy (topical agents, phototherapy, localized
              radiation), systemic therapy, chemotherapy, and — in advanced
              cases — stem-cell transplant. Advanced-stage CTCL carries a
              materially worse prognosis, which is why a delayed or missed
              diagnosis is central to the alleged harm.
            </p>
            <div className="mt-4 rounded-md border border-warning/20 bg-amber-50 px-4 py-3">
              <p className="text-xs font-semibold text-warning">
                Diagnosis Pathway
              </p>
              <p className="mt-1 text-sm text-midnight-navy/80">
                Because early CTCL mimics atopic dermatitis, plaintiffs allege
                Dupixent was prescribed for what was actually an undiagnosed
                lymphoma — and that immune modulation then accelerated it.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ── 5. Scientific Evidence ──────────────────────────────────────── */}
      <div className="rounded-lg bg-white p-6 shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <FileText className="w-4.5 h-4.5 text-intelligence-teal" />
          <h2 className="font-heading text-lg font-semibold text-midnight-navy">
            Scientific Evidence
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-cloud">
                <th className="py-3 pr-4 text-xs font-semibold uppercase tracking-wider text-slate-gray">
                  Study / Source
                </th>
                <th className="py-3 px-3 text-xs font-semibold uppercase tracking-wider text-slate-gray text-center">
                  Year
                </th>
                <th className="py-3 px-3 text-xs font-semibold uppercase tracking-wider text-slate-gray text-center">
                  Source
                </th>
                <th className="py-3 pl-3 text-xs font-semibold uppercase tracking-wider text-slate-gray">
                  Finding
                </th>
              </tr>
            </thead>
            <tbody>
              {SCIENTIFIC_STUDIES.map((s) => (
                <tr
                  key={s.study}
                  className="border-b border-cloud/50 hover:bg-cloud/40 transition-colors"
                >
                  <td className="py-3 pr-4 font-medium text-midnight-navy">
                    {s.study}
                  </td>
                  <td className="py-3 px-3 text-center text-midnight-navy">
                    {s.year}
                  </td>
                  <td className="py-3 px-3 text-center">
                    <span className="inline-block rounded-full bg-intelligence-teal/10 px-2 py-0.5 text-xs font-medium text-intelligence-teal">
                      {s.source}
                    </span>
                  </td>
                  <td className="py-3 pl-3 text-midnight-navy/80">
                    {s.finding}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="mt-4 rounded-md border border-warning/20 bg-amber-50 px-4 py-3">
          <p className="text-sm text-midnight-navy/80">
            <span className="font-semibold text-warning">
              Causation is contested.
            </span>{" "}
            The headline study (Hasan et al., JAAD 2024) reports a four-fold
            CTCL association, but a competing &ldquo;unmasking&rdquo; hypothesis
            holds that CTCL was already present and misdiagnosed as atopic
            dermatitis before Dupixent. This is an unresolved scientific
            dispute — and the central battleground for both qualification
            screening and the defense.
          </p>
        </div>
      </div>

      {/* ── 5b. Live FAERS Signals (LIVE DATA) ──────────────────────────── */}
      <LiveFaersSignals
        data={faersSignals}
        injuryLabel="cutaneous T-cell lymphoma"
        concentrationMode="lawyer"
        methodologyNote="Lawyer-filed share is FAERS reports with an attorney primary-source qualification divided by all qualifying CTCL reports for the drug. The full-dataset lawyer-filed baseline is 0.73%; Dupixent's CTCL share well above it reflects direct plaintiff-firm reporting — an early litigation-activity indicator, not a clinical finding. Reports are matched on the exact FAERS medicinal-product names 'DUPIXENT' and 'DUPILUMAB' (dupilumab is a single-source biologic, so the generic name maps 1:1 to the brand). The injury is the cutaneous T-cell lymphoma preferred-term spectrum; bare 'Lymphoma' and B-cell terms are excluded."
      />

      {/* ── 6. Qualification Criteria ───────────────────────────────────── */}
      <div className="rounded-lg bg-white p-6 shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <Shield className="w-4.5 h-4.5 text-intelligence-teal" />
          <h2 className="font-heading text-lg font-semibold text-midnight-navy">
            Qualification Criteria
          </h2>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-cloud">
                <th className="py-3 pr-4 text-xs font-semibold uppercase tracking-wider text-slate-gray">
                  Criterion
                </th>
                <th className="py-3 px-3 text-xs font-semibold uppercase tracking-wider text-slate-gray">
                  Standard
                </th>
                <th className="py-3 pl-3 text-xs font-semibold uppercase tracking-wider text-slate-gray">
                  Notes
                </th>
              </tr>
            </thead>
            <tbody>
              {QUALIFICATION_CRITERIA.map((c) => (
                <tr
                  key={c.criterion}
                  className="border-b border-cloud/50 hover:bg-cloud/40 transition-colors"
                >
                  <td className="py-3 pr-4 font-medium text-midnight-navy whitespace-nowrap">
                    {c.criterion}
                  </td>
                  <td className="py-3 px-3 text-midnight-navy/80">
                    {c.standard}
                  </td>
                  <td className="py-3 pl-3 text-midnight-navy/60 text-xs">
                    {c.notes}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Common Screening Questions */}
        <h3 className="mt-6 mb-3 text-sm font-semibold text-midnight-navy">
          Common Screening Questions
        </h3>
        <div className="grid gap-1.5 sm:grid-cols-2">
          {SCREENING_QUESTIONS.map((q, i) => (
            <div
              key={i}
              className="flex items-start gap-2 rounded-md bg-cloud/60 px-3 py-2"
            >
              <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-intelligence-teal/10 text-[10px] font-bold text-intelligence-teal">
                {i + 1}
              </span>
              <p className="text-xs text-midnight-navy/80">{q}</p>
            </div>
          ))}
        </div>

        {/* Disqualifiers */}
        <h3 className="mt-6 mb-3 text-sm font-semibold text-midnight-navy">
          Disqualifiers
        </h3>
        <div className="grid gap-1.5 sm:grid-cols-2">
          {DISQUALIFIERS.map((d) => (
            <div
              key={d}
              className="flex items-center gap-2 rounded-md bg-red-50/60 px-3 py-2"
            >
              <XCircle className="w-3.5 h-3.5 shrink-0 text-alert/70" />
              <p className="text-xs text-midnight-navy/80">{d}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ── 7. Litigation Timeline ──────────────────────────────────────── */}
      <div className="rounded-lg bg-white p-6 shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <Clock className="w-4.5 h-4.5 text-intelligence-teal" />
          <h2 className="font-heading text-lg font-semibold text-midnight-navy">
            Litigation Timeline
          </h2>
        </div>
        <div className="overflow-x-auto pb-2">
          <div
            className="relative flex items-start"
            style={{ minWidth: `${LITIGATION_TIMELINE.length * 140}px` }}
          >
            <div className="absolute left-[70px] right-[70px] top-[52px] h-px bg-intelligence-teal/30" />
            {LITIGATION_TIMELINE.map((e, i) => (
              <div
                key={i}
                className={`flex min-w-[140px] flex-1 flex-col items-center text-center ${
                  e.future ? "opacity-60" : ""
                }`}
              >
                <p
                  className={`mb-2 text-[10px] font-semibold leading-tight ${
                    e.future ? "text-slate-gray" : "text-midnight-navy"
                  }`}
                >
                  {e.date}
                </p>
                <div
                  className={`relative z-10 h-3 w-3 shrink-0 rounded-full border-2 ${
                    e.future
                      ? "border-slate-gray/40 bg-white border-dashed"
                      : "border-intelligence-teal bg-intelligence-teal"
                  }`}
                />
                <p
                  className={`mt-2 max-w-[120px] text-[10px] leading-tight ${
                    e.future ? "italic text-slate-gray" : "text-midnight-navy/80"
                  }`}
                >
                  {e.short}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── 8. Advertising Landscape (LIVE DATA) ────────────────────────── */}
      <div className="rounded-lg bg-white p-6 shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp className="w-4.5 h-4.5 text-intelligence-teal" />
          <h2 className="font-heading text-lg font-semibold text-midnight-navy">
            Advertising Landscape
          </h2>
          {hasLiveData && (
            <span className="rounded-full bg-emerald-50 border border-success/30 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-success flex items-center gap-1">
              <Database className="w-3 h-3" /> Live Data
            </span>
          )}
        </div>

        {hasLiveData ? (
          <>
            <div className="grid grid-cols-2 gap-4 md:grid-cols-4 mb-6">
              <div className="rounded-lg bg-cloud/60 p-4">
                <div className="flex items-center gap-1.5 mb-2">
                  <Users className="w-3.5 h-3.5 text-intelligence-teal" />
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-gray">
                    Advertisers
                  </p>
                </div>
                <p className="text-2xl font-bold text-midnight-navy">
                  {fmtNum(totalAdvertisers)}
                </p>
              </div>
              <div className="rounded-lg bg-cloud/60 p-4">
                <div className="flex items-center gap-1.5 mb-2">
                  <DollarSign className="w-3.5 h-3.5 text-intelligence-teal" />
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-gray">
                    Est. Spend
                  </p>
                </div>
                <p className="text-2xl font-bold text-midnight-navy">
                  {fmtCur(totalSpend)}
                </p>
              </div>
              <div className="rounded-lg bg-cloud/60 p-4">
                <div className="flex items-center gap-1.5 mb-2">
                  <Eye className="w-3.5 h-3.5 text-intelligence-teal" />
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-gray">
                    Unique Creatives
                  </p>
                </div>
                <p className="text-2xl font-bold text-midnight-navy">
                  {fmtNum(totalCreatives)}
                </p>
              </div>
              <div className="rounded-lg bg-cloud/60 p-4">
                <div className="flex items-center gap-1.5 mb-2">
                  <Monitor className="w-3.5 h-3.5 text-intelligence-teal" />
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-gray">
                    Platforms
                  </p>
                </div>
                <p className="text-2xl font-bold text-midnight-navy">
                  {allPlatforms.size}
                </p>
                <div className="mt-1.5 flex flex-wrap gap-1">
                  {Array.from(allPlatforms)
                    .sort()
                    .map((p) => (
                      <span
                        key={p}
                        className="rounded-full px-2 py-0.5 text-[10px] font-medium text-white"
                        style={{ backgroundColor: PLATFORM_COLORS[p] ?? "#6B7280" }}
                      >
                        {p}
                      </span>
                    ))}
                </div>
              </div>
            </div>

            {segments.length > 0 && (
              <>
                <h3 className="mb-3 text-sm font-semibold text-midnight-navy">
                  Advertiser Segments
                </h3>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  {segments.map((seg) => {
                    const meta = segMeta(seg.segment);
                    const spendPct =
                      totalSpend > 0 ? (seg.total_spend / totalSpend) * 100 : 0;
                    return (
                      <div
                        key={seg.segment}
                        className="rounded-lg border p-4"
                        style={{ borderColor: meta.color + "40", backgroundColor: meta.bg }}
                      >
                        <p
                          className="text-xs font-bold uppercase tracking-wider"
                          style={{ color: meta.color }}
                        >
                          {meta.label}
                        </p>
                        <p className="mt-2 text-2xl font-bold text-midnight-navy">
                          {seg.advertiser_count}
                        </p>
                        <div className="mt-2 space-y-1">
                          <div className="flex justify-between text-xs text-slate-gray">
                            <span>Spend</span>
                            <span className="font-medium text-midnight-navy">
                              {fmtCur(seg.total_spend)}
                            </span>
                          </div>
                          <div className="h-1.5 w-full rounded-full bg-white/60">
                            <div
                              className={`h-1.5 rounded-full ${meta.bar}`}
                              style={{ width: `${Math.min(spendPct, 100)}%` }}
                            />
                          </div>
                          <div className="flex justify-between text-xs text-slate-gray">
                            <span>Creatives</span>
                            <span className="font-medium text-midnight-navy">
                              {fmtNum(seg.total_creatives)}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </>
        ) : (
          <div className="rounded-lg border border-cloud bg-cloud/40 p-8 text-center">
            <Database className="w-8 h-8 mx-auto mb-3 text-slate-gray/40" />
            <p className="text-sm font-medium text-midnight-navy/60">
              No Dupixent CTCL ad activity collected yet
            </p>
            <p className="mt-1 text-xs text-slate-gray">
              This is a pre-MDL tort. Ad-platform data is collected
              automatically and will populate here once firms begin running
              Dupixent CTCL campaigns.
            </p>
          </div>
        )}
      </div>

      {/* ── 8b. Cost Benchmark Scorecard (LIVE DATA) ───────────────────── */}
      <CostBenchmarkScorecard data={benchmark} />

      {/* ── 9. Footer / Disclaimer ──────────────────────────────────────── */}
      <div className="rounded-lg border border-cloud bg-cloud/40 p-5">
        <p className="text-xs leading-relaxed text-slate-gray">
          This is a pre-MDL evaluation surface, refreshed as the litigation
          develops. MDL No. 3180 had not been formed as of {AS_OF_DATE}; the
          MDL status reflects the JPML petition and the May 28, 2026
          consolidation hearing. The estimated CPA is an LMI planning estimate,
          not a litigation-derived figure. This page does not constitute legal
          advice.
        </p>
        <p className="mt-3 text-[11px] text-slate-gray/80">
          Data sources: openFDA FAERS, Journal of the American Academy of
          Dermatology (Hasan et al., 2024), JPML filings (MDL No. 3180), court
          records.
        </p>
      </div>

      <NewLandingPagesCard tortSlug="dupixent" tortLabel="Dupixent" />
      <AskAIPanel tortContext={DUPIXENT_TORT_CONTEXT} />
    </div>
  );
}
