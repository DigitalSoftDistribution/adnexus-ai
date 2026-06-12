import type {
  IAdminOpsRepository,
  AdminErrorListResult,
} from '../../../domain/repositories/IAdminOpsRepository';
import { Result, ok, err, ForbiddenError } from '../../../domain/value-objects/Result';

export interface ListAdminErrorsInput {
  userRole: string;
  page?: number;
  limit?: number;
  severity?: string;
}

export class ListAdminErrorsUseCase {
  constructor(private readonly adminOpsRepository: IAdminOpsRepository) {}

  async execute(input: ListAdminErrorsInput): Promise<Result<AdminErrorListResult>> {
    if (input.userRole !== 'admin') {
      return err(new ForbiddenError('Admin access required'));
    }

    const page = input.page ?? 1;
    const limit = Math.min(input.limit ?? 20, 100);
    const result = await this.adminOpsRepository.getErrors({
      page,
      limit,
      severity: input.severity,
    });

    return ok(result);
  }
}
