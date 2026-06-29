# Strategy Engine — Grounded Strategist Redesign

**Date:** 2026-06-28
**Status:** Design approved, pending spec review
**Surface:** `web/app/(app)/strategy/` + `web/app/api/strategy/generate/route.ts` + `web/lib/strategy-engine/`

---

## 1. Problem

The Strategy Engine today is a **deterministic core + LLM narrator**. The deterministic core picks one of three fixed archetypes (head-to-head / niche-carve-out / audience-play), builds a channel-level plan, and gpt-4o only writes prose over that fixed skeleton. The "no absolute reach figures," archetype lockouts, and writer-only role are scar tissue from an earlier version where the LLM hallucinated.

The result feels generic and, in places, wrong:

- **Market-scoping bug:** the user's selected market (DMA) never reaches the outlet assembler. `assembleStrategyInputs(supabase, state, {tortSlug, tortLabel})` takes no DMA argument, so named outlets are scoped to the **whole state** and default-labeled to the state's #1 DMA. Picking **Huntsville** still surfaces **Birmingham** radio stations.
- **No within-channel funnel logic:** "Google Ads" / "Meta" are treated as monolithic with a single archetype-assigned funnel tag. In reality Google Search is bottom-funnel intent capture while YouTube is top-funnel awareness; the same platform serves opposite goals.
- **The AI is boxed out of the one thing it's good at:** synthesizing many weak signals (demographics, accident data, media landscape, competitive whitespace) into a coherent, tailored strategy.
- **User input barely shapes output:** the interview's audience field only sets narrator voice; goal and budget tier only nudge the deterministic plan.

