# Marketer Optimization Playbook

> **Research brief for AdNexus knowledge base**  
> Compiled: 2026-06-12  
> Sources: Meta Business Help Center, Google Ads Help, Modern Marketing Institute, Flighted, Funnel.io, Foreplay, industry automation tool comparisons  
> Access date: 2026-06-12

---

## Executive Summary

Performance marketers improve ROAS through a repeatable loop: **consolidate structure → exit learning phase → test creatives systematically → expand audiences with first-party signals → scale with CBO → refresh before fatigue → triangulate attribution**. Tracking infrastructure (Meta Pixel + CAPI, Google enhanced conversions) is foundational — without clean signals, optimization algorithms underperform. Automation tools (Madgicx, Revealbot) matter most for **rule-based budget scaling, fatigue alerts, and cross-campaign orchestration** — not raw creative generation alone.

---

## 1. Improving ROAS: Creative Refresh, Audience Expansion, Bid Strategy

### Creative refresh (primary lever in 2025–2026)

Meta's algorithm increasingly uses **creative signals as targeting**. As iOS privacy eroded interest-level precision, creative quality became the primary audience-finding mechanism. Industry consensus: **70–80% of Meta performance now derives from creative**, not budget or targeting settings (Zentric Digital / AppsFlyer cited patterns, 2025).

**Three-layer creative testing model** (Modern Marketing Institute, 2026):

| Layer | What to test | When |
|-------|-------------|------|
| **Concept** | DR vs. social proof vs. PAS vs. UGC | First — biggest swings |
| **Format** | Static vs. video vs. carousel vs. Reels-native | After concept winner |
| **Element** | Headlines, hooks, CTAs, offers | After format winner |

**Scoring matrix for video:**
- **Hook rate** — % watching past 3 seconds
- **Hold rate** — % watching to 50%
- **Conversion rate** — downstream action

Allocate **15–20% of total spend** to structured creative testing (not "waste" — infrastructure investment).

### Audience expansion

Shift from hyper-segmented interest stacks to **consolidated broad + signal** architecture:

1. **Consolidate ad sets** — fewer, broader ad sets concentrate optimization events (target: 50 events/ad set/week to exit learning phase)
2. **First-party pyramid** — Tier 1 (website visitors, customer lists, 75%+ video viewers) → Tier 2 (lookalikes from Tier 1) → Tier 3 (broad + Advantage+ Audience)
3. **Horizontal scaling** — duplicate winners into new geos, audience pools, funnel stages, offers
4. **Vertical scaling** — increase budget max 20% per change to avoid learning-phase reset

### Bid strategy

| Strategy | Best for | Risk |
|----------|----------|------|
| **Highest volume/value** | New campaigns, learning phase exit | Higher CPA initially |
| **Cost per result goal** | Stable accounts with known CPA targets | May limit delivery |
| **Bid cap** | Strict unit economics, mature accounts | Can under-deliver |
| **ROAS goal** | Ecommerce with reliable purchase value data | Needs volume + clean CAPI |

**Learning phase discipline:**
- ~50 optimization events per ad set per week to stabilize
- Any edit >20–25% budget, audience swap, or creative change **resets learning**
- Minimum 7-day evaluation window before killing ad sets

### ROAS measurement reality check

Platform-reported ROAS often overstates true impact. Triangulate with:
- **MER** (Marketing Efficiency Ratio) = total revenue ÷ total ad spend
- **Incrementality tests** (Meta Conversion Lift holdout groups)
- **Post-purchase surveys** ("How did you hear about us?")
- Third-party attribution (Northbeam, Triple Whale, Rockerbox)

---

## 2. Finding New Target Groups

### Interest stacking (legacy → declining)

Interest stacking (AND/OR combinations of interests) was the 2018–2022 playbook. In 2025–2026:
- Many interest audiences deprecated or reduced in precision
- Meta's Advantage+ Audience and broad targeting outperform manual stacks when conversion signal is strong
- Interest stacking still useful for **initial hypothesis testing in ABO**, not long-term scale

### Lookalikes

