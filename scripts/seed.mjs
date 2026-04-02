import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://inmktpwhpkiknctznrys.supabase.co";
const supabaseAnonKey =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlubWt0cHdocGtpa25jdHpucnlzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ2NDk3MzYsImV4cCI6MjA5MDIyNTczNn0.Hy170cM8JF6JLS61Vvar2RbSA0egvHXwazJeXCsMa5w";

const supabase = createClient(supabaseUrl, supabaseAnonKey);

// ---------- helpers ----------
function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}
function randBetween(min, max) {
  return Math.round(min + Math.random() * (max - min));
}
function randomDate(start, end) {
  const d = new Date(
    start.getTime() + Math.random() * (end.getTime() - start.getTime())
  );
  return d.toISOString().split("T")[0];
}

// ---------- Firms ----------
const firmsData = [
  { name: "Morgan & Morgan", slug: "morgan-morgan", firm_type: "plaintiff_firm", website: "https://www.forthepeople.com", headquarters_city: "Orlando", headquarters_state: "FL" },
  { name: "Simmons Hanly Conroy", slug: "simmons-hanly-conroy", firm_type: "plaintiff_firm", website: "https://www.simmonsfirm.com", headquarters_city: "Alton", headquarters_state: "IL" },
  { name: "Napoli Shkolnik", slug: "napoli-shkolnik", firm_type: "plaintiff_firm", website: "https://www.napolishkolnik.com", headquarters_city: "New York", headquarters_state: "NY" },
  { name: "Ben Crump Law", slug: "ben-crump-law", firm_type: "plaintiff_firm", website: "https://www.bencrump.com", headquarters_city: "Tallahassee", headquarters_state: "FL" },
  { name: "Weitz & Luxenberg", slug: "weitz-luxenberg", firm_type: "plaintiff_firm", website: "https://www.weitzlux.com", headquarters_city: "New York", headquarters_state: "NY" },
  { name: "Parker Waichman", slug: "parker-waichman", firm_type: "plaintiff_firm", website: "https://www.yourlawyer.com", headquarters_city: "Port Washington", headquarters_state: "NY" },
  { name: "Sokolove Law", slug: "sokolove-law", firm_type: "plaintiff_firm", website: "https://www.sokolovelaw.com", headquarters_city: "Boston", headquarters_state: "MA" },
  { name: "TorHoerman Law", slug: "torhoerman-law", firm_type: "plaintiff_firm", website: "https://www.torhoermanlaw.com", headquarters_city: "Edwardsville", headquarters_state: "IL" },
  { name: "Levin Papantonio Rafferty", slug: "levin-papantonio-rafferty", firm_type: "plaintiff_firm", website: "https://www.levinlaw.com", headquarters_city: "Pensacola", headquarters_state: "FL" },
  { name: "Beasley Allen", slug: "beasley-allen", firm_type: "plaintiff_firm", website: "https://www.beasleyallen.com", headquarters_city: "Montgomery", headquarters_state: "AL" },
  { name: "Cellino & Barnes", slug: "cellino-barnes", firm_type: "plaintiff_firm", website: "https://www.cellinoandbarnes.com", headquarters_city: "Buffalo", headquarters_state: "NY" },
  { name: "Jim Adler & Associates", slug: "jim-adler-associates", firm_type: "plaintiff_firm", website: "https://www.jimadler.com", headquarters_city: "Houston", headquarters_state: "TX" },
  { name: "Morris Bart", slug: "morris-bart", firm_type: "plaintiff_firm", website: "https://www.morrisbart.com", headquarters_city: "New Orleans", headquarters_state: "LA" },
  { name: "Lanier Law Firm", slug: "lanier-law-firm", firm_type: "plaintiff_firm", website: "https://www.lanierlawfirm.com", headquarters_city: "Houston", headquarters_state: "TX" },
  { name: "Motley Rice", slug: "motley-rice", firm_type: "plaintiff_firm", website: "https://www.motleyrice.com", headquarters_city: "Mount Pleasant", headquarters_state: "SC" },
  { name: "Brown & Crouppen", slug: "brown-crouppen", firm_type: "plaintiff_firm", website: "https://www.getbc.com", headquarters_city: "St. Louis", headquarters_state: "MO" },
  { name: "Pintas & Mullins", slug: "pintas-mullins", firm_type: "plaintiff_firm", website: "https://www.pintasandmullins.com", headquarters_city: "Chicago", headquarters_state: "IL" },
  { name: "Pond Lehocky", slug: "pond-lehocky", firm_type: "plaintiff_firm", website: "https://www.pondlehocky.com", headquarters_city: "Philadelphia", headquarters_state: "PA" },
  { name: "Nigh Goldenberg Raso & Vaughn", slug: "nigh-goldenberg-raso-vaughn", firm_type: "plaintiff_firm", website: "https://www.nghlaw.com", headquarters_city: "Columbus", headquarters_state: "OH" },
  { name: "Saiontz & Kirk", slug: "saiontz-kirk", firm_type: "plaintiff_firm", website: "https://www.saiontzandkirk.com", headquarters_city: "Baltimore", headquarters_state: "MD" },
  { name: "Girardi Keese", slug: "girardi-keese", firm_type: "plaintiff_firm", website: "https://www.girardikeese.com", headquarters_city: "Los Angeles", headquarters_state: "CA" },
  { name: "Fleming Nolen Jez", slug: "fleming-nolen-jez", firm_type: "plaintiff_firm", website: "https://www.flemingattorneys.com", headquarters_city: "Houston", headquarters_state: "TX" },
  { name: "Watts Guerra", slug: "watts-guerra", firm_type: "plaintiff_firm", website: "https://www.wattsguerra.com", headquarters_city: "San Antonio", headquarters_state: "TX" },
  { name: "Sanders Phillips Grossman", slug: "sanders-phillips-grossman", firm_type: "plaintiff_firm", website: "https://www.sandersphillips.com", headquarters_city: "Los Angeles", headquarters_state: "CA" },
  { name: "Wisner Baum", slug: "wisner-baum", firm_type: "plaintiff_firm", website: "https://www.wisnerbaum.com", headquarters_city: "Los Angeles", headquarters_state: "CA" },
];

