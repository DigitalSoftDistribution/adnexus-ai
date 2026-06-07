import { ArrowRight, CheckCircle2, KeyRound, Plug, ServerCog, ShieldCheck, TerminalSquare } from 'lucide-react';
import { Link } from '@/i18n/navigation';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { PageHeader } from '@/components/ui/page-header';

const capabilities = [
  'Connect AdNexus to AI clients such as Claude, Cursor, and other MCP-compatible tools.',
  'Query campaign, report, audience, and sync data once the MCP backend is available.',
  'Prepare draft-first actions for optimizations so humans can review before spend-impacting changes run.',
];

const checklist = [
  {
    title: 'Connect an ad account',
    description: 'MCP tools will only be useful after Meta, Google, TikTok, or Snap data is connected and synced.',
    href: '/dashboard/integrations',
    cta: 'Open integrations',
  },
  {
    title: 'Generate an API key',
    description: 'Use the existing API key settings as the future credential source for MCP access.',
    href: '/dashboard/settings',
    cta: 'Manage API keys',
  },
  {
    title: 'Install client config',
    description: 'Client snippets are coming soon because the MCP HTTP endpoint is not deployed yet.',
    href: null,
    cta: 'Coming soon',
  },
  {
    title: 'Test your first query',
    description: 'A read-only smoke test will be enabled after the backend exposes real MCP tools.',
    href: null,
    cta: 'Coming soon',
  },
];

const nextBackendSlices = [
  'Define the MCP transport, route, and authentication contract without exposing placeholder endpoints.',
  'Map existing API key scopes to read-only MCP tool permissions.',
  'Ship read-only campaign and report tools before any draft-writing or execution tools.',
];

export function McpContent() {
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
              <Badge variant="warning">Setup in progress</Badge>
              <Badge variant="outline">Not connected yet</Badge>
            </div>
            <h2 className="text-lg font-semibold tracking-tight">MCP dashboard support is being set up.</h2>
            <p className="max-w-3xl text-sm text-muted-foreground">
              AdNexus does not currently expose a productized MCP server endpoint from this dashboard. This page is the
              first-class entrypoint for the rollout, so setup steps are visible without pretending that live MCP tools
              already exist.
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
            <CardDescription>Prepare the workspace for MCP without relying on unavailable backend pieces.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {checklist.map((item, index) => (
              <div key={item.title} className="flex flex-col gap-3 rounded-lg border p-4 sm:flex-row sm:items-center sm:justify-between">
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
                  <Badge variant="secondary" className="w-fit shrink-0">{item.cta}</Badge>
                )}
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Client setup</CardTitle>
            <CardDescription>No endpoint snippet yet</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-lg border bg-muted/40 p-4">
              <div className="flex items-center gap-2 text-sm font-medium">
                <TerminalSquare className="h-4 w-4" />
                MCP client config
              </div>
              <p className="mt-2 text-sm text-muted-foreground">
                We are intentionally not showing a Claude, Cursor, or JSON config snippet until the MCP endpoint and key
                model are deployed. Use API keys today for existing API access only.
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
          <CardTitle>Next backend slices for real MCP</CardTitle>
          <CardDescription>The dashboard entrypoint is ready; these are the product slices needed before live setup snippets appear.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-3">
          {nextBackendSlices.map((slice) => (
            <div key={slice} className="flex gap-3 rounded-lg border p-4">
              <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              <p className="text-sm text-muted-foreground">{slice}</p>
            </div>
          ))}
        </CardContent>
      </Card>

      <div className="flex flex-wrap gap-2 text-sm text-muted-foreground">
        <span className="inline-flex items-center gap-1">
          <CheckCircle2 className="h-4 w-4 text-primary" />
          Dashboard route and navigation are available now.
        </span>
        <span>Operational MCP status will appear only after a backend service exists.</span>
      </div>
    </div>
  );
}
