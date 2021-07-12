import findReachableUrls from 'find-reachable-urls';
import got from 'got';
import isUrl from 'is-url';
import { xml2js } from 'xml-js';
import cache from './utils/cache';
import log from './utils/log';
import repositoryUrl from './registries/repository-url';

const getLatestVersion = async (pkg) => {
  let response;
  try {
    response = await got.get(`https://api.nuget.org/v3-flatcontainer/${pkg}/index.json`);
  } catch (err) {
    if (err.statusCode === 404) {
      log('Package not found', pkg);
      return;
    }

    log(err);
    return;
  }

  let json;
  try {
    json = JSON.parse(response.body);
  } catch (err) {
    log('Parsing response failed');
    return;
  }

  // The version list is in ascending order so we take the last one and hope it has the best url data
  const [version] = json.versions.slice(-1);

  return version;
};

const getProjectUrls = async (pkg, version) => {
  let response;
  try {
    response = await got.get(`https://api.nuget.org/v3-flatcontainer/${pkg}/${version}/${pkg}.nuspec`);
  } catch (err) {
    if (err.statusCode === 404) {
      log('Package not found', pkg);
      return;
    }

    log(err);
    return;
  }

  let json;
  try {
    json = xml2js(response.body, { compact: true });
  } catch (err) {
    log('Parsing response failed');
    return;
  }

  // Parsing is based on this version of the schema
  // https://github.com/NuGet/NuGet.Client/blob/b82834821e19fd2a0489ef66f786939a38d435b5/src/NuGet.Core/NuGet.Packaging/compiler/resources/nuspec.xsd
  const { metadata: { repository, projectUrl: project } } = json.package;

  const urls = [];

  if (repository && repository._attributes) {
    const { url } = repository._attributes;
    urls.push(url);
  }

  if (project) {
    const url = project._text;

    // We only want to use the project url if it points to github because a lot of the times these go to corporate, project, or personal websites and aren't useful for us
    if (url && url.startsWith('https://github.com')) {
      urls.push(url);
    }
  }

  return urls;
};

export default async (pkg) => {
  pkg = pkg.toLowerCase();

  const cacheKey = `nuget_${pkg}`;
  const cacheValue = await cache.get(cacheKey);

  if (cacheValue) {
    return cacheValue;
  }

  const packageVersion = await getLatestVersion(pkg);

  if (!packageVersion) {
    return undefined;
  }

  const urls = await getProjectUrls(pkg, packageVersion);

  const validUrls = urls.map((bestMatchUrl) => {
    try {
      let url = repositoryUrl(bestMatchUrl);

      if (!url && isUrl(bestMatchUrl)) {
        url = bestMatchUrl;
      }

      return url;
    } catch (err) {
      return false;
    }
  });

  const reachableUrl = await findReachableUrls(validUrls, { firstMatch: true });

  if (!reachableUrl) {
    log('No URL for package found, falling back to nuget.org');
    return `https://www.nuget.org/packages/${pkg}/`;
  }

  await cache.set(cacheKey, reachableUrl);

  return reachableUrl;
};
