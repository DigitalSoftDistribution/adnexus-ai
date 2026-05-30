export type GoalMetricType = 'spend' | 'roas' | 'ctr' | 'conversions' | 'cpa' | 'impressions' | 'clicks';
export type GoalStatus = 'active' | 'achieved' | 'missed' | 'paused';

export interface Goal {
  id: string;
  workspaceId: string;
  name: string;
  description: string | null;
  metricType: GoalMetricType;
  targetValue: number;
  currentValue: number;
  campaignIds: string[];
  platform: string | null;
  startDate: string | null;
  endDate: string | null;
  status: GoalStatus;
  createdBy: string | null;
  createdAt: Date;
  updatedAt: Date;
}
