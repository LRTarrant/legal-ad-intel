import {
  MapPin,
  AlertTriangle,
  Target,
  TrendingUp,
  Store,
  Activity,
} from "lucide-react";
import type { FarsCountyHotspot, MvPoiTarget } from "@/lib/queries";

type Recommendation = {
  icon: React.ReactNode;
  title: string;
  description: string;
};

type MvAIRecommendationsProps = {
  hotspots: FarsCountyHotspot[];
  poiTargets: MvPoiTarget[];
  selectedState: string | null;
  totalCrashes: number;
  totalFatalities: number;
  nationalCrashes: number;
  drunkPct: number;
};

function cleanCountyName(name: string): string {
  return name.replace(/\s*\(\d+\)$/, "");
}

function generateRecommendations({
  hotspots,
  poiTargets,
  selectedState,
  totalCrashes,
  totalFatalities,
  nationalCrashes,
  drunkPct,
}: MvAIRecommendationsProps): Recommendation[] {
  const cards: Recommendation[] = [];

  // 1. Hotspot targeting — top county
  if (hotspots.length > 0 && selectedState) {
    const top = hotspots[0];
    cards.push({
      icon: <MapPin className="h-5 w-5 text-intelligence-teal" />,
      title: `Target ${cleanCountyName(top.county_name)} where fatal crashes are concentrated in ${selectedState}`,
      description: `${cleanCountyName(top.county_name)} recorded ${top.total_crashes.toLocaleString()} fatal crashes with ${top.total_fatalities.toLocaleString()} fatalities — target hospitals, auto repair shops, and dealers in this area for maximum reach.`,
    });
  }

  // 2. Drunk driving focus
  if (drunkPct > 15) {
    const location = selectedState ?? "the selected area";
    cards.push({
      icon: <AlertTriangle className="h-5 w-5 text-intelligence-teal" />,
      title: `${drunkPct.toFixed(1)}% of crashes involve drunk driving — emphasize DUI messaging`,
      description: `${drunkPct.toFixed(1)}% of crashes in ${location} involve drunk driving. Emphasize DUI-related personal injury and wrongful death messaging in your advertising campaigns.`,
    });
  }

  // 3. POI targeting — top advertising target
  if (poiTargets.length > 0) {
    const top = poiTargets[0];
    const categoryLabel: Record<string, string> = {
      hospital: "hospital",
      auto_repair: "auto repair shop",
      auto_dealer: "auto dealer",
      body_shop: "body shop",
    };
    cards.push({
      icon: <Store className="h-5 w-5 text-intelligence-teal" />,
      title: `Prioritize ad spend near ${top.poi_name} in ${top.state}`,
      description: `${top.poi_name} (${categoryLabel[top.category] ?? top.category}) has an ad value score of ${top.ad_value_score.toLocaleString()} with ${top.nearby_crashes.toLocaleString()} fatal crashes nearby — a high-value location for geo-targeted legal advertising.`,
    });
  }

  // 4. Severity messaging
  if (totalCrashes > 0) {
    const avgFatalitiesPerCrash = totalFatalities / totalCrashes;
    if (avgFatalitiesPerCrash > 1) {
      cards.push({
        icon: <Activity className="h-5 w-5 text-intelligence-teal" />,
        title: `Avg ${avgFatalitiesPerCrash.toFixed(2)} fatalities per crash — emphasize wrongful death and serious injury messaging`,
        description: `With an average of ${avgFatalitiesPerCrash.toFixed(2)} fatalities per crash, emphasize wrongful death claims, survivor benefits, and serious injury compensation in advertising copy.`,
      });
    }
  }

  // 5. Geographic concentration — top 5 counties
  if (hotspots.length >= 5 && totalCrashes > 0) {
    const top5Total = hotspots
      .slice(0, 5)
      .reduce((sum, h) => sum + h.total_crashes, 0);
    const pctConcentrated = (top5Total / totalCrashes) * 100;
    if (pctConcentrated > 20) {
      cards.push({
        icon: <Target className="h-5 w-5 text-intelligence-teal" />,
        title: `Top 5 counties = ${pctConcentrated.toFixed(0)}% of fatal crashes`,
        description: `The top 5 counties account for ${pctConcentrated.toFixed(0)}% of ${selectedState ? `${selectedState}'s` : "all"} fatal crashes. Concentrate geo-targeted advertising in these counties for efficient budget allocation.`,
      });
    }
  }

  // 6. Scale opportunity — state vs national
  if (selectedState && nationalCrashes > 0 && totalCrashes > 0) {
    const pctOfNational = (totalCrashes / nationalCrashes) * 100;
    cards.push({
      icon: <TrendingUp className="h-5 w-5 text-intelligence-teal" />,
      title: `${selectedState} accounts for ${pctOfNational.toFixed(1)}% of national fatal crashes`,
      description: `${selectedState} accounts for ${totalCrashes.toLocaleString()} of ${nationalCrashes.toLocaleString()} fatal crashes nationwide (${pctOfNational.toFixed(1)}%). ${pctOfNational > 5 ? "This is a major market — justify premium ad spend." : "Consider multi-state campaigns for scale."}`,
    });
  }

  return cards;
}

export function MvAIRecommendations(props: MvAIRecommendationsProps) {
  const recommendations = generateRecommendations(props);

  if (recommendations.length === 0) return null;

  return (
    <div className="space-y-4">
      <div>
        <h2 className="font-heading text-xl font-semibold text-midnight-navy">
          Advertising Intelligence
        </h2>
        <p className="mt-1 text-sm text-slate-gray">
          Data-driven recommendations based on motor vehicle crash patterns
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {recommendations.map((rec) => (
          <div
            key={rec.title}
            className="rounded-xl border-l-4 border-intelligence-teal bg-white p-5 shadow-sm"
          >
            <div className="flex items-start gap-3">
              <div className="mt-0.5 shrink-0">{rec.icon}</div>
              <div>
                <h3 className="font-heading text-sm font-semibold text-midnight-navy">
                  {rec.title}
                </h3>
                <p className="mt-1.5 text-sm leading-relaxed text-slate-gray">
                  {rec.description}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
