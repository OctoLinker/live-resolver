import config from './config.json';

describe('config.json', () => {
  const props = ['registry', 'xpaths', 'fallback'];

  for (const key of Object.keys(config)) {
    describe(`${key}`, () => {
      for (const propKey of Object.keys(props)) {
        const prop = props[propKey];
        it(`has "${prop}" property`, () => {
          expect(config[key][prop]).toBeDefined();
        });
      }
    });
  }
});
