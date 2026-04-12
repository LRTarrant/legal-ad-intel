import {
  MapPin,
  Sun,
  AlertTriangle,
  Target,
  TrendingUp,
} from "lucide-react";
import type { BoatingHotspotCounty, BoatingSeverityStats } from "@/lib/queries";

type Recommendation = {
  icon: React.ReactNode;
  title: string;
  description: string;
};

type AIRecommendationsProps = {
  hotspots: BoatingHotspotCounty[];
  severity: BoatingSeverityStats;
  selectedState: string | null;
  nationalTotal: number;
  stateTotal: number;
};

function generateRecommendations({
  hotspots,
  severity,
  selectedState,
  nationalTotal,
  stateTotal,
}: AIRecommendationsProps): Recommendation[] {
  const cards: Recommendation[] = [];

  // 1. Hotspot targeting — top county
  if (hotspots.length > 0) {
    const top = hotspots[0];
    cards.push({
      icon: <MapPin className="h-5 w-5 text-intelligence-teal" />,
      title: `Target ${top.county_name}, ${top.state}`,
      description: `${top.county_name} recorded ${top.total_accidents.toLocaleString()} boating accidents with ${top.total_deaths.toLocaleString()} fatalities — target marinas, boat ramps, and marine dealers in this area for maximum reach.`,
    });
  }

  // 2. Seasonal timing (generic — monthly data unavailable)
  cards.push({
    icon: <Sun className="h-5 w-5 text-intelligence-teal" />,
    title: "Plan campaigns for peak boating season",
    description:
      "Boating injuries peak from May through September. Schedule ad flights to coincide with summer boating activity when injury rates are highest and claimant volume is greatest.",
  });

  // 3. Severity-based messaging
  if (severity.fatality_rate > 3) {
    cards.push({
      icon: <AlertTriangle className="h-5 w-5 text-intelligence-teal" />,
      title: "High fatality rate — focus on wrongful death cases",
      description: `The ${severity.fatality_rate.toFixed(1)}% fatality rate indicates a significant proportion of accidents involve deaths. Consider messaging around wrongful death claims, survivor benefits, and family compensation.`,
    });
  } else if (severity.pct_fatal > 5) {
    cards.push({
      icon: <AlertTriangle className="h-5 w-5 text-intelligence-teal" />,
      title: "Meaningful fatal accident share",
      description: `${severity.pct_fatal.toFixed(1)}% of boating accidents result in at least one death. Include wrongful death practice areas alongside personal injury in campaign targeting.`,
    });
  }

  // 4. Geographic concentration
  if (hotspots.length >= 5) {
    const top5Total = hotspots
      .slice(0, 5)
      .reduce((sum, h) => sum + h.total_accidents, 0);
    const compareTotal = selectedState ? stateTotal : nationalTotal;
    if (compareTotal > 0) {
      const pctConcentrated = (top5Total / compareTotal) * 100;
      if (pctConcentrated > 30) {
        cards.push({
          icon: <Target className="h-5 w-5 text-intelligence-teal" />,
          title: `Top 5 counties = ${pctConcentrated.toFixed(0)}% of accidents`,
          description: `The top 5 counties account for ${pctConcentrated.toFixed(0)}% of ${selectedState ? `${selectedState}'s` : "all"} boating accidents. Concentrate geo-targeted advertising in these counties for efficient budget allocation.`,
        });
      }
    }
  }

  // 5. Scale opportunity — state vs national
  if (selectedState && nationalTotal > 0 && stateTotal > 0) {
    const pctOfNational = (stateTotal / nationalTotal) * 100;
    cards.push({
      icon: <TrendingUp className="h-5 w-5 text-intelligence-teal" />,
      title: `${selectedState} = ${pctOfNational.toFixed(1)}% of national market`,
      description: `${selectedState} accounts for ${stateTotal.toLocaleString()} of ${nationalTotal.toLocaleString()} boating accidents nationwide (${pctOfNational.toFixed(1)}%). ${pctOfNational > 10 ? "This is a major market — justify premium ad spend." : "Consider multi-state campaigns for scale."}`,
    });
  }

  return cards;
}

export function AIRecommendations(props: AIRecommendationsProps) {
  const recommendations = generateRecommendations(props);

  if (recommendations.length === 0) return null;

  return (
    <div className="space-y-4">
      <div>
        <h2 className="font-heading text-xl font-semibold text-midnight-navy">
          Advertising Intelligence
        </h2>
        <p className="mt-1 text-sm text-slate-gray">
          Data-driven recommendations based on boating accident patterns
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
