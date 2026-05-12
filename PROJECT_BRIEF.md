# Project Brief — Legal Marketing Intelligence (LMI)

## 1. What this product is

Legal Marketing Intelligence (LMI) is a legal advertising intelligence SaaS for U.S. plaintiff firms and their agencies.

It aggregates market-wide legal ad activity (TV, CTV, radio, digital) and overlays it with risk and opportunity signals (injury events, litigation posture, demographics) so buyers can make better decisions about:
- Which torts to advertise
- Where and when to run campaigns
- What realistic signed-case economics look like. [cite:65][cite:62]

Core philosophy: every surface (PI, mass tort, media seller view) must expose unique, layered data signals that change a marketing decision — not just generic AI ad generation. [cite:65]

## 2. Primary audiences

1. **Media sellers** (Entravision, iHeart, NBCU, etc.)  
   - Job: pitch and close plaintiff firms and legal agencies on TV/CTV/radio inventory.  
   - Want: who to call, which torts are hot in which markets, and a credible “why now.”

2. **Legal-focused ad agencies**  
   - Job: plan and optimize campaigns across channels for plaintiff firms.  
   - Want: where competitors are spending, where risk/opportunity is mispriced, and how to package media + creative.

3. **Plaintiff / mass-tort firms**  
   - Job: decide which torts and geos to invest in, and expected cost per signed case.  
   - Want: clear, honest views of saturation, risk, and signed-case economics — not hype. [cite:63][cite:64]

## 3. Key value propositions

- Unique signals, not generic stats — combine ad activity, injury/fatality data, litigation posture, demographics, and judicial context into layered views that directly inform marketing decisions. [cite:65]
- Campaign Builder as the front door — turns signals into practical plans (tort + geo + budget, strategic brief, geo recommendations, creative, bulk-import CSVs for Meta and Google Ads, video with logo watermark). [cite:67][cite:79][cite:82][cite:85]
- One data spine, multiple workspaces — same intelligence powers media seller, agency, and firm views. [cite:63][cite:65]

## 4. Tech stack & automation

- **Frontend:** Next.js App Router, TypeScript, Tailwind, Vercel.
- **Backend/API:** Next.js API routes; server-side ffmpeg utilities for video rendering. [cite:79]
- **Database/Auth:** Supabase Postgres with row-level security.
- **Data & ETL:**
  - Python jobs for ingest/normalize external datasets (FARS, NOAA Storm Events, demographics, MDL/JPML, CourtListener/RECAP, PI viability). [cite:75][cite:76][cite:77]
  - GitHub Actions wired to external providers (Searchapi.io, OpenAI, Apify, ElevenLabs, etc.) for advertising and AI workflows.
  - Supabase cron (pg_cron) and future Actions handle scheduled refresh and publish steps. [cite:75][cite:76]

## 5. Product constraints / non-goals (for now)

- No consumer or defense/insurance use cases.
- No generic “ad spy” clone — LMI must add unique signal beyond scraped ads.
- No freemium; trials are guided / invite-only. [cite:64]
- Respect privacy, court terms of use, and ad platform ToS.

## 6. Pricing direction (still evolving)

- Starter: ~\$495/mo  
- Pro (hero tier): ~\$1,495/mo  
- Media/enterprise tiers: ~\$3,500–\$4,000/mo  
- Per-seat pricing by company size, strong annual commitments and referral incentives, usage-based AI content credits, white-label as separate SKU. [cite:64]

## 7. Near-term priorities (snapshot)

- Standardize tort pages to a centralized criteria/screening data store with full questions + disqualifiers. [cite:66]
- Upgrade Campaign Builder to consume that criteria data for multi-step qualification flows. [cite:66][cite:67]
- Build out state-level PI surfaces and supporting data for more jurisdictions. [cite:62]
- Polish UI/UX, docs, and demos for media companies, agencies, and firms. [cite:62][cite:63]
