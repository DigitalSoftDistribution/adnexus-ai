# AdNexus AI — Positioning (2026 refresh)

> Status date: 2026-06-13. This supersedes the competitive framing in
> `../info.md` and `../ADNEXUS_AI_STRATEGY.md` §1, both of which were written
> when "MCP-native + broad write tools" was still a moat. The market moved.
> Read alongside `V1_PUNCH_LIST.md` (what to build) and `PATH_TO_V1.md` (status).

## TL;DR

The original thesis was largely "a better Pipeboard": MCP-native, broad
cross-platform **write** tools, draft-first approval. Two of those three legs
were commoditized in 2026. **Draft-first governance is the leg that survived —
lead with it.**

## What changed in the market (verified June 2026)

| Shift | Evidence | Consequence for us |
|---|---|---|
| **Platforms shipped their own free MCPs** | Meta official Ads MCP launched **Apr 2026**, free, 29 tools (campaigns, insights, audiences, budget pacing, creative editing). Amazon Ads MCP launched **Feb 2026** (50+ tools, incl. DSP/AMC). Google has official MCP coverage. | "MCP-native" and "lots of write tools" are **table stakes, not differentiation**. Single-platform agent access is now free. |
| **Write-tool count is no longer scarce** | PaidSync ships 309 tools across 7 platforms; Adspirer, Ryze, Flyweel all compete on coverage. | Don't market tool counts. We lose that race and it doesn't matter. |
| **The surviving moats are unification, autonomy, and governance** | Every 2026 buyer's-guide converges on: cross-channel attribution a CFO trusts, 24/7 measurement-backed optimization, and auditable/explainable change control (EU AI Act, Aug 2026). | These map directly onto what we already half-built. Double down. |

Sources are catalogued in `V1_PUNCH_LIST.md` § References.

## Revised positioning statement

> **AdNexus AI is the governed, cross-platform, multilingual ad-ops workspace
> where AI drafts every change and a human (or approval chain) signs off before
> anything goes live.**
>
> For mid-market performance teams and agencies who need the speed of an AI
> agent *and* the auditability the official platform tools don't provide.

## The three pillars, re-weighted

| Pillar | 2025 weight | 2026 weight | Why |
|---|---|---|---|
| **Draft-First Approval + audit trail** | Co-equal | **Primary moat** | The one thing free official MCPs and "autonomous" competitors (Ryze, AdScale) structurally don't offer. EU AI Act tailwind. Already built end-to-end (drafts → review → approve/reject + audit log). |
| **Cross-platform unification** | Co-equal | **Secondary moat** | Official MCPs are single-platform and siloed. A unified ROAS/CPA across channels is the #1 named gap. **We don't fully have this yet** — see punch-list T1. |
| **MCP-native architecture** | Co-equal | **Demoted to "supported"** | Now a checkbox, not a headline. Keep the MCP server; stop leading with it. |
| **Multilingual (10 locales)** | Not mentioned | **New wedge** | US-centric competitors ship English-only. Real, shipped (`next-intl`, 10 locales). Cheap, defensible edge in EU/LatAm/Japan. |

## Who we are NOT competing with (anymore)

- **Free official platform MCPs** — we *use* them as a backend execution path, we
  don't out-tool them. Our value sits *above* a single platform.
- **Tool-count maximalists** (PaidSync, Flyweel) — coverage race, not our game.

## Who we ARE competing with

- **"Autonomous optimization" players** (Ryze AI, AdScale, Madgicx) — they win on
  hands-off ROAS lift but lose on control/auditability. Our counter: "autonomy
  *with* a seatbelt — every change is drafted, explained, and reversible."
- **Mature dashboards** (Smartly, Revealbot, Optmyzr) — expensive, rule-based,
  not AI-native, weak governance story. Our counter: AI-native + approval-gated +
  cheaper.

## Messaging do / don't

**Do:** "nothing goes live without approval", "one ROAS across every channel",
"explainable, auditable AI for the EU AI Act era", "works in 10 languages".

**Don't:** "120+ write tools", "MCP-first", "fully autonomous" (that's the
competitor's frame and undercuts our governance moat).

## Pricing implication

The `ADNEXUS_AI_STRATEGY.md` tiers ($79 / $199 / $499 / custom) remain sound for
the mid-market target. But the **per-tier feature gating should key off the new
moats**, not tool counts:

- Govern the **approval-chain depth** (solo approve → multi-step agency approval)
  and **number of unified channels**, not "number of agents".
- Make the **audit log + exportable change history** an Agency/Enterprise
  upsell — it's the compliance artifact buyers will pay for.