- Seed quality matters more than seed size — **purchase converters > all visitors > page engagers**
- 1% lookalikes for precision prospecting; 3–5% for scale
- Degraded by signal loss — pair with CAPI for better seed refresh
- Refresh seeds monthly from latest high-LTV customer exports

### Broad + signal (current best practice)

**Formula:** Broad targeting + strong conversion signal + creative diversity

1. Run Advantage+ Audience or broad geo/demographic only
2. Feed algorithm via Pixel + CAPI with deduplicated purchase events
3. Let creative diversity find micro-audiences within the broad pool
4. Use **audience signals** (not hard restrictions) — Meta uses these as hints, not walls

### Audience discovery workflow

```
1. Export top 20% LTV customers → seed lookalike 1%
2. Run broad + Advantage+ with 3–5 concept-layer creatives
3. Analyze breakdowns (age, placement, device) after 7 days stable delivery
4. Spin winning segments into dedicated retargeting (Tier 1)
5. Horizontal scale: new geo, new offer, new funnel stage
```

---

## 3. Meta Pixel + CAPI + Events Manager Setup

### Why both Pixel and CAPI

| Channel | Strength | Weakness |
|---------|----------|----------|
| **Browser Pixel** | Easy setup, rich client-side context | Blocked by ad blockers, ITP, cookie restrictions |
| **Conversions API (CAPI)** | Server-side, ad-blocker resistant, richer PII for matching | Requires dev/integration |

**Best practice: Pixel + CAPI together with event deduplication** (Meta official guidance).

### CAPI benefits (Meta Business Help Center)

- Decreased cost per result via more reliable signal
- Optimize for later-journey actions (subscriptions, in-store, LTV scores)
- Better cross-channel measurement
- Higher event match quality (EMQ) with hashed email, phone, name, zip

### Events Manager setup checklist

1. **Create dataset** (replaces legacy pixel-only setup; offline conversions API deprecated May 2025)
2. **Install Meta Pixel** on all pages + standard events (ViewContent, AddToCart, Purchase)
3. **Deploy CAPI** via partner (Shopify, GTM, Segment) or direct server integration
4. **Deduplication** — send matching `event_id` from Pixel and CAPI for same event
5. **Event match quality** — target EMQ score >6/10; add customer info parameters (email, phone, fbp, fbc)
6. **Aggregated Event Measurement** — prioritize 8 conversion events for iOS 14.5+ domains
7. **Test events** — use Events Manager test tool before going live
8. **Diagnostics** — monitor for unmatched events, duplicate events, missing parameters

### Optimization event selection

| Funnel stage | Event | When to optimize |
|-------------|-------|-----------------|
| Top | ViewContent, Lead | Low volume, awareness |
| Mid | AddToCart, InitiateCheckout | Building signal |
| Bottom | Purchase, CompleteRegistration | ≥50 events/week per ad set |

Start with higher-funnel events if purchase volume <50/week; graduate to Purchase once volume supports it.

---

## 4. Google Ads Conversion Tracking + Enhanced Conversions

### Standard conversion tracking

1. Define conversion actions in Google Ads (Goals → Conversions)
2. Deploy Google tag or GTM container on all pages
3. Fire conversion tag on confirmation page or via event trigger
4. Link Google Analytics 4 for imported conversions (optional)
5. Enable **conversion linker** tag for cross-domain tracking

### Enhanced conversions for web

Supplements standard tags by sending **hashed first-party data** (SHA-256) — email, phone, name, address — to improve match rates when cookies fail.

**Setup paths (Google Ads Help, 2026):**
- Google Tag Manager (recommended) — Google Ads User-Provided Data Event tag
- Google tag direct — automatic or manual CSS selector collection
- Google Ads API — for server-side implementations

**April 2026 change:** Enhanced conversions for web and leads merge into a **single on/off setting**. Google will accept UPD from website tags, Data Manager, and API simultaneously.

### Enhanced conversions checklist

1. Accept Customer Data Policies + Google Ads Data Processing Terms
2. Enable "Allow user-provided data capabilities" in Google tag settings
3. Choose collection method:
   - **Automatic** — tag detects form fields (lowest effort)
   - **CSS selectors** — manual field mapping (more control)
   - **Code snippet** — highest accuracy, prioritized over auto-detect
