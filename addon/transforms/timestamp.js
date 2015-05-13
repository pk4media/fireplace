/* global Firebase */

import Transform from './base';

export function now() {
  return Firebase.ServerValue.TIMESTAMP;
}

export default Transform.extend({
  deserialize(value) {
    if (!value) {
      return null;
    }
    return new Date(value);
  },

  serialize(value) {
    if (value === Firebase.ServerValue.TIMESTAMP) {
      return value;
    }
    if (!value || !value.getTime) {
      return null;
    }
    return value.getTime();
  }
});