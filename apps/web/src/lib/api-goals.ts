import { api } from './api-base';

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

/* ═══════════════════════════════════════════════════════════════════ */
/*  GOALS API                                                         */
/* ═══════════════════════════════════════════════════════════════════ */

export type GoalType = 'ROAS' | 'CPA' | 'CTR' | 'Spend' | 'Conversions' | 'Custom';
export type GoalStatus = 'on-track' | 'at-risk' | 'off-track' | 'completed';
export type GoalPlatform = 'Meta' | 'Google' | 'TikTok' | 'Snap' | 'All';

export interface PerformanceGoal {
  id: string;
  name: string;
  type: GoalType;
  platform: GoalPlatform;
  current: number;
  target: number;
  unit: string;
  status: GoalStatus;
  startDate: string;
  endDate: string;
  campaigns: string[];
  alertWhen: 'at-risk' | 'off-track' | 'never';
}

export interface CreateGoalInput {
  name: string;
  type: GoalType;
  target: number;
  unit: string;
  platform: GoalPlatform;
  campaigns: string[];
  startDate: string;
  endDate: string;
  alertWhen: 'at-risk' | 'off-track' | 'never';
}

let MOCK_GOALS: PerformanceGoal[] = [
  { id: '1', name: 'Q2 ROAS Target', type: 'ROAS', platform: 'All', current: 3.8, target: 4.0, unit: 'x', status: 'on-track', startDate: '2026-04-01', endDate: '2026-06-30', campaigns: ['All campaigns'], alertWhen: 'at-risk' },
  { id: '2', name: 'Meta CPA Reduction', type: 'CPA', platform: 'Meta', current: 36, target: 28, unit: '$', status: 'on-track', startDate: '2026-05-01', endDate: '2026-06-15', campaigns: ['Summer Sale', 'Retargeting'], alertWhen: 'at-risk' },
  { id: '3', name: 'Google CTR Improvement', type: 'CTR', platform: 'Google', current: 2.1, target: 2.8, unit: '%', status: 'at-risk', startDate: '2026-05-01', endDate: '2026-05-31', campaigns: ['Search Brand', 'PMax'], alertWhen: 'off-track' },
  { id: '4', name: 'Monthly Spend Cap', type: 'Spend', platform: 'All', current: 150, target: 180, unit: 'K', status: 'off-track', startDate: '2026-05-01', endDate: '2026-05-31', campaigns: ['All campaigns'], alertWhen: 'at-risk' },
  { id: '5', name: 'TikTok Video Completion', type: 'Custom', platform: 'TikTok', current: 35, target: 45, unit: '%', status: 'on-track', startDate: '2026-04-15', endDate: '2026-06-15', campaigns: ['FYP Viral', 'Spark Ads'], alertWhen: 'at-risk' },
  { id: '6', name: 'Snap App Install Volume', type: 'Conversions', platform: 'Snap', current: 95, target: 150, unit: '', status: 'on-track', startDate: '2026-05-01', endDate: '2026-06-30', campaigns: ['App Install', 'Dynamic'], alertWhen: 'at-risk' },
  { id: '7', name: 'Creative Refresh Frequency', type: 'Custom', platform: 'Meta', current: 2.5, target: 2.0, unit: 'wks', status: 'completed', startDate: '2026-01-01', endDate: '2026-12-31', campaigns: ['All campaigns'], alertWhen: 'never' },
  { id: '8', name: 'Cross-Platform ROAS', type: 'ROAS', platform: 'All', current: 3.0, target: 3.5, unit: 'x', status: 'at-risk', startDate: '2026-05-01', endDate: '2026-05-31', campaigns: ['All campaigns'], alertWhen: 'off-track' },
];

export const goalsApi = {
  async list(): Promise<PerformanceGoal[]> {
    await delay(400);
    return [...MOCK_GOALS];
  },
  async create(input: CreateGoalInput): Promise<PerformanceGoal> {
    await delay(500);
    const goal: PerformanceGoal = {
      id: `g_${Date.now()}`,
      ...input,
      current: 0,
      status: 'on-track',
    };
    MOCK_GOALS.push(goal);
    return goal;
  },
  async update(id: string, input: Partial<CreateGoalInput>): Promise<PerformanceGoal> {
    await delay(400);
    const idx = MOCK_GOALS.findIndex((g) => g.id === id);
    if (idx === -1) throw new Error('Goal not found');
    MOCK_GOALS[idx] = { ...MOCK_GOALS[idx], ...input };
    return { ...MOCK_GOALS[idx] };
  },
  async delete(id: string): Promise<void> {
    await delay(300);
    MOCK_GOALS = MOCK_GOALS.filter((g) => g.id !== id);
  },
  async toggleStatus(id: string): Promise<PerformanceGoal> {
    await delay(300);
    const goal = MOCK_GOALS.find((g) => g.id === id);
    if (!goal) throw new Error('Goal not found');
    goal.status = goal.status === 'on-track' ? 'at-risk' : 'on-track';
    return { ...goal };
  },
};
