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

export default function StrategyPage() {
  return <StrategyClient />;
}
