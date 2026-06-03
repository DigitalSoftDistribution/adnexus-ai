import type { ReactNode } from 'react';

/**
 * Article bodies keyed by slug. Kept separate from post metadata
 * (lib/marketing/blog-posts.ts) so the index and route stay light.
 *
 * Honesty: no fabricated customer metrics, named clients, or invented spend
 * figures. Case-study pieces are explicitly framed as illustrative.
 */

function MetaMcpArticle() {
  return (
    <article className="prose-custom">
      <p className="lead">
        In 2026, Meta released an official MCP (Model Context Protocol) server for its Marketing
        API — open-source and maintained by Meta&apos;s own engineering team. For an industry that
        spent a decade building walled gardens around ad data, that is a meaningful shift.
      </p>

      <p>
        The implications go beyond &ldquo;another API wrapper.&rdquo; An official MCP server changes
        how ad platforms think about data accessibility, AI integration, and the relationship between
        advertisers and their own campaign data. Here is why it matters and where the real work still
        lives.
      </p>

      <h2>What an MCP server actually does</h2>
      <p>
        At its core, an MCP server is a standardized layer that sits between large language models
        (Claude, ChatGPT, Cursor) and an underlying API. Instead of writing a custom integration for
        every tool, the MCP server exposes the data through a universal interface that any
        MCP-compatible client can consume.
      </p>
      <p>
        In practice, that means you can ask &ldquo;show me every campaign with CPA over $50 this
        week&rdquo; and get an accurate answer pulled live from your accounts — no SQL, no dashboard
        spelunking. The protocol handles pagination, rate limiting, retries, and OAuth token refresh.
      </p>

      <h2>Why this matters for ad tools</h2>
      <p>
        For the last few years, every AI ad tool faced the same architectural question: how do you
        let an LLM interact with ad platforms safely and reliably? The answers fell into three camps:
      </p>
      <ul>
        <li><strong>Chat-only interfaces</strong> where the AI talks to the API but you never see the data visually.</li>
        <li><strong>Massive tool surfaces</strong> where every endpoint becomes its own function, overwhelming the model&apos;s reasoning.</li>
        <li><strong>Proprietary middleware</strong> that locks you into one vendor&apos;s stack.</li>
      </ul>
      <p>
        An official MCP server solves the protocol problem at the source. One authoritative bridge
        instead of dozens of bespoke integrations means faster development, fewer breaking changes,
        and lower per-request overhead.
      </p>

      <h2>The safety gap: why draft-first still matters</h2>
      <p>
        Here is the critical caveat. An MCP server makes it easy for an LLM to <em>read</em> your
        data — and just as easy to <em>write</em>: create campaigns, change budgets, pause ads.
        Without guardrails, that is dangerous.
      </p>
      <p>
        Most MCP servers include basic permission scopes, but they do not enforce a draft-first
        workflow by default. That is the layer we believe every responsible tool has to add on top:
        every write action staged as a draft that a human approves before it deploys. The MCP server
        handles the communication; your approval handles the decision.
      </p>

      <blockquote>
        The future of ad management isn&apos;t more dashboards. It&apos;s better interfaces between
        human intent, AI reasoning, and platform data.
      </blockquote>

      <h2>What happens next</h2>
      <p>
        Expect two things over the next year. First, more platforms will ship official MCP servers as
        they realize that making data accessible to AI agents is a competitive advantage, not a risk.
        Second, the tooling landscape will split: tools that embrace open protocols and add real safety
        layers will pull ahead; tools competing purely on raw API access will fade. The moat is no
        longer &ldquo;we can connect to Meta&rdquo; — it is &ldquo;we help you use AI safely once you
        are connected.&rdquo;
      </p>

      <p>
        That is exactly the bet AdNexus is built on: official, open protocols underneath, and a
        draft-first approval layer on top so AI never touches a live budget without you.
      </p>
    </article>
  );
}

