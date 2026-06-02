import { Cpu } from 'lucide-react';

const proseClass =
  'space-y-5 text-[15.5px] leading-[1.8] text-gray-400 ' +
  '[&_h2]:mt-12 [&_h2]:mb-4 [&_h2]:text-[26px] [&_h2]:font-semibold [&_h2]:leading-tight [&_h2]:tracking-tight [&_h2]:text-white ' +
  '[&_ul]:list-disc [&_ul]:space-y-2.5 [&_ul]:pl-5 [&_ul_strong]:font-semibold [&_ul_strong]:text-white ' +
  '[&_strong]:text-white ' +
  '[&_code]:rounded-md [&_code]:border [&_code]:border-white/10 [&_code]:bg-white/5 [&_code]:px-2 [&_code]:py-0.5 [&_code]:font-mono [&_code]:text-[13px] [&_code]:text-white ' +
  '[&_blockquote]:my-9 [&_blockquote]:rounded-r-xl [&_blockquote]:border-l-[3px] [&_blockquote]:border-[#c3f53b] [&_blockquote]:bg-white/[0.03] [&_blockquote]:px-7 [&_blockquote]:py-6 [&_blockquote]:text-lg [&_blockquote]:font-medium [&_blockquote]:italic [&_blockquote]:text-white';

