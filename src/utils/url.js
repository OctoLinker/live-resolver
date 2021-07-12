function prioritiesHost(host, urls = []) {
  let insertIndex = 0;
  return urls.reduce((memo, url) => {
    if (url.includes(host)) {
      memo.splice(insertIndex++, 0, url); // eslint-disable-line no-plusplus
    } else {
      memo.push(url);
    }
    return memo;
  }, []);
}

export {
  // eslint-disable-next-line import/prefer-default-export
  prioritiesHost,
};
