import jpath from 'json-path';

function xpathResolver(json, selector) {
  try {
    return jpath.resolve(json, selector);
  } catch (err) {
    return '';
  }
}

export default function (json, xpaths) {
  return xpaths
    .map((selector) => xpathResolver(json, selector))
    .filter(
      (result) => result.length && typeof result[0] === 'string' && result[0],
    )
    .map((result) => result[0]);
}