function DraftFirstArticle() {
  return (
    <article className="prose-custom">
      <p className="lead">
        The single most important design decision in AdNexus is also the most boring-sounding one:
        nothing the AI proposes goes live until a human approves it. We call it draft-first, and it
        shapes everything else.
      </p>
      <p>
        It is tempting to let an AI agent act autonomously. The demos look magical. But ad budgets are
        real money, and a confident model that misreads a trend can burn through a daily budget before
        anyone notices. Draft-first turns that risk into a review step.
      </p>

      <h2>What &ldquo;draft-first&rdquo; means in practice</h2>
      <ul>
        <li><strong>Every write is a draft.</strong> Budget shifts, pauses, audience tweaks, creative swaps — all of them land in an approval queue, not on the live campaign.</li>
        <li><strong>Every draft explains itself.</strong> The metric that triggered it, the change proposed, and the expected impact are attached, so you can judge quickly.</li>
        <li><strong>You can edit before you approve.</strong> Change a number, narrow an audience, then ship — or reject outright.</li>
        <li><strong>Everything is logged.</strong> Who approved what, when, and why is recorded for a full audit trail.</li>
      </ul>

      <h2>Why we made approval the default, not an option</h2>
      <p>
        A setting that defaults to &ldquo;auto-apply&rdquo; eventually gets switched on under time
        pressure, and then a bad change ships unseen. By making approval a structural part of the
        architecture rather than a toggle, the unsafe path simply does not exist. That constraint is a
        feature.
      </p>

      <h2>The trust dividend</h2>
      <p>
        Counter-intuitively, asking for approval makes the AI <em>more</em> useful, not less. Because
        you trust that nothing ships behind your back, you let the agent monitor far more aggressively
        — every account, around the clock — and you act on more of its suggestions. Trust is what
        unlocks scale.
      </p>

      <blockquote>
        An assistant you have to babysit is slower than doing it yourself. An assistant you can trust
        is the only kind worth having.
      </blockquote>
    </article>
  );
}

function GoogleAdsAccessArticle() {
  return (
    <article className="prose-custom">
      <p className="lead">
        If you are building or buying any tool that manages Google Ads programmatically, one
        gate stands between you and production: Google Ads API Standard Access. Here is what it is and
        how to clear it.
      </p>

      <h2>Test vs Basic vs Standard access</h2>
      <ul>
        <li><strong>Test access</strong> lets you call the API only against test accounts — useful for development, useless for real campaigns.</li>
        <li><strong>Basic access</strong> raises limits and allows production calls, but with a capped daily operation budget suited to small footprints.</li>
        <li><strong>Standard access</strong> removes those practical caps and is what any serious multi-account tool needs.</li>
      </ul>

      <h2>What Google looks for</h2>
      <p>
        The application review focuses on a few things: a clear description of how your tool uses the
        API, a compliant interface, adherence to the Required Minimum Functionality, and a privacy
        policy that matches what you actually do with the data. Vague applications get bounced.
      </p>

      <h2>Practical tips</h2>
      <ul>
        <li><strong>Be specific.</strong> Describe the exact features and the endpoints they call. Reviewers reward clarity.</li>
        <li><strong>Show the UI.</strong> Screenshots or a short demo of the real product speeds approval.</li>
        <li><strong>Mind your scopes.</strong> Request only the access your features need.</li>
        <li><strong>Keep the policy current.</strong> Your privacy policy and data handling must match the application.</li>
      </ul>

      <p>
        Standard access is a milestone, not a one-time event — you have to keep your tool compliant as
        it evolves. Build the review discipline in early and renewals stay painless.
      </p>
    </article>
  );
}

function ToolBloatArticle() {
  return (
    <article className="prose-custom">
      <p className="lead">
        More tools are not better tools. When you hand a large language model a sprawling surface of
        120+ functions, its reasoning gets worse, not better. A curated, well-named set wins.
      </p>

      <h2>Why a huge tool surface hurts</h2>
      <ul>
        <li><strong>Token cost.</strong> Every tool definition is loaded into context. A giant surface eats the budget the model needs for actual reasoning.</li>
        <li><strong>Choice paralysis.</strong> Faced with near-duplicate tools, models pick the wrong one or chain calls inefficiently.</li>
        <li><strong>Maintenance drag.</strong> Each tool is a contract to keep current as the underlying API shifts.</li>
      </ul>

      <h2>What a curated surface looks like</h2>
      <p>
        Instead of mapping every API endpoint one-to-one, group the work the way a marketer thinks:
        &ldquo;summarize performance,&rdquo; &ldquo;propose a budget change,&rdquo; &ldquo;find
        fatiguing creative.&rdquo; A few dozen intent-shaped tools cover the real jobs and keep the
        model&apos;s reasoning sharp.
      </p>

      <blockquote>
        The goal is not maximum coverage of an API. It is maximum clarity for the model doing the
        work.
      </blockquote>

      <p>
        This is why AdNexus favors a focused tool surface over a raw firehose: the agent reasons
        better, costs less to run, and proposes cleaner drafts.
      </p>
    </article>
  );
}

