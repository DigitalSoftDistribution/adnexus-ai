import type { IScheduledReportRepository } from '../../../domain/repositories/IScheduledReportRepository';
import type { ScheduledReport } from '../../../domain/entities/ScheduledReport';
import { Result, ok, err, ForbiddenError, NotFoundError, ValidationError } from '../../../domain/value-objects/Result';

export interface ListScheduledReportsInput {
  workspaceId: string;
  userRole: string;
  page?: number;
  limit?: number;
}

export class ListScheduledReportsUseCase {
  constructor(private scheduledReportRepo: IScheduledReportRepository) {}

  async execute(input: ListScheduledReportsInput): Promise<Result<{
    reports: ScheduledReport[];
    total: number;
    page: number;
    totalPages: number;
  }>> {
    if (!['owner', 'admin', 'editor', 'viewer'].includes(input.userRole)) {
      return err(new ForbiddenError('Insufficient permissions'));
    }

    const result = await this.scheduledReportRepo.list({
      workspaceId: input.workspaceId,
      page: input.page,
      limit: input.limit,
    });
    return ok(result);
  }
}

export interface CreateScheduledReportInput {
  workspaceId: string;
  userId: string;
  userRole: string;
  name: string;
  description?: string | null;
  reportType: ScheduledReport['reportType'];
  config?: Record<string, unknown>;
  scheduleCron: string;
  recipients?: string[];
  format?: ScheduledReport['format'];
}

export class CreateScheduledReportUseCase {
  constructor(private scheduledReportRepo: IScheduledReportRepository) {}

  async execute(input: CreateScheduledReportInput): Promise<Result<ScheduledReport>> {
    if (!['owner', 'admin', 'editor'].includes(input.userRole)) {
      return err(new ForbiddenError('Insufficient permissions'));
    }
    if (!input.name?.trim()) {
      return err(new ValidationError('Name is required'));
    }
    if (!input.scheduleCron?.trim()) {
      return err(new ValidationError('Schedule cron is required'));
    }

    const report = await this.scheduledReportRepo.create({
      workspaceId: input.workspaceId,
      name: input.name.trim(),
      description: input.description ?? null,
      reportType: input.reportType,
      config: input.config ?? {},
      scheduleCron: input.scheduleCron.trim(),
      recipients: input.recipients ?? [],
      format: input.format ?? 'pdf',
      status: 'active',
      lastRunAt: null,
      lastRunStatus: null,
      nextRunAt: new Date(),
      createdBy: input.userId,
    });

    return ok(report);
  }
}

export interface DeleteScheduledReportInput {
  scheduledReportId: string;
  workspaceId: string;
  userRole: string;
}

export class DeleteScheduledReportUseCase {
  constructor(private scheduledReportRepo: IScheduledReportRepository) {}

  async execute(input: DeleteScheduledReportInput): Promise<Result<{ deleted: boolean }>> {
    if (!['owner', 'admin'].includes(input.userRole)) {
      return err(new ForbiddenError('Insufficient permissions'));
    }

    const existing = await this.scheduledReportRepo.findByIdAndWorkspace(
      input.scheduledReportId,
      input.workspaceId,
    );
    if (!existing) {
      return err(new NotFoundError('Scheduled report'));
    }

    const deleted = await this.scheduledReportRepo.delete(input.scheduledReportId);
    return ok({ deleted });
  }
}
