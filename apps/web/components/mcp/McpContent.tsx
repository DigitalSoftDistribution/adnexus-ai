'use client';

import { useQuery } from '@tanstack/react-query';
import { ArrowRight, CheckCircle2, KeyRound, Plug, ServerCog, ShieldCheck, TerminalSquare } from 'lucide-react';
import { Link } from '@/i18n/navigation';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { PageHeader } from '@/components/ui/page-header';
import { ErrorState } from '@/components/ui/error-state';

interface McpStatus {
  status: string;
  version: string;
  liveTransport: boolean;
  transports: {
    recommended: string;
    currentAppServer: string;
    legacyServer: string;
  };
  catalog: {
    total: number;
    byStatus: { implemented: number; planned: number };
    byMode: { read: number; draft: number; approve: number; admin: number };
  };
  gaps: string[];
}

interface McpTool {
  name: string;
  title: string;
  category: string;
  mode: string;
  status: 'implemented' | 'planned';
  description: string;
}

function useMcpStatus() {
  return useQuery({
    queryKey: ['mcp', 'status'],
    queryFn: async (): Promise<McpStatus> => {
      const res = await fetch('/api/v2/mcp/status');
      if (!res.ok) throw new Error('Failed to load MCP status');
      const json = await res.json();
      return json.data;
    },
  });
}

function useMcpTools() {
  return useQuery({
    queryKey: ['mcp', 'tools'],
    queryFn: async (): Promise<McpTool[]> => {
      const res = await fetch('/api/v2/mcp/tools');
      if (!res.ok) throw new Error('Failed to load MCP tool catalog');
      const json = await res.json();
      return json.data?.tools ?? [];
    },
  });
}

const capabilities = [
  'Connect AdNexus to AI clients such as Claude, Cursor, and other MCP-compatible tools.',
  'Query campaign, report, audience, and sync data through the read-first MCP tool catalog.',
  'Prepare draft-first actions for optimizations so humans can review before spend-impacting changes run.',
];

