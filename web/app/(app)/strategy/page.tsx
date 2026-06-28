/**
 * /strategy — Strategy Engine (standalone v1).
 *
 * Authenticated route (the (app) shell + middleware gate it). The interview +
 * generation are client-driven; the API re-assembles inputs server-side. PR 3b
 * replaces the plain result readout with the designed 12-slide deck.
 */

import StrategyClient from "./strategy-client";

export const metadata = {
  title: "Strategy Engine | Legal Marketing Intelligence",
};

// Next 16: searchParams is async. Read an optional ?state= / ?case_type= pre-fill
// (e.g. from a state-page CTA like /strategy?state=AL) and seed the interview.
export default async function StrategyPage({
  searchParams,
}: {
  searchParams: Promise<{ state?: string; case_type?: string }>;
}) {
  const { state, case_type } = await searchParams;
  const initialState = state ? state.toUpperCase() : undefined;
  const initialCaseTypes = case_type ? [case_type] : undefined;

  return <StrategyClient initialState={initialState} initialCaseTypes={initialCaseTypes} />;
}
