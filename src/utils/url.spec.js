import { prioritiesHost } from './url';

const inputUrls = [
  'https://foo.com',
  'https://github.com/foo',
  'https://bar.com',
  'https://github.com/bar',
];

describe('url', () => {
  describe('prioritiesHost', () => {
    it('priorities github.com', () => {
      expect(prioritiesHost('github.com', inputUrls)).toStrictEqual([
        'https://github.com/foo',
        'https://github.com/bar',
        'https://foo.com',
        'https://bar.com',
      ]);
    });

    it('priorities foo.com', () => {
      expect(prioritiesHost('foo.com', inputUrls)).toStrictEqual([
        'https://foo.com',
        'https://github.com/foo',
        'https://bar.com',
        'https://github.com/bar',
      ]);
    });

    it('priorities bar.com', () => {
      expect(prioritiesHost('bar.com', inputUrls)).toStrictEqual([
        'https://bar.com',
        'https://foo.com',
        'https://github.com/foo',
        'https://github.com/bar',
      ]);
    });
  });
});
