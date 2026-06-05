import { describe, it, expect, vi } from 'vitest';
import { ListGoalsUseCase } from './ListGoalsUseCase';
import { GetGoalByIdUseCase } from './GetGoalByIdUseCase';
import { CreateGoalUseCase } from './CreateGoalUseCase';
import { UpdateGoalUseCase } from './UpdateGoalUseCase';
import { DeleteGoalUseCase } from './DeleteGoalUseCase';
import { GetGoalProgressUseCase } from './GetGoalProgressUseCase';
import type { IGoalRepository } from '../../../domain/repositories/IGoalRepository';
import type { Goal, GoalProgress } from '../../../domain/entities/Goal';

const goal: Goal = {
  id: 'goal-1',
  workspaceId: 'ws-1',
  campaignId: null,
  name: 'Hit 4x ROAS',
  description: null,
  metric: 'roas',
  targetValue: 4,
  currentValue: 2,
  period: 'monthly',
  status: 'active',
  startDate: null,
  endDate: null,
  alertThreshold: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const progress: GoalProgress = {
  goalId: 'goal-1',
  currentValue: 2,
  targetValue: 4,
  percentage: 50,
  remaining: 2,
  isOnTrack: true,
  projectedValue: 4.2,
  daysRemaining: 10,
  trend: 'up',
};

const makeRepo = (overrides: Partial<IGoalRepository> = {}): IGoalRepository =>
  ({
    findById: vi.fn(),
    findByIdAndWorkspace: vi.fn().mockResolvedValue(goal),
    list: vi.fn().mockResolvedValue({ goals: [goal], total: 1, page: 1, totalPages: 1 }),
    create: vi.fn().mockResolvedValue(goal),
    update: vi.fn().mockResolvedValue(goal),
    delete: vi.fn().mockResolvedValue(true),
    getProgress: vi.fn().mockResolvedValue(progress),
    ...overrides,
  }) as IGoalRepository;

const status = (r: { success: boolean; error?: unknown }) =>
  (r as { error: { statusCode: number } }).error.statusCode;

describe('ListGoalsUseCase', () => {
  it('returns the workspace goal list', async () => {
    const res = await new ListGoalsUseCase(makeRepo()).execute({ workspaceId: 'ws-1' });
    expect(res.success).toBe(true);
    if (res.success) expect(res.data.total).toBe(1);
  });

  it('passes filters through to the repository', async () => {
    const repo = makeRepo();
    await new ListGoalsUseCase(repo).execute({
      workspaceId: 'ws-1',
      campaignId: 'c-1',
      status: 'active',
      page: 2,
      limit: 10,
    });
    expect(repo.list).toHaveBeenCalledWith(
      expect.objectContaining({ workspaceId: 'ws-1', campaignId: 'c-1', status: 'active', page: 2, limit: 10 }),
    );
  });
});

describe('GetGoalByIdUseCase', () => {
  it('returns a goal scoped to the workspace', async () => {
    const res = await new GetGoalByIdUseCase(makeRepo()).execute({ goalId: 'goal-1', workspaceId: 'ws-1' });
    expect(res.success).toBe(true);
  });

  it('404s when the goal is not in the workspace', async () => {
    const repo = makeRepo({ findByIdAndWorkspace: vi.fn().mockResolvedValue(null) });
    const res = await new GetGoalByIdUseCase(repo).execute({ goalId: 'goal-x', workspaceId: 'ws-1' });
    expect(res.success).toBe(false);
    if (!res.success) expect(status(res)).toBe(404);
  });
});

describe('CreateGoalUseCase', () => {
  const base = {
    workspaceId: 'ws-1',
    name: 'Hit 4x ROAS',
    metric: 'roas',
    targetValue: 4,
    period: 'monthly',
    userRole: 'editor',
  };

  it('creates a goal for an editor', async () => {
    const repo = makeRepo();
    const res = await new CreateGoalUseCase(repo).execute(base);
    expect(res.success).toBe(true);
    expect(repo.create).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'Hit 4x ROAS', currentValue: 0, status: 'active' }),
    );
  });

  it('denies a viewer (403)', async () => {
    const res = await new CreateGoalUseCase(makeRepo()).execute({ ...base, userRole: 'viewer' });
    expect(res.success).toBe(false);
    if (!res.success) expect(status(res)).toBe(403);
  });

  it('rejects a too-short name (400)', async () => {
    const res = await new CreateGoalUseCase(makeRepo()).execute({ ...base, name: 'x' });
    expect(res.success).toBe(false);
    if (!res.success) expect(status(res)).toBe(400);
  });

  it('rejects a non-positive target value (400)', async () => {
    const res = await new CreateGoalUseCase(makeRepo()).execute({ ...base, targetValue: 0 });
    expect(res.success).toBe(false);
    if (!res.success) expect(status(res)).toBe(400);
  });

  it('trims the goal name before persisting', async () => {
    const repo = makeRepo();
    await new CreateGoalUseCase(repo).execute({ ...base, name: '  Spaced Goal  ' });
    expect(repo.create).toHaveBeenCalledWith(expect.objectContaining({ name: 'Spaced Goal' }));
  });
});

