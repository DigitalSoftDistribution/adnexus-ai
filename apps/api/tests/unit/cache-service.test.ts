import { jest } from '@jest/globals';
import {
  get,
  set,
  del,
  exists,
  ttl,
  cacheCampaigns,
  getCachedCampaigns,
  invalidateCampaigns,
  cacheInsights,
  getCachedInsights,
  invalidateInsights,
  cacheAccountOverview,
  getCachedAccountOverview,
  cacheDrafts,
  getCachedDrafts,
  invalidateDrafts,
  cacheUserSession,
  getCachedUserSession,
  invalidateUserSession,
  incrementCounter,
  getCounter,
  delPattern,
} from '../../src/services/cache-service';

// ─── Mock Redis Module ───────────────────────────────────────────

const mockRedisClient = {
  get: jest.fn(),
  set: jest.fn(),
  del: jest.fn(),
  exists: jest.fn(),
  ttl: jest.fn(),
  scan: jest.fn(),
  incr: jest.fn(),
  expire: jest.fn(),
  multi: jest.fn().mockReturnValue({
    incr: jest.fn().mockReturnThis(),
    expire: jest.fn().mockReturnThis(),
    exec: jest.fn().mockResolvedValue([[null, 1], [null, 1]]),
  }),
};

let redisAvailable = true;

jest.mock('../../src/lib/redis', () => ({
  getRedisClient: jest.fn().mockImplementation(() => mockRedisClient),
  isRedisAvailable: jest.fn().mockImplementation(() => redisAvailable),
}));

// ─── Suite: set / get ────────────────────────────────────────────

describe('cache set/get operations', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    redisAvailable = true;
  });

  it('should set and get a string value', async () => {
    // Arrange
    const key = 'test:key';
    const value = { message: 'hello world' };
    mockRedisClient.set.mockResolvedValueOnce('OK');
    mockRedisClient.get.mockResolvedValueOnce(JSON.stringify(value));

    // Act
    await set(key, value, 60);
    const result = await get<typeof value>(key);

    // Assert
    expect(mockRedisClient.set).toHaveBeenCalledWith(key, JSON.stringify(value), 'EX', 60);
    expect(result).toEqual(value);
  });

  it('should set value without TTL when not specified', async () => {
    // Arrange
    const key = 'test:no-ttl';
    const value = 'persistent';
    mockRedisClient.set.mockResolvedValueOnce('OK');

    // Act
    await set(key, value);

    // Assert
    expect(mockRedisClient.set).toHaveBeenCalledWith(key, JSON.stringify(value));
    expect(mockRedisClient.set).not.toHaveBeenCalledWith(
      expect.anything(),
      expect.anything(),
      'EX',
      expect.anything(),
    );
  });

  it('should get null for non-existent key', async () => {
    // Arrange
    mockRedisClient.get.mockResolvedValueOnce(null);

    // Act
    const result = await get('test:nonexistent');

    // Assert
    expect(result).toBeNull();
  });

  it('should get null for invalid JSON data', async () => {
    // Arrange
    mockRedisClient.get.mockResolvedValueOnce('not valid json {{');

    // Act
    const result = await get('test:invalid');

    // Assert
    expect(result).toBeNull();
  });
});

// ─── Suite: TTL Expiration ───────────────────────────────────────

describe('cache TTL expiration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    redisAvailable = true;
  });

  it('should return TTL for a key', async () => {
    // Arrange
    mockRedisClient.ttl.mockResolvedValueOnce(45);

    // Act
    const result = await ttl('test:ttl-key');

    // Assert
    expect(result).toBe(45);
    expect(mockRedisClient.ttl).toHaveBeenCalledWith('test:ttl-key');
  });

  it('should return -2 for non-existent key TTL', async () => {
    // Arrange
    mockRedisClient.ttl.mockResolvedValueOnce(-2);

    // Act
    const result = await ttl('test:does-not-exist');

    // Assert
    expect(result).toBe(-2);
  });

  it('should expire key after TTL seconds', async () => {
    // Arrange
    const key = 'test:expiring';
    const value = 'temp data';
    mockRedisClient.set.mockResolvedValueOnce('OK');

    // Act
    await set(key, value, 1);

    // Assert
    expect(mockRedisClient.set).toHaveBeenCalledWith(key, JSON.stringify(value), 'EX', 1);
  });
});

// ─── Suite: del ──────────────────────────────────────────────────

describe('cache del operation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    redisAvailable = true;
  });

  it('should delete a key', async () => {
    // Arrange
    mockRedisClient.del.mockResolvedValueOnce(1);

    // Act
    await del('test:key-to-delete');

    // Assert
    expect(mockRedisClient.del).toHaveBeenCalledWith('test:key-to-delete');
  });
});

