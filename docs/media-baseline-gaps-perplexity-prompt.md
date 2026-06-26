# Media baseline — gap research (Perplexity prompt) + verification checklist

Two separate things:
1. **Perplexity prompt** below — for the genuine DATA gaps (data we don't have at all).
2. **Verification checklist** — 8 rows already in the seed that need a primary-source eyeball (NOT a Perplexity task; Perplexity summaries are what produced the conflicting figures, so confirm these against the actual page/PDF).

---

## 1. Perplexity prompt (paste into Perplexity)

> I'm building a U.S. media-consumption-by-demographic dataset for legal/advertising media planning. I need REPUBLISHABLE or at least clearly-cited recent figures (2024–2026) to fill specific gaps. For every figure, give me the exact number, the demographic cut, the primary source name, the source URL, and the year. Flag clearly whether each source is free/public (e.g. Pew, government, free industry PDFs) or paywalled/subscription (e.g. Nielsen/Comscore/Scarborough paid tiers) — I can only publish from free/public sources, so prioritize those.
>
> Fill these gaps specifically:
>
> 1. **Broadcast / linear TV general reach (not news) by race/ethnicity** — what share of Black, Hispanic, Asian, and White U.S. adults watch broadcast or cable TV, or how much time each group spends with linear TV. I have TV-*news* by race from Pew but need GENERAL TV viewing by race. Is there ANY free/public source for this, or is it strictly Nielsen/Scarborough paid? Be explicit if it's paid-only.
>
> 2. **Terrestrial (AM/FM) radio reach by AGE and GENDER, from a free source** — clean recent percentages by age band (18-34, 35-54, 55+) and by gender. I already have Nielsen/Edison cite-as-fact fragments; I want the freest, most citable version.
>
> 3. **Media consumption by household INCOME, beyond TV** — income-tier breakdowns (e.g. under $50K / $50-100K / $100K+) for radio, podcasts, social platforms, and YouTube. I have streaming and linear-TV-by-income; income is thin for the other channels. Free/public sources preferred.
>
> 4. **Out-of-home / billboard reach by demographic** (optional, if a clean free source exists) — any recent demographic reach data for OOH that a media planner would cite.
>
> Keep it organized by gap number. Skip anything that requires a paid subscription unless there's truly no free alternative, in which case say so plainly so I know the gap is unfillable without a license.

---

## 2. Verification checklist (human check vs primary source — NOT Perplexity)

These 8 rows are in the seed but flagged UNVERIFIED. Open the actual source and confirm the exact figure before ship. If a number can't be confirmed, drop the row.

| # | Row | Seed value | Confirm against |
|---|---|---|---|
| 1 | Podcast monthly reach, Black | 66% | Edison Podcast Consumer 2026 PDF (race breakdown page) |
| 2 | Podcast monthly reach, Hispanic | 60% | Edison Podcast Consumer 2026 PDF |
| 3 | TikTok use, 18-29 | 59% | Pew "8 facts about Americans and TikTok" (Mar 2026) — secondary said 63%, direct search said 59%; confirm which |
| 4 | TikTok use, 30-49 | 44% | Pew "8 facts about Americans and TikTok" |
| 5 | TikTok use, 50-64 | 30% | Pew "8 facts about Americans and TikTok" |
| 6 | YouTube use, 18-29 | 90% | Pew "5 facts about Americans and YouTube" (Feb 2025) |
| 7 | YouTube use, 50-64 | 86% | Pew "5 facts about Americans and YouTube" |
| 8 | YouTube use, 65+ | 65% | Pew "5 facts about Americans and YouTube" |

Tip: all 6 Pew rows (#3–8) can be confirmed by opening the two Pew short-reads pages and reading the age table. The 2 Edison rows (#1–2) need the Podcast Consumer 2026 PDF, which has a free download.
