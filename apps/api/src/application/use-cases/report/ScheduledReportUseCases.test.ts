import { describe, it, expect, vi } from 'vitest';
import {
  ListScheduledReportsUseCase,
  CreateScheduledReportUseCase,
  DeleteScheduledReportUseCase,
} from './ScheduledReportUseCases';
import type { IScheduledReportRepository } from '../../../domain/repositories/IScheduledReportRepository';
import type { ScheduledReport } from '../../../domain/entities/ScheduledReport';

const scheduled: ScheduledReport = {
  id: 'sch-1',
  workspaceId: 'ws-1',
  name: 'Weekly',
  description: null,
  reportType: 'performance',
  config: {},
  scheduleCron: '0 8 * * 1',
  recipients: ['ops@example.com'],
  format: 'pdf',
  status: 'active',
  lastRunAt: null,
  lastRunStatus: null,
  nextRunAt: new Date(),
  createdBy: 'u-1',
  createdAt: new Date(),
  updatedAt: new Date(),
};

const makeRepo = (overrides: Partial<IScheduledReportRepository> = {}): IScheduledReportRepository =>
  ({
    list: vi.fn().mockResolvedValue({ reports: [scheduled], total: 1, page: 1, totalPages: 1 }),
    create: vi.fn().mockResolvedValue(scheduled),
    findByIdAndWorkspace: vi.fn().mockResolvedValue(scheduled),
    delete: vi.fn().mockResolvedValue(true),
    ...overrides,
  }) as IScheduledReportRepository;

describe('Scheduled report use-cases', () => {
  it('lists scheduled reports', async () => {
    const res = await new ListScheduledReportsUseCase(makeRepo()).execute({
      workspaceId: 'ws-1', userRole: 'viewer',
    });
    expect(res.success).toBe(true);
  });

  it('creates a scheduled report for an editor', async () => {
    const repo = makeRepo();
    const res = await new CreateScheduledReportUseCase(repo).execute({
      workspaceId: 'ws-1',
      userId: 'u-1',
      userRole: 'editor',
      name: 'Weekly',
      reportType: 'performance',
      scheduleCron: '0 8 * * 1',
    });
    expect(res.success).toBe(true);
    expect(repo.create).toHaveBeenCalled();
  });

  it('deletes a scheduled report for an admin', async () => {
    const repo = makeRepo();
    const res = await new DeleteScheduledReportUseCase(repo).execute({
      scheduledReportId: 'sch-1', workspaceId: 'ws-1', userRole: 'admin',
    });
    expect(res.success).toBe(true);
    expect(repo.delete).toHaveBeenCalledWith('sch-1');
  });
});
