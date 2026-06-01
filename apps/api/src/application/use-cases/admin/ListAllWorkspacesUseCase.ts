import type { IWorkspaceRepository } from '../../../domain/repositories/IWorkspaceRepository';
import type { Workspace } from '../../../domain/entities/Workspace';
import { Result, ok, err } from '../../../domain/value-objects/Result';
import { ForbiddenError } from '../../../domain/value-objects/Result';

interface ListAllWorkspacesInput {
  userRole: string;
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
}

interface WorkspaceListResult {
  workspaces: Workspace[];
  total: number;
  page: number;
  totalPages: number;
}

export class ListAllWorkspacesUseCase {
  constructor(private readonly workspaceRepository: IWorkspaceRepository) {}

  async execute(input: ListAllWorkspacesInput): Promise<Result<WorkspaceListResult>> {
    if (input.userRole !== 'admin') {
      return err(new ForbiddenError('Admin access required'));
    }

    const result = await this.workspaceRepository.list({
      page: input.page,
      limit: input.limit,
      search: input.search,
      status: input.status as any,
    });

    return ok(result);
  }
}