// ---------- Markets ----------
const marketsData = [
  { market_code: "501", market_name: "New York", state_code: "NY", region: "Northeast", timezone_name: "America/New_York", latitude: 40.7128, longitude: -74.006 },
  { market_code: "803", market_name: "Los Angeles", state_code: "CA", region: "West", timezone_name: "America/Los_Angeles", latitude: 34.0522, longitude: -118.2437 },
  { market_code: "602", market_name: "Chicago", state_code: "IL", region: "Midwest", timezone_name: "America/Chicago", latitude: 41.8781, longitude: -87.6298 },
  { market_code: "618", market_name: "Houston", state_code: "TX", region: "South", timezone_name: "America/Chicago", latitude: 29.7604, longitude: -95.3698 },
  { market_code: "623", market_name: "Dallas-Fort Worth", state_code: "TX", region: "South", timezone_name: "America/Chicago", latitude: 32.7767, longitude: -96.797 },
  { market_code: "504", market_name: "Philadelphia", state_code: "PA", region: "Northeast", timezone_name: "America/New_York", latitude: 39.9526, longitude: -75.1652 },
  { market_code: "524", market_name: "Atlanta", state_code: "GA", region: "South", timezone_name: "America/New_York", latitude: 33.749, longitude: -84.388 },
  { market_code: "528", market_name: "Miami-Fort Lauderdale", state_code: "FL", region: "South", timezone_name: "America/New_York", latitude: 25.7617, longitude: -80.1918 },
  { market_code: "539", market_name: "Tampa-St. Petersburg", state_code: "FL", region: "South", timezone_name: "America/New_York", latitude: 27.9506, longitude: -82.4572 },
  { market_code: "753", market_name: "Phoenix", state_code: "AZ", region: "West", timezone_name: "America/Phoenix", latitude: 33.4484, longitude: -112.074 },
  { market_code: "751", market_name: "Denver", state_code: "CO", region: "West", timezone_name: "America/Denver", latitude: 39.7392, longitude: -104.9903 },
  { market_code: "609", market_name: "St. Louis", state_code: "MO", region: "Midwest", timezone_name: "America/Chicago", latitude: 38.627, longitude: -90.1994 },
  { market_code: "622", market_name: "New Orleans", state_code: "LA", region: "South", timezone_name: "America/Chicago", latitude: 29.9511, longitude: -90.0715 },
  { market_code: "630", market_name: "Birmingham", state_code: "AL", region: "South", timezone_name: "America/Chicago", latitude: 33.5186, longitude: -86.8104 },
  { market_code: "807", market_name: "San Francisco-Oakland", state_code: "CA", region: "West", timezone_name: "America/Los_Angeles", latitude: 37.7749, longitude: -122.4194 },
  { market_code: "819", market_name: "Seattle-Tacoma", state_code: "WA", region: "West", timezone_name: "America/Los_Angeles", latitude: 47.6062, longitude: -122.3321 },
  { market_code: "505", market_name: "Detroit", state_code: "MI", region: "Midwest", timezone_name: "America/Detroit", latitude: 42.3314, longitude: -83.0458 },
  { market_code: "613", market_name: "Minneapolis-St. Paul", state_code: "MN", region: "Midwest", timezone_name: "America/Chicago", latitude: 44.9778, longitude: -93.265 },
  { market_code: "506", market_name: "Boston", state_code: "MA", region: "Northeast", timezone_name: "America/New_York", latitude: 42.3601, longitude: -71.0589 },
  { market_code: "839", market_name: "Las Vegas", state_code: "NV", region: "West", timezone_name: "America/Los_Angeles", latitude: 36.1699, longitude: -115.1398 },
];

