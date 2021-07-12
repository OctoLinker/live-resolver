import uniqWith from 'lodash.uniqwith';
import isEqual from 'lodash.isequal';
import registries from '../registries';

const supportedTypes = ['ping', 'go', 'java', 'nuget', ...registries.supported];

export default function (payload) {
  // Remove invalid items which does not follow format {type:'foo', target: 'bar'}
  // Filter out types which are not supported
  // Remove duplicates
  return uniqWith(payload, isEqual).filter(
    (item) => item
      && item.target
      && item.target.length
      && supportedTypes.includes(item.type),
  );
}
