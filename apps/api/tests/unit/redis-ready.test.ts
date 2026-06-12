import { EventEmitter } from 'events';

const ORIGINAL_ENV = process.env;

type RedisModule = typeof import('../../src/lib/redis');

function createMockRedis(status: string): EventEmitter & { status: string } {
  const emitter = new EventEmitter() as EventEmitter & { status: string };
  emitter.status = status;
  return emitter;
}

async function loadRedisModule(
  redisUrl: string | undefined,
  client: ReturnType<typeof createMockRedis> | null,
): Promise<RedisModule> {
  jest.resetModules();
  process.env = {
    ...ORIGINAL_ENV,
    NODE_ENV: 'test',
    JWT_SECRET: 'test-jwt-secret-key-for-redis-ready-tests-only',
    REDIS_URL: redisUrl,
  };

  jest.doMock('ioredis', () => jest.fn(() => client));

  return import('../../src/lib/redis');
}

describe('whenRedisReady', () => {
  afterEach(() => {
    process.env = ORIGINAL_ENV;
    jest.resetModules();
    jest.dontMock('ioredis');
  });

  it('does nothing when REDIS_URL is unset', async () => {
    const mod = await loadRedisModule(undefined, null);
    const callback = jest.fn();

    mod.whenRedisReady(callback);

    expect(callback).not.toHaveBeenCalled();
  });

  it('invokes callback immediately when Redis is already ready', async () => {
    const client = createMockRedis('ready');
    const mod = await loadRedisModule('redis://localhost:6379', client);
    const callback = jest.fn();

    mod.whenRedisReady(callback);

    expect(callback).toHaveBeenCalledTimes(1);
  });

  it('defers callback until Redis emits ready', async () => {
    const client = createMockRedis('connecting');
    const mod = await loadRedisModule('redis://localhost:6379', client);
    const callback = jest.fn();

    mod.whenRedisReady(callback);
    expect(callback).not.toHaveBeenCalled();

    client.status = 'ready';
    client.emit('ready');
    expect(callback).toHaveBeenCalledTimes(1);
  });
});
