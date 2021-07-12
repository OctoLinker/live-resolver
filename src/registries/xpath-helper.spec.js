import jpath from 'json-path';
import xpathHelper from './xpath-helper';

jest.mock('json-path');

describe('xpath-helper', () => {
  beforeEach(() => {
    jpath.resolve.mockReturnValue([]);
  });

  afterEach(() => jpath.resolve.mockClear());

  describe('jpath', () => {
    const json = {
      foo: '',
      bar: 'blub',
    };
    const xpaths = ['/foo', '/bar'];

    it('calls jpath.resolve for each xpath entry', () => {
      xpathHelper({}, xpaths);

      expect(jpath.resolve.mock.calls).toHaveLength(xpaths.length);
      expect(jpath.resolve.mock.calls[0][1]).toBe(xpaths[0]);
      expect(jpath.resolve.mock.calls[1][1]).toBe(xpaths[1]);
    });

    it('calls jpath.resolve with json passed in', () => {
      xpathHelper(json, xpaths);

      expect(jpath.resolve.mock.calls[0][0]).toBe(json);
    });

    it('ignores empty values', () => {
      jpath.resolve.mockReturnValueOnce(['']);
      jpath.resolve.mockReturnValueOnce(['blub']);

      const result = xpathHelper(json, xpaths);
      expect(result).toEqual(['blub']);
    });
  });
});