// ---------- Mass Torts ----------
const massTortsData = [
  { name: "Camp Lejeune", slug: "camp-lejeune", category: "environmental", status: "active", disease_or_injury: "Cancer, kidney disease, birth defects", product_or_exposure: "Contaminated water at Camp Lejeune" },
  { name: "Talcum Powder", slug: "talcum-powder", category: "product_liability", status: "active", disease_or_injury: "Ovarian cancer, mesothelioma", product_or_exposure: "Johnson & Johnson talcum powder" },
  { name: "AFFF Firefighting Foam", slug: "afff-firefighting-foam", category: "environmental", status: "active", disease_or_injury: "Cancer, thyroid disease", product_or_exposure: "PFAS-containing firefighting foam" },
  { name: "Roundup", slug: "roundup", category: "product_liability", status: "active", disease_or_injury: "Non-Hodgkin lymphoma", product_or_exposure: "Roundup weed killer (glyphosate)" },
  { name: "Paraquat", slug: "paraquat", category: "product_liability", status: "active", disease_or_injury: "Parkinson's disease", product_or_exposure: "Paraquat herbicide" },
  { name: "NEC Baby Formula", slug: "nec-baby-formula", category: "product_liability", status: "active", disease_or_injury: "Necrotizing enterocolitis (NEC)", product_or_exposure: "Cow's milk-based baby formula" },
  { name: "Hair Relaxer", slug: "hair-relaxer", category: "product_liability", status: "emerging", disease_or_injury: "Uterine cancer, endometriosis", product_or_exposure: "Chemical hair relaxer products" },
  { name: "Tylenol / Acetaminophen", slug: "tylenol-acetaminophen", category: "pharma", status: "active", disease_or_injury: "Autism, ADHD in children", product_or_exposure: "Acetaminophen during pregnancy" },
  { name: "Zantac", slug: "zantac", category: "pharma", status: "winding_down", disease_or_injury: "Cancer", product_or_exposure: "Ranitidine (Zantac)" },
  { name: "3M Earplugs", slug: "3m-earplugs", category: "product_liability", status: "winding_down", disease_or_injury: "Hearing loss, tinnitus", product_or_exposure: "3M Combat Arms Earplugs" },
  { name: "Hernia Mesh", slug: "hernia-mesh", category: "product_liability", status: "active", disease_or_injury: "Pain, infection, organ perforation", product_or_exposure: "Hernia mesh surgical implant" },
  { name: "CPAP", slug: "cpap", category: "product_liability", status: "active", disease_or_injury: "Cancer, respiratory injury", product_or_exposure: "Philips CPAP machines" },
  { name: "Ozempic / Mounjaro", slug: "ozempic-mounjaro", category: "pharma", status: "emerging", disease_or_injury: "Gastroparesis, bowel obstruction", product_or_exposure: "GLP-1 receptor agonist drugs" },
  { name: "Social Media Youth Harm", slug: "social-media-youth-harm", category: "product_liability", status: "emerging", disease_or_injury: "Anxiety, depression, self-harm", product_or_exposure: "Social media platforms" },
];

