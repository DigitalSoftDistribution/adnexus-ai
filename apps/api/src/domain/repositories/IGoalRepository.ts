import type { Goal, GoalMetricType, GoalStatus } from '../entities/Goal';

export interface GoalFilters {
  workspaceId: string;
  status?: GoalStatus | GoalStatus[];
  metricType?: GoalMetricType;
  platform?: string;
  search?: string;
  page?: number;
  limit?: number;
}

export interface GoalListResult {
  goals: Goal[];
  total: number;
  page: number;
  totalPages: number;
}

export interface IGoalRepository {
  findById(id: string): Promise<Goal | null>;
  findByIdAndWorkspace(id: string, workspaceId: string): Promise<Goal | null>;
  list(filters: GoalFilters): Promise<GoalListResult>;
  create(goal: Omit<Goal, 'id' | 'createdAt' | 'updatedAt'>): Promise<Goal>;
  update(id: string, updates: Partial<Goal>): Promise<Goal | null>;
  delete(id: string): Promise<boolean>;
  updateProgress(id: string, currentValue: number): Promise<Goal | null>;
  countByWorkspace(workspaceId: string): Promise<number>;
}
