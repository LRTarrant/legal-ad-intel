import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/* ── Tort category lists ──────────────────────────────────────────────── */

const CANCER_TORTS = [
  "Roundup",
  "Talcum Powder",
  "AFFF",
  "Paraquat",
  "Hair Relaxer",
];
const ACCIDENT_TORTS = [
  "Motor Vehicle",
  "Large Truck",
  "Motorcycle",
  "Auto Injury",
  "Truck Accident",
];

/* ── Hardcoded fallback populations (2024 Census estimates) ───────────── */

const STATE_POPULATIONS: Record<string, number> = {
  AL: 5108468, AK: 733406, AZ: 7431344, AR: 3067732, CA: 38965193,
  CO: 5877610, CT: 3617176, DE: 1031890, DC: 678972, FL: 22610726,
  GA: 11029227, HI: 1435138, ID: 1964726, IL: 12549689, IN: 6862199,
  IA: 3207004, KS: 2940546, KY: 4526154, LA: 4573749, ME: 1395722,
  MD: 6180253, MA: 7001399, MI: 10037261, MN: 5737915, MS: 2939690,
  MO: 6196156, MT: 1132812, NE: 1978379, NV: 3194176, NH: 1402054,
  NJ: 9290841, NM: 2117522, NY: 19571216, NC: 10835491, ND: 783926,
  OH: 11785935, OK: 4053824, OR: 4233358, PA: 12961683, RI: 1095962,
  SC: 5373555, SD: 919318, TN: 7126489, TX: 30503301, UT: 3417734,
  VT: 647464, VA: 8642274, WA: 7812880, WV: 1770071, WI: 5893718,
  WY: 576851,
};

const TOP_10_POP_STATES = Object.entries(STATE_POPULATIONS)
  .sort(([, a], [, b]) => b - a)
  .slice(0, 10)
  .map(([st]) => st);

/* ── Helpers ──────────────────────────────────────────────────────────── */

const extract = <T>(
  result: PromiseSettledResult<{ data: T | null; error: unknown }>,
): T | null => {
  if (result.status === "fulfilled" && !result.value.error) {
    return result.value.data;
  }
  return null;
};

type TortCategory = "cancer" | "accident" | "other";

function categorizeTort(name: string): TortCategory {
  const lower = name.toLowerCase();
  if (CANCER_TORTS.some((t) => lower.includes(t.toLowerCase()))) return "cancer";
  if (ACCIDENT_TORTS.some((t) => lower.includes(t.toLowerCase()))) return "accident";
  return "other";
}

function normalize(values: number[]): number[] {
  const max = Math.max(...values, 1);
  return values.map((v) => (v / max) * 100);
}

interface ScoredState {
  state: string;
  state_name: string;
  score: number;
  signals: string[];
  primary_signal: string;
}

/* ── State name map ───────────────────────────────────────────────────── */

const STATE_NAMES: Record<string, string> = {
  AL: "Alabama", AK: "Alaska", AZ: "Arizona", AR: "Arkansas", CA: "California",
  CO: "Colorado", CT: "Connecticut", DE: "Delaware", DC: "District of Columbia",
  FL: "Florida", GA: "Georgia", HI: "Hawaii", ID: "Idaho", IL: "Illinois",
  IN: "Indiana", IA: "Iowa", KS: "Kansas", KY: "Kentucky", LA: "Louisiana",
  ME: "Maine", MD: "Maryland", MA: "Massachusetts", MI: "Michigan",
  MN: "Minnesota", MS: "Mississippi", MO: "Missouri", MT: "Montana",
  NE: "Nebraska", NV: "Nevada", NH: "New Hampshire", NJ: "New Jersey",
  NM: "New Mexico", NY: "New York", NC: "North Carolina", ND: "North Dakota",
  OH: "Ohio", OK: "Oklahoma", OR: "Oregon", PA: "Pennsylvania",
  RI: "Rhode Island", SC: "South Carolina", SD: "South Dakota", TN: "Tennessee",
  TX: "Texas", UT: "Utah", VT: "Vermont", VA: "Virginia", WA: "Washington",
  WV: "West Virginia", WI: "Wisconsin", WY: "Wyoming",
};

const ALL_STATES = Object.keys(STATE_NAMES);

