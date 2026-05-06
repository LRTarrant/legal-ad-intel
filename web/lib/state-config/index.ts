import { coloradoConfig } from "./colorado";
import { illinoisConfig } from "./illinois";
import { indianaConfig } from "./indiana";
import { kentuckyConfig } from "./kentucky";
import { louisianaConfig } from "./louisiana";
import { massachusettsConfig } from "./massachusetts";
import { marylandConfig } from "./maryland";
import { michiganConfig } from "./michigan";
import { minnesotaConfig } from "./minnesota";
import { missouriConfig } from "./missouri";
import { newYorkConfig } from "./new-york";
import { northCarolinaConfig } from "./north-carolina";
import { ohioConfig } from "./ohio";
import { pennsylvaniaConfig } from "./pennsylvania";
import { southCarolinaConfig } from "./south-carolina";
import { tennesseeConfig } from "./tennessee";
import { texasConfig } from "./texas";
import { wisconsinConfig } from "./wisconsin";
import type { StateConfig } from "./_types";

/**
 * Registry of all state configs. Add new states here.
 *
 * The keys are the URL slugs ("tennessee", "texas", "new-york", etc.).
 * Slugs MUST be lowercase, kebab-case, and match the directory name in
 * /app/(app)/state-intelligence/{slug}/ during the migration period.
 */
export const STATE_CONFIGS: Record<string, StateConfig> = {
  colorado: coloradoConfig,
  illinois: illinoisConfig,
  indiana: indianaConfig,
  kentucky: kentuckyConfig,
  louisiana: louisianaConfig,
  maryland: marylandConfig,
  massachusetts: massachusettsConfig,
  michigan: michiganConfig,
  minnesota: minnesotaConfig,
  missouri: missouriConfig,
  "new-york": newYorkConfig,
  "north-carolina": northCarolinaConfig,
  ohio: ohioConfig,
  pennsylvania: pennsylvaniaConfig,
  "south-carolina": southCarolinaConfig,
  tennessee: tennesseeConfig,
  texas: texasConfig,
  wisconsin: wisconsinConfig,
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
