import type { IAdminOpsRepository, ApiUsageSummary } from '../../../domain/repositories/IAdminOpsRepository';
import { Result, ok, err, ForbiddenError } from '../../../domain/value-objects/Result';

export interface GetAdminApiUsageInput {
  userRole: string;
  dateFrom?: string;
  dateTo?: string;
}

export class GetAdminApiUsageUseCase {
  constructor(private readonly adminOpsRepository: IAdminOpsRepository) {}

  async execute(input: GetAdminApiUsageInput): Promise<Result<ApiUsageSummary>> {
    if (input.userRole !== 'admin') {
      return err(new ForbiddenError('Admin access required'));
    }

    const usage = await this.adminOpsRepository.getApiUsage({
      dateFrom: input.dateFrom,
      dateTo: input.dateTo,
    });

    return ok(usage);
  }
}
