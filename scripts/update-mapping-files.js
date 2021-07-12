#!/usr/bin/env node

import fs from 'fs';

import path from 'path';
import got from 'got';
import jsdom from 'jsdom'; // eslint-disable-line import/no-extraneous-dependencies

const { JSDOM } = jsdom;

const config = [
  'http://junit.org/junit5/docs/current/api/allclasses-frame.html',
  'http://static.javadoc.io/org.mockito/mockito-core/2.12.0/allclasses-frame.html',
  'https://www.slf4j.org/api/allclasses-frame.html',
  'http://hamcrest.org/JavaHamcrest/javadoc/2.0.0.0/allclasses-frame.html',
  'http://fasterxml.github.io/jackson-core/javadoc/2.9/allclasses-frame.html',
  'http://fasterxml.github.io/jackson-databind/javadoc/2.9/allclasses-frame.html',
  'http://fasterxml.github.io/jackson-annotations/javadoc/2.9/allclasses-frame.html',
  'http://hadoop.apache.org/docs/stable/api/allclasses-frame.html',
];

async function loadPage(url) {
  try {
    const { body } = await got(url);
    return new JSDOM(body).window.document;
  } catch (err) {
    return new JSDOM('<html></html>').window.document;
  }
}

async function getSpringDocumentationUrls() {
  const urlsToFetch = [];
  const document = await loadPage('https://spring.io/docs/reference');

  function findUrl(el, list) {
    const node = el.parentNode.parentNode.querySelector('.api-link');
    if (!node) return;

    let url = node.href.replace('index.html', '');
    url += 'allclasses-frame.html';

    list.push(url);
  }

  document.querySelectorAll('.docs--item').forEach((elContainer) => {
    const currentVersionEl = elContainer.querySelector('.icon-current-version');
    const releaseVersionEl = elContainer.querySelector('.icon-ga-release');
    const snapshotVersionEl = elContainer.querySelector(
      '.icon-snapshot-release',
    );

    if (currentVersionEl) {
      findUrl(currentVersionEl, urlsToFetch);
    } else if (releaseVersionEl) {
      findUrl(releaseVersionEl, urlsToFetch);
    } else if (snapshotVersionEl) {
      findUrl(snapshotVersionEl, urlsToFetch);
    }
  });

  return urlsToFetch;
}

async function getClassesUrl(results, url) {
  console.log(url);
  const document = await loadPage(url);
  const baseUrl = url.replace('allclasses-frame.html', '');

  const nodes = document.querySelectorAll('a');
  if (nodes) {
    nodes.forEach((el) => {
      const link = el.href;
      let library = link.replace(/\//g, '.');

      if (library.endsWith('.html')) {
        library = library.slice(0, -5);
      }

      results[library] = `${baseUrl}${link}`;
    });
  }
}

(async () => {
  const fullconfig = config.concat(await getSpringDocumentationUrls());

  const dir = path.join(__dirname, '../src/java/mapping.json');

  const content = {};
  for (const url of fullconfig) {
    await getClassesUrl(content, url); // eslint-disable-line no-await-in-loop
  }

  fs.writeFileSync(dir, JSON.stringify(content, null, ' '));
})();
