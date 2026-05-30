import type { IReportRepository } from '../../../domain/repositories/IReportRepository';
import type { Report } from '../../../domain/repositories/IReportRepository';
import { Result, ok, err, ForbiddenError, ValidationError } from '../../../domain/value-objects/Result';

export interface CreateReportInput {
  workspaceId: string;
  userRole: string;
  name: string;
  type: 'performance' | 'attribution' | 'creative' | 'custom';
  config: Record<string, unknown>;
  schedule?: { frequency: 'daily' | 'weekly' | 'monthly'; recipients: string[] };
}

export class CreateReportUseCase {
  constructor(private reportRepo: IReportRepository) {}

  async execute(input: CreateReportInput): Promise<Result<Report>> {
    if (!['owner', 'admin', 'editor'].includes(input.userRole)) {
      return err(new ForbiddenError('Insufficient permissions'));
    }

    if (!input.name?.trim()) {
      return err(new ValidationError('Report name is required'));
    }

    const report = await this.reportRepo.create({
      workspaceId: input.workspaceId,
      name: input.name.trim(),
      type: input.type,
      config: input.config,
      schedule: input.schedule ?? null,
      lastRunAt: null,
    });

    return ok(report);
  }
}
