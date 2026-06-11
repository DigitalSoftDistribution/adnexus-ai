import type { ISettingsRepository } from '../../../domain/repositories/ISettingsRepository';
import { Result, ok, err, ForbiddenError, NotFoundError } from '../../../domain/value-objects/Result';

export interface GetProfileInput {
  userId: string;
  userRole: string;
}

export interface ProfileOutput {
  id: string;
  email: string;
  name: string | null;
  avatarUrl: string | null;
}

export class GetProfileUseCase {
  constructor(private settingsRepo: ISettingsRepository) {}

  async execute(input: GetProfileInput): Promise<Result<ProfileOutput>> {
    if (!['owner', 'admin', 'editor', 'viewer'].includes(input.userRole)) {
      return err(new ForbiddenError('Insufficient permissions'));
    }

    const profile = await this.settingsRepo.getProfile(input.userId);
    if (!profile) {
      return err(new NotFoundError('Profile'));
    }

    return ok(profile);
  }
}
