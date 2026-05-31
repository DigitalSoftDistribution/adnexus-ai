import type { IExportRepository } from '../../../domain/repositories/IExportRepository';
import type { Export } from '../../../domain/entities/Export';
import { Result, ok, err } from '../../../domain/value-objects/Result';
import { ForbiddenError, ValidationError } from '../../../domain/value-objects/Result';

interface CreateExportInput {
  workspaceId: string;
  name: string;
  entity: string;
  format: string;
  filters?: Record<string, unknown>;
  userId: string;
  userRole: string;
}

export class CreateExportUseCase {
  constructor(private readonly exportRepository: IExportRepository) {}

  async execute(input: CreateExportInput): Promise<Result<Export>> {
    if (!['owner', 'admin', 'editor'].includes(input.userRole)) {
      return err(new ForbiddenError('Insufficient permissions'));
    }

    if (!input.name || input.name.trim().length < 2) {
      return err(new ValidationError('Export name must be at least 2 characters'));
    }

    const exportItem = await this.exportRepository.create({
      workspaceId: input.workspaceId,
      name: input.name.trim(),
      entity: input.entity as Export['entity'],
      format: input.format as Export['format'],
      status: 'pending',
      filters: input.filters ?? null,
      fileUrl: null,
      fileSize: null,
      rowCount: null,
      errorMessage: null,
      createdBy: input.userId,
      completedAt: null,
    });

    return ok(exportItem);
  }
}
