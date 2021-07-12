import Mixpanel from 'mixpanel';
import log from './log';

let instance;

export default {
  init: () => {
    if (!process.env.MIXPANEL_TOKEN) {
      return;
    }

    instance = Mixpanel.init(process.env.MIXPANEL_TOKEN, {
      protocol: 'https',
    });
  },

  track: (data) => {
    if (!instance) {
      return log('Track', data);
    }

    return new Promise((resolve) => {
      instance.track_batch(data, resolve);
    });
  },
};
