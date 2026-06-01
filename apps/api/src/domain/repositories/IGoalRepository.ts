import type { Goal, GoalFilters, GoalListResult, GoalProgress } from '../entities/Goal';

export interface IGoalRepository {
  findById(id: string): Promise<Goal | null>;
  findByIdAndWorkspace(id: string, workspaceId: string): Promise<Goal | null>;
  list(filters: GoalFilters): Promise<GoalListResult>;
  create(goal: Omit<Goal, 'id' | 'createdAt' | 'updatedAt'>): Promise<Goal>;
  update(id: string, updates: Partial<Goal>): Promise<Goal | null>;
  delete(id: string): Promise<boolean>;
  getProgress(goalId: string): Promise<GoalProgress | null>;
}
