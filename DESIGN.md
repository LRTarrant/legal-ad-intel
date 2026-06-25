---
name: Legal Marketing Intelligence
description: Competitive ad intelligence for U.S. plaintiff law firms, presented as a calm, authoritative briefing surface.
colors:
  midnight-navy: "#0B1D3A"
  intelligence-teal: "#1A8C96"
  steel-blue: "#2E5077"
  light-teal: "#4FB8C4"
  charcoal: "#1E1E2E"
  slate-gray: "#6B7280"
  cloud: "#F1F5F9"
  white: "#FFFFFF"
  success: "#10B981"
  warning: "#F59E0B"
  alert: "#EF4444"
  viz-green: "#16A34A"
  viz-amber: "#E0A030"
  viz-red: "#DC2626"
  jud-conservative: "#D64550"
  jud-liberal: "#2F6FED"
  jud-moderate: "#E0A030"
  jud-unknown: "#94A3B8"
typography:
  display:
    fontFamily: "DM Sans, system-ui, sans-serif"
    fontSize: "1.875rem"
    fontWeight: 700
    lineHeight: 1.15
    letterSpacing: "-0.01em"
  headline:
    fontFamily: "DM Sans, system-ui, sans-serif"
    fontSize: "1.25rem"
    fontWeight: 600
    lineHeight: 1.25
    letterSpacing: "normal"
  title:
    fontFamily: "DM Sans, system-ui, sans-serif"
    fontSize: "1rem"
    fontWeight: 600
    lineHeight: 1.4
    letterSpacing: "normal"
  body:
    fontFamily: "Inter, system-ui, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.6
    letterSpacing: "normal"
  label:
    fontFamily: "DM Sans, system-ui, sans-serif"
    fontSize: "0.6875rem"
    fontWeight: 700
    lineHeight: 1.2
    letterSpacing: "0.2em"
  mono:
    fontFamily: "JetBrains Mono, monospace"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.4
    letterSpacing: "normal"
rounded:
  sm: "6px"
  md: "8px"
  lg: "12px"
  xl: "16px"
  full: "9999px"
spacing:
  xs: "8px"
  sm: "12px"
  md: "16px"
  lg: "20px"
  xl: "24px"
components:
  button-primary:
    backgroundColor: "{colors.white}"
    textColor: "{colors.intelligence-teal}"
    rounded: "{rounded.md}"
    padding: "8px 16px"
  button-primary-hover:
    backgroundColor: "{colors.intelligence-teal}"
    textColor: "{colors.white}"
    rounded: "{rounded.md}"
    padding: "8px 16px"
  card:
    backgroundColor: "{colors.white}"
    textColor: "{colors.charcoal}"
    rounded: "{rounded.lg}"
    padding: "24px"
  card-hero:
    backgroundColor: "{colors.midnight-navy}"
    textColor: "{colors.white}"
    rounded: "{rounded.xl}"
    padding: "24px"
  chip-status:
    backgroundColor: "{colors.cloud}"
    textColor: "{colors.slate-gray}"
    rounded: "{rounded.full}"
    padding: "4px 12px"
---

# Design System: Legal Marketing Intelligence

## 1. Overview

**Creative North Star: "The Intelligence Terminal"**

LMI is a calm, authoritative briefing surface for people spending real money on legal advertising. The screen behaves like a terminal an analyst trusts: navy carries authority, teal is the signal that something matters, and a cloud-tinted canvas keeps everything legible across long working sessions. Density is purposeful, never frantic. White card surfaces float a hair above the cloud background; hairline dividers and a single restrained accent do the structural work that color overload would do in a lesser product. The data reads like a verdict, not a spreadsheet.

This system is modern and premium by craft, not by decoration. Authority comes from restraint: generous whitespace, a tight type hierarchy, and the discipline to let one teal accent mean something. It explicitly rejects the "ad spy" scraper aesthetic (raw dumps with no decision layer), the cookie-cutter AI-SaaS look (purple gradients, hero-metric templates, identical icon-card grids, gradient text), the garish ambulance-chaser palette (loud red CTAs, stock gavels, urgency badges), and the wall-of-charts overwhelm of legacy enterprise BI. LMI is business intelligence made legible for marketers who are not analysts.

