# Claude Code handoff — Media Consumption Baseline

Two prompts, run in order. **Prompt 1** is plain Claude Code (data + engine logic, no UI). **Prompt 2** is the Impeccable design flow for the UI, run only after Prompt 1 ships so Impeccable designs against a populated table, not an empty one.

Shared context for both: all research, sourcing, and the table spec are committed to `docs/`. Source of truth:
- `docs/media-consumption-baseline.md` — table spec, licensing constraints, wiring instructions, page rendering requirements.
- `docs/media_consumption_baseline_seed.csv` — 34 curated, sourced rows. Do NOT invent or alter any percentages; use these exact values. If a number looks wrong, stop and ask — new numbers require a fresh licensing check.

---

## PROMPT 1 — data + engine wiring (plain Claude Code)

Paste this block into Claude Code from inside the `legal-ad-intel` repo:

> We're adding a demographic media-consumption baseline so the Strategy Engine's audience-fit signal stops running empty. Read `docs/media-consumption-baseline.md` and `docs/media_consumption_baseline_seed.csv` first — they're the source of truth, and the percentages are pre-sourced and licensing-checked (do not alter them or pull "fresher" numbers). Also re-read `CLAUDE.md` §2, and inspect the live `media_profiles` table via the Supabase MCP so you augment rather than blindly replace it.
>
> This prompt is DATA + LOGIC + ROUTE-SCAFFOLD ONLY. Do NOT design/style the Media Consumption UI — that's a separate Impeccable design pass after this ships. You WILL create a minimal stub page + sidebar entry (step 4) so Impeccable has a route to design into, but leave the visual build to Impeccable. Do NOT touch the existing `web/app/(app)/market-demographics/` page.
>
> Build in this order, smallest safe steps first, and show me a 3–6 bullet plan before the migration:
> 1. **Migration** — create `media_consumption_baseline` per the spec's table definition (note the `scope` column — `news` vs `general` — it's load-bearing), then INSERT every row from `docs/media_consumption_baseline_seed.csv` (~53 rows; use the CSV as the source of truth for the count, don't hardcode it). New file under `supabase/migrations/` (run `ls supabase/migrations/ | grep ^<your-timestamp>` first — duplicate-version collisions block the queue, see CLAUDE.md §11). RLS: readable by authenticated users like other reference tables, not service-role-only. Give me the SQL to review before applying.
> 2. **Regenerate types** → `web/lib/database.types.ts`.
> 3. **Wire `assemble-inputs.ts`** — replace/augment the audience-fit block (~line 267, the `media_profiles` path) per the spec: pull the county demographic mix, query the baseline for the dominant demographic groups, compute a deterministic per-channel RELATIVE fit score weighted by the county's demographic shares. **CRITICAL: respect the `scope` column (read the spec's "News vs general scope" section). Prefer `scope='general'` rows; use `scope='news'` only as a relative-ranking proxy. For radio, the fit MUST come from the general Nielsen reach rows (Black 92% / Hispanic 98% / Urban 50.2%), NOT the Pew radio-news 11% row — using the news row would wrongly tank radio.** Keep the math out of the LLM (match `channel-plan.ts`); the LLM narrates and should say "news-consumption proxy" when only a news row backs a channel. **Also wire `ctv` fit from the new CTV rows — `channel-plan.ts` already lists `ctv` (awareness) but it had NO baseline rows, so it was being planned blind; the CTV rows are Nielsen-cited `general` (display cited, never reproduced tables). And keep `ctv` and `digital` as separate channels — `digital` is a device bucket, not a buyable channel (see the spec's Known gaps).** Preserve graceful degrade: `audience_fit: true` only when rows are found, honest directional fallback otherwise. Add/update unit tests alongside `strategy-engine.test.ts` — include a test asserting radio fit for a high-Black-share county uses the general reach row, not the news row.
> 4. **Scaffold the standalone route + sidebar entry (stub only).** Create `web/app/(app)/media-consumption/page.tsx` as a minimal placeholder (it can just read + dump the baseline rows for now — Impeccable designs it in Pass 2). Add a new sidebar item `{ label: "Media Consumption", href: "/media-consumption", Icon: <pick a fitting lucide icon> }` under the existing **"Audiences & Media Research"** heading in `web/app/(app)/sidebar.tsx`, as a sibling to "Market Demographics". Placement is locked (see spec): standalone page, NOT a tab on Market Demographics. Do not style it — just a working route + nav link.
> 5. **Verify against a deployed environment** (CLAUDE.md §2.7): drive the Alabama page's Strategy Engine, confirm an Audience-Play archetype now cites real consumption fit (e.g. radio over-indexing for a high-Black-share market). Confirm the new `/media-consumption` route loads and the sidebar item appears. Screenshot it.
>
> Hard constraints: engine stays relative-scores-only (fit × (1 − competition)), no absolute reach/impressions. Pew rows carry attribution downstream; Nielsen rows are cite-as-fact only (never reproduced tables). Branch + PR, do NOT push to main — the `assemble-inputs.ts` edit touches the live Alabama engine, tests are the guardrail.

---

## PROMPT 2 — Media Consumption UI (Impeccable, after Prompt 1 ships)

Run the Impeccable design flow for the new section. The table now exists with real rows, so Impeccable designs against live data.

**Impeccable flow for this build (per impeccable.style/designing):**
`/impeccable init` already run in the repo (used during the Alabama state-page polish), so `PRODUCT.md` + `DESIGN.md` exist — skip init.
1. **This is PRODUCT mode, not brand mode.** Impeccable's own rule: brand = landing pages/editorial (the impression is the product); product = "app UI, admin, dashboards, tools — users are here to finish something." The Media Consumption page is a data display inside the authenticated app. State product mode so it picks fluent density + semantic states + repeatable components, not an editorial hero treatment.
2. **`/impeccable shape`** the page against the brief below → **`/impeccable craft`** the build.
3. **Pre-ship gauntlet** (the page has real edge cases — missing rows, a demographic with no data, long citations): `/impeccable audit` (scores a11y/responsive/anti-patterns), `/impeccable clarify` (rewrites labels + microcopy to the LMI audience), `/impeccable harden` (stress-tests messy/empty data). Point each at just this page, not the whole app — Impeccable notes a narrow target reviews sharper.

Design brief to feed Impeccable `shape` (this is the WHAT and the constraints — let Impeccable own the HOW/visual design):

- **Surface:** the standalone `web/app/(app)/media-consumption/page.tsx` route that Pass 1 scaffolded (sidebar item already added under "Audiences & Media Research"). Design the full page here. Placement is locked — standalone, sibling to Market Demographics, NOT a section on the Market Demographics page.
- **Data source:** the `media_consumption_baseline` table (national rows). Read-only render.
- **Content to show:** demographic × channel consumption — the by-race cut (how Black / Hispanic / White / Asian audiences consume TV, radio, social, YouTube, etc.) and the by-age cut (how 18–29 vs 50+ split across social, podcasts, TV). Pull metric + value + source per row. **Show the `scope` honestly: distinguish news-consumption rows from general-usage rows (a small "news" vs "general reach" label/grouping). Don't present a news-getting % as if it were total reach — that's the credibility line a media buyer would test.**
- **Required, non-negotiable (licensing):**
  - Attribution block directly with the data: "Source: Pew Research Center (2024–2025); BLS American Time Use Survey." plus the Pew disclaimer verbatim: "Pew Research Center bears no responsibility for the analyses or interpretations of the data presented here."
  - Nielsen-sourced figures get an inline "(Nielsen, [year])" cited-stat treatment with the public link — never a reproduced Nielsen table.
  - One honest framing line: "National consumption patterns by demographic, applied to this market's population mix." Do NOT present it as measured local consumption.
  - Never lay it out so it implies Pew/Nielsen endorses a firm or campaign — keep the citation visually separate from any recommendation.
- **Audience/voice:** the three LMI personas (PI firms, agencies, media sellers). Clear, decision-oriented, not academic.

After Impeccable crafts it, verify on a deployed environment (screenshot) and confirm the attribution + disclaimer render.

---

## Notes for Lance (not part of the paste)

- Order matters for a real reason: Prompt 1 first means Impeccable shapes the section against a populated table, so the layout reflects actual data, not a guess.
- The two prompts are independent deploys — the engine improvement (Prompt 1) ships and is valuable on its own even before the UI section exists.
- Riskiest step is Prompt 1 #3 (live engine edit) — branch + PR, tests guard it.
- If Claude Code offers to pull fresher Pew numbers itself, stop it — sourcing + licensing were done deliberately. New numbers = new licensing check.
- I couldn't read Impeccable's exact `shape`/`craft` step definitions from Cowork (it's a Claude Code skill). The Prompt 2 brief is written as design INPUT so the Impeccable flow drives the specifics — adjust the brief into whatever shape `/impeccable shape` expects as you learn the flow.
