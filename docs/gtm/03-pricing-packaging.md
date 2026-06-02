# AdNexus AI - Pricing & Packaging

## Pricing philosophy

Anchor on **flat platform fee + metered AI credits**, NOT ad-spend percentage. This is the
explicit anti-positioning vs Revealbot/Madgicx (both spend-tiered). It is also what protects
gross margin - see [`07-financial-model.md`](07-financial-model.md). The credit primitive
already exists in the product (`ai_credits` table + `credit-tracker` service in `SPEC.md`).

## Live tiers today (from `apps/web/src/views/Pricing.tsx`)

| Tier | Monthly | Annual | Accounts | Notes |
|---|---|---|---|---|
| Free | $0 | $0 | 1 (Meta or Google) | Read-only audit, draft preview (no execution) |
| Growth | $49 | $408 | 3 (Meta + Google) | AI Agent draft-first, 2 seats |
| Team (popular) | $149 | $1,240 | 10 pooled | All 4 platforms, full AI, Slack, 5 seats |
| Agency | $399 | $3,324 | 25 pooled | White-label, API, custom rules, unlimited seats |

## Reconciliation with the GTM plan's proposed tiers

The GTM plan proposed Free / Pro $39 / Agency $149 / Scale $399. The **live page is already
well-structured** and close. Recommended reconciliation (decision for the founder):

- **DECIDED - entry price $39/mo** (down from the live $49). $39 undercuts Madgicx ($49) and
  Revealbot ($99) on the headline and matches the wedge-audience price sensitivity. Ladder
  becomes **$0 / $39 / $149 / $399**.
- **Keep the 4-tier ladder**, but make the **Agency tier the hero in agency channels**
  (it is the revenue ICP per [`02-beachhead-icp.md`](02-beachhead-icp.md)).
- Add an explicit **AI-credit allotment line** to every tier card (Free ~100, Growth ~1,500,
  Team ~6,000, Agency ~20,000 + top-ups). Today the cards omit credit counts; adding them
  makes the "no spend tax" story concrete.

> This doc does **not** rewrite `Pricing.tsx` itself. The price change ($49 -> $39) and credit
> counts are flagged for a separate follow-up PR against the marketing page.

## Packaging mechanics (grounded in 2026 benchmarks)

| Lever | Recommendation | Benchmark rationale |
|---|---|---|
| Trial type | **Reverse trial**: full features 14 days, then downgrade to Free | Reverse trial median ~24% convert vs ~4.5% pure freemium |
| Card at trial | **DECIDED - no card** (opt-in trial) to maximize top-of-funnel volume | Opt-in ~14% convert but the zero-CAC wedge audience self-serves from MCP directories; volume > per-trial rate at this stage. Revisit if activation is strong but conversion lags. |
| Free tier | Keep "useful but capped" (read-only audit, draft preview) | Prevents infra bleed on non-converters; still a directory magnet |
| Activation gate | Push user to connect 1 ad account + run 1 Morning Brief within 7 days | Activation drives 60-75% of trial conversion variance |
| Annual | 2 months free (already live) | Standard; improves cash + retention |

## Credit model (margin guardrail)

- 1 credit ≈ one AI action (recommendation, brief section, anomaly explanation, NL query).
- Heavy users hit the cap and buy top-ups (Stripe payment intent already in `billing` routes).
- Credits decouple our COGS (LLM tokens) from the customer's ad spend - the core margin lever.

## Pricing decisions (locked)

1. **Entry price: $39/mo.** Ladder is $0 / $39 / $149 / $399.
2. **No card on the trial** (opt-in, 14-day, reverse to Free) to maximize top-of-funnel volume.
3. Publish credit counts on the pricing cards now (recommended) - bundled into the follow-up
   `Pricing.tsx` PR alongside the $49 -> $39 change.
