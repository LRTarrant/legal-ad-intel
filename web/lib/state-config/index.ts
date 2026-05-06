import { illinoisConfig } from "./illinois";
import { massachusettsConfig } from "./massachusetts";
import { michiganConfig } from "./michigan";
import { newYorkConfig } from "./new-york";
import { northCarolinaConfig } from "./north-carolina";
import { ohioConfig } from "./ohio";
import { pennsylvaniaConfig } from "./pennsylvania";
import { tennesseeConfig } from "./tennessee";
import { texasConfig } from "./texas";
import type { StateConfig } from "./_types";

/**
 * Registry of all state configs. Add new states here.
 *
 * The keys are the URL slugs ("tennessee", "texas", "new-york", etc.).
 * Slugs MUST be lowercase, kebab-case, and match the directory name in
 * /app/(app)/state-intelligence/{slug}/ during the migration period.
 */
export const STATE_CONFIGS: Record<string, StateConfig> = {
  illinois: illinoisConfig,
  massachusetts: massachusettsConfig,
  michigan: michiganConfig,
  "new-york": newYorkConfig,
  "north-carolina": northCarolinaConfig,
  ohio: ohioConfig,
  pennsylvania: pennsylvaniaConfig,
  tennessee: tennesseeConfig,
  texas: texasConfig,
};

export const STATE_SLUGS = Object.keys(STATE_CONFIGS);

/** Look up a config by slug. Returns null if no config exists. */
export function getStateConfig(slug: string): StateConfig | null {
  return STATE_CONFIGS[slug] ?? null;
}

export type { StateConfig } from "./_types";
export type {
  TrafficStatsBlock,
  WorkplaceStatsBlock,
  CommuteStatsBlock,
  InjuryDataRow,
  StateInjuryData,
  CrashEmbed,
  StateContent,
  StateFeatureFlags,
} from "./_types";
