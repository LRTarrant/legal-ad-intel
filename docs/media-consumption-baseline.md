# Media Consumption Baseline — spec + wiring

Status: research-ready spec (2026-06-25, Cowork). Implements the demographic baseline the Strategy Engine's audience-fit signal was missing, and powers the unbuilt Media Consumption section of the Market Demographics page. Build in Claude Code.

## Why this exists

The Strategy Engine (`web/lib/strategy-engine/`) already has an audience-fit slot: `assemble-inputs.ts` reads `media_profiles` for channel fit, but those rows are generic and empty for AL, so the fit signal runs on almost nothing. That's why Audience-Play recommendations feel thin. This adds a curated, attributed national baseline (Pew + ATUS, both republishable) so the engine can reason: *national demographic consumption rates × this county's demographic mix → weight these channels here.*

Two consumers, one table:
1. **Market Demographics page** (`web/app/(app)/market-demographics/`) renders it as the Media Consumption section (user-facing, with Pew attribution visible).
2. **Strategy Engine** (`assemble-inputs.ts`) reads it for the audience-fit signal, replacing/augmenting the empty `media_profiles` path.

## Licensing (must respect — these are the build constraints)

- **Pew = republishable WITH attribution.** Pew terms allow citing findings and building your own charts from their data without advance permission, IF attributed. Two conditions: (a) attribute every use + show Pew's disclaimer ("Pew Research Center bears no responsibility for the analyses or interpretations of the data presented here."); (b) never present it so it implies Pew endorses a firm/product/campaign. Keep the citation factual and visually separate from the recommendation.
- **BLS ATUS = public domain.** No restriction. Use freely for time-spent rows.
- **Nielsen = NOT republishable.** Rows tagged `Nielsen (cited as fact)` in the seed are headline numbers restated as fact (a fact like "radio reaches 92% of Black adults" isn't copyrightable; Nielsen's tables/expression are). Display them as a cited stat with a link to the public source, NEVER as a reproduced Nielsen chart/table. If in doubt, drop the Nielsen rows — Pew + ATUS alone carry the engine.

## Table: `media_consumption_baseline`

One row per (geography × demographic × channel × metric). Designed so Scarborough/MRI DMA rows slot in later with NO schema change — just `geography_level='dma'` rows.

| column | type | notes |
|---|---|---|
| `id` | uuid pk | |
| `geography_level` | text | `national` now; `dma` / `msa` later (Scarborough). CHECK in (`national`,`dma`,`msa`,`state`). |
| `geo_code` | text | `US` for national; DMA code/name later. |
| `demographic_type` | text | `all` \| `race` \| `age` \| `income` \| `education`. CHECK. **`income` is now in use** (groups `lower` / `upper`); the engine ignores income rows for now (see §"How `assemble-inputs.ts` should use it"). |
| `demographic_group` | text | `all_adults`; race `black`/`white`/`hispanic`/`asian`; age `18_29`, `30_49`, `50_64`, `65_plus`, plus source-native bands `12_34`, `18_34`, `18_49`, `35_49`, `35_54`, `35_plus`, `50_plus`, `55_plus`; income `lower`/`upper`. |
| `channel` | text | free-text (no CHECK). Normalize to Strategy Engine `ChannelKey` where possible: `tv_linear`, `ctv`, `radio`, `radio_urban`, `social`, `youtube`, `facebook`, `instagram`, `tiktok`, `whatsapp`, `snapchat`, `reddit`, `x_twitter`, `search`, `podcast`, `print`, `digital`, `all_media`, **`ooh`** (out-of-home/billboard — new). Note `ctv` ≠ `digital` (see Known gaps). |
| `metric` | text | free-text (no CHECK). Current vocabulary: `news_consume`, `news_prefer`, `news_regular`, `platform_use`, `reach_monthly`, `reach_weekly`, `ad_audio_share`, `format_share`, `time_spent_weekly`, `time_spent_daily`, `news_consume_skew`, `streaming_use`, `cable_subscribe`, `local_news`, `netflix_use`, `listener_share`, `heavy_viewer_index`, `linear_share_of_tv_time`, `watch_time_skew`, `ad_notice`. |
| `scope` | text | **`news` or `general`. CRITICAL — see "News vs general scope" below.** `news` = the figure measures getting NEWS from the channel (a reach proxy). `general` = total/any consumption or adoption of the channel (direct reach). |
| `value` | numeric | the figure. |
| `unit` | text | free-text (do NOT CHECK-constrain). Reach/adoption percentages (the only units the engine averages): `pct_at_least_sometimes`, `pct_prefer`, `pct_regularly`, `pct_ever_use`, `pct_reach`, `pct_monthly`, `pct_subscribe`. Non-comparable units the engine excludes from the math: `hours_per_day`, `hours_per_week`, `index_vs_avg`, `direction_over_index`, `pct_of_tv_time`, `pct_of_us_youtube_watch_time`, `pct_of_listeners`, `pct_of_ad_supported_audio`, `pct_of_black_radio_listening`, `pct_radio_plus_podcast_of_ad_audio`, `pct_notice_enroute_retail`. |
| `source` | text | e.g. `Pew Research Center`, `BLS American Time Use Survey`, `OAAA/Harris Poll …`, `Edison Research (Podcast Consumer 2026)`, and cite-as-fact vendors (`Nielsen …`, `Edison Share of Ear …`, `eMarketer/Pixability …`, `Adwave/Nielsen/Ipsos …`). |
| `source_url` | text | exact page. |
| `source_year` | int | for staleness/refresh. |
| `notes` | text | caveats, comparison context. |
| `created_at` / `updated_at` | timestamptz | |

