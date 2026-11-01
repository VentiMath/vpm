import {insertStyles} from 'vemotion-utils';

// A Global component owns one sheet for its mounted lifetime. DOM work occurs
// only in insertion/layout effects, including hydration and final disposal.
export class GlobalSheet {
  constructor(cache) {
    this.cache = cache;
    this.sheet = null;
    this.hydrated = false;
  }
  mount(serialized) {
    const parent = this.cache.sheet;
    const key = `${this.cache.key}-global`;
    this.sheet = new parent.constructor({key, nonce: parent.nonce, container: parent.container, speedy: parent.isSpeedy});
    this.sheet.before = parent.tags[0] || null;
    const document = parent.container.ownerDocument;
    const identity = `${key} ${serialized.name}`;
    const existing = Array.from(document.querySelectorAll('style[data-emotion]')).find(node => node.getAttribute('data-emotion') === identity);
    this.hydrated = !!existing;
    if (existing) {
      existing.setAttribute('data-emotion', key);
      this.sheet.hydrate([existing]);
    }
  }
  apply(serialized) {
    if (this.hydrated) {this.hydrated = false; return;}
    if (serialized.next) insertStyles(this.cache, serialized.next, true);
    const last = this.sheet.tags.at(-1);
    if (last) {
      this.sheet.before = last.nextElementSibling;
      this.sheet.flush();
    }
    this.cache.insert('', serialized, this.sheet, false);
  }
  dispose() {
    this.sheet?.flush();
    this.sheet = null;
    this.hydrated = false;
  }
}