export function McpContent() {
  const { data: status, isLoading: statusLoading, isError: statusError, refetch: refetchStatus } = useMcpStatus();
  const { data: tools, isLoading: toolsLoading } = useMcpTools();

  if (statusLoading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (statusError || !status) {
    return (
      <div className="space-y-6">
        <PageHeader
          icon={<ServerCog className="h-5 w-5" />}
          title="MCP Server"
          description="Connect AdNexus to AI clients with safe, account-aware campaign context."
        />
        <ErrorState
          title="Unable to load MCP status"
          description="The MCP readiness API is unavailable. Retry after confirming you are signed in."
          onRetry={() => refetchStatus()}
          retryLabel="Retry"
        />
      </div>
    );
  }

  const implementedTools = (tools ?? []).filter((t) => t.status === 'implemented');
  const plannedTools = (tools ?? []).filter((t) => t.status === 'planned');

  const checklist = [
    {
      title: 'Connect an ad account',
      description: 'MCP tools need synced Meta, Google, TikTok, or Snap data in the workspace.',
      href: '/dashboard/integrations',
      cta: 'Open integrations',
      done: false,
    },
    {
      title: 'Generate an API key',
      description: 'API keys are the credential source for future MCP access scopes.',
      href: '/dashboard/settings',
      cta: 'Manage API keys',
      done: false,
    },
    {
      title: 'Review tool catalog',
      description: `${status.catalog.byStatus.implemented} read/draft tools are mapped to live v2 routes today.`,
      href: null,
      cta: `${status.catalog.byStatus.implemented} live mappings`,
      done: status.catalog.byStatus.implemented > 0,
    },
    {
      title: 'Enable MCP transport',
      description: status.liveTransport
        ? 'Streamable HTTP transport is live on this environment.'
        : 'Production Streamable HTTP endpoint is not deployed yet — catalog is API-only.',
      href: null,
      cta: status.liveTransport ? 'Transport live' : 'Transport pending',
      done: status.liveTransport,
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        icon={<ServerCog className="h-5 w-5" />}
        title="MCP Server"
        description="Connect AdNexus to AI clients with safe, account-aware campaign context."
        actions={
          <Button asChild variant="outline">
            <Link href="/dashboard/settings">
              <KeyRound className="mr-2 h-4 w-4" />
              API keys
            </Link>
          </Button>
        }
      />

      <Card className="border-amber-200 bg-amber-50/60 dark:border-amber-900/60 dark:bg-amber-950/20">
        <CardContent className="flex flex-col gap-4 p-5 md:flex-row md:items-start md:justify-between">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant={status.liveTransport ? 'success' : 'warning'}>
                {status.liveTransport ? 'Transport ready' : 'Catalog ready — transport pending'}
              </Badge>
              <Badge variant="outline">v{status.version}</Badge>
              <Badge variant="secondary" className="capitalize">
                {status.status.replace(/_/g, ' ')}
              </Badge>
            </div>
            <h2 className="text-lg font-semibold tracking-tight">
              {status.catalog.total} MCP tools catalogued ({status.catalog.byStatus.implemented} implemented)
            </h2>
            <p className="max-w-3xl text-sm text-muted-foreground">
              This dashboard reads live readiness from GET /api/v2/mcp/status and the tool catalog from
              GET /api/v2/mcp/tools. Client install snippets appear only after the production transport is deployed.
            </p>
            <p className="text-xs text-muted-foreground">
              Planned endpoint: <span className="font-mono">{status.transports.currentAppServer}</span>
            </p>
          </div>
          <Button asChild>
            <Link href="/dashboard/integrations">
              Connect data source
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-3">
        {capabilities.map((capability) => (
          <Card key={capability}>
            <CardContent className="flex gap-3 p-5">
              <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Plug className="h-4 w-4" />
              </span>
              <p className="text-sm text-muted-foreground">{capability}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.4fr_0.9fr]">
        <Card>
          <CardHeader>
            <CardTitle>Readiness checklist</CardTitle>
            <CardDescription>Workspace prep steps before MCP clients can call live tools.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {checklist.map((item, index) => (
              <div
                key={item.title}
                className="flex flex-col gap-3 rounded-lg border p-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="flex gap-3">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold">
                    {index + 1}
                  </span>
                  <div>
                    <p className="font-medium">{item.title}</p>
                    <p className="text-sm text-muted-foreground">{item.description}</p>
                  </div>
                </div>
                {item.href ? (
                  <Button asChild variant="outline" size="sm" className="shrink-0">
                    <Link href={item.href}>{item.cta}</Link>
                  </Button>
                ) : (
                  <Badge variant={item.done ? 'success' : 'secondary'} className="w-fit shrink-0">
                    {item.cta}
                  </Badge>
                )}
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Client setup</CardTitle>
            <CardDescription>
              {status.liveTransport ? 'Configure your MCP client' : 'No transport snippet yet'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-lg border bg-muted/40 p-4">
              <div className="flex items-center gap-2 text-sm font-medium">
                <TerminalSquare className="h-4 w-4" />
                MCP client config
              </div>
              <p className="mt-2 text-sm text-muted-foreground">
                {status.liveTransport
                  ? 'Use an API key from Settings and point your MCP client at the v2 MCP transport URL above.'
                  : 'We intentionally hide Claude/Cursor JSON snippets until Streamable HTTP is deployed. Use API keys for REST access today.'}
              </p>
            </div>
            <Button asChild variant="outline" className="w-full">
              <Link href="/dashboard/webhooks">Review webhooks</Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Live tool catalog</CardTitle>
          <CardDescription>
            {toolsLoading
              ? 'Loading catalog…'
              : `${implementedTools.length} implemented · ${plannedTools.length} planned · modes: ${status.catalog.byMode.read} read / ${status.catalog.byMode.draft} draft / ${status.catalog.byMode.approve} approve`}
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-2">
          {implementedTools.slice(0, 8).map((tool) => (
            <div key={tool.name} className="flex gap-3 rounded-lg border p-4">
              <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              <div className="min-w-0">
                <p className="text-sm font-medium">{tool.title}</p>
                <p className="text-xs text-muted-foreground">{tool.description}</p>
                <div className="mt-1 flex flex-wrap gap-1">
                  <Badge variant="outline" className="text-[10px] capitalize">
                    {tool.mode}
                  </Badge>
                  <Badge variant="secondary" className="text-[10px] capitalize">
                    {tool.category.replace(/_/g, ' ')}
                  </Badge>
                </div>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Backend gaps before live MCP clients</CardTitle>
          <CardDescription>Returned by the MCP status API — not static copy.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-2">
          {status.gaps.map((gap) => (
            <div key={gap} className="flex gap-3 rounded-lg border p-4">
              <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
              <p className="text-sm text-muted-foreground">{gap}</p>
            </div>
          ))}
        </CardContent>
      </Card>

      <div className="flex flex-wrap gap-2 text-sm text-muted-foreground">
        <span className="inline-flex items-center gap-1">
          <CheckCircle2 className="h-4 w-4 text-primary" />
          Dashboard wired to /api/v2/mcp/status and /api/v2/mcp/tools.
        </span>
        <span>Operational MCP transport will surface here when liveTransport becomes true.</span>
      </div>
    </div>
  );
}
