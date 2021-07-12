import nodeUrl from 'url';
import githubUrl from 'github-url-to-object';

export default function (url) {
  if (typeof url !== 'string') {
    return null;
  }

  // Remove last trailing slash
  if (url.slice(-1) === '/') {
    url = url.slice(0, -1);
  }

  // Fix multiple forward slashes
  url = url.replace(/([^:]\/)\/+/g, '$1');

  // Resolve shorthand url to a qualified URL
  if (url.split('/').length === 2) {
    url = `http://github.com/${url}`;
  }

  // Replace and fix invalid urls
  url = url.replace('https+git://', 'git+https://');
  url = url.replace('://www.github.com', '://github.com');

  // Ensure there is a protocol (`github-url-to-object` needs it)
  if (nodeUrl.parse(url).protocol === null) {
    url = `https://${url}`;
  }

  const githubInfo = githubUrl(url);
  return githubInfo ? githubInfo.https_url : url;
}
