import { Result, ok, err, ForbiddenError, ValidationError } from '../../../domain/value-objects/Result';
import type {
  IMockTrafficSeeder,
  MockTrafficPlatform,
  MockTrafficSeedResult,
} from '../../ports/IMockTrafficSeeder';

export interface SeedMockTrafficInput {
  workspaceId: string;
  userId: string;
  userRole: string;
  harnessKey?: string;
  platforms?: string[];
  variant?: string;
}

const ADMIN_ROLES = ['owner', 'admin'];
const SUPPORTED_PLATFORMS: MockTrafficPlatform[] = ['meta', 'google', 'tiktok', 'snap'];
const SUPPORTED_VARIANTS = ['baseline', 'high_spend', 'low_roas'] as const;
type MockTrafficVariant = (typeof SUPPORTED_VARIANTS)[number];

export class SeedMockTrafficUseCase {
  constructor(
    private readonly seeder: IMockTrafficSeeder,
    private readonly env: NodeJS.ProcessEnv = process.env,
  ) {}

  async execute(input: SeedMockTrafficInput): Promise<Result<MockTrafficSeedResult>> {
    if (!ADMIN_ROLES.includes(input.userRole)) {
      return err(new ForbiddenError('Requires owner or admin role'));
    }

    if (this.env.MOCK_TRAFFIC_HARNESS_ENABLED !== 'true') {
      return err(new ForbiddenError('Mock traffic harness is disabled'));
    }

    const nodeEnv = this.env.NODE_ENV ?? 'development';
    const context = this.env.MOCK_TRAFFIC_HARNESS_CONTEXT ?? '';
    if (nodeEnv === 'production' && context !== 'preview' && context !== 'test') {
      return err(new ForbiddenError('Mock traffic harness is not available in production'));
    }

    const expectedKey = this.env.MOCK_TRAFFIC_HARNESS_KEY;
    if (nodeEnv !== 'test') {
      if (!expectedKey || input.harnessKey !== expectedKey) {
        return err(new ForbiddenError('Invalid mock traffic harness key'));
      }
    }

    const platforms = this.parsePlatforms(input.platforms);
    if (!platforms.success) return platforms;

    const variant = this.parseVariant(input.variant);
    if (!variant.success) return variant;

    const result = await this.seeder.seed({
      workspaceId: input.workspaceId,
      userId: input.userId,
      platforms: platforms.data,
      variant: variant.data,
    });
    return ok(result);
  }

  private parsePlatforms(platforms?: string[]): Result<MockTrafficPlatform[]> {
    if (!platforms || platforms.length === 0) return ok(SUPPORTED_PLATFORMS);

    const unique = Array.from(new Set(platforms));
    const invalid = unique.filter((p) => !SUPPORTED_PLATFORMS.includes(p as MockTrafficPlatform));
    if (invalid.length > 0) {
      return err(new ValidationError(`Unsupported mock traffic platform: ${invalid.join(', ')}`));
    }
    return ok(unique as MockTrafficPlatform[]);
  }

  private parseVariant(variant?: string): Result<MockTrafficVariant> {
    if (!variant) return ok('baseline');
    if (!SUPPORTED_VARIANTS.includes(variant as MockTrafficVariant)) {
      return err(new ValidationError(`Unsupported mock traffic variant: ${variant}`));
    }
    return ok(variant as MockTrafficVariant);
  }
}
