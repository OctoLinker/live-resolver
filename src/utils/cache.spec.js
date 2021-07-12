import redis from 'ioredis';
import cache from './cache';
import './log';

jest.mock('./log');
jest.mock('ioredis');

describe('cache', () => {
  let redisInstance;

  function invokeEventHandler(calls, eventName) {
    const item = calls.find(([name]) => name === eventName);
    if (item && item[1]) {
      return item[1]();
    }

    throw new Error(`No handler for ${eventName} found`);
  }

  function instantiateAuth(eventName, status) {
    const promise = cache.auth();
    [redisInstance] = redis.mock.instances;
    invokeEventHandler(redisInstance.on.mock.calls, eventName);
    redisInstance.status = status;
    return promise;
  }

  afterEach(() => {
    // Force new redis instance creation
    redis.mock.instances[0].status = null;

    // Clear memory cache
    cache._memoryCache.clear();

    jest.clearAllMocks();
  });

  describe('auth', () => {
    it('resolves when redis emits "ready" event', () => {
      instantiateAuth('ready', 'ready');
    });

    it('resolves when redis emits "error" event', () => {
      const promise = instantiateAuth('error', null);
      expect(redisInstance.disconnect).toHaveBeenCalledTimes(1);
      return promise;
    });
  });

  describe('get', () => {
    describe('when not connected to redis', () => {
      it('reads value from memory cache', async () => {
        instantiateAuth('error', null);
        cache._memoryCache.set('memory-foo', 'memory-bar');
        const result = await cache.get('memory-foo');
        expect(result).toBe('memory-bar');
      });
    });

    describe('when connected to redis', () => {
      it('reads value form redis cache', async () => {
        instantiateAuth('ready', 'ready');

        redisInstance.get.mockReturnValue('redis-bar');
        const result = await cache.get('redis-foo');
        expect(result).toBe('redis-bar');
      });
    });
  });

  describe('set', () => {
    describe('when not connected to redis', () => {
      it('writes value to memory cache', async () => {
        instantiateAuth('error', null);

        cache.set('memory-foo', 'memory-bar');
        const result = await cache.get('memory-foo');
        expect(result).toBe('memory-bar');
      });
    });

    describe('when connected to redis', () => {
      it('writes value to redis cache', async () => {
        instantiateAuth('ready', 'ready');

        cache.set('redis-foo', 'redis-bar');
        expect(redisInstance.set).toBeCalledWith(
          'redis-foo',
          'redis-bar',
          'EX',
          3600 * 12,
        );
      });
    });
  });

  describe('getRedisStatus', () => {
    it('returns ready status', async () => {
      instantiateAuth('ready', 'ready');
      expect(cache.getRedisStatus()).toBe('ready');
    });

    it('returns reconneting status', async () => {
      instantiateAuth('ready', 'reconneting');
      expect(cache.getRedisStatus()).toBe('reconneting');
    });
  });

  describe('simpleCacheSize', () => {
    it('returns the size of the memory cache', async () => {
      instantiateAuth('ready', 'ready');
      cache._memoryCache.set('foo');
      cache._memoryCache.set('bar');
      expect(cache.simpleCacheSize()).toBe(2);
    });
  });
});
