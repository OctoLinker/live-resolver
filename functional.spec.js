import http from 'http';
import got from 'got';
import handler from './src/handler';

describe('functional', () => {
  let server;

  beforeAll(
    () => new Promise((resolve) => {
      server = http
        .createServer((req, res) => handler(req, res))
        .listen(3000);

      resolve();
    }),
  );

  afterAll((done) => { server.close(done); });

  function testBulk(type, target, result) {
    it(`resolves ${target} from ${type} to ${result}`, async () => {
      const response = await got.post({
        json: true,
        url: 'http://localhost:3000/',
        body: [{ type, target }],
      });
      expect(response.body).toEqual({
        result: [
          {
            result,
            target,
            type,
          },
        ],
      });
    });
  }

  it('supports GET', async () => {
    const response = await got.get({
      json: true,
      url:
        'http://localhost:3000/?npm=jquery,request&go=k8s.io/kubernetes/pkg/api',
    });
    expect(response.body).toEqual({
      result: [
        {
          result: 'https://github.com/jquery/jquery',
          target: 'jquery',
          type: 'npm',
        },
        {
          result: 'https://github.com/request/request',
          target: 'request',
          type: 'npm',
        },
        {
          result:
            'https://github.com/kubernetes/kubernetes/tree/master/pkg/api',
          target: 'k8s.io/kubernetes/pkg/api',
          type: 'go',
        },
      ],
    });
  });

  testBulk('bower', 'jquery', 'https://github.com/jquery/jquery-dist');
  testBulk(
    'composer',
    'phpunit/phpunit',
    'https://github.com/sebastianbergmann/phpunit',
  );
  testBulk('rubygems', 'nokogiri', 'https://github.com/sparklemotion/nokogiri');
  testBulk('npm', 'eslint', 'https://github.com/eslint/eslint');
  testBulk('npm', '@jest/core', 'https://github.com/facebook/jest/tree/master/packages/jest-core');
  testBulk('npm', '@lerna/command', 'https://github.com/lerna/lerna/tree/master/core/command');
  testBulk('npm', 'request', 'https://github.com/request/request');
  testBulk(
    'npm',
    'babel-helper-regex',
    'https://github.com/babel/babel/tree/master/packages/babel-helper-regex',
  );
  testBulk(
    'npm',
    'audio-context-polyfill',
    'https://www.npmjs.com/package/audio-context-polyfill',
  );
  testBulk(
    'npm',
    'github-url-from-username-repo',
    'https://github.com/robertkowalski/github-url-from-username-repo',
  );
  testBulk(
    'npm',
    'find-project-root',
    'https://github.com/kirstein/find-project-root',
  );
  testBulk('pypi', 'simplejson', 'https://github.com/simplejson/simplejson');
  testBulk('crates', 'libc', 'https://github.com/rust-lang/libc');
  testBulk(
    'go',
    'k8s.io/kubernetes/pkg/api',
    'https://github.com/kubernetes/kubernetes/tree/master/pkg/api',
  );
  // testBulk('melpa', 'zzz-to-char', 'https://github.com/mrkkrp/zzz-to-char');
  testBulk(
    'java',
    'org.apache.log4j.Appender',
    'https://www.slf4j.org/api/org/apache/log4j/Appender.html',
  );
  testBulk(
    'java',
    'java.util.List',
    'https://docs.oracle.com/javase/9/docs/api/java/util/List.html',
  );
  testBulk(
    'ping',
    'https://nodejs.org/api/path.html',
    'https://nodejs.org/api/path.html',
  );
  testBulk(
    'pub',
    'path',
    'https://github.com/dart-lang/path',
  );
  testBulk(
    'cran',
    'fracdiff',
    'https://github.com/mmaechler/fracdiff',
  );
  testBulk(
    'cran',
    'usethis',
    'https://github.com/r-lib/usethis',
  );
  testBulk(
    'cran',
    'boot',
    'https://github.com/cran/boot',
  );
  testBulk(
    'nuget',
    'Notify',
    'https://www.nuget.org/packages/notify/',
  );
  testBulk(
    'nuget',
    'QRCoder',
    'https://github.com/codebude/QRCoder',
  );
});
