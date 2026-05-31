import type { IExportRepository } from '../../../domain/repositories/IExportRepository';
import { Result, ok, err } from '../../../domain/value-objects/Result';
import { NotFoundError, ForbiddenError } from '../../../domain/value-objects/Result';

interface DeleteExportInput {
  exportId: string;
  workspaceId: string;
  userRole: string;
}

export class DeleteExportUseCase {
  constructor(private readonly exportRepository: IExportRepository) {}

  async execute(input: DeleteExportInput): Promise<Result<boolean>> {
    if (!['owner', 'admin'].includes(input.userRole)) {
      return err(new ForbiddenError('Insufficient permissions'));
    }

    const existing = await this.exportRepository.findByIdAndWorkspace(input.exportId, input.workspaceId);
    if (!existing) {
      return err(new NotFoundError('Export'));
    }

    const deleted = await this.exportRepository.delete(input.exportId);
    return ok(deleted);
  }
}