The system is also multi-tenant: primary, accent, surface, and fonts are driven by CSS variables (`--color-primary`, `--color-accent`, `--color-surface`, `--tenant-font-heading`) so a firm's own brand can ride on top. Every pattern here must stay coherent and premium when those variables shift, not just under the default navy/teal.

**Key Characteristics:**
- Navy authority, teal signal, cloud canvas, white surfaces.
- Flat by default; elevation is a whisper (`shadow-sm`), never a slab.
- One accent, used sparingly. Teal earns attention because it is rare.
- Decision-first layout: the verdict, then the supporting data.
- Tenant-flexible: the whole system survives a palette swap.

## 2. Colors

A disciplined navy/teal palette on a cool near-white canvas, with semantic and data-viz colors held in reserve for meaning, never decoration.

### Primary
- **Midnight Navy** (#0B1D3A): The authority color and the workhorse. Headings, primary text emphasis, the drenched hero blocks (`card-hero`), and key structural elements. When a surface needs to feel weighty and certain, it goes navy.
- **Intelligence Teal** (#1A8C96): The one signal accent. Section labels, the primary CTA outline, active states, accent borders, and "this matters" highlights. Its rarity is the entire point (see The One Signal Rule).

### Secondary
- **Steel Blue** (#2E5077): A bridge tone between navy and teal for the rare case that needs a third structural blue. Used sparingly; do not reach for it to add variety.
- **Light Teal** (#4FB8C4): A lifted teal for hover tints and secondary accent fills. Rare by design.

### Neutral
- **Charcoal** (#1E1E2E): Default body-text ink on light surfaces. The foreground default.
- **Slate Gray** (#6B7280): Secondary text, captions, supporting labels, and divider-label text. Verify 4.5:1 before using on tinted surfaces; do not drop opacity so far that supporting copy fails contrast.
- **Cloud** (#F1F5F9): The page canvas and the hairline border/divider color. Also used at low opacity (`cloud/30`–`cloud/60`) for inset tinted blocks.
- **White** (#FFFFFF): Card and panel surfaces. The figure against the cloud ground.

### Tertiary (semantic + data-viz)
- **Success** (#10B981) / **Warning** (#F59E0B) / **Alert** (#EF4444): UI state semantics (toasts, status, validation).
- **Viz Green** (#16A34A) / **Viz Amber** (#E0A030) / **Viz Red** (#DC2626): Score and viability bands (favorable / challenging / difficult). Slightly deeper than the UI semantics so they read correctly inside dense data surfaces.
- **Judicial lean** — Conservative (#D64550) / Liberal (#2F6FED) / Moderate (#E0A030, = Viz Amber) / Unknown (#94A3B8): the categorical palette for judicial-profile data (county maps, judicial-mix bars). These encode an external red/blue/amber political convention, so they sit outside the brand ramp on purpose. **One canonical set**: the county map and every state page's judicial-mix bar must use these exact values — do not fork a second judicial palette.

### Named Rules
**The One Signal Rule.** Intelligence Teal appears on ≤10% of any screen. It marks the one thing that matters in that view (the active state, the primary action, the section label). If teal is everywhere, it signals nothing. Build variety from navy, slate, and cloud, not from spending the accent.

**The Earned Color Rule.** Semantic and viz colors carry meaning only. A red is a verdict ("Difficult"), never a decoration. Never use alert red as a CTA color or a brand flourish; that is the ambulance-chaser tell.

## 3. Typography

**Display Font:** DM Sans (with system-ui, sans-serif)
**Body Font:** Inter (with system-ui, sans-serif)
**Label/Mono Font:** JetBrains Mono (with monospace)

**Character:** DM Sans (geometric, confident) for headings against Inter (humanist, highly legible) for body is a deliberate contrast pairing, not two-of-a-kind. DM Sans gives headings a modern, slightly editorial authority; Inter keeps dense data and prose effortless to read. JetBrains Mono is reserved for figures, codes, and tabular values where character alignment matters.

### Hierarchy
- **Display** (DM Sans 700, 1.875rem / ~30px, line-height 1.15): Page titles (e.g. a state name). Restrained on purpose. This is a product, not a billboard; there is no oversized hero clamp.
- **Headline** (DM Sans 600, 1.25rem): Section and card-group headings.
- **Title** (DM Sans 600, 1rem): Card titles and sub-section headers.
- **Body** (Inter 400, 1rem, line-height 1.6): Paragraph and explanatory copy. Cap measure at ~65–75ch (the product uses `max-w-2xl`).
- **Label** (DM Sans 700, 0.6875rem / 11px, letter-spacing 0.2em, UPPERCASE): The teal section kicker and slate divider labels. This is a deliberate, controlled labeling system, not a per-section reflex.
- **Mono** (JetBrains Mono 400, 0.875rem): Figures, IDs, and tabular numerics.

### Named Rules
**The Controlled Kicker Rule.** The uppercase tracked label is a structural device used once to title a page region or to caption a hairline divider, in teal or muted slate. It is allowed because it is rationed. It is forbidden to stack one above every section as scaffolding; that is the AI-grammar trope, not voice.

**The Restrained Display Rule.** Display headings stay at ~30px and never balloon into a marketing-hero clamp. Authority here is hierarchy and whitespace, not type size.

## 4. Elevation

Flat by default, with a single whisper of lift. The system is built on tonal layering: white card surfaces sit on the cloud (#F1F5F9) canvas, separated by hairline `border-cloud` strokes rather than heavy shadows. Depth is conveyed by the figure/ground contrast of white-on-cloud and by 1px borders, not by stacked drop shadows. The one ambient shadow (`shadow-sm`) is used almost universally on resting cards as a barely-there grounding, and heavier shadows (`shadow-lg`) appear only on genuinely floating UI (sticky/backdrop layers, dropdowns). Nested cards are forbidden.

### Shadow Vocabulary
- **Resting** (`box-shadow: 0 1px 2px 0 rgb(0 0 0 / 0.05)` — Tailwind `shadow-sm`): The default grounding on white cards. So subtle it reads as a hairline, not a slab.
- **Floating** (`box-shadow: 0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)` — Tailwind `shadow-lg`): Reserved for layers that genuinely sit above the page (popovers, dropdowns, the occasional spotlight panel).

### Named Rules
**The Whisper Rule.** If a shadow is visible as a shadow at rest, it is too strong. Resting elevation is `shadow-sm` and nothing heavier. Structure comes from borders and white-on-cloud contrast first.

**The Flat Stack Rule.** Surfaces do not nest. A card never contains another bordered, shadowed card. Inside a card, use tinted insets (`bg-cloud/40`) and hairline dividers, never a second elevation tier.

## 5. Components

### Buttons
- **Shape:** Gently curved (8px radius, `rounded.md`).
- **Primary (the signature CTA):** Ghost/outlined, not filled at rest. A 2px Intelligence Teal border with teal label on white, `inline-flex` with a leading 16px icon. The fill-on-hover is the moment of life: on hover the background becomes solid teal and the label flips to white, over a ~150ms transition.
- **Hover / Focus:** Background `intelligence-teal`, text `white`. Focus-visible must show a clear ring (teal at reduced opacity); never rely on the hover fill alone for keyboard users.
- **Secondary / Ghost:** Borderless slate text actions for low-emphasis controls. There is no loud filled-red or filled-navy "shouting" button in the system.

### Chips / Pills
- **Style:** Fully rounded (`rounded.full`), 11px bold uppercase label, `px-3 py-1`, with a tinted background and matching 1px border in the same hue family (e.g. status: `bg-red-50` + `border-red-300` + `text-red-600`).
- **State:** Used as status/verdict tags ("Contributory Negligence State", viability band). The color is semantic; a chip's hue always means something.

### Cards / Containers
- **Corner Style:** 12px (`rounded.lg`) for standard cards; 16px (`rounded.xl`) for hero/feature blocks.
- **Background:** White (`#FFFFFF`) on the cloud canvas. Hero/feature blocks invert to drenched Midnight Navy with white text.
- **Shadow Strategy:** `shadow-sm` at rest (see Elevation). No heavier shadow on standard cards.
- **Border:** 1px `border-cloud` hairline. Accent cards may add a subtle teal treatment: a 1px `intelligence-teal/20` border with a near-invisible `from-intelligence-teal/[0.04] to-white` wash, or a 3px **top** accent rule (`border-t-[3px] border-t-intelligence-teal`). Top accents only.
- **Internal Padding:** 20–24px (`spacing.lg`–`spacing.xl`); tighter (16px) for compact metric cards.

### Inputs / Fields
- **Style:** White or cloud-tinted fill, 1px `border-cloud`, `rounded.md` (8px). Quiet at rest.
- **Focus:** Border shifts to Intelligence Teal with a soft teal ring. Placeholder text must meet 4.5:1 (use slate, not a faint gray).

### Navigation
- **App sidebar:** The persistent left nav for the authenticated shell; grouped sections (Emerging Torts, Active MDLs, State Intelligence). Navy/charcoal text, teal active state. Alphabetized within groups.
- **Sticky page header:** A per-page sticky bar (`sticky top-0 z-30`) on a translucent white surface (`bg-white/90`) with `backdrop-blur` and a bottom `border-cloud` hairline. This is the one sanctioned, purposeful use of backdrop-blur (a functional sticky layer), not decorative glass.

### Signature Component — The Verdict Bar
A row of compact "verdict" cards that opens a data surface by stating the conclusion first (PI viability score, top markets, posture) before the supporting tables. Each card carries a thin colored top rule keyed to a viz band (green/amber/red) and a one-word verdict chip. This is the visual embodiment of the decision-first principle: the answer, then the evidence.

## 6. Do's and Don'ts

### Do:
- **Do** lead every surface with the decision ("so what for the spend"), then the supporting data. The Verdict Bar pattern is the model.
- **Do** ration Intelligence Teal to ≤10% of a screen (The One Signal Rule). Build variety from navy, slate, and cloud.
- **Do** keep elevation to `shadow-sm` at rest and structure with 1px `border-cloud` hairlines and white-on-cloud contrast (The Whisper Rule).
- **Do** use the outlined teal CTA that fills on hover as the primary action, with a visible focus ring for keyboard users.
- **Do** let semantic and viz colors mean something. Red is a verdict, not a flourish (The Earned Color Rule).
- **Do** verify body and label text hits 4.5:1, including slate-gray on tinted `cloud` surfaces, and across tenant palettes (WCAG 2.1 AA).
- **Do** keep display headings restrained (~30px); authority is hierarchy and whitespace, not size.

### Don't:
- **Don't** ship the generic "ad spy" look: raw ad dumps with no decision layer or scraper aesthetic. LMI always adds the interpretation.
- **Don't** ship the cookie-cutter AI-SaaS look: purple gradients, the hero-metric template (big number + small label + gradient accent), identical icon-card grids, or gradient text (`background-clip: text`). Emphasis comes from weight and size, never a gradient.
- **Don't** use the garish ambulance-chaser palette: loud red CTAs, stock gavels, urgency/trust-badge spam.
- **Don't** recreate dense enterprise-BI overwhelm: a wall of charts with no narrative. Make the intelligence legible for non-analysts.
- **Don't** stack an uppercase tracked eyebrow above every section. The kicker is a rationed device (The Controlled Kicker Rule), not per-section scaffolding.
- **Don't** use a colored `border-left`/`border-right` greater than 1px as a side stripe on cards, callouts, or alerts. Use a full hairline border, a tinted background, or a top accent rule instead. (Migrate any existing left-stripe callouts to this.)
- **Don't** nest cards or stack elevation tiers (The Flat Stack Rule). Inside a card, use tinted insets and dividers.
- **Don't** use decorative glassmorphism. Backdrop-blur is allowed only on the functional sticky page header.
- **Don't** hard-code the LMI navy/teal where a tenant variable should drive it; the system must survive a brand swap.
