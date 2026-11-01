'use strict';
const normalize = value => value ? value.split('/').filter(Boolean).join('/') : '';
const decode = value => {try {return decodeURIComponent(value);} catch {return value;}};
class DocumentPattern {
  constructor(pattern) {
    this.parts = normalize(pattern).split('/').map(part => {
      const capture = /^\{([^={}]+)(?:=[^{}]+)?\}$/.exec(part);
      return {name: capture?.[1], many: part.includes('**'), wildcard: part.includes('*') || !!capture};
    });
  }
  hasWildcards() {return this.parts.some(part => part.wildcard);}
  extractMatches(document) {
    const values = normalize(document).split('/'), result = {};
    let offset = 0;
    for (let index = 0; index < this.parts.length && offset < values.length; index++) {
      const part = this.parts[index];
      const end = part.many ? values.length - (this.parts.length - index - 1) : offset + 1;
      if (part.name !== undefined) Object.defineProperty(result, part.name, {
        value: decode(values.slice(offset, end).join('/')), enumerable: true, writable: true, configurable: true,
      });
      offset = end;
    }
    return result;
  }
}
module.exports = {DocumentPattern, normalize};
