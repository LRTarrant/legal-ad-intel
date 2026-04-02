import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://inmktpwhpkiknctznrys.supabase.co";
const supabaseAnonKey =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlubWt0cHdocGtpa25jdHpucnlzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ2NDk3MzYsImV4cCI6MjA5MDIyNTczNn0.Hy170cM8JF6JLS61Vvar2RbSA0egvHXwazJeXCsMa5w";

const supabase = createClient(supabaseUrl, supabaseAnonKey);

// ---------------------------------------------------------------------------
// Firms
// ---------------------------------------------------------------------------
const firms = [
  { name: "Morgan & Morgan", slug: "morgan-morgan", firm_type: "plaintiff_firm", website: "https://www.forthepeople.com", headquarters_city: "Orlando", headquarters_state: "FL" },
  { name: "Simmons Hanly Conroy", slug: "simmons-hanly-conroy", firm_type: "plaintiff_firm", website: "https://www.simmonsfirm.com", headquarters_city: "Alton", headquarters_state: "IL" },
  { name: "Napoli Shkolnik", slug: "napoli-shkolnik", firm_type: "plaintiff_firm", website: "https://www.napolishkolnik.com", headquarters_city: "New York", headquarters_state: "NY" },
  { name: "Ben Crump Law", slug: "ben-crump-law", firm_type: "plaintiff_firm", website: "https://www.bencrump.com", headquarters_city: "Tallahassee", headquarters_state: "FL" },
  { name: "Weitz & Luxenberg", slug: "weitz-luxenberg", firm_type: "plaintiff_firm", website: "https://www.weitzlux.com", headquarters_city: "New York", headquarters_state: "NY" },
  { name: "Parker Waichman", slug: "parker-waichman", firm_type: "plaintiff_firm", website: "https://www.yourlawyer.com", headquarters_city: "Port Washington", headquarters_state: "NY" },
  { name: "Sokolove Law", slug: "sokolove-law", firm_type: "plaintiff_firm", website: "https://www.sokolovelaw.com", headquarters_city: "Boston", headquarters_state: "MA" },
  { name: "TorHoerman Law", slug: "torhoerman-law", firm_type: "plaintiff_firm", website: "https://www.torhoermanlaw.com", headquarters_city: "Edwardsville", headquarters_state: "IL" },
  { name: "Levin Papantonio Rafferty", slug: "levin-papantonio", firm_type: "plaintiff_firm", website: "https://www.levinlaw.com", headquarters_city: "Pensacola", headquarters_state: "FL" },
  { name: "Beasley Allen", slug: "beasley-allen", firm_type: "plaintiff_firm", website: "https://www.beasleyallen.com", headquarters_city: "Montgomery", headquarters_state: "AL" },
  { name: "Cellino & Barnes", slug: "cellino-barnes", firm_type: "plaintiff_firm", website: "https://www.cellinobarnes.com", headquarters_city: "Buffalo", headquarters_state: "NY" },
  { name: "Jim Adler & Associates", slug: "jim-adler", firm_type: "plaintiff_firm", website: "https://www.jimadler.com", headquarters_city: "Houston", headquarters_state: "TX" },
  { name: "Morris Bart", slug: "morris-bart", firm_type: "plaintiff_firm", website: "https://www.morrisbart.com", headquarters_city: "New Orleans", headquarters_state: "LA" },
  { name: "Lanier Law Firm", slug: "lanier-law-firm", firm_type: "plaintiff_firm", website: "https://www.lanierlawfirm.com", headquarters_city: "Houston", headquarters_state: "TX" },
  { name: "Motley Rice", slug: "motley-rice", firm_type: "plaintiff_firm", website: "https://www.motleyrice.com", headquarters_city: "Mount Pleasant", headquarters_state: "SC" },
  { name: "Brown & Crouppen", slug: "brown-crouppen", firm_type: "plaintiff_firm", website: "https://www.getbc.com", headquarters_city: "St. Louis", headquarters_state: "MO" },
  { name: "Pintas & Mullins", slug: "pintas-mullins", firm_type: "plaintiff_firm", website: "https://www.pintasandmullins.com", headquarters_city: "Chicago", headquarters_state: "IL" },
  { name: "Pond Lehocky", slug: "pond-lehocky", firm_type: "plaintiff_firm", website: "https://www.pondlehocky.com", headquarters_city: "Philadelphia", headquarters_state: "PA" },
  { name: "Nigh Goldenberg Raso & Vaughn", slug: "nigh-goldenberg", firm_type: "plaintiff_firm", website: "https://www.nightlaw.com", headquarters_city: "Columbus", headquarters_state: "OH" },
  { name: "Saiontz & Kirk", slug: "saiontz-kirk", firm_type: "plaintiff_firm", website: "https://www.saiontzandkirk.com", headquarters_city: "Baltimore", headquarters_state: "MD" },
  { name: "Girardi Keese", slug: "girardi-keese", firm_type: "plaintiff_firm", website: "https://www.girardikeese.com", headquarters_city: "Los Angeles", headquarters_state: "CA" },
  { name: "Fleming Nolen Jez", slug: "fleming-nolen-jez", firm_type: "plaintiff_firm", website: "https://www.flemingnolenjez.com", headquarters_city: "Houston", headquarters_state: "TX" },
  { name: "Watts Guerra", slug: "watts-guerra", firm_type: "plaintiff_firm", website: "https://www.wattsguerra.com", headquarters_city: "San Antonio", headquarters_state: "TX" },
  { name: "Sanders Phillips Grossman", slug: "sanders-phillips-grossman", firm_type: "plaintiff_firm", website: "https://www.sandersphillips.com", headquarters_city: "Houston", headquarters_state: "TX" },
  { name: "Wisner Baum", slug: "wisner-baum", firm_type: "plaintiff_firm", website: "https://www.wisnerbaum.com", headquarters_city: "Los Angeles", headquarters_state: "CA" },
];

