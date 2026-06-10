import type { IAdminOpsRepository, FeatureFlag } from '../../../domain/repositories/IAdminOpsRepository';
import { Result, ok, err, ForbiddenError } from '../../../domain/value-objects/Result';

export interface GetFeatureFlagsInput {
  userRole: string;
}

export class GetFeatureFlagsUseCase {
  constructor(private readonly adminOpsRepository: IAdminOpsRepository) {}

  async execute(input: GetFeatureFlagsInput): Promise<Result<FeatureFlag[]>> {
    if (input.userRole !== 'admin') {
      return err(new ForbiddenError('Admin access required'));
    }

    const flags = await this.adminOpsRepository.getFeatureFlags();
    return ok(flags);
  }
}
