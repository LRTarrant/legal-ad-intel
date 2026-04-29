# State Onboarding Runbook

How to add a new state to the state-intelligence section.

## 1. Run the scaffolder

```bash
python scripts/onboard_state.py georgia \
  --abbr GA \
  --display-name "Georgia" \
  --has-injury-data
```

This creates:
- `web/app/(app)/state-intelligence/georgia/page.tsx`
- `web/app/(app)/state-intelligence/georgia/georgia-client.tsx`
- `web/lib/data/competitive-landscape/georgia.ts` (stub)
- `web/lib/data/ga-injury-stats.ts` (stub, if `--has-injury-data`)
- Registers the state in the sidebar, AI search allowlist, and `STATE_FILES`

## 2. Add Tableau (or similar) iframe URLs

Open `web/app/(app)/state-intelligence/{slug}/{slug}-client.tsx` and find the `StateCrashEmbed` TODO comment. Replace it with:

```tsx
<StateCrashEmbed
  stateName="Georgia"
  sourceLabel="GA Governor's Office of Highway Safety"
  sourceUrl="https://example.com"
  embeds={[
    {
      name: "Fatal Crashes",
      iframeSrc: "https://...",
      height: 2000,
      description: "Description of this dashboard.",
    },
  ]}
/>
```

If the state has no public crash dashboards, remove the TODO comment entirely.

## 3. Parse injury data (if applicable)

a. Download the state's injury PDF.

b. Create a state config JSON:

```bash
cp scripts/state_configs/tennessee.json scripts/state_configs/georgia.json
# Edit georgia.json: update state_name, state_abbr, counties, years, exports, etc.
```

c. Run the parser:

```bash
# From pre-extracted text:
python scripts/parse_state_injury_pdf.py \
  --txt /path/to/georgia_injuries.txt \
  --state-config scripts/state_configs/georgia.json \
  --out web/lib/data/ga-injury-stats.ts

# Or from PDF directly (requires poppler-utils):
python scripts/parse_state_injury_pdf.py \
  --pdf /path/to/georgia_injuries.pdf \
  --state-config scripts/state_configs/georgia.json \
  --out web/lib/data/ga-injury-stats.ts

# Or from a previously parsed CSV:
python scripts/parse_state_injury_pdf.py \
  --csv /path/to/georgia_injuries.csv \
  --state-config scripts/state_configs/georgia.json \
  --out web/lib/data/ga-injury-stats.ts
```

## 4. Seed plaintiff firms

Edit `web/lib/data/competitive-landscape/{slug}.ts`:
- Add 5 firms per major DMA
- Follow the existing Tennessee file as a template

## 5. Verify build

```bash
cd web && npm run build
```

## 6. Open PR

Create a PR against `main`. After merge, trigger the ingestion workflows:
- Ad Intel Daily
- Google Ads Daily
- TikTok Ads Daily
- SERP Intel Daily
