import type { IAdSetRepository } from '../../../domain/repositories/IAdSetRepository';
import type { AdSet } from '../../../domain/entities/AdSet';
import { Result, ok, err } from '../../../domain/value-objects/Result';
import { NotFoundError, ForbiddenError } from '../../../domain/value-objects/Result';

interface UpdateAdSetInput {
  adSetId: string;
  userRole: string;
  updates: Partial<AdSet>;
}

export class UpdateAdSetUseCase {
  constructor(private readonly adSetRepository: IAdSetRepository) {}

  async execute(input: UpdateAdSetInput): Promise<Result<AdSet>> {
    if (!['owner', 'admin', 'editor'].includes(input.userRole)) {
      return err(new ForbiddenError('Insufficient permissions'));
    }

    const adSet = await this.adSetRepository.update(input.adSetId, input.updates);

    if (!adSet) {
      return err(new NotFoundError('Ad set'));
    }

    return ok(adSet);
  }
}