describe('UpdateGoalUseCase', () => {
  const base = { goalId: 'goal-1', workspaceId: 'ws-1', userRole: 'editor', updates: { targetValue: 5 } };

  it('updates an existing goal for an editor', async () => {
    const repo = makeRepo();
    const res = await new UpdateGoalUseCase(repo).execute(base);
    expect(res.success).toBe(true);
    expect(repo.update).toHaveBeenCalledWith('goal-1', { targetValue: 5 });
  });

  it('denies a viewer (403)', async () => {
    const res = await new UpdateGoalUseCase(makeRepo()).execute({ ...base, userRole: 'viewer' });
    expect(res.success).toBe(false);
    if (!res.success) expect(status(res)).toBe(403);
  });

  it('404s when the goal does not exist', async () => {
    const repo = makeRepo({ findByIdAndWorkspace: vi.fn().mockResolvedValue(null) });
    const res = await new UpdateGoalUseCase(repo).execute(base);
    expect(res.success).toBe(false);
    if (!res.success) expect(status(res)).toBe(404);
    expect(repo.update).not.toHaveBeenCalled();
  });
});

describe('DeleteGoalUseCase', () => {
  const base = { goalId: 'goal-1', workspaceId: 'ws-1', userRole: 'admin' };

  it('deletes a goal for an admin', async () => {
    const repo = makeRepo();
    const res = await new DeleteGoalUseCase(repo).execute(base);
    expect(res.success).toBe(true);
    expect(repo.delete).toHaveBeenCalledWith('goal-1');
  });

  it('denies an editor (403) — delete is owner/admin only', async () => {
    const repo = makeRepo();
    const res = await new DeleteGoalUseCase(repo).execute({ ...base, userRole: 'editor' });
    expect(res.success).toBe(false);
    if (!res.success) expect(status(res)).toBe(403);
    expect(repo.delete).not.toHaveBeenCalled();
  });

  it('404s when the goal does not exist', async () => {
    const repo = makeRepo({ findByIdAndWorkspace: vi.fn().mockResolvedValue(null) });
    const res = await new DeleteGoalUseCase(repo).execute(base);
    expect(res.success).toBe(false);
    if (!res.success) expect(status(res)).toBe(404);
  });
});

describe('GetGoalProgressUseCase', () => {
  it('returns progress for a goal in the workspace', async () => {
    const res = await new GetGoalProgressUseCase(makeRepo()).execute({ goalId: 'goal-1', workspaceId: 'ws-1' });
    expect(res.success).toBe(true);
    if (res.success) expect(res.data.percentage).toBe(50);
  });

  it('404s when the goal is not in the workspace', async () => {
    const repo = makeRepo({ findByIdAndWorkspace: vi.fn().mockResolvedValue(null) });
    const res = await new GetGoalProgressUseCase(repo).execute({ goalId: 'goal-x', workspaceId: 'ws-1' });
    expect(res.success).toBe(false);
    if (!res.success) expect(status(res)).toBe(404);
  });

  it('404s when progress cannot be computed', async () => {
    const repo = makeRepo({ getProgress: vi.fn().mockResolvedValue(null) });
    const res = await new GetGoalProgressUseCase(repo).execute({ goalId: 'goal-1', workspaceId: 'ws-1' });
    expect(res.success).toBe(false);
    if (!res.success) expect(status(res)).toBe(404);
  });
});
