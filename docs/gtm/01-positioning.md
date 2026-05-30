# AdNexus AI - Positioning & Messaging

> Source of truth for how we talk about AdNexus in every channel. Derived from the
> product in [`SPEC.md`](../../SPEC.md) and validated against the live comparison
> pages (`CompareMadgicx`, `CompareBirch`, `CompareSmartly`) and the MCP server
> (`apps/mcp/src/server.py`, 30+ tools).

## 1. The wedge: MCP-native, not "another Madgicx"

The Meta-ads-automation market is crowded and price-anchored:

| Competitor | Entry price | Core model | Weak spot we exploit |
|---|---|---|---|
| Revealbot / Birch | ~$99/mo | Rule-based, ad-spend-tiered | Price scales punitively with spend; no AI-chat control |
| Madgicx | ~$49-69/mo | AI recommendations, Meta-mostly | Meta-only for management; spend-tiered |
| AdCreative.ai | ~$29/mo | Creative generation only | No campaign execution |
| Smartly.io | Enterprise | End-to-end DCO | Out of reach for SMB/agency |

Competing head-on on "AI ad automation" is a losing bootstrap fight. AdNexus owns one
position **none of them sells**: a first-class **MCP server** that lets a media buyer
manage Meta, Google, TikTok & Snap from inside Claude or Cursor, with a **draft-first**
human-approval safety layer and a **full audit log**.

## 2. Category line (one-liner)

> **The ad optimizer that lives in your AI chat.**
> Manage Meta, Google, TikTok & Snap from Claude or Cursor - every change is a draft you approve.

## 3. The four differentiators we hammer everywhere

1. **MCP-native conversational control** - optimize ads by chatting with Claude/Cursor.
   No competitor occupies this. (Backed by `apps/mcp/src/server.py`, 30+ tools, SSE/HTTP transport.)
2. **Draft-first approval + full audit log** - every AI write is staged for human approval;
   nothing goes live without a click. This is the *trust* story agencies need. (`drafts`, `audit_log` in `SPEC.md`.)
3. **True multi-platform** - Meta + Google + TikTok + Snap in one dashboard and one MCP surface.
   Madgicx is Meta-mostly; this is a concrete, demoable gap.
4. **Credit-based AI pricing that does NOT scale punitively with ad spend** - the #1 complaint
   about Revealbot/Madgicx. We meter AI usage (credits), not a tax on the budget you manage.

## 4. Positioning / messaging matrix by ICP

| Audience | Headline | Proof point | Anti-competitor angle |
|---|---|---|---|
| **Small agencies** (revenue ICP) | "One approval queue for every client, every platform." | Audit log + white-label reports + pooled accounts | vs Revealbot's spend-scaled pricing |
| **AI-native buyers** (wedge ICP) | "Optimize ads by chatting with Claude. AdNexus is the MCP server for ad ops." | 30-tool MCP server, draft-first writes | No competitor has an MCP server |
| **DTC founders** (later) | "Your AI media buyer that asks before it spends." | Draft-first = trust; Morning Brief | vs autonomous tools that spend without asking |

## 5. Message hierarchy (use in this order)

1. **Hook** - "Manage your ads from Claude." (curiosity + category creation)
2. **Trust** - "Every change is a draft you approve. Full audit log." (de-risk the AI)
3. **Breadth** - "Meta, Google, TikTok & Snap - one place." (rational completeness)
4. **Price** - "Flat fee + AI credits. We don't tax your ad spend." (switching trigger)

## 6. Words we use / words we avoid

- Use: *draft-first, approve, audit log, MCP, agentic, one queue, no spend tax.*
- Avoid: *fully autonomous, set-and-forget, replaces your media buyer* (undermines the trust wedge).
