import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  getDailyTrendByProvider,
  getMonthlySpendByProvider,
  getSearchapiQuotaBurn,
  getTenantAttributedCost,
  getTopOperationsByCost,
  type DailyTrendPoint,
  type OperationSpend,
  type ProviderSpend,
  type QuotaBurn,
  type TenantSpend,
} from "@/lib/api-costs/queries";
import { ApiCostsClient } from "./api-costs-client";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "API Costs | Admin",
};

type SettledOr<T> = { ok: true; data: T } | { ok: false; error: string };

async function settle<T>(p: Promise<T>): Promise<SettledOr<T>> {
  try {
    const data = await p;
    return { ok: true, data };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

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
      settle<ProviderSpend[]>(getMonthlySpendByProvider(supabase)),
      settle<OperationSpend[]>(getTopOperationsByCost(supabase, 10)),
      settle<TenantSpend[]>(getTenantAttributedCost(supabase)),
      settle<QuotaBurn>(getSearchapiQuotaBurn(supabase)),
      settle<DailyTrendPoint[]>(getDailyTrendByProvider(supabase, 30)),
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
