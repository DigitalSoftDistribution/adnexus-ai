import type { IExportRepository } from '../../../domain/repositories/IExportRepository';
import type { ExportListResult } from '../../../domain/entities/Export';
import { Result, ok } from '../../../domain/value-objects/Result';

interface ListExportsInput {
  workspaceId: string;
  status?: string | string[];
  entity?: string | string[];
  format?: string | string[];
  page?: number;
  limit?: number;
}

export class ListExportsUseCase {
  constructor(private readonly exportRepository: IExportRepository) {}

  async execute(input: ListExportsInput): Promise<Result<ExportListResult>> {
    const result = await this.exportRepository.list({
      workspaceId: input.workspaceId,
      status: input.status as any,
      entity: input.entity as any,
      format: input.format as any,
      page: input.page,
      limit: input.limit,
    });

    return ok(result);
  }
}