4. Validate in Google Ads → Goals → Conversions → Diagnostics (allow ~30 days for impact data)
5. Respect Consent Mode — UPD collection gated on `ad_storage` consent where implemented

### Match key priority

Email (preferred) → phone + email → full address (first name, last name, postal code, country required).

---

## 5. Campaign Structure: CBO vs ABO, Ad Set Testing

### Definitions

| | ABO (Ad Set Budget Optimization) | CBO (Advantage Campaign Budget) |
|---|----------------------------------|-----------------------------------|
| Budget level | Per ad set | Per campaign |
| Control | High — manual | Low — algorithmic |
| Best for | Testing creatives/audiences | Scaling proven winners |
| Maintenance | High (daily adjustments) | Low |
| Learning phase | Per ad set | Campaign-wide |

### When to use ABO

- Creative tests needing **equal spend** per variation
- Isolated audience tests (prevent winner cannibalizing test budget)
- Low confidence in creative hit rate
- Hands-on daily management capacity

### When to use CBO

- Validated winners ready to scale
- Want Meta to allocate toward lowest CPA / highest ROAS in real time
- Limited time for manual budget management
- 3–5 ad sets max (more dilutes learning signals)

### Hybrid workflow (industry standard)

```
ABO Testing Campaign          →    CBO Scaling Campaign
─────────────────────              ─────────────────────
$50/day per ad set (equal)         Single campaign budget
3–5 creative/audience tests   →    Duplicate winners (preserve post ID)
7–14 days to exit learning         Min spend 10–20% per ad set (optional)
Kill losers, identify winners →    Pause ABO originals (no overlap)
```

### Structural rules

- **Never mix testing and scaling in one campaign**
- CBO: max 3–5 ad sets per campaign
- Don't change budgets >20% during learning phase
- Use minimum spend limits in CBO to give new ad sets fair data exposure
- Preserve social proof by duplicating with **post ID**, not recreating ads

---

## 6. Fatigue Detection Signals

### What is ad fatigue?

Audience sees the same creative too often → engagement drops → platform algorithm downranks → CPC rises, reach falls, ROAS erodes. Distinct from **brand fatigue** (audience still likes brand, tired of specific execution).

### Primary KPI signals (Funnel.io, Meta Analytics research)

| Signal | Direction | Interpretation |
|--------|-----------|----------------|
| CTR | ↓ 20–30% from baseline | First warning — attention slipping |
| CPC | ↑ | Algorithm working harder per click |
| CPA / CAC | ↑ | Conversion efficiency declining |
| Frequency | ↑ (especially >3–4 cold, >8+ retargeting) | Overexposure to same users |
| Reach | ↓ | Algorithm deprioritizing stale creative |
| ROAS | ↓ | Net profitability eroding |
| Video hook/hold rates | ↓ | Creative-specific fatigue |
| Unique reach / impressions ratio | ↓ | Same people seeing ad repeatedly |

### Channel-specific fatigue velocity

Fast → Slow: **TikTok → Meta → LinkedIn → Google Display**

- TikTok/Meta: refresh every 7–14 days for active spend
- LinkedIn: 3–4 weeks possible with small audiences
- Google Display: slowest; broad network spreads impressions

### Composite fatigue score (industry pattern)

```
Fatigue Score = 0.30 × CTR_decay + 0.20 × CPM_increase + 0.30 × CVR_decline + 0.20 × CPA_change
```

Normalize each component against 7-day and 14-day rolling baselines. Score >0.6 = refresh recommended; >0.8 = urgent.

### Prevention cycle

1. **Monitor** — automated dashboards with cross-platform KPIs
2. **Adjust** — widen audience or frequency cap when signals appear
3. **Refresh** — new visuals/headlines/formats; keep brand consistency
4. **Automate** — dynamic creative (DCO), creative rotation rules

### Meta's research insight

Meta Analytics (Creative Fatigue study): performance degrades with repeated exposures; adding new creative into ad sets **before** metrics collapse maintains delivery efficiency. Proactive rotation outperforms reactive replacement.

---

## 7. AI/Automation Tools: Madgicx, Revealbot — What Features Matter

