import * as React from 'react';
import {insertStyles, registerStyles} from 'vemotion-utils';
import {useInsertionEffectAlwaysWithSyncFallback} from 'vemotion-use-insertion-effect-with-fallbacks';
import isBrowser from '#is-browser';

// Render plans collect styles before effects run. Registration stays synchronous
// so a later cx() or nested styled component can compose an earlier class.
export class StyleBatch {
  constructor(cache, includeLinkedNames = false) {
    this.cache = cache;
    this.entries = [];
    this.includeLinkedNames = includeLinkedNames;
  }
  add(serialized, stringTag = false) {
    registerStyles(this.cache, serialized, stringTag);
    this.entries.push(serialized, stringTag);
    return `${this.cache.key}-${serialized.name}`;
  }
  insert() {
    let output = '';
    for (let i = 0; i < this.entries.length; i += 2) {
      const css = insertStyles(this.cache, this.entries[i], this.entries[i + 1]);
      if (css !== undefined) output += css;
    }
    return output;
  }
  names() {
    const names = [];
    for (let i = 0; i < this.entries.length; i += 2) {
      for (let current = this.entries[i]; current; current = this.includeLinkedNames && current.next) names.push(current.name);
    }
    return names.join(' ');
  }
}

export function inlineStyle(cache, identity, rules) {
  return React.createElement('style', {
    'data-emotion': identity,
    dangerouslySetInnerHTML: {__html: rules},
    nonce: cache.sheet.nonce,
  });
}

export function StyleInsertion({batch}) {
  const css = useInsertionEffectAlwaysWithSyncFallback(() => {
    const rules = batch.insert();
    // React treats an effect's return value as cleanup. CSS is a return value
    // only for the server's synchronous adapter, never for a browser effect.
    if (!isBrowser) return rules;
  });
  return isBrowser || !css ? null : inlineStyle(batch.cache, `${batch.cache.key} ${batch.names()}`, css);
}

export function joinStyles(serialized) {
  const names = [], styles = [];
  for (let part = serialized; part; part = part.next) {
    names.push(part.name); styles.push(part.styles);
  }
  return {name: names.join(' '), styles: styles.join('')};
}