Natural key: a row is unique on `(geography_level, geo_code, demographic_type, demographic_group, channel, metric, scope, source, source_year)` — `source` + `source_year` are part of the key because the seed legitimately carries two measurements of the same cell from different publishers/years (Black TikTok news-regular: 2024 Pew vs 2026 Pew; Black radio ad-audio-share: Nielsen vs Edison).

Seed data: `docs/media_consumption_baseline_seed.csv` (**112 rows** as of the 2026-06-26 research expansion). Loaded via a delete-and-reload migration so the table == the seed exactly.

RLS: follow the repo convention. This is non-sensitive reference data — readable by authenticated users like other reference tables. No service-role-only restriction needed.

## News vs general scope (READ THIS — it's the credibility line)

Most republishable Pew data measures getting **news** from a channel ("76% of Black adults get news on TV"), NOT total consumption. A PI firm running an awareness campaign cares whether the audience is *reached at all*, not whether they get *news* there. So news-consumption is a **directional proxy for reach, not a direct measure.** Every row carries a `scope`:

- **`scope='general'`** = direct reach/adoption. Trust it as-is for channel fit. Sources: Pew Social Media Fact Sheet (platform ever-use by race/age/income), Pew streaming-use (`streaming_use` → CTV) and cable/satellite subscription (`cable_subscribe` → linear-TV access), Edison podcast monthly reach, and the Nielsen radio reach rows (cite-only).
- **`scope='news'`** = news-getting on that channel. Use as a RANKING proxy (relative over-index by demographic), not as an absolute reach number. Known distortions to respect:
  - **Radio**: news-radio (Pew 11% often) massively understates *general* radio reach. For radio, prefer the `general` Nielsen reach rows (Black 92% monthly, Hispanic 98% weekly, Urban formats 50.2% of Black listening). Do NOT let the Pew radio-news number drive radio down — it's measuring the wrong thing.
  - **Podcast**: news-podcast overstates general podcast reach (news-seekers skew). The seed's podcast rows are now `general` listening (67% of 18-29), use those.
  - **TV / social**: news-consumption tracks general reach reasonably (lots of people who watch TV news watch TV), so the `news` rows are an acceptable reach proxy for ranking by demographic.

