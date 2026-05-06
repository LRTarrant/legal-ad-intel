# CLAUDE.md — Legal Marketing Intelligence

You are Claude Code working in the Legal Marketing Intelligence (LMI) repo.

Your job: be a **careful, high-quality coder**, not an autonomous agent. Follow these rules every session. [file:32][cite:60]

---

## 1. Project overview

- LMI is a legal advertising intelligence SaaS for U.S. plaintiff firms and their agencies.
- It turns ad activity + injury/litigation/public data into practical campaign plans and dashboards.
- Every feature should expose unique, layered data signals that change a marketing or case-acquisition decision. [cite:65]

---

## 2. Tech stack

- Frontend: Next.js App Router, TypeScript, Tailwind, Vercel.
- Backend/API: Next.js API routes; server-side ffmpeg/media utilities.
- Database/Auth: Supabase Postgres with row-level security.
- Data/ETL & automation:
  - Python scripts for ingest/normalize FARS, NOAA, demographics, MDL/JPML, CourtListener/RECAP, PI viability, etc.
  - GitHub Actions integrating Searchapi.io, OpenAI, Apify, ElevenLabs, and other providers for ETL and AI content workflows.
  - Supabase cron planned for in-database refresh/publish jobs. [cite:75][cite:76]

---

## 3. Coding principles

1. Small, safe changes first  
   - Prefer minimal diffs over large refactors.  
   - If a refactor seems necessary, describe it first and wait for confirmation.

2. Be explicit about schema and migrations  
   - Call out any DB or RLS changes.  
   - Propose SQL migrations but assume the user will apply them manually.

3. Match existing patterns  
   - Follow existing file/module layout and naming.  
   - Don’t introduce new frameworks or paradigms unnecessarily.

4. Types and tests  
   - Maintain or improve TypeScript safety.  
   - Update or add tests when touching core logic.

5. Respect RLS, privacy, and ToS  
   - Do not expose sensitive data directly to the frontend.  
   - Assume existing RLS patterns must be preserved.

---

## 4. Repo navigation

At session start, look for and honor these files:

- `PROJECT_BRIEF.md` — product context, audiences, priorities.
- `SCHEMA.md` — generated types / DB schema snapshot.
- `ARCHITECTURE.md` — high-level architecture and automation notes.
- `CURRENT_PRIORITIES.md` — active work for this week.

Respect any “DO NOT TOUCH” or “experimental” notes.

---

## 5. Task boundaries

You **should**:

- Implement/modify features that touch a reasonable number of files (≈1–10).
- Fix bugs, improve type-safety, and wire UI to existing data.
- Draft or modify Python ETL modules and GitHub Actions YAML when asked.
- Suggest tests and basic observability when useful. [cite:75][cite:76]

You **should not**:

- Attempt repo-wide refactors without explicit instruction.
- Change deployment/CI settings unless asked.
- Invent new external APIs or providers without user approval.
- Fabricate datasets or signals not grounded in real sources.

---

## 6. Collaboration with other tools

Routing rules (high level):

- Perplexity Computer — multi-tool orchestration only (browser + repo + shell + scheduling); not for routine coding. [file:32]
- Perplexity chat — research, specs, market analysis.
- Claude (you) — primary coder for multi-file and cross-layer changes.
- ChatGPT — tactical debugging and small one-off fixes. [file:32][cite:60]

If the user pastes a router decision or task plan, follow it and keep scope to that plan.

---

## 7. UX & content style

- Audience: U.S. plaintiff firms, agencies, and media sellers.
- Tone: clear, direct, professional; bias toward decision-making language.
- For Campaign Builder, PI surfaces, and tort pages:
  - Emphasize what the data means for marketing decisions (“so what”), not just raw stats. [cite:65][cite:67]

---

## 8. Safety & review

- Start big changes with a brief plan (3–6 bullets) before dumping a large diff.
- Call out any risky changes (schema, RLS, auth, pricing/entitlements).
- If requirements are ambiguous, ask for clarification instead of guessing.

---

## 9. Example good tasks

- “Wire the PI geo-targeting API into the Campaign Builder flow and add tests.” [cite:85]
- “Update the FARS ETL script to handle the 2025 CSV schema and refresh normalized tables.” [cite:75][cite:76]
- “Implement the trial subscription seeder so invite acceptance creates a proper subscriptions row with buyer_type, tier='trial', status='trialing', and aligned current_period_end.” [cite:71]
