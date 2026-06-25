# Product

## Register

product

## Users

Three audiences, all making money decisions about legal advertising:

- **Plaintiff / mass-tort law firms** — partners and in-house marketing leads deciding where to spend case-acquisition budget, which torts to chase, and which markets are winnable.
- **Legal-focused ad agencies** — media buyers and strategists building campaign plans and proposals for firm clients.
- **Media sellers** (Entravision, iHeart, NBCU and similar) — reps who need a credible, data-backed reason a firm should buy their inventory.

Context of use: focused work sessions, often pulling a number or a chart into a pitch, a plan, or a budget conversation. Frequently non-technical. They are not analysts; they want the "so what," not a raw data dump. They will judge the product's credibility by how it looks and how fast it gets them to a decision.

## Product Purpose

Legal Marketing Intelligence (LMI) turns ad activity plus injury, litigation, and public data into practical campaign plans, intelligence surfaces, and dashboards for U.S. plaintiff firms and their agencies. Every surface should expose unique, layered data signals that change a marketing or case-acquisition decision (where competitors advertise, which markets are saturated, which torts have traction, which recalls are pre-MDL). Success is a user looking at a screen and changing what they spend, where they run, or which case type they pursue.

## Brand Personality

**Modern & premium.** Polished SaaS craft, generous and deliberate whitespace, refined detail. This is a paid intelligence product and should feel worth the price the moment it loads. Voice is clear, direct, and professional, biased toward decision-making language ("so what for your spend"), never hype. Confident without being loud; the data and the craft carry the authority, not exclamation points.

## Anti-references

This should explicitly NOT look or feel like:

- **Generic "ad spy" tools** (AdSpy, BigSpy, SpyFu) — raw ad dumps with no decision layer, scraper aesthetic. LMI always adds the interpretation.
- **Cookie-cutter AI SaaS** — purple gradients, hero-metric template (big number + small label + gradient accent), identical icon-card grids, gradient text, tracked-uppercase eyebrows on every section. The saturated 2026 AI-generated look.
- **Cheap legal-lead / ambulance-chaser sites** — garish red CTAs, stock gavels, trust-badge spam, loud urgency.
- **Dense enterprise BI** (Tableau, legacy dashboards) — wall-of-charts overwhelm with no narrative, hostile to non-analysts. LMI is BI made legible for marketers.

## Design Principles

1. **Decision over data.** Every surface leads with what the number means for a marketing or case-acquisition decision, then shows the supporting data. No stat ships without a "so what."
2. **Earn the premium.** Craft is the proof of value. Spacing rhythm, type hierarchy, and interaction detail should read as a high-end paid product, not a scaffold.
3. **Legible intelligence, not a data dump.** Layered signals presented so a non-analyst gets the insight at a glance. Depth is available on demand, never forced up front.
4. **Quiet authority.** Confidence comes from the data and the restraint, not from loud color, urgency, or hype. The interface should feel like it knows more than the competition without shouting it.
5. **Brand-flexible by design.** The system is multi-tenant (per-firm primary/accent/surface/fonts via CSS variables). Components must stay coherent and premium across tenant palettes, not just the default LMI navy/teal.

## Accessibility & Inclusion

Target **WCAG 2.1 AA**. Body text ≥ 4.5:1 contrast (large/bold text ≥ 3:1), including placeholder text and muted labels — verify against tinted surfaces, not assumed. Full keyboard navigation with visible focus states. Respect `prefers-reduced-motion` on every animation (crossfade or instant fallback). Don't encode meaning in color alone (status, chart series). Hold the AA bar across tenant palettes, not just the default theme.
