export type GoalMetric = 'spend' | 'impressions' | 'clicks' | 'conversions' | 'ctr' | 'roas' | 'cpa' | 'reach' | 'frequency';
export type GoalPeriod = 'daily' | 'weekly' | 'monthly' | 'campaign_lifetime';
export type GoalStatus = 'active' | 'paused' | 'achieved' | 'missed' | 'archived';

export interface Goal {
  id: string;
  workspaceId: string;
  campaignId: string | null;
  name: string;
  description: string | null;
  metric: GoalMetric;
  targetValue: number;
  currentValue: number;
  period: GoalPeriod;
  status: GoalStatus;
  startDate: string | null;
  endDate: string | null;
  alertThreshold: number | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface GoalProgress {
  goalId: string;
  currentValue: number;
  targetValue: number;
  percentage: number;
  remaining: number;
  isOnTrack: boolean;
  projectedValue: number | null;
  daysRemaining: number | null;
  trend: 'up' | 'down' | 'flat';
}

export interface GoalFilters {
  workspaceId: string;
  campaignId?: string;
  status?: GoalStatus | GoalStatus[];
  metric?: GoalMetric | GoalMetric[];
  period?: GoalPeriod | GoalPeriod[];
  page?: number;
  limit?: number;
}

export interface GoalListResult {
  goals: Goal[];
  total: number;
  page: number;
  totalPages: number;
}
