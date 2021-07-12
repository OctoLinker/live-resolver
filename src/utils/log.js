const name = Math.random()
  .toString(36)
  .replace(/[^a-z]+/g, '')
  .substr(0, 8);

function log(...rest) {
  if (process.env.NODE_ENV === 'test') {
    return;
  }

  const region = process.env.NOW_REGION || '';
  console.log.apply(this, [`>> ${name} ${region}:`, ...rest]);
}

log.prefix = name;

export default log;
