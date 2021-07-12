import Redis from 'ioredis';
import log from './log';

// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
// ~~ Thanks to RedisGreen and ZEIT for sponsoring ~~
// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

// https://zeit.co/docs/v2/platform/regions-and-providers/
// bru1 - Brussels, Belgium, Europe
// gru1 - São Paulo, Brazil
// hnd1 - Tokyo, Japan
// iad1 - Washington DC, USA
// sfo1 - San Francisco, CA, USA

const redisUrls = {
  dev1: 'sprightly-lavender-4454.redisgreen.net',
  bru1: 'sprightly-lavender-4454.redisgreen.net',
  gru1: 'handsome-turtle-8352.redisgreen.net',
  hnd1: 'inventive-willow-2140.redisgreen.net',
  iad1: 'content-pumpkin-3522.redisgreen.net',
  sfo1: 'graceful-turnip-982.redisgreen.net',
};

const availableRegions = ['dev1', 'bru1', 'gru1', 'hnd1', 'iad1', 'sfo1'];
const defaultExpireValue = 3600 * 12;

let redis;
const simpleCache = new Map();

const nowRegion = process.env.NOW_REGION || '';
let redisRegion = nowRegion;

function getRedisConfig() {
  if (!availableRegions.includes(nowRegion)) {
    log(`Region "${nowRegion}" not supported. Fallback to a random region`);
    // TODO Fallback to closest region
    redisRegion = availableRegions[Math.floor(Math.random() * availableRegions.length)];
  }

  const password = process.env[`REDIS_PASSWORD_${redisRegion.toUpperCase()}`];
  const host = redisUrls[redisRegion];

  log(
    `Cache connect to redis ${host} (${redisRegion}) from NOW region ${nowRegion}`,
  );

  return {
    host,
    password,
    port: 11042,
  };
}

function auth() {
  log('Cache auth');

  return new Promise((resolve) => {
    if (redis && redis.status === 'ready') {
      log(
        `Cache re-use redis ${
          redisUrls[redisRegion]
        } (${redisRegion}) from NOW region ${nowRegion}`,
      );

      return resolve();
    }

    const { host, port, password } = getRedisConfig();

    if (redis) {
      log('Cache Redis disconnect');
      redis.disconnect();
    }

    redis = new Redis({
      port,
      host,
      password,
    });

    ['connect', 'close', 'reconnecting', 'end'].forEach((eventName) => {
      redis.on(eventName, () => {
        log(`Cache Redis event: ${eventName}`);
      });
    });

    redis.on('error', async (error) => {
      log('Cache Redis event: error', error);
      if (redis) {
        log('Cache Redis status', redis.status);
        log('Cache Redis disconnect');
        redis.disconnect();
        redis = null;
      }
      resolve();
    });

    redis.on('ready', () => {
      log('Cache Redis event: ready');
      resolve();
    });
  });
}

async function set(key, value, expire = defaultExpireValue) {
  if (!redis || redis.status !== 'ready') {
    log('Cache SET simple-cache', key, value);
    simpleCache.set(key, value);
    return;
  }

  try {
    log('Cache SET redis-cache', key, value, expire);
    const timingStart = Date.now();
    await redis.set(key, value, 'EX', expire);
    log('Cache SET redis-cache timing', Date.now() - timingStart);
  } catch (error) {
    log('Cache SET redis-cache error', error);
  }
}

async function get(key) {
  if (!redis || redis.status !== 'ready') {
    log('Cache GET simple-cache', key);
    return simpleCache.get(key);
  }

  try {
    log('Cache GET redis-cache', key);
    const timingStart = Date.now();
    const value = await redis.get(key);
    log('Cache GET redis-cache timing', Date.now() - timingStart);
    return value;
  } catch (error) {
    log('Cache GET redis-cache error', error);
  }
}

export default {
  auth,
  set,
  get,
  getRedisStatus: () => redis && redis.status,
  simpleCacheSize: () => simpleCache.size,
  _memoryCache: simpleCache,
};
