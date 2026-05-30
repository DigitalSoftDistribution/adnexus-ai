import type { IAudienceRepository } from '../../../domain/repositories/IAudienceRepository';
import type { Audience } from '../../../domain/repositories/IAudienceRepository';
import { Result, ok, err, ForbiddenError, ValidationError } from '../../../domain/value-objects/Result';

export interface CreateAudienceInput {
  workspaceId: string;
  userRole: string;
  platform: string;
  name: string;
  type: 'custom' | 'lookalike' | 'saved' | 'retargeting';
  size?: number;
  targeting?: Record<string, unknown>;
}

export class CreateAudienceUseCase {
  constructor(private audienceRepo: IAudienceRepository) {}

  async execute(input: CreateAudienceInput): Promise<Result<Audience>> {
    if (!['owner', 'admin', 'editor'].includes(input.userRole)) {
      return err(new ForbiddenError('Insufficient permissions'));
    }

    if (!input.name?.trim()) {
      return err(new ValidationError('Audience name is required'));
    }

    const audience = await this.audienceRepo.create({
      workspaceId: input.workspaceId,
      platform: input.platform,
      platformAudienceId: null,
      name: input.name.trim(),
      type: input.type,
      size: input.size ?? null,
      targeting: input.targeting ?? null,
      status: 'active',
    });

    return ok(audience);
  }
}
