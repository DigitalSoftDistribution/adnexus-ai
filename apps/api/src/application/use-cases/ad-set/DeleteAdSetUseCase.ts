import type { IAdSetRepository } from '../../../domain/repositories/IAdSetRepository';
import { Result, ok, err } from '../../../domain/value-objects/Result';
import { NotFoundError, ForbiddenError } from '../../../domain/value-objects/Result';

interface DeleteAdSetInput {
  adSetId: string;
  userRole: string;
}

export class DeleteAdSetUseCase {
  constructor(private readonly adSetRepository: IAdSetRepository) {}

  async execute(input: DeleteAdSetInput): Promise<Result<boolean>> {
    if (!['owner', 'admin'].includes(input.userRole)) {
      return err(new ForbiddenError('Insufficient permissions'));
    }

    const deleted = await this.adSetRepository.delete(input.adSetId);

    if (!deleted) {
      return err(new NotFoundError('Ad set'));
    }

    return ok(true);
  }
}
