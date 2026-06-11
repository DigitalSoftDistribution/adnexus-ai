import type { IAdminOpsRepository, FeatureFlag } from '../../../domain/repositories/IAdminOpsRepository';
import { Result, ok, err, ForbiddenError } from '../../../domain/value-objects/Result';

export interface UpdateFeatureFlagInput {
  userRole: string;
  key: string;
  value: boolean;
}

export class UpdateFeatureFlagUseCase {
  constructor(private readonly adminOpsRepository: IAdminOpsRepository) {}

  async execute(input: UpdateFeatureFlagInput): Promise<Result<FeatureFlag>> {
    if (input.userRole !== 'admin') {
      return err(new ForbiddenError('Admin access required'));
    }

    const flag = await this.adminOpsRepository.updateFeatureFlag(input.key, input.value);
    return ok(flag);
  }
}
