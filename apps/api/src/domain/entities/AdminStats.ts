export interface AdminStats {
  totalWorkspaces: number;
  totalUsers: number;
  totalCampaigns: number;
  totalAds: number;
  totalSpend: number;
  activeSubscriptions: number;
  mrr: number;
  newUsersToday: number;
  newWorkspacesToday: number;
  topWorkspaces: Array<{
    id: string;
    name: string;
    userCount: number;
    campaignCount: number;
    totalSpend: number;
  }>;
  platformBreakdown: Record<string, number>;
  dailySignups: Array<{ date: string; count: number }>;
  dailyRevenue: Array<{ date: string; amount: number }>;
}
