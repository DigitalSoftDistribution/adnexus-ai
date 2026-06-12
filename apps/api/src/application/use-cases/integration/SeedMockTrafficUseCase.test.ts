import { describe, it, expect, vi } from 'vitest';
import { SeedMockTrafficUseCase } from './SeedMockTrafficUseCase';
import type { IMockTrafficSeeder } from '../../ports/IMockTrafficSeeder';

const makeSeeder = (): IMockTrafficSeeder => ({
  seed: vi.fn().mockResolvedValue({
    workspaceId: 'ws-1',
    accountsSeeded: 4,
    campaignsSeeded: 8,
    adSetsSeeded: 16,
    adsSeeded: 48,
    metricsSeeded: 112,
    platforms: ['meta', 'google', 'tiktok', 'snap'],
    accountIds: ['acc-meta', 'acc-google', 'acc-tiktok', 'acc-snap'],
    campaignStatuses: ['active', 'paused'],
  }),
});

const baseInput = {
  workspaceId: 'ws-1',
  userId: 'u-1',
  userRole: 'admin',
  harnessKey: 'qa-key',
};

const enabledEnv = {
  NODE_ENV: 'staging',
  MOCK_TRAFFIC_HARNESS_ENABLED: 'true',
  MOCK_TRAFFIC_HARNESS_CONTEXT: 'preview',
  MOCK_TRAFFIC_HARNESS_KEY: 'qa-key',
} as NodeJS.ProcessEnv;

describe('SeedMockTrafficUseCase', () => {
  it('seeds default Meta, Google, TikTok, and Snap mock traffic when safely gated', async () => {
    const seeder = makeSeeder();
    const result = await new SeedMockTrafficUseCase(seeder, enabledEnv).execute(baseInput);

    expect(result.success).toBe(true);
    expect(seeder.seed).toHaveBeenCalledWith({
      workspaceId: 'ws-1',
      userId: 'u-1',
      platforms: ['meta', 'google', 'tiktok', 'snap'],
      variant: 'baseline',
    });
  });

  it('supports a bounded platform subset and variant', async () => {
    const seeder = makeSeeder();
    const result = await new SeedMockTrafficUseCase(seeder, enabledEnv).execute({
      ...baseInput,
      platforms: ['meta'],
      variant: 'low_roas',
    });

    expect(result.success).toBe(true);
    expect(seeder.seed).toHaveBeenCalledWith(expect.objectContaining({
      platforms: ['meta'],
      variant: 'low_roas',
    }));
  });

  it('rejects non-admin users before seeding', async () => {
    const seeder = makeSeeder();
    const result = await new SeedMockTrafficUseCase(seeder, enabledEnv).execute({
      ...baseInput,
      userRole: 'editor',
    });

    expect(result.success).toBe(false);
    expect(seeder.seed).not.toHaveBeenCalled();
    if (!result.success) expect((result.error as unknown as { statusCode: number }).statusCode).toBe(403);
  });

  it('stays disabled unless the harness flag is explicitly enabled', async () => {
    const seeder = makeSeeder();
    const result = await new SeedMockTrafficUseCase(seeder, {
      ...enabledEnv,
      MOCK_TRAFFIC_HARNESS_ENABLED: 'false',
    }).execute(baseInput);

    expect(result.success).toBe(false);
    expect(seeder.seed).not.toHaveBeenCalled();
  });

  it('rejects production unless explicitly running in preview/test context', async () => {
    const seeder = makeSeeder();
    const result = await new SeedMockTrafficUseCase(seeder, {
      ...enabledEnv,
      NODE_ENV: 'production',
      MOCK_TRAFFIC_HARNESS_CONTEXT: '',
    }).execute(baseInput);

    expect(result.success).toBe(false);
    expect(seeder.seed).not.toHaveBeenCalled();
  });

  it('requires the harness key outside test', async () => {
    const seeder = makeSeeder();
    const result = await new SeedMockTrafficUseCase(seeder, enabledEnv).execute({
      ...baseInput,
      harnessKey: 'wrong',
    });

    expect(result.success).toBe(false);
    expect(seeder.seed).not.toHaveBeenCalled();
  });

  it('validates supported platforms', async () => {
    const seeder = makeSeeder();
    const result = await new SeedMockTrafficUseCase(seeder, enabledEnv).execute({
      ...baseInput,
      platforms: ['meta', 'linkedin'],
    });

    expect(result.success).toBe(false);
    expect(seeder.seed).not.toHaveBeenCalled();
    if (!result.success) expect((result.error as Error).message).toContain('Unsupported mock traffic platform');
  });
});
