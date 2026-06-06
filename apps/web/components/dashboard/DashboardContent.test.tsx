import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { NextIntlClientProvider } from "next-intl";
import type { ReactNode } from "react";
import { DashboardContent } from "./DashboardContent";
import messages from "@/messages/en.json";

// useSSE pulls in EventSource/WebSocket plumbing we don't want in jsdom.
vi.mock("@/hooks/useSSE", () => ({
  useSSE: () => ({ isConnected: true }),
}));

const summary = {
  totalCampaigns: 12,
  activeCount: 8,
  pausedCount: 4,
  totalSpend: 12345.67,
  totalImpressions: 1000000,
  totalClicks: 25000,
  totalConversions: 1200,
  avgCtr: 0.025,
  avgCpa: 10.29,
  avgRoas: 3.4,
  platformBreakdown: { meta: 7, google: 5 },
  statusBreakdown: { active: 8, paused: 4 },
  spendSeries: [],
};

const integrations = [
  {
    platform: "meta",
    label: "Meta Ads",
    connected: false,
    status: "not_connected",
    id: null,
    accountName: null,
    lastSyncedAt: null,
    connectUrl: "/api/v1/auth/meta/connect?workspace_id=ws-1",
  },
];

function mockDashboardFetch(
  summaryData = summary,
  integrationData = integrations,
) {
  return vi.fn().mockImplementation((input: RequestInfo | URL) => {
    const url = typeof input === "string" ? input : input.toString();
    if (url.startsWith("/api/v2/campaigns/summary")) {
      return Promise.resolve({
        ok: true,
        json: async () => ({ data: summaryData }),
      });
    }
    if (url.includes("/api/v2/integrations/accounts/")) {
      return Promise.resolve({ ok: true, json: async () => ({ data: [] }) });
    }
    if (url.includes("/api/v2/integrations")) {
      return Promise.resolve({
        ok: true,
        json: async () => ({ data: integrationData }),
      });
    }
    return Promise.resolve({ ok: false, json: async () => ({}) });
  });
}

function renderWithQuery(ui: ReactNode) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <NextIntlClientProvider locale="en" messages={messages}>
      <QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>
    </NextIntlClientProvider>,
  );
}

describe("DashboardContent", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("renders KPI cards once the summary loads", async () => {
    vi.stubGlobal("fetch", mockDashboardFetch());

    renderWithQuery(<DashboardContent />);

    expect(await screen.findByText("Total Spend")).toBeInTheDocument();
    expect(screen.getByText("Impressions")).toBeInTheDocument();
    expect(screen.getByText("Conversions")).toBeInTheDocument();
    // Platform breakdown card is rendered from the response.
    expect(screen.getByText("Platform Breakdown")).toBeInTheDocument();
    // ROAS is formatted with an 'x' suffix.
    expect(screen.getByText("3.40x")).toBeInTheDocument();
  });

  it("hits the v2 summary endpoint", async () => {
    const fetchMock = mockDashboardFetch();
    vi.stubGlobal("fetch", fetchMock);

    renderWithQuery(<DashboardContent />);
    await screen.findByText("Total Spend");

    expect(fetchMock).toHaveBeenCalledWith("/api/v2/campaigns/summary");
  });

  it("shows an error state when the request fails", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: false, json: async () => ({}) }),
    );

    renderWithQuery(<DashboardContent />);

    expect(
      await screen.findByText("Failed to load dashboard"),
    ).toBeInTheDocument();
  });

  it("shows a guided first-value empty state when there are no campaigns", async () => {
    vi.stubGlobal(
      "fetch",
      mockDashboardFetch({
        ...summary,
        totalCampaigns: 0,
        platformBreakdown: {},
        statusBreakdown: {},
        spendSeries: [],
      }),
    );

    renderWithQuery(<DashboardContent />);

    expect(await screen.findByText("No campaign data yet")).toBeInTheDocument();
    expect(
      screen.getByText("Get to your first useful dashboard"),
    ).toBeInTheDocument();
    expect(screen.getAllByText("Connect Meta account").length).toBeGreaterThan(
      0,
    );
    expect(screen.getByText("Sync first account")).toBeInTheDocument();
    // KPI cards should NOT render in the empty state.
    expect(screen.queryByText("Total Spend")).not.toBeInTheDocument();
  });
});