**Engine rule:** when both a `general` and a `news` row exist for a (demographic, channel), prefer `general`. When only `news` exists, use it as a relative-ranking proxy and let the narration say "news-consumption proxy." Never present a news-scoped % as if it were total reach. The radio story specifically must lean on the Nielsen general-reach rows (cited), not the Pew radio-news row.

## How `assemble-inputs.ts` should use it (audience-fit)

Today the audience-fit block (~line 267) builds a `Map<ChannelKey, fitScore>` from `media_profiles` and admits AL has no rows. Replace/augment with:

1. Pull the county's demographic mix (already available via the demographics the page uses — % Black, % Hispanic, median age band). For Greene County: ~80% Black.
2. Query `media_consumption_baseline` for `geography_level='national'` rows matching the dominant demographic groups.
3. Compute a per-channel fit score = weighted blend of each demographic group's consumption metric for that channel, weighted by the county's share of that group. **Apply the scope rule (see "News vs general scope"): prefer `scope='general'` rows; fall back to `scope='news'` as a relative proxy. For radio, use the `general` Nielsen reach rows, NOT the Pew radio-news row.** E.g. radio fit for an 80%-Black county leans on the Black general radio rows (reach 92%, urban format 50.2%), not the 11% radio-news figure.
4. Keep it RELATIVE (the engine's existing rule: opportunity = fit × (1 − competition), no absolute reach claims). The baseline informs *relative* fit ranking, not impressions.
5. Set `audience_fit: true` only when baseline rows were found; otherwise keep the honest `directional`/empty path. Confidence tier stays driven by data presence.
6. **Only average comparable units.** The fit math runs on reach/adoption percentages only (`pct_ever_use`, `pct_reach`, `pct_monthly`, `pct_subscribe`, `pct_at_least_sometimes`, `pct_regularly`). Rows in any other unit are excluded from the numeric base: hours (`time_spent_daily`/`time_spent_weekly`), indices (`heavy_viewer_index`), directional flags (`news_consume_skew`), and share-of-something stats (`linear_share_of_tv_time`, `watch_time_skew`, `listener_share`, `ad_audio_share`, `format_share`, `ad_notice`). They remain in the table for the UI / narration, but mixing e.g. 2.9 hours with 84% would be nonsense. The guard lives in `audience-fit.ts` (`REACH_PCT_UNITS`).
7. **`income` is ignored for now** (the demographic mix has no income shares yet) and **`ooh` is skipped** (no engine `ChannelKey`). Both degrade silently — they never crash the assembler. New buyable metrics that DO feed fit: `streaming_use` → `ctv`, `cable_subscribe` → `tv_linear`, `local_news` → `radio` (news anchor).

Keep the math deterministic and out of the LLM (matches `channel-plan.ts` — "the AI never sees this math; it only narrates the result"). The LLM should receive the resulting fit scores + the source citations, and narrate "radio over-indexes for this market per Pew/Nielsen," never invent the percentages.

## Build sequence (data-first, UI-second)

This ships in two passes — see `docs/CLAUDE-CODE-PROMPT-media-baseline.md`:
- **Pass 1 (plain Claude Code):** migration + seed + types + `assemble-inputs.ts` wiring + tests. No UI.
- **Pass 2 (Impeccable design flow):** the Media Consumption section below, run via `/impeccable shape` → `/impeccable craft` AFTER pass 1, so the design is built against a populated table. The section below is the design BRIEF (the what + constraints), not build steps — Impeccable owns the visual design.

## How the Media Consumption page should render it

**Placement decision (locked 2026-06-25): STANDALONE page, sibling to Market Demographics.** New route `web/app/(app)/media-consumption/page.tsx` + a new sidebar item "Media Consumption" under the existing **"Audiences & Media Research"** heading in `web/app/(app)/sidebar.tsx` (the section currently holds only "Market Demographics" — it's built to grow). NOT a tab/section on the Market Demographics page. Rationale: Market Demographics is Census/ACS at MSA level; Media Consumption is Pew/Nielsen national-by-demographic — different sources, different geography, different cadence. Forcing a national baseline onto an MSA-keyed page creates a local-vs-national mismatch. Two clean sibling destinations is the honest UX.

- New "Media Consumption" page at `web/app/(app)/media-consumption/page.tsx`.
- Show the national baseline as a small demographic × channel table or simple bars: by-race and by-age consumption.
- **Attribution block** directly under it: "Source: Pew Research Center (2024–2025); BLS American Time Use Survey. Pew Research Center bears no responsibility for the analyses or interpretations of the data presented here." Nielsen-sourced figures get an inline "(Nielsen, [year])" with the public link.
- Frame it as a national baseline applied to local demographics — do NOT label it as measured local consumption. One honest sentence: "National consumption patterns by demographic, applied to this market's population mix."

## Scarborough future-proofing (when revenue arrives)

When Scarborough/MRI is licensed, add `geography_level='dma'` rows keyed by DMA. The `assemble-inputs.ts` query should prefer `dma` rows for the market when present and fall back to `national`. That's a query-precedence change, not a schema change. Note: Scarborough is NOT republishable either — same display rules as Nielsen (drives the engine's internal scoring; show only derived/cited, not raw tables).

## New channel: OOH (out-of-home / billboard)

`ooh` is now a channel, sourced from the **OAAA/Harris Poll 2024 Value of OOH Guide** (free public PDF, republishable WITH attribution): % who notice OOH ads en route to retail, by race (Black 78 / Hispanic 76 / Asian 73 vs 68 all-adults — minorities over-index). The engine does NOT yet plan `ooh` (no `ChannelKey`), so these rows feed the Media Consumption page only; the assembler skips them gracefully.

## Known gaps (flagged, not blockers)

These are the remaining holes in the republishable baseline. None block the engine. Updated 2026-06-26 after the research expansion.

1. **CTV is now Pew-sourced and REPUBLISHABLE** (was the old 4 Nielsen-cited rows). The seed's CTV rows are Pew streaming-use by age + income (`streaming_use`: 83% of adults, ~90% under-50, 65% of 65+, upper-income 91 / lower 77) plus Netflix/top-platform context, all from the Pew "83% use streaming services" short-read — display with Pew attribution, no longer cite-only. The old Nielsen Gauge rows were replaced. (Linear-TV access is covered separately by Pew `cable_subscribe`, which skews old: 64% of 65+ vs 16% of 18-29.)
2. **General broadcast-TV reach %-by-race is confirmed Nielsen-paid-only.** There is no free/public source for "% of Black/Hispanic/etc. adults who watch TV." The seed fills this with **BLS American Time Use Survey time-spent-by-race** (public domain: Black 2.9 h/day, White 2.61, Hispanic 2.09, Asian 1.71) as the republishable proxy. Note it's `hours_per_day`, so the engine excludes it from the numeric fit (different unit) — it's a UI/narration signal. Pew TV-*news*-by-race remains as the news-scoped reach proxy. To harden: license Nielsen/Scarborough general-TV-reach-by-race (cite-only).
3. **Radio now has a republishable anchor.** Pew-Knight Local News gives radio = 52% local-news reach (`local_news`, the most resilient traditional local-news source) — a free/public radio row that doesn't depend on the cite-as-fact Nielsen reach numbers. The Nielsen/Edison radio reach + share-of-ear rows stay as cite-as-fact reinforcement.
4. **Radio (and most channels) by INCOME is unfillable without Nielsen/Scarborough.** Income is covered for streaming/linear-TV/social (Pew) but NOT for radio or podcast reach by income tier — confirmed paid-only. The engine ignores the income axis for now regardless.
5. **`digital` vs `ctv` are different — don't conflate.** `digital` = device-level news access (Pew, 86%). `ctv` = a buyable streaming channel. Keep them separate in any UI grouping and in the engine's channel map.

## Honest limitation (put in the output)

Pew/ATUS are national baselines, not market-measured. The engine's inference is sound and how real planners reason, but be transparent: "national rates applied to local demographics," not "measured local consumption." Defensible when stated; misleading if hidden.