// ---------------------------------------------------------------------------
// Markets (US DMAs)
// ---------------------------------------------------------------------------
const markets = [
  { market_code: "501", market_name: "New York", state_code: "NY", region: "Northeast", timezone_name: "America/New_York", latitude: 40.7128, longitude: -74.0060 },
  { market_code: "803", market_name: "Los Angeles", state_code: "CA", region: "West", timezone_name: "America/Los_Angeles", latitude: 34.0522, longitude: -118.2437 },
  { market_code: "602", market_name: "Chicago", state_code: "IL", region: "Midwest", timezone_name: "America/Chicago", latitude: 41.8781, longitude: -87.6298 },
  { market_code: "618", market_name: "Houston", state_code: "TX", region: "South", timezone_name: "America/Chicago", latitude: 29.7604, longitude: -95.3698 },
  { market_code: "623", market_name: "Dallas-Fort Worth", state_code: "TX", region: "South", timezone_name: "America/Chicago", latitude: 32.7767, longitude: -96.7970 },
  { market_code: "504", market_name: "Philadelphia", state_code: "PA", region: "Northeast", timezone_name: "America/New_York", latitude: 39.9526, longitude: -75.1652 },
  { market_code: "524", market_name: "Atlanta", state_code: "GA", region: "South", timezone_name: "America/New_York", latitude: 33.7490, longitude: -84.3880 },
  { market_code: "528", market_name: "Miami-Fort Lauderdale", state_code: "FL", region: "South", timezone_name: "America/New_York", latitude: 25.7617, longitude: -80.1918 },
  { market_code: "539", market_name: "Tampa-St. Petersburg", state_code: "FL", region: "South", timezone_name: "America/New_York", latitude: 27.9506, longitude: -82.4572 },
  { market_code: "753", market_name: "Phoenix", state_code: "AZ", region: "West", timezone_name: "America/Phoenix", latitude: 33.4484, longitude: -112.0740 },
  { market_code: "751", market_name: "Denver", state_code: "CO", region: "West", timezone_name: "America/Denver", latitude: 39.7392, longitude: -104.9903 },
  { market_code: "609", market_name: "St. Louis", state_code: "MO", region: "Midwest", timezone_name: "America/Chicago", latitude: 38.6270, longitude: -90.1994 },
  { market_code: "622", market_name: "New Orleans", state_code: "LA", region: "South", timezone_name: "America/Chicago", latitude: 29.9511, longitude: -90.0715 },
  { market_code: "630", market_name: "Birmingham", state_code: "AL", region: "South", timezone_name: "America/Chicago", latitude: 33.5186, longitude: -86.8104 },
  { market_code: "807", market_name: "San Francisco-Oakland", state_code: "CA", region: "West", timezone_name: "America/Los_Angeles", latitude: 37.7749, longitude: -122.4194 },
  { market_code: "819", market_name: "Seattle-Tacoma", state_code: "WA", region: "West", timezone_name: "America/Los_Angeles", latitude: 47.6062, longitude: -122.3321 },
  { market_code: "505", market_name: "Detroit", state_code: "MI", region: "Midwest", timezone_name: "America/Detroit", latitude: 42.3314, longitude: -83.0458 },
  { market_code: "613", market_name: "Minneapolis-St. Paul", state_code: "MN", region: "Midwest", timezone_name: "America/Chicago", latitude: 44.9778, longitude: -93.2650 },
  { market_code: "506", market_name: "Boston", state_code: "MA", region: "Northeast", timezone_name: "America/New_York", latitude: 42.3601, longitude: -71.0589 },
  { market_code: "839", market_name: "Las Vegas", state_code: "NV", region: "West", timezone_name: "America/Los_Angeles", latitude: 36.1699, longitude: -115.1398 },
];

