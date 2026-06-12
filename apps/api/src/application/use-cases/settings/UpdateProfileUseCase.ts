import type { ISettingsRepository } from '../../../domain/repositories/ISettingsRepository';
import { Result, ok, err, ForbiddenError, NotFoundError, ValidationError } from '../../../domain/value-objects/Result';
import type { ProfileOutput } from './GetProfileUseCase';

export interface UpdateProfileInput {
  userId: string;
  userRole: string;
  name?: string;
  avatarUrl?: string;
}

export class UpdateProfileUseCase {
  constructor(private settingsRepo: ISettingsRepository) {}

  async execute(input: UpdateProfileInput): Promise<Result<ProfileOutput>> {
    if (!['owner', 'admin', 'editor', 'viewer'].includes(input.userRole)) {
      return err(new ForbiddenError('Insufficient permissions'));
    }

    if (input.name !== undefined && !input.name.trim()) {
      return err(new ValidationError('Name cannot be empty'));
    }

    const updated = await this.settingsRepo.updateProfile(input.userId, {
      name: input.name?.trim(),
      avatarUrl: input.avatarUrl,
    });
    if (!updated) {
      return err(new NotFoundError('Profile'));
    }

    const profile = await this.settingsRepo.getProfile(input.userId);
    if (!profile) {
      return err(new NotFoundError('Profile'));
    }

    return ok(profile);
  }
}