A generic marketing skill *feels* better because it reasons end-to-end, but it invents facts (a Huntsville station that doesn't exist, a made-up reach number, a phantom competitor). LMI's moat is real, proprietary, grounded signal. The target is **the generic skill's reasoning latitude with LMI's grounded data**, so the product can connect dots the generic skill only pretends to.

## 2. Direction (approved decisions)

1. **AI as grounded strategist, not narrator.** The AI reads all real signals and writes the strategy itself: selects tactics, sequences the funnel, chooses which real outlets/competitors to feature, and explains the why. Archetypes become optional lenses, not a cage.
2. **Authority split: AI owns selection + narrative; code owns all numbers.** The AI picks tactics, sequences them, makes format/genre calls, writes rationale, and chooses illustrative examples. Budget allocation %, audience-fit scores, min-spend thresholds, and reach/frequency targets are computed deterministically; the AI may restate them but never originate them.
3. **User input = soft framing + a free-text goal box.** Structured fields plus one free-text "what does winning look like / what's off-limits" box. The AI weighs all of it as framing; data still drives what's recommended.
4. **A comprehensive interview** — rich enough to deliver a great strategy (see §3).
5. **Tactic + funnel model** replaces the channel-level archetype plan (see §4).
6. **Budget honesty** — the plan is realistic about what a budget can fund; honesty over upsell (see §5).
7. **Foundation readiness gate** — interview-driven, no audit tooling built into the engine (see §6).
8. **Recommendation grammar** — a media brief (format + rationale + target + examples + empowerment), not a buy sheet (see §7).
9. **Cross-signal reasoning over the relevant injury + demographic data** — v1 (state PI mode): auto + construction + boating + demographics, not just FARS auto. The opportunity overlay is a pluggable pack; cancer incidence + recall/MDL signals plug in later as "tort mode" (see §8).
10. **Grounding contract + validation** — the AI cannot invent entities or numbers, or claim delivered reach (see §9).

## 3. The interview (input capture)

Principle: ask only what materially changes a strategy; every answer flows into the AI's framing context.

**Who & where**
- Audience (firm / agency / media seller) — *required* — sets the deck voice.
- Case types — *required*.
- State — *required*.
- **Geographic priority** — *required, new* — statewide, or one/few specific metros/counties. Also the input that scopes the data (fixes the Huntsville bug).

**The economics**
- **Budget (real range, not a tier)** — *required, upgraded* — e.g. `<$10k/mo`, `$10–25k`, `$25–75k`, `$75k+`. The AI never invents the split, but needs the real ceiling to know which tactics are feasible.
- **Timeline / urgency** — *optional, new* — testing vs. launching hard vs. always-on. Changes cadence and sequencing.

**Their current reality**
- **Already advertising? If so, where + what's working / not** — *required, upgraded from "existing channels"* — reshapes the whole plan.
- **Intake capacity** — *required, new* — can they handle a volume spike, or do they need steady flow? A plan that floods a firm that can't answer the phone is a bad plan.

**The framing magic**
- **Primary objective** — *required, upgraded to specific* — max case volume / lower cost-per-case / enter a new tort / build brand / defend against a competitor.
- **Free-text: "What does winning look like in the next 90 days, and is anything off-limits?"** — *required, new* — where the AI hears the real goal, brand sensitivities, and constraints.

**Foundation readiness (3–4 yes / no / not-sure)** — *required* — dedicated landing pages? call + conversion tracking? intake that calls leads back fast? a website you'd send paid traffic to? (Feeds §6.)

## 4. Tactic + funnel model

Replace the channel-level archetype plan with a **fixed, curated tactic library** (v1: ~15–20 PI/mass-tort tactics). Each tactic carries funnel metadata, min-spend, prerequisites, and the four runtime scores.

**Three funnel stages:** Awareness → Consideration → Intent/Conversion.

**Tactics decompose channels** (within-channel funnel depth is the key upgrade). Illustrative subset:

| Channel | Tactic | Funnel stage |
|---|---|---|
| Google Ads | Search (PI/injury keywords) | Intent/Conversion |
| Google Ads | Performance Max | Consideration→Intent |
| Google Ads | YouTube in-stream / bumper | Awareness |
| Google Ads | Demand Gen | Consideration |
| Meta | Lead-form / Advantage+ conversion | Intent/Conversion |
| Meta | Retargeting | Intent/Conversion |
| Meta | Broad awareness video | Awareness |
| Broadcast | Linear TV | Awareness |
| Broadcast | CTV / OTT | Awareness→Consideration |
| Broadcast | Radio | Awareness (+frequency) |
| Organic | SEO / GBP | Intent/Conversion (long-horizon) |
| OOH | Billboards | Awareness (credibility) |
| Social | TikTok | Awareness (younger torts) |

**Tactic library entry (schema sketch):**
```
{
  key, channel, label,
  funnel_stage,                 // awareness | consideration | intent_conversion
  min_effective_monthly_usd,    // deterministic budget floor
  prerequisites: [...],         // foundation requirements (§6)
  format_dimensions?: [...],    // e.g. radio: country | urban | spanish | news_talk
  reach_freq_targets,           // standards-table defaults, scaled by budget (§7)
}
```

**Goal → funnel weighting** (the "match the goal with the tactic" rule):
- **Leads / case volume / lower CPL** → weight Intent/Conversion heaviest, then Consideration, lean Awareness. Search, Meta lead-forms, retargeting, SEO rise; YouTube/linear TV appear only with a reason (no bottom-funnel inventory left, or a brand-credibility gap hurting conversion).
- **Brand / enter a new tort** → weight Awareness + Consideration up.
- **Defend share** → Consideration + Intent in channels competitors already own.

**Four deterministic per-tactic scores** (code-owned numbers the AI reasons over):
1. **Funnel fit** — goal × stage weight.
2. **Audience fit** — does this tactic/format reach the right demographic for *this* tort (§8).
3. **Opportunity overlay** — injury volume + geography for *this* market (§8).
4. **Competitive status** — whitespace (open) vs. saturated (expensive), from `strategy_whitespace_channels` + `get_pi_competitors_by_dma`.

The AI receives the scored tactic menu and **selects a coherent, funnel-sequenced mix, respecting one guardrail a generic skill ignores**: a leads-goal plan still usually needs some upper-funnel support, so it won't recommend 100% Search and call it a strategy. It reasons about the *balance*, grounded in the data.

**Library policy:** fixed/curated for v1. The AI may **not** recommend an out-of-library tactic as a core recommendation. A clearly-labeled "adjacent tactic" suggestion slot is a future loosening, not v1.

## 5. Budget realism (the honesty layer)

Every tactic carries a **minimum effective monthly spend** (deterministic). Rough shape:

| Tactic | Min effective / mo | Why |
|---|---|---|
| Paid Search | ~$1.5–2k | Pay-per-click scales down |
| SEO / GBP | ~$1.5–3k | Retainer-shaped, low floor |
| Meta lead-form / retargeting | ~$1.5k | Scales down |
| CTV / OTT | ~$5k | Below this, frequency too thin |
| Radio | ~$5–8k | Needs frequency |
| Linear TV | ~$15–25k+ | Below this you're invisible |

Two deterministic rules feed the AI before it reasons:
1. **Affordability filter** — tactics whose min exceeds the budget are flagged "out of range"; the AI won't pitch them as core.
2. **Concentration rule** — at low budgets, don't fragment. The AI is told the realistic *number* of tactics the budget supports (1–2 at the low end), then picks the best.

The AI is instructed toward **honesty over upsell**: at $2k it says plainly "this budget realistically funds paid search and SEO; here's how to make them work, and here's the spend level where TV/radio start to make sense." That builds trust and creates a natural upgrade conversation. Code owns the feasibility numbers and the tactic count; the AI owns which tactics and the honest narrative.

## 6. Foundation readiness (without becoming an SEO tool)

A media plan is only as good as the funnel it points at. Foundations belong in the strategy as a **readiness gate**, not as tooling the engine builds or runs.

**Mechanism:**
1. **Each tactic carries prerequisites** (deterministic): Paid Search → dedicated landing page + conversion/call tracking; Meta lead-form → CRM/intake that responds in minutes; SEO/GBP → claimed Google Business Profile + healthy site; CTV/TV → a credible brand + somewhere to send the lift.
2. **The interview asks 3–4 readiness questions** (§3).
3. **Output gets a "Before you spend a dollar" section** — lists prerequisites for the *recommended* tactics, flags the gaps the user admitted, and is blunt ("We're recommending paid search, but you told us you don't have landing pages. Fix that first, or you'll pay for clicks that don't convert.").

**Scope decisions:**
- **v1:** readiness gate only (interview-driven + tactic prerequisites). Zero new tooling, ships with the engine.
- **Phase 2 (deferred):** light automated foundation check using existing Ahrefs MCP / SEO data (does the domain rank, is there a GBP, basic site health) to catch "not sure" answers. Not a v1 gate; adds a runtime dependency.
- **Off the table (separate product line):** full SEO audits, landing-page builders. Documented here so they never creep into the strategy engine.

## 7. Recommendation grammar (a media brief, not a buy sheet)

The deliverable guides on **approach + rationale + targets + examples**, then empowers the user/agency to execute. The value is the strategic rationale agencies skip when they get locked into cost-per-point or buying down the ranker, not a directive on exactly what to buy.

Each recommended tactic reads as:
1. **The call + rationale** — e.g. "Radio, weighted to Country and Urban Contemporary, because for [tort] in the Huntsville DMA your plaintiff demographic over-indexes on those formats" (grounded in audience + accident + demographic data).
2. **The target** — "Aim for ~X reach and an effective frequency of Y+." Deterministic, from a media-planning standards table scaled to budget. **A planning target, not a delivered-reach claim.**
3. **Illustrative examples** — 2–3 *real* outlets in the recommended formats, scoped to the selected market: "e.g. WXXX-FM (Urban), WBUL (Country)." Framed as examples.
4. **The empowerment line** — "Here are other in-market stations; explore reach with your media reps before committing."

This is **one tactic inside a holistic, funnel-sequenced plan**, not the plan. Each tactic's rationale connects up- and down-funnel to the rest.

**Reach/frequency reconciliation:** the old "no absolute reach figures" rule stays for *delivered-reach claims* ("this plan reaches 2.3M people" — banned, hallucination risk). Planning *targets* to brief against ("aim for ~60% reach at effective frequency 4+") are legitimate, deterministic, and explicitly allowed.

**Thin-market behavior:** outlets are illustrations of a format recommendation, so thin local inventory is fine. Stay strictly in-market; when a market is thin, lean harder on the format rationale and the "explore with your reps" guidance. **Never fall back to out-of-market (e.g. Birmingham) stations.**

## 8. Data-prep layer (facts in, per the selected market)

The deterministic "gather every real signal" step, market-scoped. **This is where the Huntsville bug dies.**

**Market scoping (the fix):**
- Thread the selected **market (DMA + geographic priority)** into `assembleStrategyInputs` (new parameter).
- Scope `media_outlets` and `broadcast_stations` to **that DMA**, not the whole state. Huntsville selection → only Huntsville-market stations.
- Remove the state-#1-DMA default labeling.

**Principle — feed only signals that change a media decision.** Over-feeding the AI the whole warehouse dilutes reasoning and raises cost + hallucination risk. The deciding test for each signal is "does it change a state-level PI media decision," not "do we have the data."

**Opportunity overlay is a pluggable signal pack, swappable by mode** (this is how the engine later extends to tort pages without a rewrite):
- **State PI mode (v1):** overlay = injury-geography signals.
  - **Auto (FARS)** — core, every state: `get_state_accident_summary` / `state_crash_statistics`.
  - **Construction** — core where populated (`construction_*`): strong PI/workplace signal with a built-in demographic angle (the Texas example).
  - **Boating** — where populated (`boating_*`): real PI signal in coastal/lake states; geographic + seasonal.
  - **Storms** — *demoted to a timing/seasonality note*, not a core opportunity driver (property/surge-timing, not PI media mix).
  - **Cancer incidence — deferred.** A latent mass-tort signal, not state PI media. Belongs to tort mode.
- **Tort mode (next phase, after state pages):** same engine, overlay swaps to tort-specific signals = **cancer incidence + recall density + MDL/litigation activity**. The funnel model, tactic library, budget honesty, grounding contract, and media-brief grammar carry over unchanged; only the opportunity pack changes.

**Constant context layers (both modes), market-scoped, degrading gracefully** (missing block flips an `available` flag; confidence drops rather than fabricating):
- **Demographics:** `census_demographics` (mix incl. `pct_hispanic`, age bands) → population-weighted demographic mix.
- **Media landscape:** `media_outlets` (`format_genre`, `market`), `broadcast_stations` (`network_affil`, `nielsen_dma`), `dma_markets`.
- **Audience consumption:** `media_consumption_baseline` (national, demographic-weighted) → per-tactic/format audience fit.
- **Competitive:** `get_pi_competitors_by_dma`, `strategy_whitespace_channels`, `strategy_market_creatives`.
- **Tort context:** `mass_torts` / `torts`.

**Cross-signal reasoning requirement (the Texas example):** the AI must connect injury type + demographic mix + media landscape. High construction fatalities in a Hispanic-majority Texas metro → recommend Spanish-language radio/TV and regional formats (e.g. Regional Mexican radio, Univision/Telemundo affiliates), grounded in the demographic mix and the `format_genre` / language attributes of real in-market outlets. The audience-fit score (§4.2) must carry a **demographic→media affinity** dimension, including language/cultural formats, so the AI's format calls are data-driven, not guessed.

**Output:** one clean structured payload — market, tort, user framing answers, readiness flags, the scored tactic menu, demographic mix, opportunity signals, and in-market real outlets — with every outlet/competitor/number traceable to a source. **No archetype is chosen here.** The reasoning moves to the AI.

## 9. The AI core + grounding contract

The AI receives the full structured payload and produces:
- The selected, **funnel-sequenced tactic mix** honoring goal→funnel weighting, budget honesty, and concentration.
- The **rationale** per tactic, connecting demographic + injury + competitive data.
- The **format/genre calls + targets + illustrative examples** per the §7 grammar.
- The **"before you spend a dollar"** readiness section.
- The holistic narrative tying it together.

**Grounding contract (validation layer enforces all of it):**
- Every station, competitor, and outlet named must exist in the payload. Invented entity → rejected / regenerated.
- Every hard number (allocation %, min-spend, reach/frequency target) comes from code; the AI may restate but not originate.
- No delivered-reach / guaranteed-outcome claims.
- No out-of-budget or out-of-library tactic as a core recommendation.

## 10. Output contract & deck

Preserve the deck-rendering `Strategy` contract where possible; extend it to carry the new shapes (tactic-level recommendations, funnel sequence, readiness section, format calls + targets + examples). The PPTX export (`web/app/api/strategy/export/route.ts`) and `strategy-deck.tsx` consume the same contract, so contract changes must update both. Keep the change additive where feasible.

## 11. Non-goals (YAGNI)

- SEO audit engine, landing-page builder (separate product line).
- Phase-2 automated foundation check (deferred, not v1).
- AI inventing tactics outside the curated library.
- Delivered-reach / guaranteed-outcome figures.
- Multi-state rollout mechanics (the engine is already state-parameterized; rollout/onboarding is separate work). The engine must be **state-agnostic** so it works as states come online, but onboarding new states is out of scope here.
- **Tort mode** (cancer incidence + recall/MDL opportunity pack for tort pages) — the design keeps the overlay pluggable so this is a clean next phase, but tort mode itself is out of scope for v1.

## 12. Open implementation questions (resolve in planning)

1. **Model choice.** The reasoning load is now much higher than narration. Evaluate moving from `gpt-4o` to a stronger reasoning-grade model. Keep OpenAI infra + `trackCall` cost tracking either way; flag the cost/latency tradeoff.
2. **Tactic library home.** Code constant vs. a Supabase table (`strategy_tactics`). Lean code constant for v1 (vetted, versioned in git, no migration), revisit if it needs per-tenant tuning.
3. **Min-spend & reach/frequency standards tables.** Source values (industry standards) and where they live (code constant vs. table). Same lean as #2.
4. **Demographic→media affinity mapping.** How much is derived from `media_consumption_baseline` vs. a small curated language/format affinity table. Confirm `media_outlets.format_genre` carries enough language/format signal in-market.
5. **Validation strictness.** Reject-and-regenerate (one retry) vs. strip-invalid-entity-and-continue. Lean reject-and-regenerate once, then fail cleanly.

## 13. Prerequisite bug fix

The Huntsville → Birmingham market-scoping bug (§1, §8) is fixed as part of this redesign (the market-scoped assembler). If the redesign slips, the scoping fix can ship as a standalone correctness PR since it undermines trust on every market that isn't the state's #1 DMA.
