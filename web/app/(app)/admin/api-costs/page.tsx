import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  getDailyTrendByProvider,
  getMonthlySpendByProvider,
  getSearchapiQuotaBurn,
  getTenantAttributedCost,
  getTopOperationsByCost,
} from "@/lib/api-costs/queries";
import { ApiCostsClient } from "./api-costs-client";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "API Costs | Admin",
};

export default async function AdminApiCostsPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) notFound();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = supabase as any;
  const { data: profile } = await sb
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!profile || (profile as { role?: string }).role !== "super_admin") {
    notFound();
  }

  const [monthlySpend, topOperations, tenantSpend, quotaBurn, dailyTrend] =
    await Promise.all([
      getMonthlySpendByProvider(supabase),
      getTopOperationsByCost(supabase, 10),
      getTenantAttributedCost(supabase),
      getSearchapiQuotaBurn(supabase),
      getDailyTrendByProvider(supabase, 30),
    ]);

  return (
    <ApiCostsClient
      monthlySpend={monthlySpend}
      topOperations={topOperations}
      tenantSpend={tenantSpend}
      quotaBurn={quotaBurn}
      dailyTrend={dailyTrend}
    />
  );
}