// ─── Suite: exists ───────────────────────────────────────────────

describe('cache exists operation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    redisAvailable = true;
  });

  it('should return true for existing key', async () => {
    // Arrange
    mockRedisClient.exists.mockResolvedValueOnce(1);

    // Act
    const result = await exists('test:exists');

    // Assert
    expect(result).toBe(true);
  });

  it('should return false for non-existent key', async () => {
    // Arrange
    mockRedisClient.exists.mockResolvedValueOnce(0);

    // Act
    const result = await exists('test:not-exists');

    // Assert
    expect(result).toBe(false);
  });
});

// ─── Suite: Cache Invalidation ───────────────────────────────────

describe('cache invalidation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    redisAvailable = true;
  });

  it('should invalidate campaigns cache for workspace', async () => {
    // Arrange
    mockRedisClient.del.mockResolvedValueOnce(1);

    // Act
    await invalidateCampaigns('ws-123');

    // Assert
    expect(mockRedisClient.del).toHaveBeenCalledWith('campaigns:ws-123');
  });

  it('should invalidate specific insight cache', async () => {
    // Arrange
    mockRedisClient.del.mockResolvedValueOnce(1);

    // Act
    await invalidateInsights('ws-123', 'campaign-456');

    // Assert
    expect(mockRedisClient.del).toHaveBeenCalledWith('insights:ws-123:campaign-456');
  });

  it('should invalidate all insights for workspace using pattern', async () => {
    // Arrange
    mockRedisClient.scan.mockResolvedValueOnce(['0', ['insights:ws-123:camp1', 'insights:ws-123:camp2']]);
    mockRedisClient.del.mockResolvedValueOnce(2);

    // Act
    await invalidateInsights('ws-123');

    // Assert
    expect(mockRedisClient.scan).toHaveBeenCalled();
    expect(mockRedisClient.del).toHaveBeenCalledWith('insights:ws-123:camp1', 'insights:ws-123:camp2');
  });

  it('should invalidate drafts cache for workspace', async () => {
    // Arrange
    mockRedisClient.scan.mockResolvedValueOnce(['0', ['drafts:ws-123:pending']]);
    mockRedisClient.del.mockResolvedValueOnce(1);

    // Act
    await invalidateDrafts('ws-123');

    // Assert
    expect(mockRedisClient.scan).toHaveBeenCalledWith('0', 'MATCH', 'drafts:ws-123:*', 'COUNT', 100);
  });

  it('should invalidate user session', async () => {
    // Arrange
    mockRedisClient.del.mockResolvedValueOnce(1);

    // Act
    await invalidateUserSession('user-123');

    // Assert
    expect(mockRedisClient.del).toHaveBeenCalledWith('session:user-123');
  });
});

// ─── Suite: delPattern ───────────────────────────────────────────

describe('delPattern', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    redisAvailable = true;
  });

  it('should delete keys matching pattern', async () => {
    // Arrange
    mockRedisClient.scan
      .mockResolvedValueOnce(['123', ['key:1', 'key:2']])
      .mockResolvedValueOnce(['0', ['key:3']]);
    mockRedisClient.del.mockResolvedValueOnce(3);

    // Act
    await delPattern('key:*');

    // Assert
    expect(mockRedisClient.del).toHaveBeenCalledWith('key:1', 'key:2', 'key:3');
  });

  it('should handle empty scan results', async () => {
    // Arrange
    mockRedisClient.scan.mockResolvedValueOnce(['0', []]);

    // Act
    await delPattern('no-match:*');

    // Assert
    expect(mockRedisClient.del).not.toHaveBeenCalled();
  });
});

// ─── Suite: Campaign Cache ───────────────────────────────────────

describe('campaign cache', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    redisAvailable = true;
  });

  it('should cache campaigns for workspace', async () => {
    // Arrange
    const workspaceId = 'ws-123';
    const campaigns = [
      { id: 'camp1', name: 'Campaign 1', status: 'active' },
      { id: 'camp2', name: 'Campaign 2', status: 'paused' },
    ];
    mockRedisClient.set.mockResolvedValueOnce('OK');

    // Act
    await cacheCampaigns(workspaceId, campaigns, 300);

    // Assert
    expect(mockRedisClient.set).toHaveBeenCalledWith(
      `campaigns:${workspaceId}`,
      JSON.stringify(campaigns),
      'EX',
      300,
    );
  });

  it('should get cached campaigns', async () => {
    // Arrange
    const workspaceId = 'ws-123';
    const campaigns = [{ id: 'camp1', name: 'Campaign 1' }];
    mockRedisClient.get.mockResolvedValueOnce(JSON.stringify(campaigns));

    // Act
    const result = await getCachedCampaigns(workspaceId);

    // Assert
    expect(result).toEqual(campaigns);
  });
});