function TikTokFatigueArticle() {
  return (
    <article className="prose-custom">
      <p className="lead">
        TikTok creative fatigues faster than anything else in paid social. Catching it a few days
        early is the difference between trimming waste and watching ROAS fall off a cliff.
      </p>

      <h2>The signals worth watching</h2>
      <ul>
        <li><strong>Frequency climbing.</strong> When the same users see an ad too often, performance decays. Rising frequency is the earliest warning.</li>
        <li><strong>CTR decline.</strong> A steady drop in click-through against a stable baseline usually means the creative has gone stale.</li>
        <li><strong>CPM creep with flat results.</strong> Paying more to reach the same audience for fewer outcomes is a fatigue tell.</li>
        <li><strong>Watch-time falloff.</strong> On a video-first platform, shrinking completion rates signal the hook has worn out.</li>
      </ul>

      <h2>Thresholds, not absolutes</h2>
      <p>
        There is no universal &ldquo;fatigue number&rdquo; — it depends on audience size and budget.
        The reliable approach is to baseline each creative&apos;s first days, then alert when the
        trend bends against it. That is exactly the kind of pattern an always-on agent is good at:
        it watches the slope so you do not have to.
      </p>

      <h2>What to do about it</h2>
      <p>
        Once fatigue is flagged, the fix is rarely &ldquo;pause everything.&rdquo; It is usually a
        creative refresh: new hooks, new formats, a fresh angle on a proven offer. AdNexus drafts the
        flag and the suggested swap; you approve the ones that fit your brand.
      </p>
    </article>
  );
}

function MorningBriefArticle() {
  return (
    <article className="prose-custom">
      <p className="lead">
        Most AI ad tools wait for you to ask. A proactive agent flips that: it tells you what happened
        overnight before you open a single dashboard.
      </p>

      <h2>Reactive vs proactive</h2>
      <p>
        A chat box is reactive — useful, but only if you already know which question to ask. The
        problem is that the most expensive issues are the ones you did not think to check: a budget
        quietly overpacing, a creative that fatigued on Tuesday, an audience that saturated.
      </p>

      <h2>What a morning brief contains</h2>
      <ul>
        <li><strong>What changed</strong> across every account, overnight, in one place.</li>
        <li><strong>What needs attention</strong> — the handful of issues actually worth your time.</li>
        <li><strong>What the AI recommends</strong>, each item already drafted and ready to approve.</li>
      </ul>

      <blockquote>
        The best interface is the one that hands you the decision, not the one that waits for the
        question.
      </blockquote>

      <p>
        That is the design goal of the AdNexus Morning Brief: replace the daily dashboard crawl with a
        short, ranked list of decisions — most of them one click from done.
      </p>
    </article>
  );
}

function AttributionArticle() {
  return (
    <article className="prose-custom">
      <p className="lead">
        You do not need a five-figure attribution suite to answer a simple question: which channel
        actually drove the sale? Here is a pragmatic approach to cross-platform attribution.
      </p>

      <h2>Why single-platform numbers lie</h2>
      <p>
        Each ad platform claims credit generously. Add up Meta&apos;s, Google&apos;s, TikTok&apos;s,
        and Snap&apos;s self-reported conversions and you will &ldquo;sell&rdquo; far more than you
        actually did. Looked at in isolation, every channel looks like the hero.
      </p>

      <h2>A budget-friendly approach</h2>
      <ul>
        <li><strong>One source of truth for revenue.</strong> Anchor on your own store or CRM totals, not the sum of platform claims.</li>
        <li><strong>Consistent windows.</strong> Compare like-for-like attribution windows across platforms so you are not mixing apples and oranges.</li>
        <li><strong>Blended efficiency.</strong> Track blended ROAS (total revenue / total spend) alongside per-platform numbers to keep yourself honest.</li>
        <li><strong>Incrementality tests.</strong> Periodically pause a channel and watch the effect on total sales — the cheapest causal signal there is.</li>
      </ul>

      <p>
        A unified view across all four platforms makes this far easier, because the data already sits
        in one place. That is one of the quiet benefits of managing every channel from a single
        workspace.
      </p>
    </article>
  );
}

