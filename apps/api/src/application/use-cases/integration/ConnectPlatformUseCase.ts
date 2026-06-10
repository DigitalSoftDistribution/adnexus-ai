import { Result, ok, err, ForbiddenError } from '../../../domain/value-objects/Result';
import { SUPPORTED_PLATFORMS, type SupportedPlatform } from '../integration/IntegrationUseCases';

export interface ConnectPlatformInput {
  workspaceId: string;
  userRole: string;
  platform: string;
}

export interface ConnectPlatformOutput {
  platform: SupportedPlatform;
  connectUrl: string;
}

const ADMIN_ROLES = ['owner', 'admin'];

export class ConnectPlatformUseCase {
  async execute(input: ConnectPlatformInput): Promise<Result<ConnectPlatformOutput>> {
    if (!ADMIN_ROLES.includes(input.userRole)) {
      return err(new ForbiddenError('Insufficient permissions'));
    }
    if (!SUPPORTED_PLATFORMS.includes(input.platform as SupportedPlatform)) {
      return err(new ForbiddenError('Unsupported platform'));
    }

    const platform = input.platform as SupportedPlatform;
    return ok({
      platform,
      connectUrl: `/api/v1/auth/${platform}/connect?workspace_id=${input.workspaceId}`,
    });
  }
}