// ─── Suite: Insights Cache ───────────────────────────────────────

describe('insights cache', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    redisAvailable = true;
  });

  it('should cache insights for campaign', async () => {
    // Arrange
    const insights = {
      campaign_id: 'camp1',
      workspace_id: 'ws-123',
      platform: 'meta',
      spend: 1000,
      impressions: 50000,
      clicks: 1000,
      ctr: 2,
      conversions: 50,
      cpa: 20,
      roas: 3.5,
      frequency: 1.8,
      reach: 27778,
      cpm: 20,
      cpc: 1,
      cost_per_conversion: 20,
      conversion_rate: 5,
      platform_data: {},
      fetched_at: '2024-06-01T00:00:00.000Z',
    };
    mockRedisClient.set.mockResolvedValueOnce('OK');

    // Act
    await cacheInsights('ws-123', 'camp1', insights, 600);

    // Assert
    expect(mockRedisClient.set).toHaveBeenCalledWith(
      'insights:ws-123:camp1',
      JSON.stringify(insights),
      'EX',
      600,
    );
  });

  it('should get cached insights', async () => {
    // Arrange
    const insights = { campaign_id: 'camp1', spend: 1000 };
    mockRedisClient.get.mockResolvedValueOnce(JSON.stringify(insights));

    // Act
    const result = await getCachedInsights('ws-123', 'camp1');

    // Assert
    expect(result).toEqual(insights);
  });
});

// ─── Suite: Account Overview Cache ─────────────────────────────────

describe('account overview cache', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    redisAvailable = true;
  });

  it('should cache account overview', async () => {
    // Arrange
    const overview = {
      workspace_id: 'ws-123',
      total_spend: 5000,
      total_impressions: 250000,
      total_clicks: 5000,
      total_conversions: 250,
      avg_ctr: 2,
      avg_cpa: 20,
      avg_roas: 3.5,
      platform_breakdown: [],
      active_campaigns: 5,
      paused_campaigns: 2,
      drafted_campaigns: 1,
      fetched_at: '2024-06-01T00:00:00.000Z',
    };
    mockRedisClient.set.mockResolvedValueOnce('OK');

    // Act
    await cacheAccountOverview('ws-123', overview);

    // Assert
    expect(mockRedisClient.set).toHaveBeenCalled();
  });

  it('should get cached account overview', async () => {
    // Arrange
    const overview = { workspace_id: 'ws-123', total_spend: 5000 };
    mockRedisClient.get.mockResolvedValueOnce(JSON.stringify(overview));

    // Act
    const result = await getCachedAccountOverview('ws-123');

    // Assert
    expect(result).toEqual(overview);
  });
});

// ─── Suite: Drafts Cache ─────────────────────────────────────────

describe('drafts cache', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    redisAvailable = true;
  });

  it('should cache drafts by status', async () => {
    // Arrange
    const drafts = [{ id: 'draft1', status: 'pending' }, { id: 'draft2', status: 'pending' }];
    mockRedisClient.set.mockResolvedValueOnce('OK');

    // Act
    await cacheDrafts('ws-123', 'pending', drafts);

    // Assert
    expect(mockRedisClient.set).toHaveBeenCalledWith(
      'drafts:ws-123:pending',
      JSON.stringify(drafts),
      'EX',
      300,
    );
  });

  it('should get cached drafts', async () => {
    // Arrange
    const drafts = [{ id: 'draft1', status: 'pending' }];
    mockRedisClient.get.mockResolvedValueOnce(JSON.stringify(drafts));

    // Act
    const result = await getCachedDrafts('ws-123', 'pending');

    // Assert
    expect(result).toEqual(drafts);
  });
});

// ─── Suite: User Session Cache ───────────────────────────────────

describe('user session cache', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    redisAvailable = true;
  });

  it('should cache user session', async () => {
    // Arrange
    const session = {
      user_id: 'user-1',
      email: 'test@example.com',
      name: 'Test User',
      workspace_id: 'ws-123',
      role: 'owner',
      permissions: ['read', 'write'],
      logged_in_at: '2024-06-01T00:00:00.000Z',
    };
    mockRedisClient.set.mockResolvedValueOnce('OK');

    // Act
    await cacheUserSession('user-1', session);

    // Assert
    expect(mockRedisClient.set).toHaveBeenCalledWith(
      'session:user-1',
      JSON.stringify(session),
      'EX',
      1800,
    );
  });

  it('should get cached user session', async () => {
    // Arrange
    const session = { user_id: 'user-1', name: 'Test User' };
    mockRedisClient.get.mockResolvedValueOnce(JSON.stringify(session));

    // Act
    const result = await getCachedUserSession('user-1');

    // Assert
    expect(result).toEqual(session);
  });
});

