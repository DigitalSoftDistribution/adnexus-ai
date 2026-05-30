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

- **Keep the live 4-tier ladder** ($0 / $49 / $149 / $399). It is cleaner than renaming.
- **Lower the entry to $39** only if early Reddit/PH feedback shows price resistance at $49.
  $39 undercuts Madgicx ($49) and Revealbot ($99) at the headline.
- **Rename "Team" -> keep**, but make the **Agency tier the hero in agency channels**
  (it is the revenue ICP per [`02-beachhead-icp.md`](02-beachhead-icp.md)).
- Add an explicit **AI-credit allotment line** to every tier card (Free ~100, Growth ~1,500,
  Team ~6,000, Agency ~20,000 + top-ups). Today the cards omit credit counts; adding them
  makes the "no spend tax" story concrete.

> This doc intentionally does **not** rewrite `Pricing.tsx`. Price points are an open
> founder decision; changing a polished, animated marketing page is out of scope for the
> GTM research deliverable. The recommended edits are listed above for a follow-up PR.

## Packaging mechanics (grounded in 2026 benchmarks)

| Lever | Recommendation | Benchmark rationale |
|---|---|---|
| Trial type | **Reverse trial**: full features 14 days, then downgrade to Free | Reverse trial median ~24% convert vs ~4.5% pure freemium |
| Card at trial | Require card on Growth/Team/Agency trial path | Opt-out trials ~44% vs opt-in ~14% |
| Free tier | Keep "useful but capped" (read-only audit, draft preview) | Prevents infra bleed on non-converters; still a directory magnet |
| Activation gate | Push user to connect 1 ad account + run 1 Morning Brief within 7 days | Activation drives 60-75% of trial conversion variance |
| Annual | 2 months free (already live) | Standard; improves cash + retention |

## Credit model (margin guardrail)

- 1 credit ≈ one AI action (recommendation, brief section, anomaly explanation, NL query).
- Heavy users hit the cap and buy top-ups (Stripe payment intent already in `billing` routes).
- Credits decouple our COGS (LLM tokens) from the customer's ad spend - the core margin lever.

## Open pricing decisions (for the founder)

1. Entry price: hold $49 or test $39?
2. Require a card on the trial, or stay no-card to maximize top-of-funnel volume?
3. Publish credit counts on the pricing cards now, or keep them in-app only?
