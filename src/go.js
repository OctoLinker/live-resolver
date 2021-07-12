import findReachableUrls from 'find-reachable-urls';
import readMeta from 'lets-get-meta';
import got from 'got';
import { tldExists } from 'tldjs';
import cache from './utils/cache';
import log from './utils/log';

const getGoMeta = async (url) => {
  const response = await got.get(url);
  const meta = readMeta(response.body);

  if (!meta['go-source']) {
    throw new Error('go-source meta is missing');
  }

  const values = meta['go-source'].replace(/\s+/g, ' ').split(' ');

  return {
    projectRoot: values[0],
    projectUrl: values[1],
    dirTemplate: values[2].replace('{/dir}', ''),
  };
};

const resolveUrl = async (url) => {
  let goMetaConfig;

  const cacheKey = `go_${url}`;
  const cacheValue = await cache.get(cacheKey);
  if (cacheValue) {
    return cacheValue;
  }

  if (!tldExists(`http://${url}`)) {
    log(`"http://${url}" is not a valid hostname`);
    return undefined;
  }

  try {
    // Preferred with https
    goMetaConfig = await getGoMeta(`https://${url}?go-get=1`);
  } catch (err) {
    // Fallback insecure
    goMetaConfig = await getGoMeta(`http://${url}?go-get=1`);
  }

  const reachableUrl = await findReachableUrls(
    [
      url.replace(goMetaConfig.projectRoot, goMetaConfig.dirTemplate),
      goMetaConfig.projectUrl,
    ],
    { firstMatch: true },
  );

  if (!reachableUrl) {
    throw new Error('No url is reachable');
  }

  await cache.set(cacheKey, reachableUrl);

  return reachableUrl;
};

export default async function (pkg) {
  try {
    return await resolveUrl(pkg);
  } catch (err) {
    if (err.code === 'ENOTFOUND') {
      log('ENOTFOUND', err.url);
    } else {
      log(err);
    }
    return undefined;
  }
}
