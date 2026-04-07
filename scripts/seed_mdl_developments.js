const { createClient } = require("@supabase/supabase-js");

const supabase = createClient(
  "https://inmktpwhpkiknctznrys.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlubWt0cHdocGtpa25jdHpucnlzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ2NDk3MzYsImV4cCI6MjA5MDIyNTczNn0.Hy170cM8JF6JLS61Vvar2RbSA0egvHXwazJeXCsMa5w"
);

const developments = [
  // MDL 3047 - Social Media Addiction
  {
    mdl_number: 3047,
    event_date: "2026-03-25",
    event_type: "verdict",
    title: "$6M Bellwether Verdict Against Meta and YouTube",
    summary:
      "Jury found Meta and YouTube negligent for addictive design harming a young user. Meta ordered to pay $4.2M, YouTube $1.8M.",
    source_name: "NPR",
    source_url:
      "https://www.npr.org/2026/03/25/nx-s1-5746125/meta-youtube-social-media-trial-verdict",
  },
  {
    mdl_number: 3047,
    event_date: "2026-03-26",
    event_type: "verdict",
    title: "$375M New Mexico Jury Verdict Against Meta",
    summary:
      "New Mexico jury ordered Meta to pay $375M after finding the company misled users about platform safety and put children at risk.",
    source_name: "Sokolove Law",
    source_url:
      "https://www.sokolovelaw.com/personal-injury/social-media-addiction/",
  },
  {
    mdl_number: 3047,
    event_date: "2025-06-01",
    event_type: "ruling",
    title: "Section 230 and First Amendment Defenses Rejected",
    summary:
      "Judge ruled that Section 230 and the First Amendment do not shield social media companies from product liability claims in the MDL.",
    source_name: "King Law",
    source_url:
      "https://www.robertkinglawfirm.com/personal-injury/social-media-addiction-lawsuit/",
  },
  // PFAS - MDL 2433
  {
    mdl_number: 2433,
    event_date: "2026-03-31",
    event_type: "ruling",
    title:
      "Phase 2 Municipal Settlement Claims Deadline for $12B+ PFAS Settlements",
    summary:
      "Municipalities faced March 31 deadline to file Phase 2 testing claims for 3M and DuPont settlement funds or forfeit their share.",
    source_name: "LlamaLab",
    source_url:
      "https://www.llamalab.ai/blog/pfas-litigation-15000-cases-settlement-deadlines-2026",
  },
  {
    mdl_number: 2433,
    event_date: "2026-03-10",
    event_type: "settlement",
    title: "DOJ Reports $421M+ Paid in PFAS-Related Camp Lejeune Settlements",
    summary:
      "Since January 2025, DOJ has paid more than $421M in Elective Option settlements to Camp Lejeune victims.",
    source_name: "DOJ",
    source_url:
      "https://www.justice.gov/opa/pr/department-justice-approves-historic-number-settlements-camp-lejeune-victims-and-families",
  },
  // Camp Lejeune - MDL 3049
  {
    mdl_number: 3049,
    event_date: "2026-03-10",
    event_type: "settlement",
    title: "DOJ Approves 649 Camp Lejeune Settlements Worth $175M in Three Weeks",
    summary:
      "DOJ Civil Division approved 649 Elective Option offers totaling $175M. Total approved settlements now exceed $708M across 2,531 offers.",
    source_name: "DOJ",
    source_url:
      "https://www.justice.gov/opa/pr/department-justice-approves-historic-number-settlements-camp-lejeune-victims-and-families",
  },
  {
    mdl_number: 3049,
    event_date: "2026-02-15",
    event_type: "ruling",
    title: "Global Settlement Framework Negotiations Continue",
    summary:
      "Both sides continue working on a potential global settlement agreement with court assistance. Regular settlement meetings ongoing.",
    source_name: "Consumer Notice",
    source_url:
      "https://www.consumernotice.org/legal/camp-lejeune-lawsuits/",
  },
  // Paragard - MDL 2974
  {
    mdl_number: 2974,
    event_date: "2026-02-04",
    event_type: "bellwether trial",
    title: "Defense Verdict in First Paragard Bellwether Trial",
    summary:
      "Jury found in favor of Teva Pharmaceuticals on all counts including failure to warn, defective design, and fraud. Deliberation lasted approximately four hours.",
    source_name: "Goldman Ismail",
    source_url:
      "https://www.goldmanismail.com/first-paragard-iud-win/",
  },
  {
    mdl_number: 2974,
    event_date: "2026-02-17",
    event_type: "ruling",
    title: "Second Paragard Bellwether Trial Rescheduled to Fall 2026",
    summary:
      "Judge indicated the second bellwether trial will be rescheduled to fall 2026 to allow more time for motions and preparation.",
    source_name: "King Law",
    source_url:
      "https://www.robertkinglawfirm.com/mass-torts/paragard-iud-lawsuit/",
  },
  // Hair Relaxer - MDL 3060
  {
    mdl_number: 3060,
    event_date: "2026-01-08",
    event_type: "ruling",
    title: "Science Day Hearing on General Causation Held",
    summary:
      "Both sides presented scientific positions on epidemiology, toxicology, and general causation to Judge Rowland before formal Daubert briefing.",
    source_name: "LlamaLab",
    source_url:
      "https://www.llamalab.ai/blog/hair-relaxer-lawsuits-11000-cases-2026-update",
  },
  {
    mdl_number: 3060,
    event_date: "2026-03-05",
    event_type: "ruling",
    title: "Discovery Disputes Resolved at Status Hearing",
    summary:
      "Magistrate Judge Jantz held status hearing on discovery disputes and issued order governing discovery proceedings for the coming weeks.",
    source_name: "Miller & Zois",
    source_url:
      "https://www.millerandzois.com/products-liability/hair-relaxer-lawsuit/",
  },
  {
    mdl_number: 3060,
    event_date: "2026-02-01",
    event_type: "filing",
    title: "Hair Relaxer MDL Reaches 11,195 Pending Cases",
    summary:
      "MDL added 247 new cases in a single month, bringing total pending lawsuits to 11,195 before Judge Rowland.",
    source_name: "LlamaLab",
    source_url:
      "https://www.llamalab.ai/blog/hair-relaxer-lawsuits-11000-cases-2026-update",
  },
  // J&J Talc - MDL 2738
  {
    mdl_number: 2738,
    event_date: "2026-01-15",
    event_type: "ruling",
    title: "Third J&J Bankruptcy Attempt Rejected",
    summary:
      "Bankruptcy judge rejected Johnson & Johnson's third attempt to use Chapter 11 to resolve talc claims. J&J confirmed it will not attempt a fourth filing.",
    source_name: "Miller & Zois",
    source_url:
      "https://www.millerandzois.com/products-liability/medical-device-lawsuits/talcum-powder/",
  },
  // NEC Baby Formula - MDL 3026
  {
    mdl_number: 3026,
    event_date: "2026-02-01",
    event_type: "ruling",
    title: "Plaintiffs' Causation Experts Cleared to Testify",
    summary:
      "Judge Pallmeyer denied defense Daubert motions, allowing plaintiffs to present medical and scientific opinions linking cow's milk-based formulas to NEC.",
    source_name: "Lawsuit Legal News",
    source_url:
      "https://www.lawsuitlegalnews.com/nec-baby-formula-lawsuits/",
  },
  {
    mdl_number: 3026,
    event_date: "2026-03-01",
    event_type: "ruling",
    title: "Third Consecutive Bellwether Trial Dismissed",
    summary:
      "Third bellwether trial dismissed, but court stressed the decision has limited bearing on the broader litigation with hundreds of cases pending.",
    source_name: "Lawsuit Legal News",
    source_url:
      "https://www.lawsuitlegalnews.com/nec-baby-formula-lawsuits/",
  },
  // Depo-Provera - MDL 3140
  {
    mdl_number: 3140,
    event_date: "2026-01-27",
    event_type: "ruling",
    title: "Preemption and Expert Rulings to Apply MDL-Wide",
    summary:
      "Court ruled that upcoming decisions on federal preemption and expert causation will apply across the entire MDL, not just the five pilot cases.",
    source_name: "Lawsuit Information Center",
    source_url:
      "https://www.lawsuit-information-center.com/depo-provera-lawsuit.html",
  },
  {
    mdl_number: 3140,
    event_date: "2026-03-20",
    event_type: "ruling",
    title: "Plaintiff Leadership Team Reappointed",
    summary:
      "Court reappointed lead and co-lead attorneys for one-year terms through spring 2027. Over 1,700 cases now pending.",
    source_name: "Sokolove Law",
    source_url:
      "https://www.sokolovelaw.com/dangerous-drugs/depo-provera/",
  },
];

async function seed() {
  // Check if table already has rows
  const { count, error: countError } = await supabase
    .from("mdl_developments")
    .select("*", { count: "exact", head: true });

  if (countError) {
    console.error("Error checking existing rows:", countError.message);
    console.error(
      "The mdl_developments table may not exist yet. Run: supabase db push"
    );
    process.exit(1);
  }

  if (count && count > 0) {
    console.log(
      `Table already has ${count} rows. Skipping seed to avoid duplicates.`
    );
    process.exit(0);
  }

  const { data, error } = await supabase
    .from("mdl_developments")
    .insert(developments)
    .select();

  if (error) {
    console.error("Error seeding developments:", error.message);
    process.exit(1);
  }

  console.log(`Inserted ${data.length} development rows.`);
}

seed();
