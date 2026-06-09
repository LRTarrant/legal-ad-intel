import { arkansasConfig } from "./arkansas";
import { coloradoConfig } from "./colorado";
import { connecticutConfig } from "./connecticut";
import { illinoisConfig } from "./illinois";
import { indianaConfig } from "./indiana";
import { iowaConfig } from "./iowa";
import { kansasConfig } from "./kansas";
import { kentuckyConfig } from "./kentucky";
import { louisianaConfig } from "./louisiana";
import { massachusettsConfig } from "./massachusetts";
import { marylandConfig } from "./maryland";
import { michiganConfig } from "./michigan";
import { minnesotaConfig } from "./minnesota";
import { mississippiConfig } from "./mississippi";
import { missouriConfig } from "./missouri";
import { nevadaConfig } from "./nevada";
import { newJerseyConfig } from "./new-jersey";
import { newYorkConfig } from "./new-york";
import { northCarolinaConfig } from "./north-carolina";
import { ohioConfig } from "./ohio";
import { oklahomaConfig } from "./oklahoma";
import { oregonConfig } from "./oregon";
import { pennsylvaniaConfig } from "./pennsylvania";
import { southCarolinaConfig } from "./south-carolina";
import { tennesseeConfig } from "./tennessee";
import { texasConfig } from "./texas";
import { virginiaConfig } from "./virginia";
import { washingtonConfig } from "./washington";
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
  arkansas: arkansasConfig,
  colorado: coloradoConfig,
  connecticut: connecticutConfig,
  illinois: illinoisConfig,
  indiana: indianaConfig,
  iowa: iowaConfig,
  kansas: kansasConfig,
  kentucky: kentuckyConfig,
  louisiana: louisianaConfig,
  maryland: marylandConfig,
  massachusetts: massachusettsConfig,
  michigan: michiganConfig,
  minnesota: minnesotaConfig,
  mississippi: mississippiConfig,
  missouri: missouriConfig,
  nevada: nevadaConfig,
  "new-jersey": newJerseyConfig,
  "new-york": newYorkConfig,
  "north-carolina": northCarolinaConfig,
  ohio: ohioConfig,
  oklahoma: oklahomaConfig,
  oregon: oregonConfig,
  pennsylvania: pennsylvaniaConfig,
  "south-carolina": southCarolinaConfig,
  tennessee: tennesseeConfig,
  texas: texasConfig,
  virginia: virginiaConfig,
  washington: washingtonConfig,
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
