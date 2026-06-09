import { alaskaConfig } from "./alaska";
import { arkansasConfig } from "./arkansas";
import { coloradoConfig } from "./colorado";
import { connecticutConfig } from "./connecticut";
import { delawareConfig } from "./delaware";
import { districtOfColumbiaConfig } from "./district-of-columbia";
import { hawaiiConfig } from "./hawaii";
import { idahoConfig } from "./idaho";
import { illinoisConfig } from "./illinois";
import { indianaConfig } from "./indiana";
import { iowaConfig } from "./iowa";
import { kansasConfig } from "./kansas";
import { kentuckyConfig } from "./kentucky";
import { louisianaConfig } from "./louisiana";
import { maineConfig } from "./maine";
import { massachusettsConfig } from "./massachusetts";
import { marylandConfig } from "./maryland";
import { michiganConfig } from "./michigan";
import { minnesotaConfig } from "./minnesota";
import { mississippiConfig } from "./mississippi";
import { missouriConfig } from "./missouri";
import { montanaConfig } from "./montana";
import { nebraskaConfig } from "./nebraska";
import { nevadaConfig } from "./nevada";
import { newHampshireConfig } from "./new-hampshire";
import { newJerseyConfig } from "./new-jersey";
import { newMexicoConfig } from "./new-mexico";
import { newYorkConfig } from "./new-york";
import { northCarolinaConfig } from "./north-carolina";
import { northDakotaConfig } from "./north-dakota";
import { ohioConfig } from "./ohio";
import { oklahomaConfig } from "./oklahoma";
import { oregonConfig } from "./oregon";
import { pennsylvaniaConfig } from "./pennsylvania";
import { rhodeIslandConfig } from "./rhode-island";
import { southCarolinaConfig } from "./south-carolina";
import { southDakotaConfig } from "./south-dakota";
import { tennesseeConfig } from "./tennessee";
import { texasConfig } from "./texas";
import { utahConfig } from "./utah";
import { vermontConfig } from "./vermont";
import { virginiaConfig } from "./virginia";
import { washingtonConfig } from "./washington";
import { westVirginiaConfig } from "./west-virginia";
import { wisconsinConfig } from "./wisconsin";
import { wyomingConfig } from "./wyoming";
import type { StateConfig } from "./_types";

/**
 * Registry of all state configs. Add new states here.
 *
 * The keys are the URL slugs ("tennessee", "texas", "new-york", etc.).
 * Slugs MUST be lowercase, kebab-case, and match the directory name in
 * /app/(app)/state-intelligence/{slug}/ during the migration period.
 */
export const STATE_CONFIGS: Record<string, StateConfig> = {
  alaska: alaskaConfig,
  arkansas: arkansasConfig,
  colorado: coloradoConfig,
  connecticut: connecticutConfig,
  delaware: delawareConfig,
  "district-of-columbia": districtOfColumbiaConfig,
  hawaii: hawaiiConfig,
  idaho: idahoConfig,
  illinois: illinoisConfig,
  indiana: indianaConfig,
  iowa: iowaConfig,
  kansas: kansasConfig,
  kentucky: kentuckyConfig,
  louisiana: louisianaConfig,
  maine: maineConfig,
  maryland: marylandConfig,
  massachusetts: massachusettsConfig,
  michigan: michiganConfig,
  minnesota: minnesotaConfig,
  mississippi: mississippiConfig,
  missouri: missouriConfig,
  montana: montanaConfig,
  nebraska: nebraskaConfig,
  nevada: nevadaConfig,
  "new-hampshire": newHampshireConfig,
  "new-jersey": newJerseyConfig,
  "new-mexico": newMexicoConfig,
  "new-york": newYorkConfig,
  "north-carolina": northCarolinaConfig,
  "north-dakota": northDakotaConfig,
  ohio: ohioConfig,
  oklahoma: oklahomaConfig,
  oregon: oregonConfig,
  pennsylvania: pennsylvaniaConfig,
  "rhode-island": rhodeIslandConfig,
  "south-carolina": southCarolinaConfig,
  "south-dakota": southDakotaConfig,
  tennessee: tennesseeConfig,
  texas: texasConfig,
  utah: utahConfig,
  vermont: vermontConfig,
  virginia: virginiaConfig,
  washington: washingtonConfig,
  "west-virginia": westVirginiaConfig,
  wisconsin: wisconsinConfig,
  wyoming: wyomingConfig,
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
