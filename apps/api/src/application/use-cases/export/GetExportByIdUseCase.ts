import type { IExportRepository } from '../../../domain/repositories/IExportRepository';
import type { Export } from '../../../domain/entities/Export';
import { Result, ok, err } from '../../../domain/value-objects/Result';
import { NotFoundError } from '../../../domain/value-objects/Result';

interface GetExportByIdInput {
  exportId: string;
  workspaceId: string;
}

export class GetExportByIdUseCase {
  constructor(private readonly exportRepository: IExportRepository) {}

  async execute(input: GetExportByIdInput): Promise<Result<Export>> {
    const exportItem = await this.exportRepository.findByIdAndWorkspace(input.exportId, input.workspaceId);

    if (!exportItem) {
      return err(new NotFoundError('Export'));
    }

    return ok(exportItem);
  }
}
