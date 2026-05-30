# AdNexus AI - Bootstrap GTM & Business Plan

A bootstrap go-to-market and business plan for **AdNexus AI** - an MCP-native, multi-platform
(Meta/Google/TikTok/Snap) agentic ad optimizer with a draft-first approval workflow, AI agent
engine, Morning Briefs, anomaly detection, Stripe credit billing, and a 30+ tool MCP server.

Grounded in the product defined in [`../../SPEC.md`](../../SPEC.md) and the live app
(`apps/web` marketing + dashboard, `apps/mcp/src/server.py`, comparison pages).

## The one-sentence strategy

> Win the un-owned **"manage your ads from Claude"** category via the MCP server + draft-first
> trust layer; monetize through **small agencies** on a flat-fee + AI-credit model that never
> taxes ad spend; grow with **zero-CAC** community/directory distribution.

## Documents

| # | Doc | Covers |
|---|---|---|
| 01 | [Positioning & messaging](01-positioning.md) | MCP-native wedge, category line, differentiators, ICP message matrix |
| 02 | [Beachhead ICP](02-beachhead-icp.md) | Two-layer beachhead (AI-native wedge + agency revenue), qualification |
| 03 | [Pricing & packaging](03-pricing-packaging.md) | Flat fee + credits, reverse trial, reconciliation with live `Pricing.tsx` |
| 04 | [Distribution](04-distribution.md) | MCP registry + directories, Reddit/Slack/FB, Product Hunt/Show HN, SEO |
| 05 | [Launch sequence](05-launch-sequence.md) | Pre-launch, first-100 playbook, activation, PH/HN runbooks |
| 06 | [Growth scenarios](06-growth-scenarios.md) | Conservative/Base/Aggressive, tier-mix + churn sensitivity |
| 07 | [Financial model](07-financial-model.md) | Bootstrap COGS, unit economics, break-even (~7 customers) |
| 08 | [Risks & mitigations](08-risks.md) | Platform/ToS, commoditization, infra bleed, kill/pivot triggers |
| 09 | [90-day milestones](09-milestones.md) | Day 0-30 / 31-60 / 61-90 with gate conditions |

## Decisions

- **DECIDED - Launch order: MCP-first.** Ship the MCP server to the official registry +
  directories and prove trial activation *before* the Product Hunt / Show HN spike, so the
  launch lands on a funnel that already converts. See [`04-distribution.md`](04-distribution.md)
  and [`05-launch-sequence.md`](05-launch-sequence.md).

### Still open (carried across docs)

1. Single beachhead vs the two-layer (AI-native + agencies) approach - recommended: two-layer.
2. Final entry price ($49 vs $39) and whether the trial requires a card.
3. Which platform ships first for paid - recommended: Meta-only at launch.

## Note on scope

These are **strategy/research deliverables**. They intentionally do **not** rewrite the
polished marketing pages (e.g. `apps/web/src/views/Pricing.tsx`). Where a doc recommends a
product change (e.g. surfacing credit counts on pricing cards), it is flagged for a separate
follow-up PR rather than applied here.
