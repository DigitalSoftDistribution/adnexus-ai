import type { IAdPlatformCapabilities, AdPlatformCapabilities } from '../../ports/AdPlatformCapabilities';
import type { Platform } from '../../../domain/entities/Campaign';
import { Result, ok, err, ForbiddenError } from '../../../domain/value-objects/Result';

const READ_ROLES = ['owner', 'admin', 'editor', 'viewer'];
const SUPPORTED_PLATFORMS: Platform[] = ['meta', 'google', 'tiktok', 'snap'];

/**
 * Returns capabilities for a single connected or disconnected platform.
 */
export class GetPlatformCapabilitiesUseCase {
  constructor(private readonly capabilities: IAdPlatformCapabilities) {}

  async execute(input: {
    workspaceId: string;
    userRole: string;
    platform: string;
  }): Promise<Result<AdPlatformCapabilities>> {
    if (!READ_ROLES.includes(input.userRole)) {
      return err(new ForbiddenError('Insufficient permissions'));
    }
    if (!SUPPORTED_PLATFORMS.includes(input.platform as Platform)) {
      return err(new ForbiddenError('Unsupported platform'));
    }
    const caps = await this.capabilities.getCapabilities(
      input.workspaceId,
      input.platform as Platform,
    );
    return ok(caps);
  }
}

/**
 * Returns capabilities for all four supported platforms at once.
 */
export class GetAllPlatformCapabilitiesUseCase {
  constructor(private readonly capabilities: IAdPlatformCapabilities) {}

  async execute(input: {
    workspaceId: string;
    userRole: string;
  }): Promise<Result<AdPlatformCapabilities[]>> {
    if (!READ_ROLES.includes(input.userRole)) {
      return err(new ForbiddenError('Insufficient permissions'));
    }
    const caps = await this.capabilities.getAllCapabilities(input.workspaceId);
    return ok(caps);
  }
}
