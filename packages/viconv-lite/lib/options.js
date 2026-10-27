'use strict';

module.exports = function snapshot(options) {
  if (options == null) return undefined;
  if (typeof options !== 'object' || Array.isArray(options)) throw new TypeError('options must be an object');
  const copy = Object.assign(Object.create(null), options);
  if (copy.addBOM !== undefined && typeof copy.addBOM !== 'boolean') throw new TypeError('addBOM must be a boolean');
  if (copy.stripBOM !== undefined && typeof copy.stripBOM !== 'boolean' && typeof copy.stripBOM !== 'function') throw new TypeError('stripBOM must be a boolean or callback');
  if (copy.defaultEncoding !== undefined) {
    if (typeof copy.defaultEncoding !== 'string' || !/^utf-?(16|32)(le|be)(?![\s\S])/i.test(copy.defaultEncoding)) {
      throw new TypeError('defaultEncoding must name explicit UTF-16/32 endianness');
    }
  }
  return copy;
};