/* ── POST handler ─────────────────────────────────────────────────────── */

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { tort_name } = body as { tort_name?: string };

    if (!tort_name) {
      return NextResponse.json({ recommended_markets: [] });
    }

    const category = categorizeTort(tort_name);
    const db = supabase as any;

    // Parallel data fetches with Promise.allSettled
    const [
      cancerResult,
      farsResult,
      piResult,
      saturationResult,
      trendsResult,
      audienceResult,
      censusResult,
    ] = await Promise.allSettled([
      category === "cancer"
        ? db.from("cancer_incidence").select("*")
        : Promise.resolve({ data: [], error: null }),
      category === "accident"
        ? db.from("fars_fatalities").select("*")
        : Promise.resolve({ data: [], error: null }),
      category === "accident"
        ? db.from("pi_viability_scores").select("*")
        : Promise.resolve({ data: [], error: null }),
      db.from("ad_saturation_scores").select("*"),
      db
        .from("google_trends_observations")
        .select("*")
        .ilike("keyword", `%${tort_name}%`)
        .order("week_of", { ascending: false })
        .limit(200),
      db
        .from("tort_audience_profiles")
        .select("*")
        .ilike("tort_id", `%${tort_name}%`),
      db.from("census_demographics").select("*"),
    ]);

    const cancerData =
      (extract(cancerResult) as Record<string, unknown>[] | null) ?? [];
    const farsData =
      (extract(farsResult) as Record<string, unknown>[] | null) ?? [];
    const piData =
      (extract(piResult) as Record<string, unknown>[] | null) ?? [];
    const saturationData =
      (extract(saturationResult) as Record<string, unknown>[] | null) ?? [];
    const trendsData =
      (extract(trendsResult) as Record<string, unknown>[] | null) ?? [];
    const audienceData =
      (extract(audienceResult) as Record<string, unknown>[] | null) ?? [];
    const censusData =
      (extract(censusResult) as Record<string, unknown>[] | null) ?? [];

    // Build population map — census table or hardcoded fallback
    const populations = new Map<string, number>();
    if (censusData.length > 0) {
      for (const row of censusData) {
        const st = row.state as string;
        const pop = Number(row.population ?? row.total_population ?? 0);
        if (st && pop > 0) populations.set(st, (populations.get(st) ?? 0) + pop);
      }
    }
    if (populations.size === 0) {
      for (const [st, pop] of Object.entries(STATE_POPULATIONS)) {
        populations.set(st, pop);
      }
    }

    // Aggregate cancer incidence by state
    const incidenceByState = new Map<string, number>();
    for (const row of cancerData) {
      const st = row.state as string;
      const val = Number(
        row.age_adjusted_rate ?? row.rate ?? row.count ?? row.cases ?? 0,
      );
      if (st) incidenceByState.set(st, (incidenceByState.get(st) ?? 0) + val);
    }

    // Aggregate fatalities by state
    const fatalitiesByState = new Map<string, number>();
    for (const row of farsData) {
      const st = row.state as string;
      const val = Number(row.fatalities ?? row.deaths ?? row.count ?? 0);
      if (st) fatalitiesByState.set(st, (fatalitiesByState.get(st) ?? 0) + val);
    }

    // PI viability by state
    const piByState = new Map<string, number>();
    for (const row of piData) {
      const st = row.state as string;
      const score = Number(row.composite_score ?? row.score ?? 0);
      if (st) piByState.set(st, score);
    }

    // Saturation by state (tort-specific or general)
    const saturationByState = new Map<string, number>();
    for (const row of saturationData) {
      const st = row.state as string;
      const tortMatch = (row.tort_name as string) ?? "";
      if (!st) continue;
      if (tortMatch.toLowerCase().includes(tort_name.toLowerCase())) {
        saturationByState.set(
          st,
          Number(row.saturation_score ?? row.score ?? 50),
        );
      } else if (!saturationByState.has(st)) {
        saturationByState.set(
          st,
          Number(row.saturation_score ?? row.score ?? 50),
        );
      }
    }

    // Google Trends momentum by state (or global if no state breakdown)
    const trendMomentumByState = new Map<string, number>();
    if (trendsData.length >= 4) {
      // Check if data has state breakdown
      const hasStateBreakdown = trendsData.some(
        (r) => r.state && (r.state as string).length === 2,
      );
      if (hasStateBreakdown) {
        const byState = new Map<string, Record<string, unknown>[]>();
        for (const row of trendsData) {
          const st = row.state as string;
          if (st) byState.set(st, [...(byState.get(st) ?? []), row]);
        }
        for (const [st, rows] of byState) {
          const sorted = rows.sort(
            (a, b) =>
              new Date(b.week_of as string).getTime() -
              new Date(a.week_of as string).getTime(),
          );
          if (sorted.length >= 4) {
            const recent =
              sorted
                .slice(0, 4)
                .reduce((s, r) => s + Number(r.interest ?? 0), 0) / 4;
            const older =
              sorted
                .slice(4, 8)
                .reduce((s, r) => s + Number(r.interest ?? 0), 0) /
              Math.min(sorted.slice(4, 8).length, 4);
            if (older > 0) {
              trendMomentumByState.set(st, ((recent - older) / older) * 100);
            }
          }
        }
      } else {
        // Global trend — apply uniformly
        const recent =
          trendsData
            .slice(0, 4)
            .reduce((s, r) => s + Number(r.interest ?? 0), 0) / 4;
        const older =
          trendsData
            .slice(4, 8)
            .reduce((s, r) => s + Number(r.interest ?? 0), 0) /
          Math.min(trendsData.slice(4, 8).length, 4);
        const momentum = older > 0 ? ((recent - older) / older) * 100 : 0;
        for (const st of ALL_STATES) {
          trendMomentumByState.set(st, momentum);
        }
      }
    }

    // Audience match (if available)
    const audienceProfile = audienceData[0] ?? null;

    // ── Score each state ─────────────────────────────────────────────────
    const rawScores: {
      state: string;
      components: Record<string, number>;
    }[] = [];

    for (const state of ALL_STATES) {
      const pop = populations.get(state) ?? 0;
      const components: Record<string, number> = {};

      if (category === "cancer") {
        components.incidence = incidenceByState.get(state) ?? 0;
        components.population = pop;
        components.saturation_inv = 100 - (saturationByState.get(state) ?? 50);
        components.trend = Math.max(0, trendMomentumByState.get(state) ?? 0);
      } else if (category === "accident") {
        components.fatalities = fatalitiesByState.get(state) ?? 0;
        components.pi_viability = piByState.get(state) ?? 0;
        components.population = pop;
        components.saturation_inv = 100 - (saturationByState.get(state) ?? 50);
      } else {
        // pharma/device/other
        components.population = pop;
        components.saturation_inv = 100 - (saturationByState.get(state) ?? 50);
        components.trend = Math.max(0, trendMomentumByState.get(state) ?? 0);
        components.audience_match = audienceProfile ? 50 : 0; // flat if no specific data
      }

      rawScores.push({ state, components });
    }

    // Normalize each component across all states, then apply weights
    const componentKeys =
      rawScores.length > 0 ? Object.keys(rawScores[0].components) : [];
    const normalizedComponents = new Map<string, Map<string, number>>();

    for (const key of componentKeys) {
      const values = rawScores.map((s) => s.components[key]);
      const normed = normalize(values);
      for (let i = 0; i < rawScores.length; i++) {
        if (!normalizedComponents.has(rawScores[i].state)) {
          normalizedComponents.set(rawScores[i].state, new Map());
        }
        normalizedComponents.get(rawScores[i].state)!.set(key, normed[i]);
      }
    }

    // Category-specific weights
    const weights: Record<string, number> =
      category === "cancer"
        ? {
            incidence: 0.4,
            population: 0.25,
            saturation_inv: 0.2,
            trend: 0.15,
          }
        : category === "accident"
          ? {
              fatalities: 0.3,
              pi_viability: 0.3,
              population: 0.2,
              saturation_inv: 0.2,
            }
          : {
              population: 0.35,
              saturation_inv: 0.25,
              trend: 0.25,
              audience_match: 0.15,
            };

    // If a data source returned nothing, redistribute its weight equally
    const activeWeights = { ...weights };
    let zeroWeightSum = 0;
    const zeroKeys: string[] = [];
    for (const key of componentKeys) {
      const allZero = rawScores.every((s) => s.components[key] === 0);
      if (allZero) {
        zeroWeightSum += activeWeights[key] ?? 0;
        zeroKeys.push(key);
        activeWeights[key] = 0;
      }
    }
    if (zeroKeys.length > 0 && zeroKeys.length < componentKeys.length) {
      const activeKeys = componentKeys.filter((k) => !zeroKeys.includes(k));
      const redistributed = zeroWeightSum / activeKeys.length;
      for (const k of activeKeys) {
        activeWeights[k] += redistributed;
      }
    }

    // Compute final scores
    const scored: ScoredState[] = rawScores.map(({ state, components }) => {
      const normed = normalizedComponents.get(state)!;
      let score = 0;
      for (const key of componentKeys) {
        score += (normed.get(key) ?? 0) * (activeWeights[key] ?? 0);
      }

      // Assign signal labels
      const signals: string[] = [];

      // Cancer incidence
      if (category === "cancer" && (normed.get("incidence") ?? 0) >= 75) {
        signals.push("High Incidence");
      }
      // Fatalities
      if (category === "accident" && (normed.get("fatalities") ?? 0) >= 75) {
        signals.push("High Fatalities");
      }
      // Plaintiff-friendly
      if (
        category === "accident" &&
        (piByState.get(state) ?? 0) >= 70
      ) {
        signals.push("Plaintiff-Friendly");
      }
      // Low saturation
      const satScore = saturationByState.get(state) ?? 50;
      if (satScore <= 30) {
        signals.push("Low Saturation");
      }
      // Rising trend
      const momentum = trendMomentumByState.get(state) ?? 0;
      if (momentum > 10) {
        signals.push("Rising Trend");
      }
      // Large population
      if (TOP_10_POP_STATES.includes(state)) {
        signals.push("Large Population");
      }
      // Emerging market — rising trend + low saturation
      if (momentum > 10 && satScore <= 30 && !signals.includes("Emerging Market")) {
        signals.push("Emerging Market");
      }

      // Ensure at least one signal
      if (signals.length === 0) {
        if (TOP_10_POP_STATES.includes(state)) {
          signals.push("Large Population");
        } else {
          signals.push("Low Saturation");
        }
      }

      // Pick the top 2 signals max, primary is the first
      const topSignals = signals.slice(0, 2);

      return {
        state,
        state_name: STATE_NAMES[state] ?? state,
        score: Math.round(score),
        signals: topSignals,
        primary_signal: topSignals[0],
      };
    });

    // Sort by score descending and pick top 10
    scored.sort((a, b) => b.score - a.score);
    const recommended = scored.slice(0, 10);

    return NextResponse.json({ recommended_markets: recommended });
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
