import type { IAdSetRepository } from '../../../domain/repositories/IAdSetRepository';
import type { AdSet } from '../../../domain/entities/AdSet';
import { Result, ok, err } from '../../../domain/value-objects/Result';
import { NotFoundError } from '../../../domain/value-objects/Result';

interface GetAdSetByIdInput {
  adSetId: string;
  campaignId?: string;
}

export class GetAdSetByIdUseCase {
  constructor(private readonly adSetRepository: IAdSetRepository) {}

  async execute(input: GetAdSetByIdInput): Promise<Result<AdSet>> {
    const adSet = input.campaignId
      ? await this.adSetRepository.findByIdAndCampaign(input.adSetId, input.campaignId)
      : await this.adSetRepository.findById(input.adSetId);

    if (!adSet) {
      return err(new NotFoundError('Ad set'));
    }

    return ok(adSet);
  }
}