// ---------------------------------------------------------------------------
// Mass Torts
// ---------------------------------------------------------------------------
const massTorts = [
  { name: "Camp Lejeune Water Contamination", slug: "camp-lejeune", category: "environmental", status: "active", disease_or_injury: "Cancer, neurological disorders", product_or_exposure: "Contaminated water at Camp Lejeune" },
  { name: "Talcum Powder", slug: "talcum-powder", category: "product_liability", status: "active", disease_or_injury: "Ovarian cancer, mesothelioma", product_or_exposure: "Johnson & Johnson talc products" },
  { name: "AFFF Firefighting Foam", slug: "afff-firefighting-foam", category: "environmental", status: "active", disease_or_injury: "Cancer, thyroid disease", product_or_exposure: "PFAS-containing firefighting foam" },
  { name: "Roundup Weed Killer", slug: "roundup", category: "product_liability", status: "active", disease_or_injury: "Non-Hodgkin lymphoma", product_or_exposure: "Roundup (glyphosate)" },
  { name: "Paraquat Herbicide", slug: "paraquat", category: "product_liability", status: "active", disease_or_injury: "Parkinson's disease", product_or_exposure: "Paraquat herbicide" },
  { name: "NEC Baby Formula", slug: "nec-baby-formula", category: "product_liability", status: "active", disease_or_injury: "Necrotizing enterocolitis in premature infants", product_or_exposure: "Cow's milk-based formula" },
  { name: "Hair Relaxer", slug: "hair-relaxer", category: "product_liability", status: "active", disease_or_injury: "Uterine cancer, endometriosis", product_or_exposure: "Chemical hair relaxers" },
  { name: "Tylenol / Acetaminophen", slug: "tylenol-acetaminophen", category: "pharma", status: "active", disease_or_injury: "Autism, ADHD in children", product_or_exposure: "Acetaminophen during pregnancy" },
  { name: "Zantac (Ranitidine)", slug: "zantac", category: "pharma", status: "winding_down", disease_or_injury: "Cancer (bladder, stomach, liver)", product_or_exposure: "Zantac / ranitidine" },
  { name: "3M Earplugs", slug: "3m-earplugs", category: "product_liability", status: "winding_down", disease_or_injury: "Hearing loss, tinnitus", product_or_exposure: "3M Combat Arms Earplugs" },
  { name: "Hernia Mesh", slug: "hernia-mesh", category: "product_liability", status: "active", disease_or_injury: "Mesh failure, chronic pain, infection", product_or_exposure: "Surgical hernia mesh implants" },
  { name: "CPAP Devices", slug: "cpap", category: "product_liability", status: "active", disease_or_injury: "Cancer, respiratory injury", product_or_exposure: "Philips CPAP/BiPAP machines" },
  { name: "Ozempic / Mounjaro", slug: "ozempic-mounjaro", category: "pharma", status: "emerging", disease_or_injury: "Gastroparesis, bowel obstruction", product_or_exposure: "GLP-1 receptor agonists" },
  { name: "Social Media Youth Harm", slug: "social-media-youth", category: "product_liability", status: "emerging", disease_or_injury: "Depression, anxiety, self-harm in teens", product_or_exposure: "Social media platforms" },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function randomElement(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomBetween(min, max) {
  return Math.round(min + Math.random() * (max - min));
}

function randomDate(start, end) {
  const d = new Date(
    start.getTime() + Math.random() * (end.getTime() - start.getTime()),
  );
  return d.toISOString().split("T")[0];
}

const channels = ["tv", "digital", "radio", "social", "ctv", "search", "print"];
const platforms = {
  tv: ["ispot", "mediaradar"],
  digital: ["google", "meta", "mediaradar"],
  radio: ["mediaradar", "radio_analytics"],
  social: ["meta", "tiktok", "instagram"],
  ctv: ["ispot", "roku", "amazon_fire"],
  search: ["google", "bing"],
  print: ["mediaradar"],
};
const sources = ["meta", "google", "tv", "ctv", "radio", "other"];

// Spend ranges by channel (min, max)
const spendRanges = {
  tv: [15000, 500000],
  digital: [1000, 120000],
  radio: [500, 25000],
  social: [500, 60000],
  ctv: [5000, 200000],
  search: [1000, 80000],
  print: [2000, 40000],
};

// Some firms are big spenders (indices into firms array)
const bigSpenderIndices = [0, 1, 2, 4, 6, 10, 14]; // Morgan & Morgan, Simmons, Napoli, Weitz, Sokolove, Cellino, Motley Rice

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
async function seed() {
  console.log("Clearing existing data...");

  // Delete in FK order
  const { error: delAd } = await supabase.from("ad_events").delete().neq("id", "00000000-0000-0000-0000-000000000000");
  if (delAd) console.error("Error deleting ad_events:", delAd.message);
  else console.log("  Cleared ad_events");

  const { error: delMt } = await supabase.from("mass_torts").delete().neq("id", "00000000-0000-0000-0000-000000000000");
  if (delMt) console.error("Error deleting mass_torts:", delMt.message);
  else console.log("  Cleared mass_torts");

  const { error: delFirms } = await supabase.from("firms").delete().neq("id", "00000000-0000-0000-0000-000000000000");
  if (delFirms) console.error("Error deleting firms:", delFirms.message);
  else console.log("  Cleared firms");

  const { error: delMarkets } = await supabase.from("markets").delete().neq("id", "00000000-0000-0000-0000-000000000000");
  if (delMarkets) console.error("Error deleting markets:", delMarkets.message);
  else console.log("  Cleared markets");

  // ---- Insert firms ----
  console.log("\nInserting firms...");
  const { data: insertedFirms, error: firmErr } = await supabase
    .from("firms")
    .insert(firms)
    .select("id, name");

  if (firmErr) {
    console.error("Error inserting firms:", firmErr.message);
    return;
  }
  console.log(`  Inserted ${insertedFirms.length} firms`);

  // ---- Insert markets ----
  console.log("Inserting markets...");
  const { data: insertedMarkets, error: marketErr } = await supabase
    .from("markets")
    .insert(markets)
    .select("id, market_name, market_code");

  if (marketErr) {
    console.error("Error inserting markets:", marketErr.message);
    return;
  }
  console.log(`  Inserted ${insertedMarkets.length} markets`);

  // ---- Insert mass torts ----
  console.log("Inserting mass torts...");
  const { data: insertedTorts, error: tortErr } = await supabase
    .from("mass_torts")
    .insert(massTorts)
    .select("id, name, slug");

  if (tortErr) {
    console.error("Error inserting mass_torts:", tortErr.message);
    return;
  }
  console.log(`  Inserted ${insertedTorts.length} mass torts`);

  // ---- Generate ad events ----
  console.log("Generating ad events...");

  const startDate = new Date("2025-10-01");
  const endDate = new Date("2026-03-31");
  const adEvents = [];

  for (let i = 0; i < 180; i++) {
    const firmIdx = bigSpenderIndices.includes(i % firms.length)
      ? randomElement(bigSpenderIndices)
      : i % firms.length;
    const firm = insertedFirms[firmIdx];
    const market = randomElement(insertedMarkets);
    const tort = randomElement(insertedTorts);
    const channel = randomElement(channels);
    const platform = randomElement(platforms[channel]);
    const source = randomElement(sources);
    const eventDate = randomDate(startDate, endDate);

    const isBigSpender = bigSpenderIndices.includes(firmIdx);
    const [minSpend, maxSpend] = spendRanges[channel];
    const spendMultiplier = isBigSpender ? 1.5 : 1;
    const spend = Math.round(
      randomBetween(minSpend, maxSpend) * spendMultiplier,
    );

    const impressions = Math.round(spend * randomBetween(8, 25));
    const airings = channel === "tv" || channel === "ctv" || channel === "radio"
      ? randomBetween(1, 50)
      : null;
    const reach = Math.round(impressions * (0.3 + Math.random() * 0.4));

    adEvents.push({
      firm_id: firm.id,
      market_id: market.id,
      mass_tort_id: tort.id,
      source,
      source_event_id: `seed-${i}-${Date.now()}`,
      event_date: eventDate,
      channel,
      platform,
      advertiser_name_raw: firm.name,
      campaign_name: `${tort.name} - ${channel.toUpperCase()} ${eventDate.slice(0, 7)}`,
      spend_estimate: spend,
      impressions_estimate: impressions,
      airings_count: airings,
      estimated_reach: reach,
      state_code: market.market_code ? (markets.find(m => m.market_code === market.market_code)?.state_code ?? null) : null,
      dma_code: market.market_code,
      metadata: {},
    });
  }

  // Insert in batches of 50
  console.log("Inserting ad events...");
  let totalInserted = 0;
  for (let i = 0; i < adEvents.length; i += 50) {
    const batch = adEvents.slice(i, i + 50);
    const { data, error } = await supabase.from("ad_events").insert(batch).select("id");
    if (error) {
      console.error(`Error inserting ad_events batch ${i}:`, error.message);
    } else {
      totalInserted += data.length;
    }
  }
  console.log(`  Inserted ${totalInserted} ad events`);

  console.log("\nSeed complete!");
  console.log(`  Firms: ${insertedFirms.length}`);
  console.log(`  Markets: ${insertedMarkets.length}`);
  console.log(`  Mass Torts: ${insertedTorts.length}`);
  console.log(`  Ad Events: ${totalInserted}`);
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