// ---------- Channel/source configs ----------
const channels = [
  { channel: "tv", source: "tv", platforms: ["ispot"], spendRange: [25000, 500000] },
  { channel: "ctv", source: "ctv", platforms: ["ispot", "mediaradar"], spendRange: [10000, 200000] },
  { channel: "digital", source: "google", platforms: ["google", "mediaradar"], spendRange: [2000, 80000] },
  { channel: "social", source: "meta", platforms: ["meta"], spendRange: [1000, 60000] },
  { channel: "radio", source: "radio", platforms: ["mediaradar"], spendRange: [500, 30000] },
  { channel: "search", source: "google", platforms: ["google"], spendRange: [1000, 50000] },
];

// Weighted distribution: big spenders vs smaller firms
const bigSpenderIndices = [0, 1, 2, 4, 7, 9, 14]; // Morgan & Morgan, Simmons, Napoli, Weitz, TorHoerman, Beasley, Motley Rice

async function main() {
  console.log("Starting seed...\n");

  // 1. Clear existing data (respect FK constraints)
  console.log("Clearing existing data...");
  const { error: delAd } = await supabase.from("ad_events").delete().gte("created_at", "1970-01-01");
  if (delAd) console.error("  ad_events delete error:", delAd.message);
  else console.log("  ad_events cleared");

  const { error: delMassTorts } = await supabase.from("mass_torts").delete().gte("created_at", "1970-01-01");
  if (delMassTorts) console.error("  mass_torts delete error:", delMassTorts.message);
  else console.log("  mass_torts cleared");

  const { error: delFirm } = await supabase.from("firms").delete().gte("created_at", "1970-01-01");
  if (delFirm) console.error("  firms delete error:", delFirm.message);
  else console.log("  firms cleared");

  const { error: delMarket } = await supabase.from("markets").delete().gte("created_at", "1970-01-01");
  if (delMarket) console.error("  markets delete error:", delMarket.message);
  else console.log("  markets cleared");

  // 2. Insert firms
  console.log("\nInserting firms...");
  const { data: firms, error: firmErr } = await supabase
    .from("firms")
    .insert(firmsData)
    .select("id, name");
  if (firmErr) {
    console.error("Firms insert error:", firmErr.message);
    process.exit(1);
  }
  console.log(`  Inserted ${firms.length} firms`);

  // 3. Insert markets
  console.log("Inserting markets...");
  const { data: markets, error: marketErr } = await supabase
    .from("markets")
    .insert(marketsData)
    .select("id, market_name");
  if (marketErr) {
    console.error("Markets insert error:", marketErr.message);
    process.exit(1);
  }
  console.log(`  Inserted ${markets.length} markets`);

  // 4. Insert mass torts
  console.log("Inserting mass torts...");
  const { data: massTorts, error: mtErr } = await supabase
    .from("mass_torts")
    .insert(massTortsData)
    .select("id, name");
  if (mtErr) {
    console.error("Mass torts insert error:", mtErr.message);
    process.exit(1);
  }
  console.log(`  Inserted ${massTorts.length} mass torts`);

  // 5. Generate ad_events
  console.log("\nGenerating ad events...");
  const startDate = new Date("2025-10-01");
  const endDate = new Date("2026-03-31");

  const adEvents = [];
  const targetCount = 180;

  for (let i = 0; i < targetCount; i++) {
    // Weighted firm selection: big spenders get more events
    const isBigSpender = Math.random() < 0.55;
    const firmIdx = isBigSpender
      ? pick(bigSpenderIndices)
      : randBetween(0, firms.length - 1);
    const firm = firms[firmIdx];

    // Market selection: bigger markets get more activity
    const topMarketBias = Math.random() < 0.5;
    const marketIdx = topMarketBias
      ? randBetween(0, 5) // top 6 markets more often
      : randBetween(0, markets.length - 1);
    const market = markets[marketIdx];

    // Channel selection
    const chConfig = pick(channels);

    // Spend: big spenders get higher spend, TV is most expensive
    let [minSpend, maxSpend] = chConfig.spendRange;
    if (isBigSpender) {
      minSpend = Math.round(minSpend * 1.5);
      maxSpend = Math.round(maxSpend * 2);
    }
    const spend = randBetween(minSpend, maxSpend);

    // Mass tort
    const massTort = pick(massTorts);

    // Impressions estimate (roughly 10-50 impressions per dollar for digital, less for TV)
    const impPerDollar =
      chConfig.channel === "tv" || chConfig.channel === "ctv"
        ? randBetween(5, 15)
        : randBetween(15, 50);
    const impressions = spend * impPerDollar;

    const eventDate = randomDate(startDate, endDate);

    adEvents.push({
      firm_id: firm.id,
      market_id: market.id,
      mass_tort_id: massTort.id,
      source: chConfig.source,
      source_event_id: `seed-${i.toString().padStart(4, "0")}`,
      event_date: eventDate,
      aired_at: `${eventDate}T${String(randBetween(6, 23)).padStart(2, "0")}:${String(randBetween(0, 59)).padStart(2, "0")}:00Z`,
      channel: chConfig.channel,
      platform: pick(chConfig.platforms),
      advertiser_name_raw: firm.name,
      campaign_name: `${massTort.name} - ${chConfig.channel.toUpperCase()} - ${market.market_name}`,
      spend_estimate: spend,
      impressions_estimate: impressions,
      airings_count:
        chConfig.channel === "tv" || chConfig.channel === "radio"
          ? randBetween(1, 50)
          : null,
      estimated_reach: Math.round(impressions * (0.3 + Math.random() * 0.4)),
      state_code: market.state_code,
      dma_code: market.market_code,
      metadata: {},
    });
  }

  // Insert in batches of 50
  let insertedCount = 0;
  for (let i = 0; i < adEvents.length; i += 50) {
    const batch = adEvents.slice(i, i + 50);
    const { data, error } = await supabase
      .from("ad_events")
      .insert(batch)
      .select("id");
    if (error) {
      console.error(`  Batch ${i / 50 + 1} error:`, error.message);
    } else {
      insertedCount += data.length;
    }
  }
  console.log(`  Inserted ${insertedCount} ad events`);

  // Summary
  console.log("\n--- Seed Complete ---");
  console.log(`  Firms:      ${firms.length}`);
  console.log(`  Markets:    ${markets.length}`);
  console.log(`  Mass Torts: ${massTorts.length}`);
  console.log(`  Ad Events:  ${insertedCount}`);
}

main().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
