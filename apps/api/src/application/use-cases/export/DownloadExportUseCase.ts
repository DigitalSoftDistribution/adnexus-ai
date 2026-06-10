import type { IExportRepository } from '../../../domain/repositories/IExportRepository';
import type { Export } from '../../../domain/entities/Export';
import { Result, ok, err, NotFoundError } from '../../../domain/value-objects/Result';

export interface DownloadExportInput {
  exportId: string;
  workspaceId: string;
}

export interface DownloadExportResult {
  export: Export;
  /** Download-ready data as a string (CSV or JSON). */
  data: string;
  contentType: string;
  filename: string;
}

export class DownloadExportUseCase {
  constructor(private exportRepo: IExportRepository) {}

  async execute(input: DownloadExportInput): Promise<Result<DownloadExportResult>> {
    const exp = await this.exportRepo.findByIdAndWorkspace(input.exportId, input.workspaceId);
    if (!exp) {
      return err(new NotFoundError('Export'));
    }

    // Stub download payload — real data would come from the export processing pipeline
    const data = JSON.stringify({ exportId: exp.id, status: exp.status, message: 'Export download stub — processing pipeline TBD' }, null, 2);
    const isCsv = exp.format === 'csv';
    const ext = isCsv ? 'csv' : 'json';
    const contentType = isCsv ? 'text/csv' : 'application/json';
    const filename = `${exp.name ?? `export-${exp.id}`}.${ext}`;

    return ok({ export: exp, data, contentType, filename });
  }
}
