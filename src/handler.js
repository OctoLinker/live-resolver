import { parse } from 'url';
import { json } from 'micro';
import pMap from 'p-map';
import go from './go';
import java from './java';
import nuget from './nuget';
import ping from './ping';
import registries from './registries';
import log from './utils/log';
import cache from './utils/cache';
import tracking from './utils/tracking';
import preparePayload from './utils/payload';

const logPrefix = log.prefix;

const mapper = async (item) => {
  let result;

  if (registries.supported.includes(item.type)) {
    result = await registries.resolve(item.type, item.target);
  } else if (item.type === 'go') {
    result = await go(item.target);
  } else if (item.type === 'java') {
    result = await java(item.target);
  } else if (item.type === 'ping') {
    result = await ping(item.target);
  } else if (item.type === 'nuget') {
    result = await nuget(item.target);
  } else {
    return;
  }

  return {
    ...item,
    result,
  };
};

async function requestHandler(payload) {
  return pMap(payload, mapper, { concurrency: 5 });
}

function errorHandler(error, res) {
  log(error);
  res.statusCode = 500;
  res.end('Internal server error');
}

tracking.init();

export default async (req, res) => {
  if (['POST', 'GET'].includes(req.method)) {
    const timingTotalStart = Date.now();

    let body;
    if (req.method === 'POST') {
      body = await json(req);
    } else {
      const { query } = parse(req.url, true);
      body = [].concat(
        ...Object.entries(query).map(([type, values]) => values.split(',').map((target) => ({
          type,
          target,
        }))),
      );
    }

    const timingCacheAuthStart = Date.now();
    await cache.auth();
    const timingCacheAuth = Date.now() - timingCacheAuthStart;

    let result = [];
    let timingTotalEnd;
    let completed = false;
    const payload = preparePayload(body);

    try {
      result = await requestHandler(payload);
      completed = true;
    } catch (error) {
      return errorHandler(error, res);
    } finally {
      timingTotalEnd = Date.now();

      log('Request completed', completed);
      log('Instance Name', logPrefix);
      log('Redis Status', cache.getRedisStatus());
      log('Redis Auth Duration', timingCacheAuth);
      log('Simple Cache Size', cache.simpleCacheSize());
      log('Result Length', (result && result.length) || 0);
      log('Duration', timingTotalEnd - timingTotalStart);

      const meta = {
        event: 'meta',
        properties: {
          Region: process.env.NOW_REGION || 'unknown',
          'Request completed': completed,
          'Instance Name': logPrefix,
          'Redis Status': cache.getRedisStatus(),
          'Redis Auth Duration': timingCacheAuth,
          'Simple Cache Size': cache.simpleCacheSize(),
          'Result Length': (result && result.length) || 0,
          Duration: timingTotalEnd - timingTotalStart,
        },
      };

      const bulkData = [
        meta,
        ...result.map((item) => ({
          event: 'packages',
          properties: {
            Type: item.type,
            Target: item.target,
            Result: item.result,
          },
        })),
      ];

      if (process.env.NODE_ENV !== 'test') {
        console.time('Mixpanel');
        await tracking.track(bulkData);
        console.timeEnd('Mixpanel');
      }
    }

    res.setHeader('Access-Control-Allow-Origin', '*');

    if (req.method === 'GET') {
      res.setHeader('Cache-Control', 'public, max-age=300, s-maxage=300, stale-while-revalidate');
    }

    return res.end(
      JSON.stringify({
        result,
      }),
    );
  }

  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'content-type');
  res.end();
};
