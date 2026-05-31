# AdNexus AI - Risks & Mitigations

| # | Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|---|
| 1 | **Platform API risk** - Meta/Google app review, rate limits, ToS changes | High | High | Launch paid on **Meta + Google** (the ICP runs both); harden Meta first in build order but don't open paid until Google is solid. **TikTok + Snap fast-follow** as review clears. Lean on **draft-first** (a human approves every write) to stay on the right side of ToS. |
| 2 | **Commodity pressure** - incumbents copy "AI ad automation" | Med | High | Defend with the **MCP wedge + audit/trust story**, not feature parity. The MCP-native + draft-first + audit-log combination is hard to bolt on. |
| 3 | **Free-tier infra bleed** - non-converters cost LLM/API money | Med | Med | Keep Free **read-only + credit-capped**; require a card on the trial-to-paid path. |
| 4 | **Community backlash** - Reddit/FB ban brand-spam | Med | Med | Personal accounts, value-first, soft-mention only on "best tool for X" threads. Never brand-post. |
| 5 | **Churn (DTC founders)** - low-ACV, high-churn segment | Med | Med | Bias acquisition toward **agencies** (multi-account lock-in, stickier). De-prioritize solo DTC at launch. |
| 6 | **MCP ecosystem immaturity** - discovery still rough, directories churn | Med | Low | List everywhere (official registry + 5-6 dirs); don't depend on a single directory. Treat MCP as a wedge, not the only channel. |
| 7 | **Security/trust on data access** - we touch live ad accounts + tokens | Low | High | OAuth tokens encrypted at rest (`ad_accounts` in `SPEC.md`); JWT on the MCP server; lead the trust narrative with the audit log. |
| 8 | **Single-founder bandwidth** - support + dev + GTM at once | High | Med | Automate onboarding to drive activation; lean on design-partner referrals; batch community work. |

## Risk posture summary

The two risks that can actually kill the company are **#1 (platform API/ToS)** and
**#2 (commoditization)**. Both are mitigated by the same product choice: **draft-first +
audit log + MCP**. That's why messaging, pricing, and roadmap all reinforce it - it's the
moat *and* the compliance story at once.

## Early warning signals (kill/pivot triggers)

- Meta restricts or rejects the app -> pause paid acquisition, fix compliance first.
- Trial activation < 30% after onboarding fixes -> product problem, not GTM; stop scaling spend.
- Logo churn > 8%/mo sustained -> retention before acquisition.
- An incumbent ships a credible MCP server -> double down on multi-platform + agency audit depth.