export function MetaMcpArticle() {
  return (
    <div className={proseClass}>
      <p className="mb-7 text-lg leading-[1.75] text-gray-300">
        On May 8, 2026, Meta did something unexpected. They released an official MCP (Model Context
        Protocol) server for their Marketing API — completely free, open-source, and maintained by the
        Meta engineering team itself. For an industry that has spent the last decade building
        proprietary walled gardens around ad data, this is a seismic shift.
      </p>

      <p>
        The implications go far beyond a new API wrapper. The Meta MCP server represents a fundamental
        change in how ad platforms think about data accessibility, AI integration, and the relationship
        between advertisers and their own campaign data. After spending the past week integrating it
        into AdNexus AI and testing it across $2M in monthly ad spend, I can say with confidence: this
        changes everything.
      </p>

      <h2>What Meta&apos;s MCP Server Actually Does</h2>

      <p>
        At its core, the Meta MCP server is a standardized protocol layer that sits between large
        language models (Claude, ChatGPT, Cursor, etc.) and the Meta Marketing API. Instead of writing
        custom API integrations for every tool, the MCP server exposes Meta ad data through a universal
        interface that any MCP-compatible client can consume.
      </p>

      <p>
        What this means in practice: you can now ask Claude to &ldquo;show me all campaigns with CPA
        over $50 this week&rdquo; and get an instant, accurate response pulled live from your Meta ad
        accounts. No code. No SQL. No dashboard navigation. Just natural language translated into
        structured API calls through the MCP protocol.
      </p>

      <p>
        The server supports the full Meta Marketing API surface — campaigns, ad sets, ads, insights,
        creatives, audiences, and conversion tracking. It handles pagination, rate limiting, error
        retry logic, and OAuth token refresh automatically. This is not a hacky community wrapper; this
        is production-grade infrastructure from Meta&apos;s own Platform Engineering team.
      </p>

      <h2>Why This Matters for Ad Management Tools</h2>

      <p>
        For the past two years, every AI-powered ad tool has faced the same architectural challenge: how
        do you let LLMs interact with ad platforms safely, reliably, and at scale? The approaches have
        fallen into three categories:
      </p>

      <ul>
        <li>
          <strong>Chat-only interfaces</strong> (Pipeboard-style) where the AI talks to the API but you
          never see the data visually
        </li>
        <li>
          <strong>Massive tool surfaces</strong> (120+ tools) where every API endpoint gets its own
          function definition, overwhelming the LLM&apos;s reasoning capacity
        </li>
        <li>
          <strong>Proprietary middleware</strong> that locks you into a specific vendor&apos;s AI stack
        </li>
      </ul>

      <p>
        Meta&apos;s MCP server solves the protocol problem at the source. Instead of every tool vendor
        building their own Meta integration layer, there&apos;s now a single, authoritative bridge. This
        means:
      </p>

      <ul>
        <li>
          <strong>Faster development:</strong> We went from zero to full Meta integration in 48 hours
          instead of three weeks
        </li>
        <li>
          <strong>Better reliability:</strong> Official maintenance means fewer breaking changes and
          faster bug fixes
        </li>
        <li>
          <strong>Lower costs:</strong> Shared infrastructure reduces the per-request overhead that gets
          passed to customers
        </li>
        <li>
          <strong>Standardized safety:</strong> The MCP protocol includes built-in permission scoping
          and audit logging
        </li>
      </ul>

      <h2>The Safety Model: Why Draft-First Still Matters</h2>

      <p>
        Here&apos;s where I need to add a critical caveat. The MCP server makes it incredibly easy for
        LLMs to <em>read</em> your Meta data. But it also makes it easy for them to <em>write</em> —
        create campaigns, change budgets, pause ads. Without proper guardrails, this is terrifying.
      </p>

      <p>
        Meta&apos;s MCP server includes basic permission scopes, but it doesn&apos;t enforce a
        draft-first workflow by default. When we integrated it into AdNexus AI, we built an additional
        safety layer: every write action gets staged as a draft that requires human approval before
        deployment. The MCP server handles the API communication; our draft system handles the
        decision-making.
      </p>

      <p>
        This combination — Meta&apos;s official MCP server for data access, plus AdNexus&apos;s
        draft-first workflow for write safety — is what we believe is the correct architecture for
        AI-driven ad management. You get the reliability of official infrastructure with the safety of
        staged approvals.
      </p>

      <blockquote>
        &ldquo;The future of ad management isn&apos;t more dashboards. It&apos;s better interfaces
        between human intent, AI reasoning, and platform data.&rdquo;
      </blockquote>

      <h2>What Happens Next</h2>

      <p>
        I expect two things to happen in the next six months. First, Google and TikTok will release
        their own official MCP servers. The protocol is gaining momentum fast — there are now over 1,200
        community MCP servers, and major platforms are realizing that making their data accessible to AI
        agents is a competitive advantage, not a risk.
      </p>

      <p>
        Second, the ad management tool landscape will bifurcate. Tools that embrace MCP and build
        intelligent safety layers on top of it will thrive. Tools that try to maintain proprietary
        integration layers or compete on raw API access will become obsolete. The moat is no longer
        &ldquo;we can connect to Meta&rdquo; — it&apos;s &ldquo;we can help you use AI safely and
        effectively once you&apos;re connected.&rdquo;
      </p>

      <h2>How to Try It</h2>

      <p>
        If you want to experiment with Meta&apos;s MCP server directly, it&apos;s available on GitHub at{' '}
        <code>facebook/meta-mcp-server</code>. You&apos;ll need a Meta Business account with Marketing
        API access, and you&apos;ll need to generate a System User token with the appropriate
        permissions.
      </p>

      <p>
        If you&apos;d rather not deal with the setup, AdNexus AI now includes Meta&apos;s MCP server as a
        native integration. Connect your Meta account, enable the MCP layer, and you can start querying
        your ad data through Claude or ChatGPT immediately — with full draft-first protection on all
        write operations.
      </p>

      <p>
        The future of ad management isn&apos;t more dashboards. It&apos;s better interfaces between human
        intent, AI reasoning, and platform data. Meta&apos;s MCP server just accelerated that future by
        about two years.
      </p>
    </div>
  );
}

export function ComingSoon() {
  return (
    <div className="py-16 text-center">
      <span className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full border border-white/10 bg-white/[0.04]">
        <Cpu size={28} className="text-[#c3f53b]" aria-hidden="true" />
      </span>
      <h2 className="mb-3 text-2xl font-semibold text-white">Article Coming Soon</h2>
      <p className="mx-auto max-w-md text-base text-gray-400">
        We&apos;re putting the finishing touches on this article. Check back soon or subscribe to our
        newsletter to get notified.
      </p>
    </div>
  );
}