// ─── Suite: Rate Limit Counter ───────────────────────────────────

describe('rate limit counter', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    redisAvailable = true;
  });

  it('should increment counter', async () => {
    // Arrange
    const multiMock = {
      incr: jest.fn().mockReturnThis(),
      expire: jest.fn().mockReturnThis(),
      exec: jest.fn().mockResolvedValue([[null, 5], [null, 1]]),
    };
    mockRedisClient.multi.mockReturnValueOnce(multiMock);

    // Act
    const result = await incrementCounter('ratelimit:ws-123:api', 60);

    // Assert
    expect(result).toBe(5);
    expect(multiMock.incr).toHaveBeenCalledWith('ratelimit:ws-123:api');
    expect(multiMock.expire).toHaveBeenCalledWith('ratelimit:ws-123:api', 60);
  });

  it('should return counter value', async () => {
    // Arrange
    mockRedisClient.get.mockResolvedValueOnce('42');

    // Act
    const result = await getCounter('ratelimit:ws-123:api');

    // Assert
    expect(result).toBe(42);
  });

  it('should return 0 for non-existent counter', async () => {
    // Arrange
    mockRedisClient.get.mockResolvedValueOnce(null);

    // Act
    const result = await getCounter('ratelimit:ws-123:nonexistent');

    // Assert
    expect(result).toBe(0);
  });
});

// ─── Suite: Redis Unavailable Fallback ───────────────────────────

describe('Redis unavailable fallback', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    redisAvailable = false;
  });

  it('should return null on get when Redis is unavailable', async () => {
    // Act
    const result = await get('test:key');

    // Assert
    expect(result).toBeNull();
    expect(mockRedisClient.get).not.toHaveBeenCalled();
  });

  it('should silently succeed on set when Redis is unavailable', async () => {
    // Act
    await set('test:key', 'value', 60);

    // Assert - should not throw
    expect(mockRedisClient.set).not.toHaveBeenCalled();
  });

  it('should silently succeed on del when Redis is unavailable', async () => {
    // Act
    await del('test:key');

    // Assert - should not throw
    expect(mockRedisClient.del).not.toHaveBeenCalled();
  });

  it('should return false on exists when Redis is unavailable', async () => {
    // Act
    const result = await exists('test:key');

    // Assert
    expect(result).toBe(false);
  });

  it('should return -2 on ttl when Redis is unavailable', async () => {
    // Act
    const result = await ttl('test:key');

    // Assert
    expect(result).toBe(-2);
  });

  it('should return 1 on incrementCounter when Redis is unavailable', async () => {
    // Act
    const result = await incrementCounter('ratelimit:test', 60);

    // Assert
    expect(result).toBe(1);
  });

  it('should return 0 on getCounter when Redis is unavailable', async () => {
    // Act
    const result = await getCounter('ratelimit:test');

    // Assert
    expect(result).toBe(0);
  });

  it('should silently succeed on delPattern when Redis is unavailable', async () => {
    // Act
    await delPattern('test:*');

    // Assert - should not throw
    expect(mockRedisClient.scan).not.toHaveBeenCalled();
  });
});

// ─── Suite: Error Handling ───────────────────────────────────────

describe('cache error handling', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    redisAvailable = true;
  });

  it('should return null when get throws error', async () => {
    // Arrange
    mockRedisClient.get.mockRejectedValueOnce(new Error('Redis connection lost'));

    // Act
    const result = await get('test:key');

    // Assert
    expect(result).toBeNull();
  });

  it('should silently fail when set throws error', async () => {
    // Arrange
    mockRedisClient.set.mockRejectedValueOnce(new Error('Redis connection lost'));

    // Act
    await expect(set('test:key', 'value', 60)).resolves.not.toThrow();
  });

  it('should silently fail when del throws error', async () => {
    // Arrange
    mockRedisClient.del.mockRejectedValueOnce(new Error('Redis connection lost'));

    // Act
    await expect(del('test:key')).resolves.not.toThrow();
  });

  it('should return false when exists throws error', async () => {
    // Arrange
    mockRedisClient.exists.mockRejectedValueOnce(new Error('Redis connection lost'));

    // Act
    const result = await exists('test:key');

    // Assert
    expect(result).toBe(false);
  });

  it('should return -2 when ttl throws error', async () => {
    // Arrange
    mockRedisClient.ttl.mockRejectedValueOnce(new Error('Redis connection lost'));

    // Act
    const result = await ttl('test:key');

    // Assert
    expect(result).toBe(-2);
  });
});