function SoloAgencyArticle() {
  return (
    <article className="prose-custom">
      <p className="lead">
        <em>An illustrative playbook.</em> How could one operator realistically manage dozens of
        client accounts across four platforms without working nights? The answer is not heroics — it
        is letting draft-first automation do the watching while you do the deciding.
      </p>

      <h2>The bottleneck is attention, not effort</h2>
      <p>
        The hard part of running many accounts is not making changes — it is noticing which of the
        thousands of metrics across dozens of campaigns actually need a change today. That is a
        monitoring problem, and monitoring is exactly what an always-on agent is for.
      </p>

      <h2>The playbook</h2>
      <ul>
        <li><strong>Start the day with one brief.</strong> Instead of logging into dozens of accounts, read a single ranked list of what changed and what needs attention.</li>
        <li><strong>Batch-approve the obvious.</strong> Clear wins — pause a dead ad group, shift budget to a clear winner — get approved in seconds.</li>
        <li><strong>Spend your judgment where it counts.</strong> Reserve real thinking for the few drafts that involve strategy or brand.</li>
        <li><strong>Keep the audit trail.</strong> Every approved change is logged, which doubles as a clean record for client reporting.</li>
      </ul>

      <blockquote>
        Scale comes from trusting the monitoring, not from working more hours.
      </blockquote>

      <p>
        This is the workflow AdNexus is built around: per-client scopes, approval chains, and a single
        brief that turns &ldquo;fifty dashboards&rdquo; into &ldquo;one queue.&rdquo; Your numbers will
        vary — but the shape of the day is the point.
      </p>
    </article>
  );
}

function MigrationArticle() {
  return (
    <article className="prose-custom">
      <p className="lead">
        <em>An illustrative walkthrough.</em> What does it look like to move from a chat-only MCP
        connector to a visual, draft-first workspace? Here is what changes and what to expect.
      </p>

      <h2>What a chat-only tool gets right</h2>
      <p>
        Be fair to where you are starting. Chat connectors are genuinely good at one thing: asking a
        question in plain English and getting an answer from live data. If that is all you need, you
        may not need to move at all.
      </p>

      <h2>What you gain by moving</h2>
      <ul>
        <li><strong>A dashboard.</strong> You can see the whole account at a glance instead of querying for one slice at a time.</li>
        <li><strong>Governance.</strong> Draft-first approval and an audit trail replace &ldquo;hope the prompt was right.&rdquo;</li>
        <li><strong>Proactivity.</strong> The agent surfaces issues you did not think to ask about.</li>
        <li><strong>Cross-platform reasoning.</strong> One brain across Meta, Google, TikTok, and Snap rather than separate connectors.</li>
      </ul>

      <h2>How a move typically goes</h2>
      <ul>
        <li><strong>Connect.</strong> Re-authorize the same ad accounts over OAuth — usually a couple of minutes.</li>
        <li><strong>Observe.</strong> Let the agent run in read-only/draft mode for a few days to build trust before you act on anything.</li>
        <li><strong>Adopt the brief.</strong> Replace the daily dashboard crawl with the morning brief and approval queue.</li>
      </ul>

      <p>
        You keep what chat tools do well — natural-language access — because AdNexus is MCP-native too.
        You just gain the dashboard, the governance, and the proactivity on top. Your own results will
        differ; this is the shape of the transition, not a promise of numbers.
      </p>
    </article>
  );
}

const ARTICLES: Record<string, () => ReactNode> = {
  'how-metas-free-mcp-server-changes-everything': MetaMcpArticle,
  'building-a-draft-first-ad-agent': DraftFirstArticle,
  'google-ads-api-standard-access-guide': GoogleAdsAccessArticle,
  'why-120-mcp-tools-is-a-problem': ToolBloatArticle,
  'tiktok-creative-fatigue-detection': TikTokFatigueArticle,
  'morning-brief-proactive-ai-saves-5hrs': MorningBriefArticle,
  'cross-platform-attribution-guide': AttributionArticle,
  'solo-agency-playbook-50-clients': SoloAgencyArticle,
  'from-pipeboard-to-adnexus-migration-story': MigrationArticle,
};

export function getArticleBody(slug: string): ReactNode | null {
  const Body = ARTICLES[slug];
  return Body ? <Body /> : null;
}