### Feature tiers that drive ROI

| Tier | Features | Value |
|------|----------|-------|
| **Rules engine** | IF ROAS < X for Y days → pause/scale; budget pacing alerts | Prevents wasted spend; #1 reason teams adopt |
| **Automated budget scaling** | Graduated increases on winners (10–20% increments); pause losers | Reduces manual daily ops |
| **Fatigue detection** | Frequency + CTR decay alerts → auto-pause or flag refresh | 15–25% waste reduction (industry claims) |
| **Creative insights** | Hook/hold rate breakdowns, element-level performance | Informs refresh priorities |
| **Audience automation** | Auto-segment expansion, lookalike refresh triggers | Extends winner lifecycle |
| **Cross-campaign orchestration** | Portfolio-level budget reallocation | Scales beyond single-campaign view |
| **Reporting/briefing** | Morning digest, Slack alerts, anomaly detection | Reduces time-to-action |

### Madgicx strengths

- AI-powered "automation tactics" with 7 prebuilt performance triggers
- Creative intelligence + audience launcher combined
- Meta-focused depth (less Google/TikTok)
- AI recommendations for budget/creative/audience

### Revealbot (Birch) strengths

- Deep Meta rule automation (conditions, scheduling, bulk actions)
- Dynamic budget allocation based on performance thresholds
- Strong spend-tiered pricing (pain point for high-budget accounts)
- Custom metric support for rule triggers

### What matters vs. what's noise

**Matters:**
- Reliable rule execution with audit trail
- Draft/preview before rule fires (safety)
- Cross-platform support (if managing Google + Meta)
- Doesn't tax ad spend (pricing model)
- Integration with clean conversion signal (CAPI/enhanced conversions)

**Noise / commodity:**
- Generic AI copy generation without performance linkage
- Dashboards without actionable triggers
- Autonomous spend without human approval gate

### Automation rule patterns (proven)

```
IF CPA > target × 1.3 FOR 3 days → pause ad set
IF ROAS > target × 1.2 AND spend < 85% pacing → increase budget 15%
IF frequency > 4 AND CTR dropped 25% → flag fatigue + notify
IF learning_phase = limited FOR 7 days → consolidate or kill
```

---

## Sources

| # | Source | URL | Accessed |
|---|--------|-----|----------|
| 1 | Modern Marketing Institute — 7 High-ROI Meta Ads Strategies 2026 | https://www.modernmarketinginstitute.com/blog/7-high-roi-meta-ads-strategies-every-performance-marketer-must-know-in-2026 | 2026-06-12 |
| 2 | Meta Business Help — About Conversions API | https://www.facebook.com/business/help/AboutConversionsAPI | 2026-06-12 |
| 3 | Google Ads Help — Enhanced Conversions via GTM | https://support.google.com/google-ads/answer/13262500 | 2026-06-12 |
| 4 | Flighted — ABO vs CBO Meta Ads 2026 | https://www.flighted.co/blog/abo-vs-cbo-meta-ads | 2026-06-12 |
| 5 | Funnel.io — Ad Fatigue | https://funnel.io/blog/ad-fatigue | 2026-06-12 |
| 6 | Foreplay — Madgicx vs Revealbot comparison | https://www.foreplay.co/post/madgicx-vs-revealbot-vs-foreplay | 2026-06-12 |
| 7 | Meta Analytics — Creative Fatigue research | https://medium.com/@AnalyticsAtMeta/creative-fatigue-how-advertisers-can-improve-performance-by-managing-repeated-exposures-e76a0ea1084d | 2026-06-12 |
| 8 | Zentric Digital — Broad Targeting on Meta | https://www.zentric.digital/insights/stop-targeting-meta-ads-broad-targeting | 2026-06-12 |
| 9 | Improvado — PPC ROAS Guide 2026 | https://improvado.io/blog/improve-your-ppc-roas | 2026-06-12 |
| 10 | Stape — Google Ads Conversion Tracking 2026 | https://stape.io/blog/google-ads-conversion-tracking | 2026-06-12 |

---

## AdNexus Product Implications (Summary)

See parent agent deliverable for top 10 product implications derived from this research.
