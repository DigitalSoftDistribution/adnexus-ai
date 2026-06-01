import type { Export, ExportFilters, ExportListResult } from '../entities/Export';

export interface IExportRepository {
  findById(id: string): Promise<Export | null>;
  findByIdAndWorkspace(id: string, workspaceId: string): Promise<Export | null>;
  list(filters: ExportFilters): Promise<ExportListResult>;
  create(exportItem: Omit<Export, 'id' | 'createdAt' | 'updatedAt'>): Promise<Export>;
  update(id: string, updates: Partial<Export>): Promise<Export | null>;
  delete(id: string): Promise<boolean>;
}
