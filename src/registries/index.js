import util from 'util';
import got from 'got';
import isUrl from 'is-url';
import findReachableUrls from 'find-reachable-urls';
import repositoryUrl from './repository-url';
import xpathHelper from './xpath-helper';
import registryConfig from './config.json';
import cache from '../utils/cache';
import log from '../utils/log';
import { prioritiesHost } from '../utils/url';

const ERR_PACKAGE_NOT_FOUND = 'ERR_PACKAGE_NOT_FOUND';

async function resolve(type, packageName) {
  const cacheKey = `${type}_${packageName}`;

  const cacheValue = await cache.get(cacheKey);

  if (cacheValue) {
    if (cacheValue !== ERR_PACKAGE_NOT_FOUND) {
      return cacheValue;
    }

    return undefined;
  }

  const config = registryConfig[type];

  if (!config) {
    return;
  }

  const requestUrl = util.format(
    config.registry,
    packageName.replace(/\//g, '%2f'),
  );

  let response;
  try {
    response = await got.get(requestUrl);
  } catch (err) {
    if (err.statusCode === 404) {
      log('Package not found', packageName, type);
      await cache.set(cacheKey, ERR_PACKAGE_NOT_FOUND, 900); // 15 minutes
      return;
    }

    return log(err);
  }
  let json;

  try {
    json = JSON.parse(response.body);
  } catch (err) {
    log('Parsing response failed');
    await cache.set(cacheKey, ERR_PACKAGE_NOT_FOUND, 900); // 15 minutes
    return;
  }

  let urls = xpathHelper(json, config.xpaths);

  if (type === 'npm') {
    if (json.repository && json.repository.directory) {
      urls.unshift(`${repositoryUrl(json.repository.url)}/tree/master/${json.repository.directory}`);
    }

    try {
      urls.push(
        ...json.maintainers.map(({ name }) => `${name}/${packageName}`),
      );
    } catch (err) {
      //
    }
  }

  if (type === 'cran') {
    // Some packages export multiple urls seperated by comma.
    urls = urls.map((url) => url.split(',').map((str) => str.trim())).flat();

    urls = prioritiesHost('https://github.com', urls);
  }

  const validUrls = urls.map((bestMatchUrl) => {
    try {
      let url = repositoryUrl(bestMatchUrl);

      if (!url && isUrl(bestMatchUrl)) {
        url = bestMatchUrl;
      }

      // http://localhost:3000/npm/uiautomatorwd
      // returns https:github.com/macacajs/uiautomatorwd.git which cause a timeout

      return url;
    } catch (err) {
      return false;
    }
  });

  const fallbackUrl = util.format(config.fallback, packageName);
  const tryUrls = validUrls.concat(fallbackUrl);
  const reachableUrl = await findReachableUrls(tryUrls, { firstMatch: true });

  if (!reachableUrl) {
    log('No URL for package found');
    await cache.set(cacheKey, ERR_PACKAGE_NOT_FOUND, 900); // 15 minutes
    return;
  }

  await cache.set(cacheKey, reachableUrl);

  return reachableUrl;
}

export default {
  supported: Object.keys(registryConfig),
  resolve,
};
